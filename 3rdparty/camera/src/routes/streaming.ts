import { EventEmitter } from "events";
import * as request from "request";
import { Application } from "express-ws";
import { FfmpegCommand } from "fluent-ffmpeg";
import { deflateRaw } from "pako";
import { Readable, Writable } from "stream";
import {
  VIDEO_FPS,
  VIDEO_STREAM_HEIGHT,
  VIDEO_STREAM_WIDTH,
  WS_COMPRESSION_ENABLED,
  WS_PING_INTERVAL_MS,
} from "../common/constants";
import {
  isLocalDevice,
  remoteDeviceIdToJpegSnapshotUrl,
  remoteDeviceIdToMjpegStreamUrl,
} from "../common/devices";
import { decode } from "../common/encode";
import {
  AllVideoWebSocketMsgs,
  AnyDeviceId,
  LocalDeviceId,
  VideoStreamTypes,
  VideoWebSocketMsgTypes,
} from "../common/types";
import { now } from "../utils/cron";
import { getFfmpeg } from "../utils/ffmpeg";
import {
  getFps,
  getOrCreateCameraDevice,
  getZoomRelativeControl,
  moveAxisSpeedStart,
  moveAxisSpeedStop,
  start,
  takeSnapshot,
} from "../utils/videoDevices";

interface StreamingInfo {
  ffmpegNumVideoUsersConnected: number;
  mjpegNumVideoUsersConnected: number;
  lastUserDisconnectedMs: number;
  ffmpegHandle?: FfmpegCommand;
  frameEmitter: EventEmitter;
}

const streamingInfo: Record<AnyDeviceId, StreamingInfo> = {};

const getOrCreateStreamingInfo = (deviceId: AnyDeviceId): StreamingInfo => {
  if (!streamingInfo.hasOwnProperty(deviceId)) {
    streamingInfo[deviceId] = {
      ffmpegNumVideoUsersConnected: 0,
      mjpegNumVideoUsersConnected: 0,
      lastUserDisconnectedMs: 0,
      frameEmitter: new EventEmitter(),
    };
  }
  return streamingInfo[deviceId];
};

const getOrCreateFfmpegFrameEmitter = (deviceId: AnyDeviceId): EventEmitter =>
  getOrCreateStreamingInfo(deviceId).frameEmitter;

export const getLastUserDisconnectedMs = (deviceId: AnyDeviceId) =>
  getOrCreateStreamingInfo(deviceId).lastUserDisconnectedMs;

export const isStreamingVideo = (deviceId: AnyDeviceId) => {
  const {
    mjpegNumVideoUsersConnected,
    ffmpegNumVideoUsersConnected,
  } = getOrCreateStreamingInfo(deviceId);
  const r = mjpegNumVideoUsersConnected > 0 || ffmpegNumVideoUsersConnected > 0;
  console.log(`isStreamingVideo ${r}`);
  return r;
};

const videoStreamUserConnected = (
  deviceId: AnyDeviceId,
  type: VideoStreamTypes,
) => {
  console.log(`user connected to video stream ${type} ${deviceId}`);
  const {
    ffmpegNumVideoUsersConnected,
    mjpegNumVideoUsersConnected,
  } = getOrCreateStreamingInfo(deviceId);

  let newFfmpegNumVideoUsersConnected = ffmpegNumVideoUsersConnected;
  let newMjpegNumVideoUsersConnected = mjpegNumVideoUsersConnected;

  switch (type) {
    case VideoStreamTypes.ffmpeg:
      newFfmpegNumVideoUsersConnected++;
      break;
    case VideoStreamTypes.mjpeg:
      newMjpegNumVideoUsersConnected++;
      break;
    default:
      break;
  }

  streamingInfo[deviceId] = {
    ...streamingInfo[deviceId],
    ffmpegNumVideoUsersConnected: newFfmpegNumVideoUsersConnected,
    mjpegNumVideoUsersConnected: newMjpegNumVideoUsersConnected,
  };
};

const videoStreamUserDisconnected = (
  deviceId: AnyDeviceId,
  type: VideoStreamTypes,
) => {
  console.log(`user disconnected to video stream ${type} ${deviceId}`);
  const {
    ffmpegNumVideoUsersConnected,
    mjpegNumVideoUsersConnected,
  } = getOrCreateStreamingInfo(deviceId);

  let newFfmpegNumVideoUsersConnected = ffmpegNumVideoUsersConnected;
  let newMjpegNumVideoUsersConnected = mjpegNumVideoUsersConnected;

  switch (type) {
    case VideoStreamTypes.ffmpeg:
      newFfmpegNumVideoUsersConnected++;
      newFfmpegNumVideoUsersConnected = ffmpegNumVideoUsersConnected - 1;
      if (newFfmpegNumVideoUsersConnected < 0) {
        newFfmpegNumVideoUsersConnected = 0;
      }
      break;
    case VideoStreamTypes.mjpeg:
      newMjpegNumVideoUsersConnected++;
      newMjpegNumVideoUsersConnected = mjpegNumVideoUsersConnected - 1;
      if (newMjpegNumVideoUsersConnected < 0) {
        newMjpegNumVideoUsersConnected = 0;
      }
      break;
    default:
      break;
  }

  streamingInfo[deviceId] = {
    ...streamingInfo[deviceId],
    lastUserDisconnectedMs: now(),
    ffmpegNumVideoUsersConnected: newFfmpegNumVideoUsersConnected,
    mjpegNumVideoUsersConnected: newMjpegNumVideoUsersConnected,
  };
};

