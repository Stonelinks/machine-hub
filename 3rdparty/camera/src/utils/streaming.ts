import { EventEmitter } from "events";
import { FfmpegCommand } from "fluent-ffmpeg";
import { Readable, Writable } from "stream";
import {
  ENABLE_REMOTE_RTSP_CLIENT,
  FFMPEG_STDOUT_LINES,
  LOCAL_RTSP_CLIENT_USE_RAWVIDEO_SOURCE,
  LOCAL_RTSP_SERVER_PORT,
  REMOTE_VIDEO_FPS,
  VIDEO_STREAM_HEIGHT,
  VIDEO_STREAM_WIDTH,
} from "../common/constants";
import {
  isLocalDeviceType,
  remoteDeviceIdToMjpegStreamUrl,
  remoteMjpegDeviceIdToRtspStreamUrl,
} from "../common/devices";
import { encode } from "../common/encode";
import { now } from "../common/time";
import { AnyDeviceId, LocalDeviceId, VideoStreamTypes } from "../common/types";
import { getFfmpeg } from "../utils/ffmpeg";
import { getFps, getOrCreateCameraDevice, start } from "../utils/videoDevices";

interface StreamingInfo {
  ffmpegRawVideoNumVideoUsersConnected: number;
  ffmpegRtspNumVideoUsersConnected: number;
  mjpegNumVideoUsersConnected: number;
  lastUserDisconnectedMs: number;
  ffmpegRawVideoHandle?: FfmpegCommand;
  ffmpegRtspHandle?: FfmpegCommand;
  rawVideoFrameEmitter: EventEmitter;
}

const streamingInfo: Record<AnyDeviceId, StreamingInfo> = {};

export const getOrCreateStreamingInfo = (
  deviceId: AnyDeviceId,
): StreamingInfo => {
  if (!streamingInfo.hasOwnProperty(deviceId)) {
    streamingInfo[deviceId] = {
      ffmpegRawVideoNumVideoUsersConnected: 0,
      ffmpegRtspNumVideoUsersConnected: 0,
      mjpegNumVideoUsersConnected: 0,
      lastUserDisconnectedMs: 0,
      rawVideoFrameEmitter: new EventEmitter(),
    };
  }
  return streamingInfo[deviceId];
};

export const getOrCreateFfmpegRawVideoFrameEmitter = (
  deviceId: AnyDeviceId,
): EventEmitter => getOrCreateStreamingInfo(deviceId).rawVideoFrameEmitter;

export const getLastUserDisconnectedMs = (deviceId: AnyDeviceId) =>
  getOrCreateStreamingInfo(deviceId).lastUserDisconnectedMs;

export const isStreamingVideo = (deviceId: AnyDeviceId) => {
  const {
    mjpegNumVideoUsersConnected,
    ffmpegRawVideoNumVideoUsersConnected,
    ffmpegRtspNumVideoUsersConnected: ffmpegRtspNumVideoUsersConnected,
  } = getOrCreateStreamingInfo(deviceId);
  const r =
    mjpegNumVideoUsersConnected > 0 ||
    ffmpegRawVideoNumVideoUsersConnected > 0 ||
    ffmpegRtspNumVideoUsersConnected > 0;
  console.log(`isStreamingVideo ${deviceId} ${r}`);
  return r;
};

