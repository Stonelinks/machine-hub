import { Application } from "express-ws";
import { deflateRaw } from "pako";
import * as ws from "ws";
import {
  NO_CACHE_HEADER,
  WS_COMPRESSION_ENABLED,
  WS_PING_INTERVAL_MS,
} from "../common/constants";
import { isLocalDeviceType } from "../common/devices";
import { decode } from "../common/encode";
import { now } from "../common/time";
import {
  AllVideoWebSocketMsgs,
  VideoStreamTypes,
  VideoWebSocketMsgTypes,
} from "../common/types";
import {
  getOrCreateFfmpegRawVideoFrameEmitter,
  getOrCreateStreamingInfo,
  startFfmpegRawVideoStreamer,
  stopFfmpegRawVideoStreamer,
  videoStreamUserConnected,
  videoStreamUserDisconnected,
} from "../utils/streaming";
import {
  getOrCreateCameraDevice,
  getZoomRelativeControl,
  moveAxisSpeedStart,
  moveAxisSpeedStop,
  start,
  takeSnapshot,
} from "../utils/videoDevices";

export const streamingRoutes = async (app: Application) => {
  app.get("/stream/:deviceId/snapshot", async (req, res) => {
    res.set("Cache-Control", NO_CACHE_HEADER);
    const deviceId = decode(req.params.deviceId);
    const data = await takeSnapshot(deviceId);
    res.send(data);
  });

  app.get("/stream/:deviceId/mjpeg", async (req, res) => {
    const deviceId = decode(req.params.deviceId);
    await start(deviceId);
    videoStreamUserConnected(deviceId, VideoStreamTypes.mjpeg);
    res.writeHead(200, {
      "Cache-Control": NO_CACHE_HEADER,
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

  app.ws("/stream/:deviceId/ws", async (socket, req) => {
    const deviceId = decode(req.params.deviceId);
    const log = (...args: any[]) => console.log("ws", deviceId, ...args);
    const err = (...args: any[]) => console.error("ws", deviceId, ...args);
    const send = (m: Buffer | AllVideoWebSocketMsgs) => {
      if (Buffer.isBuffer(m)) {
        if (WS_COMPRESSION_ENABLED) {
          const d = deflateRaw(m);
          socket.send(d);
        } else {
          socket.send(m);
        }
      } else {
        const msgStr = JSON.stringify(m);
        log(`send ${msgStr}`);
        socket.send(msgStr);
      }
    };
    log(`open`);
    videoStreamUserConnected(deviceId, VideoStreamTypes.ffmpegRawVideo);
    const { ffmpegRawVideoHandle } = getOrCreateStreamingInfo(deviceId);
    if (!ffmpegRawVideoHandle) {
      await startFfmpegRawVideoStreamer(deviceId);
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

    getOrCreateFfmpegRawVideoFrameEmitter(deviceId).on("data", listener);
    socket.on("close", () => {
      log(`close`);
      videoStreamUserDisconnected(deviceId, VideoStreamTypes.ffmpegRawVideo);
      getOrCreateFfmpegRawVideoFrameEmitter(deviceId).removeListener(
        "data",
        listener,
      );
      clearInterval(pingInterval);
    });

    socket.on("message", m => {
      log(`received ${m}`);
      try {
        const p = JSON.parse((m as unknown) as string);
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
        if (isLocalDeviceType(deviceId)) {
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

  app.ws("/stream/:deviceId/ws_controls_only", async (socket, req) => {
    const deviceId = decode(req.params.deviceId);
    const log = (...args: any[]) =>
      console.log("ws_controls_only", deviceId, ...args);
    const err = (...args: any[]) =>
      console.error("ws_controls_only", deviceId, ...args);
    const send = (m: Buffer | AllVideoWebSocketMsgs) => {
      if (Buffer.isBuffer(m)) {
        socket.send(m);
      } else {
        const msgStr = JSON.stringify(m);
        log(`send ${msgStr}`);
        socket.send(msgStr);
      }
    };
    log(`open`);
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

    socket.on("close", () => {
      log(`close`);
      clearInterval(pingInterval);
    });

    socket.on("message", m => {
      log(`received ${m}`);
      try {
        const p = JSON.parse((m as unknown) as string);
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

  app.ws("/stream/:deviceId/ws_proxy", async (upstreamWs, req) => {
    const deviceId = decode(req.params.deviceId);
    // wildly unsafe if the URL is malformed
    const origDeviceId = decode(deviceId.split("/").slice(-2, -1)[0]);
    const origHost = deviceId.split("//")[1].split("/")[0];

    const log = (...args: any[]) =>
      console.log("ws_proxy", origHost, origDeviceId, deviceId, ...args);
    const err = (...args: any[]) =>
      console.error("ws_proxy", deviceId, ...args);

    const sendUpstream = (e: ws.MessageEvent) => {
      if (Buffer.isBuffer(e.data)) {
        upstreamWs.send(e.data);
      } else {
        log("sending upstream", e.data);
        upstreamWs.send(e.data);
      }
    };

    // device id is just a websocket URL to where we wanna proxy
    const downstreamWs = new ws.WebSocket(deviceId);

    const sendDownstream = (m: string) => {
      log("sending downstream", m);
      downstreamWs.send(m);
    };

    downstreamWs.onmessage = e => {
      // just proxy everything upstream
      sendUpstream(e);
    };

    downstreamWs.on("error", e => {
      err("downstream ws socket Error", e);
    });

    downstreamWs.on("close", () => {
      log(`downstream ws close, closing upstream as well`);
      upstreamWs.close();
    });

    upstreamWs.on("close", () => {
      log(`upstream ws close, closing downstream as well`);
      downstreamWs.close();
    });

    upstreamWs.on("message", m => {
      log(`received from upstream ${m}`);
      sendDownstream((m as unknown) as string);
      // TODO: for payloads with device IDs, need to rewrite what device its for and send it downstream

      // try {
      //   const p = JSON.parse(m as string) as AllVideoWebSocketMsgs;

      //   // if (p.deviceId) {
      //   //   p.deviceId = origEncodedDeviceId;
      //   // }

      // } catch (e) {
      //   err("received message from upstream that isn't JSON?");
      //   err(e.stack);
      // }
    });
  });
};