const startFfmpegStreamer = async (deviceId: AnyDeviceId) => {
  console.log(`startFfmpegStreamer`);
  const { ffmpegHandle } = getOrCreateStreamingInfo(deviceId);
  if (ffmpegHandle) {
    throw Error(`ffmpeg handle already exists for ${deviceId}`);
  }

  let cam;
  let fps = VIDEO_FPS;
  let input: any;
  if (isLocalDevice(deviceId)) {
    await start(deviceId);
    cam = getOrCreateCameraDevice(deviceId);
    fps = getFps(cam.cam.configGet());
    input = new Readable({
      read() {
        cam.emitter.once("frame", (buffer: Buffer) => {
          this.push(buffer);
        });
      },
    });
  } else {
    input = remoteDeviceIdToMjpegStreamUrl(deviceId);
  }

  const streamFfmpegCommand = getFfmpeg({
    stdoutLines: 1,
  })
    .input(input)
    .inputFormat("mjpeg")
    .inputFPS(fps)
    .noAudio()
    .videoCodec("libx264")
    .outputFormat("rawvideo")
    .videoBitrate("500k")
    .size(`${VIDEO_STREAM_WIDTH}x${VIDEO_STREAM_HEIGHT}`)
    .outputFPS(fps)
    .outputOptions([
      "-vprofile baseline",
      "-bufsize 600k",
      "-tune zerolatency",
      "-pix_fmt yuv420p",
      // "-g 30",
    ]);

  streamFfmpegCommand.on("start", commandStr => {
    console.log(`ffmpeg process started: ${commandStr}`);
  });

  streamFfmpegCommand.on("error", err => {
    console.log(`ffmpeg has been killed for ${deviceId}`);
    console.error(err);
  });

  streamingInfo[deviceId].ffmpegHandle = streamFfmpegCommand;

  streamFfmpegCommand.pipe(
    new Writable({
      objectMode: true,
      write: (data, encoding, callback) => {
        getOrCreateFfmpegFrameEmitter(deviceId).emit("data", data);
        callback();
      },
    }),
    { end: true },
  );
  console.log(`ffmpeg running for ${deviceId}`);
};

const stopFfmpegStreamer = (deviceId: AnyDeviceId) => {
  console.log(`stopFfmpegStreamer`);
  const { ffmpegHandle } = getOrCreateStreamingInfo(deviceId);
  if (!ffmpegHandle) {
    throw Error(`no ffmpeg handle exists for ${deviceId}`);
  }

  ffmpegHandle.kill("SIGKILL");

  streamingInfo[deviceId].ffmpegHandle = undefined;
};