export const videoStreamUserConnected = (
  deviceId: AnyDeviceId,
  type: VideoStreamTypes,
) => {
  console.log(`user connected to video stream ${type} ${deviceId}`);
  const {
    ffmpegRawVideoNumVideoUsersConnected,
    mjpegNumVideoUsersConnected,
    ffmpegRtspNumVideoUsersConnected: ffmpegRtspNumVideoUsersConnected,
  } = getOrCreateStreamingInfo(deviceId);

  let newFfmpegRawVideoNumVideoUsersConnected = ffmpegRawVideoNumVideoUsersConnected;
  let newMjpegNumVideoUsersConnected = mjpegNumVideoUsersConnected;
  let newFfmpegRtspNumVideoUsersConnected = ffmpegRtspNumVideoUsersConnected;

  switch (type) {
    case VideoStreamTypes.ffmpegRawVideo:
      newFfmpegRawVideoNumVideoUsersConnected++;
      break;
    case VideoStreamTypes.mjpeg:
      newMjpegNumVideoUsersConnected++;
      break;
    case VideoStreamTypes.ffmpegRtsp:
      newFfmpegRtspNumVideoUsersConnected++;
      break;
    default:
      break;
  }

  streamingInfo[deviceId] = {
    ...streamingInfo[deviceId],
    ffmpegRawVideoNumVideoUsersConnected: newFfmpegRawVideoNumVideoUsersConnected,
    mjpegNumVideoUsersConnected: newMjpegNumVideoUsersConnected,
    ffmpegRtspNumVideoUsersConnected: newFfmpegRtspNumVideoUsersConnected,
  };
};

export const videoStreamUserDisconnected = (
  deviceId: AnyDeviceId,
  type: VideoStreamTypes,
) => {
  console.log(`user disconnected to video stream ${type} ${deviceId}`);
  const {
    ffmpegRawVideoNumVideoUsersConnected,
    mjpegNumVideoUsersConnected,
    ffmpegRtspNumVideoUsersConnected,
  } = getOrCreateStreamingInfo(deviceId);

  let newFfmpegRawVideoNumVideoUsersConnected = ffmpegRawVideoNumVideoUsersConnected;
  let newMjpegNumVideoUsersConnected = mjpegNumVideoUsersConnected;
  let newFfmpegRtspNumVideoUsersConnected = ffmpegRtspNumVideoUsersConnected;

  switch (type) {
    case VideoStreamTypes.ffmpegRawVideo:
      newFfmpegRawVideoNumVideoUsersConnected++;
      newFfmpegRawVideoNumVideoUsersConnected =
        ffmpegRawVideoNumVideoUsersConnected - 1;
      if (newFfmpegRawVideoNumVideoUsersConnected < 0) {
        newFfmpegRawVideoNumVideoUsersConnected = 0;
      }
      if (newFfmpegRawVideoNumVideoUsersConnected === 0) {
        stopFfmpegRawVideoStreamer(deviceId);
      }
      break;
    case VideoStreamTypes.mjpeg:
      newMjpegNumVideoUsersConnected++;
      newMjpegNumVideoUsersConnected = mjpegNumVideoUsersConnected - 1;
      if (newMjpegNumVideoUsersConnected < 0) {
        newMjpegNumVideoUsersConnected = 0;
      }
      break;
    case VideoStreamTypes.ffmpegRtsp:
      newFfmpegRtspNumVideoUsersConnected++;
      newFfmpegRtspNumVideoUsersConnected =
        ffmpegRtspNumVideoUsersConnected - 1;
      if (newFfmpegRtspNumVideoUsersConnected < 0) {
        newFfmpegRtspNumVideoUsersConnected = 0;
      }
      if (newFfmpegRtspNumVideoUsersConnected === 0) {
        stopFfmpegRtspStreamer(deviceId);
      }
      break;
    default:
      break;
  }

  streamingInfo[deviceId] = {
    ...streamingInfo[deviceId],
    lastUserDisconnectedMs: now(),
    ffmpegRawVideoNumVideoUsersConnected: newFfmpegRawVideoNumVideoUsersConnected,
    mjpegNumVideoUsersConnected: newMjpegNumVideoUsersConnected,
    ffmpegRtspNumVideoUsersConnected: newFfmpegRtspNumVideoUsersConnected,
  };
};

