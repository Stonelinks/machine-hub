import JMuxer from "jmuxer";
import { inflateRaw } from "pako";
import React from "react";
import {
  VIDEO_FPS,
  VIDEO_STREAM_HEIGHT,
  VIDEO_STREAM_WIDTH,
  WS_COMPRESSION_ENABLED,
} from "../common/constants";
import { isRemoteWsProxyDeviceType } from "../common/devices";
import { encode } from "../common/encode";
import { now } from "../common/time";
import {
  AllVideoWebSocketMsgs,
  PingPayload,
  VideoWebSocketMsg,
  VideoWebSocketMsgTypes,
} from "../common/types";
import { WS_BASE_URL } from "../utils/api";
import VideoDeviceControl from "./VideoDeviceControl";

// tslint:disable-next-line:no-var-requires
const canvasToImage = require("canvas-to-image");

interface Props {
  deviceId: string;
  enableControls: boolean;
}

interface State {
  lastLagMs: number;
}

export class FfmpegVideoStreamPlayer extends React.Component<Props, State> {
  mux?: JMuxer;

  state = {
    lastLagMs: 0,
  };

  componentWillUnmount = () => {
    window.removeEventListener("focus", this.onFocus);
    window.removeEventListener("blur", this.onBlur);
    this.getSocket().close();
  };

  componentDidMount = () => {
    window.addEventListener("focus", this.onFocus);
    window.addEventListener("blur", this.onBlur);

    const socket = this.getSocket();

    this.mux = new JMuxer({
      node: this.getPlayerId(),
      mode: "video",
      flushingTime: 0,
      fps: VIDEO_FPS,
      debug: false,
    });

    socket.addEventListener("message", event => {
      if (typeof event.data === "string") {
        try {
          const m = JSON.parse(event.data) as VideoWebSocketMsg;
          switch (m.type) {
            case VideoWebSocketMsgTypes.ping:
              this.sendMessage({
                type: VideoWebSocketMsgTypes.pong,
                msg: {
                  ts: now(),
                },
              });
              this.setState({
                lastLagMs: (m.msg as PingPayload).lastLagMs as number,
              });
              break;
            default:
              break;
          }
        } catch (e) {
          this.log(e);
        }
      } else {
        if (WS_COMPRESSION_ENABLED) {
          this.mux?.feed({
            video: inflateRaw(event.data),
          });
        } else {
          this.mux?.feed({
            video: new Uint8Array(event.data),
          });
        }
      }
    });

    socket.addEventListener("error", e => {
      this.log("Socket Error", e);
    });
  };

  log = (...args: any[]) => {
    console.log(`FfmpegVideoStreamPlayer ${this.props.deviceId}`, ...args);
  };

  sendMessage = (m: AllVideoWebSocketMsgs) => {
    this.log(`sending ${m.type}`);
    this.getSocket()?.send(JSON.stringify(m));
  };

  onFocus = () => {
    this.sendMessage({ type: VideoWebSocketMsgTypes.play });
    this.playVideo();
  };

  onBlur = () => {
    this.sendMessage({ type: VideoWebSocketMsgTypes.pause });
    this.pauseVideo();
  };

  getPlayerId = () => {
    return `player-${encode(this.props.deviceId)}`;
  };

  getWsUrl = () => {
    const isProxy = isRemoteWsProxyDeviceType(this.props.deviceId);
    return `${WS_BASE_URL}/stream/${encode(this.props.deviceId)}/${
      isProxy ? "ws_proxy" : "ws"
    }`;
  };

  vid: HTMLVideoElement | null = null;
  getVideoEl = () => {
    if (!this.vid) {
      this.vid = window.document.getElementById(
        this.getPlayerId(),
      ) as HTMLVideoElement | null;
    }
    return this.vid;
  };

  playVideo = () => {
    const vid = this.getVideoEl();
    if (vid) {
      vid.play();

      // old skipahead logic i'll keep around if we ever need it
      // if (this.vid) {
      //   this.vid.addEventListener("timeupdate", (event: Event) => {
      //     const video = event.currentTarget as HTMLMediaElement;
      //     const curTime = video.currentTime;
      //     const lastBuff = video.buffered.length;
      //     if (lastBuff === 0) return;
      //     const curEnd = video.buffered.end(lastBuff - 1);

      //     if (curEnd - curTime > 3) {
      //       video.currentTime = curEnd - 1.3;
      //       console.log("skipped ahead");
      //     }
      //   });
      // }
    }
  };

  pauseVideo = () => {
    const vid = this.getVideoEl();
    if (vid) {
      vid.pause();
    }
  };

  socket?: WebSocket;
  getSocket = (): WebSocket => {
    if (!this.socket) {
      this.socket = new WebSocket(this.getWsUrl());
      this.socket.binaryType = "arraybuffer";
    }
    return this.socket;
  };

  captureScreenFrame = () => {
    const vid = this.getVideoEl();

    if (vid) {
      const w = vid.videoWidth;
      const h = vid.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(vid, 0, 0, w, h);

        canvasToImage(canvas, {
          name: `frame-${now()}`,
          type: "png",
          quality: 1,
        });
      }
    }
  };

  render = () => {
    this.log(`render`);
    const { enableControls, deviceId } = this.props;
    return (
      <div>
        <video
          id={this.getPlayerId()}
          autoPlay
          muted
          style={{
            width: `${VIDEO_STREAM_WIDTH}px`,
            height: `${VIDEO_STREAM_HEIGHT}px`,
          }}
        />
        <div>
          <pre
            style={{
              display: "inline-block",
            }}
          >{`lag (ms): ${this.state.lastLagMs}`}</pre>
          <a
            style={{
              marginLeft: "10px",
              display: "inline-block",
              backgroundColor: "lightgrey",
              paddingLeft: "4px",
              paddingRight: "4px",
              cursor: "pointer",
            }}
            onClick={this.captureScreenFrame}
          >
            capture
          </a>
        </div>
        {enableControls ? (
          <VideoDeviceControl
            sendMessage={this.sendMessage}
            deviceId={deviceId}
          />
        ) : null}
      </div>
    );
  };
}
