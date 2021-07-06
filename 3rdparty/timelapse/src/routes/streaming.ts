import { EventEmitter } from "events";
import { Application } from "express-ws";
import { FfmpegCommand } from "fluent-ffmpeg";
import { Readable, Writable } from "stream";
import { VIDEO_STREAM_HEIGHT, VIDEO_STREAM_WIDTH } from "../common/constants";
import { decode } from "../common/encode";
import { DeviceId } from "../common/types";
import { now } from "../utils/cron";
import { getFfmpeg } from "../utils/ffmpeg";
import { getOrCreateCameraDevice, start } from "../utils/videoDevices";

enum VideoStreamTypes {
  ffmpeg = "ffmpeg",
  mjpeg = "mjpeg",
}

interface StreamingInfo {
  ffmpegNumVideoUsersConnected: number;
  mjpegNumVideoUsersConnected: number;
  lastUserDisconnectedMs: number;
  ffmpegHandle?: FfmpegCommand;
  frameEmitter: EventEmitter;
}

const streamingInfo: Record<DeviceId, StreamingInfo> = {};

const getOrCreateStreamingInfo = (deviceId: DeviceId): StreamingInfo => {
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

const getOrCreateFfmpegFrameEmitter = (deviceId: DeviceId): EventEmitter =>
  getOrCreateStreamingInfo(deviceId).frameEmitter;

export const getLastUserDisconnectedMs = (deviceId: DeviceId) =>
  getOrCreateStreamingInfo(deviceId).lastUserDisconnectedMs;

export const isStreamingVideo = (deviceId: DeviceId) => {
  const {
    mjpegNumVideoUsersConnected,
    ffmpegNumVideoUsersConnected,
  } = getOrCreateStreamingInfo(deviceId);
  const r = mjpegNumVideoUsersConnected > 0 || ffmpegNumVideoUsersConnected > 0;
  console.log(`isStreamingVideo ${r}`);
  return r;
};

const videoStreamUserConnected = (
  deviceId: DeviceId,
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
  deviceId: DeviceId,
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

const startFfmpegStreamer = async (deviceId: DeviceId) => {
  console.log(`startFfmpegStreamer`);
  const { ffmpegHandle } = getOrCreateStreamingInfo(deviceId);
  if (ffmpegHandle) {
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

const stopFfmpegStreamer = (deviceId: DeviceId) => {
  console.log(`stopFfmpegStreamer`);
  const { ffmpegHandle } = getOrCreateStreamingInfo(deviceId);
  if (!ffmpegHandle) {
    throw Error(`no ffmpeg handle exists for ${deviceId}`);
  }

  ffmpegHandle.kill("SIGKILL");

  streamingInfo[deviceId].ffmpegHandle = undefined;
};

export const streamingRoutes = async (app: Application) => {
  app.get("/stream/:deviceId/stream.mjpg", async (req, res) => {
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

  app.ws("/stream/:deviceId/ffmpeg.ws", async (ws, req) => {
    const deviceId = decode(req.params.deviceId);
    console.log(`ws open ${deviceId}`);
    videoStreamUserConnected(deviceId, VideoStreamTypes.ffmpeg);
    const { ffmpegHandle } = getOrCreateStreamingInfo(deviceId);
    if (!ffmpegHandle) {
      await startFfmpegStreamer(deviceId);
    }
    const listener = data => ws.send(data);
    getOrCreateFfmpegFrameEmitter(deviceId).on("data", listener);
    ws.on("close", () => {
      console.log(`ws close ${deviceId}`);
      videoStreamUserDisconnected(deviceId, VideoStreamTypes.ffmpeg);
      if (
        getOrCreateStreamingInfo(deviceId).ffmpegNumVideoUsersConnected === 0
      ) {
        stopFfmpegStreamer(deviceId);
      }
      getOrCreateFfmpegFrameEmitter(deviceId).removeListener("data", listener);
    });

    // ws.on("message", m => {
    //   console.log(`received ${deviceId} ${m}`);
    //   switch (m as WebSocketVideoMessageTypes) {
    //     case WebSocketVideoMessageTypes.heartbeat:
    //       break;
    //     case WebSocketVideoMessageTypes.play:
    //       break;
    //     case WebSocketVideoMessageTypes.pause:
    //       break;
    //     case WebSocketVideoMessageTypes.stop:
    //       break;
    //     case WebSocketVideoMessageTypes.load:
    //       break;
    //     default:
    //       break;
    //   }
    // });
  });
};