export const startFfmpegRawVideoStreamer = async (deviceId: AnyDeviceId) => {
  const log = (...args: string[]) =>
    console.log("startFfmpegRawVideoStreamer", deviceId, ...args);
  const error = (...args: string[]) =>
    console.error("startFfmpegRawVideoStreamer", deviceId, ...args);
  log("start");
  const { ffmpegRawVideoHandle } = getOrCreateStreamingInfo(deviceId);
  if (ffmpegRawVideoHandle) {
    throw Error(`ffmpeg handle already exists for ${deviceId}`);
  }

  let cam;
  let fps = REMOTE_VIDEO_FPS;
  let input: any;
  let inputFormat = "mjpeg";
  let extraInputOptions = [];
  if (isLocalDeviceType(deviceId)) {
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
    input = ENABLE_REMOTE_RTSP_CLIENT
      ? remoteMjpegDeviceIdToRtspStreamUrl(deviceId)
      : remoteDeviceIdToMjpegStreamUrl(deviceId);
    if (ENABLE_REMOTE_RTSP_CLIENT) {
      inputFormat = "rtsp";
      extraInputOptions = ["-rtsp_transport udp"];
    }
  }

  const streamFfmpegCommand = getFfmpeg({
    stdoutLines: FFMPEG_STDOUT_LINES,
  })
    .input(input)
    .inputFormat(inputFormat)
    .inputOptions(extraInputOptions)
    .inputFPS(fps)
    .withNoAudio()
    .videoCodec("libx264")
    .videoBitrate(2048, true)
    .outputFormat("rawvideo")
    .size(`${VIDEO_STREAM_WIDTH}x${VIDEO_STREAM_HEIGHT}`)
    .outputFPS(fps)
    .addOption("-vprofile", "baseline")
    .addOption("-bufsize", "600k")
    .addOption("-pix_fmt", "yuv420p")
    .addOption("-preset", "ultrafast")
    .addOption("-deadline", "realtime")
    .addOption("-tune", "zerolatency")
    .addOption("-qmin", "0")
    .addOption("-qmax", "50")
    .addOption("-crf", "10");

  streamFfmpegCommand.on("start", commandStr => {
    log(`ffmpeg process started: ${commandStr}`);
  });

  streamFfmpegCommand.on("end", (stdout, stderr) => {
    log(`ffmpeg has ended`);
    log("stdout", stdout);
    log("stderr", stderr);
  });

  streamFfmpegCommand.on("error", (err, stdout, stderr) => {
    log(`ffmpeg has been killed for ${deviceId}`);
    error(err);
    log("stdout", stdout);
    log("stderr", stderr);
  });

  streamingInfo[deviceId].ffmpegRawVideoHandle = streamFfmpegCommand;

  streamFfmpegCommand.pipe(
    new Writable({
      objectMode: true,
      write: (data, encoding, callback) => {
        getOrCreateFfmpegRawVideoFrameEmitter(deviceId).emit("data", data);
        callback();
      },
    }),
    { end: true },
  );
  log(`ffmpeg running`);
};

export const stopFfmpegRawVideoStreamer = (deviceId: AnyDeviceId) => {
  console.log(`stopFfmpegRawVideoStreamer`);
  const { ffmpegRawVideoHandle } = getOrCreateStreamingInfo(deviceId);
  if (!ffmpegRawVideoHandle) {
    throw Error(`no ffmpeg handle exists for ${deviceId}`);
  }

  ffmpegRawVideoHandle.kill("SIGKILL");

  streamingInfo[deviceId].ffmpegRawVideoHandle = undefined;
};

