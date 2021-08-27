import JMuxer from "jmuxer";
import React from "react";
import {
  VIDEO_FPS,
  VIDEO_STREAM_HEIGHT,
  VIDEO_STREAM_WIDTH,
} from "../common/constants";
import { encode } from "../common/encode";
import {
  AllVideoWebSocketMsgs,
  VideoWebSocketMsg,
  VideoWebSocketMsgTypes,
} from "../common/types";
import { WS_BASE_URL } from "../utils/api";
import VideoDeviceControl from "./VideoDeviceControl";

interface Props {
  deviceId: string;
  enableControls: boolean;
}

export class FfmpegVideoStreamPlayer extends React.Component<Props> {
  mux?: JMuxer;

  componentWillUnmount() {
    window.removeEventListener("focus", this.onFocus);
    window.removeEventListener("blur", this.onBlur);
    this.getSocket().close();
  }

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
              this.sendMessage({ type: VideoWebSocketMsgTypes.pong });
              break;

            default:
              break;
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        this.mux?.feed({
          video: new Uint8Array(event.data),
        });
      }
    });

    socket.addEventListener("error", e => {
      console.log("Socket Error", e);
    });
  };

  sendMessage = (m: AllVideoWebSocketMsgs) => {
    console.log(`FfmpegVideoStreamPlayer sending ${m.type}`);
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
    return `${WS_BASE_URL}/stream/${encode(this.props.deviceId)}/ws`;
  };

  vid: HTMLVideoElement | null = null;
  getVideoEl = () => {
    if (!this.vid) {
      this.vid = window.document.querySelector(`#${this.getPlayerId()}`);
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

  render() {
    console.log(`FfmpegVideoStreamPlayer render`);
    const { enableControls, deviceId } = this.props;
    return (
      <>
        <video
          id={this.getPlayerId()}
          autoPlay
          muted
          style={{
            width: `${VIDEO_STREAM_WIDTH}px`,
            height: `${VIDEO_STREAM_HEIGHT}px`,
          }}
        />
        {enableControls ? (
          <VideoDeviceControl
            sendMessage={this.sendMessage}
            deviceId={deviceId}
          />
        ) : null}
      </>
    );
  }
}
