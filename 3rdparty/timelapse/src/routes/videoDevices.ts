import { EventEmitter } from "events";
import { Application } from "express-ws";
import { FfmpegCommand } from "fluent-ffmpeg";
import { Readable, Writable } from "stream";
import { VIDEO_STREAM_HEIGHT, VIDEO_STREAM_WIDTH } from "../common/constants";
import { decode } from "../common/encode";
import { MILLISECONDS_IN_SECOND, timeout } from "../common/time";
import { DeviceId } from "../common/types";
import { now } from "../utils/cron";
import { getFfmpeg } from "../utils/ffmpeg";
import {
  getControl,
  getOrCreateCameraDevice,
  getZoomInfo,
  listVideoDevices,
  moveAxisRelative,
  moveAxisSpeedStart,
  moveAxisSpeedStop,
  setCameraDeviceZoom,
  start,
  takeSnapshot,
} from "../utils/videoDevices";

const numVideoUsersConnected: Record<DeviceId, number> = {};
const lastUserDisconnectedMs: Record<DeviceId, number> = {};
const ffmpegHandles: Record<DeviceId, FfmpegCommand> = {};
const httpVideoStreamReceiverEmitters: Record<DeviceId, EventEmitter> = {};

const getOrCreateEventEmitterForDeviceId = (
  deviceId: DeviceId,
): EventEmitter => {
  if (!httpVideoStreamReceiverEmitters.hasOwnProperty(deviceId)) {
    httpVideoStreamReceiverEmitters[deviceId] = new EventEmitter();
  }
  return httpVideoStreamReceiverEmitters[deviceId];
};

export const getLastUserDisconnectedMs = (deviceId: DeviceId) => {
  const r = numVideoUsersConnected[deviceId];
  if (!r) {
    return 0;
  } else {
    return r;
  }
};

export const isStreamingVideo = (deviceId: DeviceId) => {
  const r = numVideoUsersConnected[deviceId];
  let ret = false;
  if (!r) {
    ret = false;
  } else {
    ret = r > 1;
  }
  console.log(`isStreamingVideo ${deviceId} ${ret}`);
  return ret;
};

const videoStreamUserConnected = (deviceId: DeviceId) => {
  console.log("user connected to video stream", deviceId);
  if (!numVideoUsersConnected.hasOwnProperty(deviceId)) {
    numVideoUsersConnected[deviceId] = 0;
  }
  numVideoUsersConnected[deviceId]++;
};

const videoStreamUserDisconnected = (deviceId: DeviceId) => {
  console.log("user disconnected from video stream", deviceId);
  lastUserDisconnectedMs[deviceId] = now();
  if (!numVideoUsersConnected.hasOwnProperty(deviceId)) {
    return;
  }
  numVideoUsersConnected[deviceId]--;
  if (numVideoUsersConnected[deviceId] < 0) {
    numVideoUsersConnected[deviceId] = 0;
  }
};

const startFfmpegStreamer = async (deviceId: DeviceId) => {
  console.log(`startFfmpegStreamer`);
  if (ffmpegHandles.hasOwnProperty(deviceId)) {
    throw Error(`ffmpeg handle already exists for ${deviceId}`);
  }

  await start(deviceId);

  const streamFfmpegCommand = getFfmpeg({
    stdoutLines: 1,
  })
    .input(
      new Readable({
        read() {
          getOrCreateCameraDevice(deviceId).emitter.once(
            "frame",
            (buffer: Buffer) => {
              this.push(buffer);
            },
          );
        },
      }),
    )
    .inputFormat("mjpeg")
    .noAudio()
    .format("mpegts")
    .videoCodec("mpeg1video")
    .size(`${VIDEO_STREAM_WIDTH}x${VIDEO_STREAM_HEIGHT}`)
    .videoBitrate("256k")
    .outputOptions("-bf 0");

  streamFfmpegCommand.on("start", commandStr => {
    console.log(`ffmpeg process started: ${commandStr}`);
  });

  streamFfmpegCommand.on("error", err => {
    console.log(`ffmpeg has been killed for ${deviceId}`);
    if (err) {
      console.error(err);
    }
  });

  ffmpegHandles[deviceId] = streamFfmpegCommand;

  streamFfmpegCommand.pipe(
    new Writable({
      objectMode: true,
      write: (data, encoding, callback) => {
        getOrCreateEventEmitterForDeviceId(deviceId).emit("data", data);
        callback();
      },
    }),
    { end: true },
  );
  console.log(`ffmpeg running for ${deviceId}`);
};

const stopFfmpegStreamer = (deviceId: DeviceId) => {
  console.log(`stopFfmpegStreamer`);
  if (!ffmpegHandles.hasOwnProperty(deviceId)) {
    throw Error(`no ffmpeg handle exists for ${deviceId}`);
  }

  const command = ffmpegHandles[deviceId];

  command.kill("SIGKILL");

  delete ffmpegHandles[deviceId];
};