export const startFfmpegRtspStreamer = async (deviceId: LocalDeviceId) => {
  const log = (...args: string[]) =>
    console.log("startFfmpegRtspStreamer", deviceId, ...args);
  const error = (...args: string[]) =>
    console.error("startFfmpegRtspStreamer", deviceId, ...args);
  log("start");

  const cam = getOrCreateCameraDevice(deviceId);
  const fps = getFps(cam.cam.configGet());

  if (LOCAL_RTSP_CLIENT_USE_RAWVIDEO_SOURCE) {
    const { ffmpegRawVideoHandle } = getOrCreateStreamingInfo(deviceId);
    if (!ffmpegRawVideoHandle) {
      await startFfmpegRawVideoStreamer(deviceId);
    }
    videoStreamUserConnected(deviceId, VideoStreamTypes.ffmpegRawVideo);
  } else {
    await start(deviceId);

    const { ffmpegRawVideoHandle } = getOrCreateStreamingInfo(deviceId);
    if (ffmpegRawVideoHandle) {
      throw Error(`ffmpeg handle already exists for ${deviceId}`);
    }
  }

  const input = new Readable({
    read() {
      if (LOCAL_RTSP_CLIENT_USE_RAWVIDEO_SOURCE) {
        getOrCreateFfmpegRawVideoFrameEmitter(deviceId).once(
          "data",
          (buffer: Buffer) => {
            this.push(buffer);
          },
        );
      } else {
        cam.emitter.once("frame", (buffer: Buffer) => {
          this.push(buffer);
        });
      }
    },
  });

  const streamFfmpegCommand = LOCAL_RTSP_CLIENT_USE_RAWVIDEO_SOURCE
    ? getFfmpeg({
        stdoutLines: FFMPEG_STDOUT_LINES,
      })
        .input(input)
        .inputFormat("rawvideo")
        .addInputOption("-pixel_format", "yuv420p")
        .addInputOption(
          "-video_size",
          `${VIDEO_STREAM_WIDTH}x${VIDEO_STREAM_HEIGHT}`,
        )
        .inputFPS(fps)
        // .size(`${VIDEO_STREAM_WIDTH}x${VIDEO_STREAM_HEIGHT}`)
        .withNoAudio()
        .videoCodec("copy")
        .output(
          `rtsp://localhost:${LOCAL_RTSP_SERVER_PORT}/${encode(deviceId)}`,
        )
        .outputFormat("rtsp")
    : getFfmpeg({
        stdoutLines: FFMPEG_STDOUT_LINES,
      })
        .input(input)
        .inputFormat("mjpeg")
        .inputFPS(fps)
        .withNoAudio()
        .videoCodec("libx264")
        .videoBitrate(2048, true)
        .output(
          `rtsp://localhost:${LOCAL_RTSP_SERVER_PORT}/${encode(deviceId)}`,
        )
        .outputFormat("rtsp")
        .size(`${VIDEO_STREAM_WIDTH}x${VIDEO_STREAM_HEIGHT}`)
        .outputFPS(fps)
        .addOption("-vprofile", "baseline")
        .addOption("-bufsize", "600k")
        .addOption("-pix_fmt", "yuv420p")
        .addOption("-preset", "ultrafast")
        .addOption("-deadline", "realtime")
        .addOption("-tune", "zerolatency")
        .addOption("-qmin", "0")
        .addOption("-qmax", "50")
        .addOption("-crf", "10");

  streamFfmpegCommand.on("start", commandStr => {
    log(`ffmpeg process started: ${commandStr}`);
  });

  streamFfmpegCommand.on("error", (err, stdout, stderr) => {
    log(`ffmpeg has been killed for ${deviceId}`);
    error(err);
    log("stdout", stdout);
    log("stderr", stderr);
  });

  streamFfmpegCommand.on("end", (stdout, stderr) => {
    log(`ffmpeg has ended`);
    log("stdout", stdout);
    log("stderr", stderr);
  });

  streamingInfo[deviceId].ffmpegRtspHandle = streamFfmpegCommand;

  streamFfmpegCommand.run();
  log(`ffmpeg running for ${deviceId}`);
};

export const stopFfmpegRtspStreamer = (deviceId: AnyDeviceId) => {
  console.log(`stopFfmpegRtspStreamer`);
  const { ffmpegRtspHandle } = getOrCreateStreamingInfo(deviceId);
  if (!ffmpegRtspHandle) {
    throw Error(`no ffmpeg handle exists for ${deviceId}`);
  }

  ffmpegRtspHandle.kill("SIGKILL");

  streamingInfo[deviceId].ffmpegRtspHandle = undefined;

  if (LOCAL_RTSP_CLIENT_USE_RAWVIDEO_SOURCE) {
    videoStreamUserDisconnected(deviceId, VideoStreamTypes.ffmpegRawVideo);
  }
};