export const streamingRoutes = async (app: Application) => {
  app.get("/stream/:deviceId/snapshot", async (req, res) => {
    const deviceId = decode(req.params.deviceId);
    const data = await takeSnapshot(deviceId);
    res.send(data);
  });

  app.get("/stream/:deviceId/mjpeg", async (req, res) => {
    const deviceId = decode(req.params.deviceId);
    await start(deviceId);
    videoStreamUserConnected(deviceId, VideoStreamTypes.mjpeg);
    res.writeHead(200, {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0",
      Pragma: "no-cache",
      Connection: "close",
      "Content-Type": "multipart/x-mixed-replace; boundary=--myboundary",
    });

    const writeFrame = (buffer: Buffer) => {
      res.write(
        `--myboundary\nContent-Type: image/jpeg\nContent-length: ${buffer.length}\n\n`,
      );
      res.write(buffer);
    };

    getOrCreateCameraDevice(deviceId).emitter.addListener("frame", writeFrame);
    res.addListener("close", () => {
      videoStreamUserDisconnected(deviceId, VideoStreamTypes.mjpeg);
      getOrCreateCameraDevice(deviceId).emitter.removeListener(
        "frame",
        writeFrame,
      );
    });
  });

  app.ws("/stream/:deviceId/ws", async (ws, req) => {
    const deviceId = decode(req.params.deviceId);
    const log = (...args: any[]) => console.log(deviceId, ...args);
    const err = (...args: any[]) => console.error(deviceId, ...args);
    const send = (m: Buffer | AllVideoWebSocketMsgs) => {
      if (Buffer.isBuffer(m)) {
        if (WS_COMPRESSION_ENABLED) {
          const d = deflateRaw(m);
          ws.send(d);
        } else {
          ws.send(m);
        }
      } else {
        const msgStr = JSON.stringify(m);
        log(`ws send ${msgStr}`);
        ws.send(msgStr);
      }
    };
    log(`ws open`);
    videoStreamUserConnected(deviceId, VideoStreamTypes.ffmpeg);
    const { ffmpegHandle } = getOrCreateStreamingInfo(deviceId);
    if (!ffmpegHandle) {
      await startFfmpegStreamer(deviceId);
    }
    let isPlaying = true;
    const listener = (data: Buffer) => {
      if (isPlaying) {
        send(data);
      }
    };
    let lastPongTs = now();
    const pingInterval = setInterval(() => {
      const n = now();
      send({
        type: VideoWebSocketMsgTypes.ping,
        msg: {
          ts: n,
          lastLagMs: n - lastPongTs - WS_PING_INTERVAL_MS,
        },
      });
    }, WS_PING_INTERVAL_MS);

    getOrCreateFfmpegFrameEmitter(deviceId).on("data", listener);
    ws.on("close", () => {
      log(`ws close`);
      videoStreamUserDisconnected(deviceId, VideoStreamTypes.ffmpeg);
      if (
        getOrCreateStreamingInfo(deviceId).ffmpegNumVideoUsersConnected === 0
      ) {
        stopFfmpegStreamer(deviceId);
      }
      getOrCreateFfmpegFrameEmitter(deviceId).removeListener("data", listener);
      clearInterval(pingInterval);
    });

    ws.on("message", m => {
      log(`ws received ${m}`);
      try {
        const p = JSON.parse(m as string);
        switch (p.type as VideoWebSocketMsgTypes) {
          case VideoWebSocketMsgTypes.pong:
            lastPongTs = p.msg.ts;
            break;
          case VideoWebSocketMsgTypes.play:
            isPlaying = true;
            break;
          case VideoWebSocketMsgTypes.pause:
            isPlaying = false;
            break;
          default:
            break;
        }
        if (isLocalDevice(deviceId)) {
          const { cam, zoom } = getOrCreateCameraDevice(deviceId);
          switch (p.type as VideoWebSocketMsgTypes) {
            case VideoWebSocketMsgTypes.zoomControl:
              const zoomRelControl = getZoomRelativeControl(cam);
              zoomRelControl(zoom, p.msg.direction);
              break;
            case VideoWebSocketMsgTypes.speedControlStart:
              moveAxisSpeedStart(cam, p.msg.axis, p.msg.direction);
              break;
            case VideoWebSocketMsgTypes.speedControlStop:
              moveAxisSpeedStop(cam, p.msg.axis);
              break;
            default:
              break;
          }
        }
      } catch (e) {
        err("received message that isn't JSON?");
        err(e.stack);
      }
    });
  });

  app.ws("/stream/:deviceId/ws_controls_only", async (ws, req) => {
    const deviceId = decode(req.params.deviceId);
    const log = (...args: any[]) => console.log(deviceId, ...args);
    const err = (...args: any[]) => console.error(deviceId, ...args);
    const send = (m: Buffer | AllVideoWebSocketMsgs) => {
      if (Buffer.isBuffer(m)) {
        ws.send(m);
      } else {
        const msgStr = JSON.stringify(m);
        log(`ws send ${msgStr}`);
        ws.send(msgStr);
      }
    };
    log(`ws open`);
    let lastPongTs = now();
    const pingInterval = setInterval(() => {
      const n = now();
      send({
        type: VideoWebSocketMsgTypes.ping,
        msg: {
          ts: n,
          lastLagMs: n - lastPongTs - WS_PING_INTERVAL_MS,
        },
      });
    }, WS_PING_INTERVAL_MS);

    ws.on("close", () => {
      log(`ws close`);
      clearInterval(pingInterval);
    });

    ws.on("message", m => {
      log(`ws received ${m}`);
      try {
        const p = JSON.parse(m as string);
        const { cam, zoom } = getOrCreateCameraDevice(deviceId);
        switch (p.type as VideoWebSocketMsgTypes) {
          case VideoWebSocketMsgTypes.pong:
            lastPongTs = p.msg.ts;
            break;
          case VideoWebSocketMsgTypes.zoomControl:
            const zoomRelControl = getZoomRelativeControl(cam);
            zoomRelControl(zoom, p.msg.direction);
            break;
          case VideoWebSocketMsgTypes.speedControlStart:
            moveAxisSpeedStart(cam, p.msg.axis, p.msg.direction);
            break;
          case VideoWebSocketMsgTypes.speedControlStop:
            moveAxisSpeedStop(cam, p.msg.axis);
            break;
          default:
            break;
        }
      } catch (e) {
        err("received message that isn't JSON?");
        err(e.stack);
      }
    });
  });
};