export const registerVideoDeviceRoutes = async (app: Application) => {
  app.get("/video-device/list", async (req, res) => {
    const l = await listVideoDevices();
    res.send(JSON.stringify(l));
  });

  app.get("/video-device/:deviceId/snapshot.jpg", async (req, res) => {
    const deviceId = decode(req.params.deviceId);
    const data = await takeSnapshot(deviceId);
    res.send(data);
  });

  // app.get("/video-device/:deviceId/stream.mjpg", async (req, res) => {
  //   const deviceId = decode(req.params.deviceId);
  //   await start(deviceId);
  //   videoStreamUserConnected(deviceId);
  //   res.writeHead(200, {
  //     "Cache-Control":
  //       "no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0",
  //     Pragma: "no-cache",
  //     Connection: "close",
  //     "Content-Type": "multipart/x-mixed-replace; boundary=--myboundary",
  //   });

  //   const writeFrame = (buffer: Buffer) => {
  //     res.write(
  //       `--myboundary\nContent-Type: image/jpeg\nContent-length: ${buffer.length}\n\n`,
  //     );
  //     res.write(buffer);
  //   };

  //   getOrCreateCameraDevice(deviceId).emitter.addListener("frame", writeFrame);
  //   res.addListener("close", () => {
  //     videoStreamUserDisconnected(deviceId);
  //     // if (numVideoUsersConnected[deviceId] === 0) {
  //     //   stopFfmpegStreamer(deviceId);
  //     // }
  //     getOrCreateCameraDevice(deviceId).emitter.removeListener(
  //       "frame",
  //       writeFrame,
  //     );
  //   });
  // });

  app.ws("/video-device/:deviceId/stream.ws", async (ws, req) => {
    const deviceId = decode(req.params.deviceId);
    videoStreamUserConnected(deviceId);
    if (!ffmpegHandles.hasOwnProperty(deviceId)) {
      await startFfmpegStreamer(deviceId);
    }
    const listener = data => ws.send(data);
    getOrCreateEventEmitterForDeviceId(deviceId).on("data", listener);
    ws.on("close", () => {
      videoStreamUserDisconnected(deviceId);
      if (numVideoUsersConnected[deviceId] === 0) {
        stopFfmpegStreamer(deviceId);
      }
      getOrCreateEventEmitterForDeviceId(deviceId).removeListener(
        "data",
        listener,
      );
    });
  });

  app.get("/video-device/:deviceId/formats", (req, res) => {
    const deviceId = decode(req.params.deviceId);
    const { cam } = getOrCreateCameraDevice(deviceId);
    res.send(JSON.stringify(cam.formats));
  });

  app.get("/video-device/:deviceId/controls", (req, res) => {
    const deviceId = decode(req.params.deviceId);
    const { cam } = getOrCreateCameraDevice(deviceId);
    res.send(JSON.stringify(cam.controls));
  });

  app.get(
    "/video-device/:deviceId/control/:axis/:direction/position",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const axis = decode(req.params.axis) as any;
      const direction = decode(req.params.direction) as any;

      const { cam } = getOrCreateCameraDevice(deviceId);
      moveAxisRelative(cam, axis, direction, 128);
      await timeout(2 * MILLISECONDS_IN_SECOND);

      res.send(true);
    },
  );

  app.get(
    "/video-device/:deviceId/control/zoom/:direction",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const direction = decode(req.params.direction);

      const { cam, zoom } = getOrCreateCameraDevice(deviceId);
      const zoomAbsControl = getControl(cam, `zoom absolute`);
      if (zoomAbsControl) {
        const { min, max } = getZoomInfo(cam);
        const zoomDelta = (direction === "in" ? 1 : -1) * 10;

        let newZoom = zoom + zoomDelta;

        if (zoom < min) {
          newZoom = min;
        } else if (zoom > max) {
          newZoom = max;
        }

        setCameraDeviceZoom(deviceId, newZoom);

        console.log("zoom", direction, newZoom, "delta", zoomDelta);

        cam.controlSet(zoomAbsControl.id, newZoom);
      }

      res.send(true);
    },
  );

  app.get(
    "/video-device/:deviceId/control/:axis/:direction/speed/start",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const axis = decode(req.params.axis) as any;
      const direction = decode(req.params.direction) as any;

      const { cam } = getOrCreateCameraDevice(deviceId);
      moveAxisSpeedStart(cam, axis, direction);

      res.send(true);
    },
  );

  app.get(
    "/video-device/:deviceId/control/:axis/speed/stop",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const axis = decode(req.params.axis) as any;

      const { cam } = getOrCreateCameraDevice(deviceId);
      moveAxisSpeedStop(cam, axis);

      res.send(true);
    },
  );
};
