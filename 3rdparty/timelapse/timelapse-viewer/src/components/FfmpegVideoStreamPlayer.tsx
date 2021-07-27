import _ from "lodash";
import React from "react";
import { VIDEO_STREAM_HEIGHT, VIDEO_STREAM_WIDTH } from "../common/constants";
import { MILLISECONDS_IN_SECOND } from "../common/time";
import { AllWebsocketMsgs, WebSocketVideoMessageTypes } from "../common/types";
import { encode } from "../common/encode";
import { WS_BASE_URL } from "../utils/api";
import VideoDeviceControl from "./VideoDeviceControl";
import JMuxer from "jmuxer";

interface Props {
  deviceId: string;
  enableControls: boolean;
}

export class FfmpegVideoStreamPlayer extends React.Component<Props> {
  mux?: JMuxer;

  componentWillUnmount() {
    window.removeEventListener("focus", this.onFocus);
    window.removeEventListener("blur", this.onBlur);
  }

  componentDidMount = _.debounce(() => {
    window.addEventListener("focus", this.onFocus);
    window.addEventListener("blur", this.onBlur);

    const socket = this.getSocket();

    this.mux = new JMuxer({
      node: this.getPlayerId(),
      mode: "video",
      flushingTime: 50,
      fps: 30, // TODO hardcoded for now, maybe have this get set by the server?
      debug: false,
    });

    socket.addEventListener("message", event => {
      this.mux?.feed({
        video: new Uint8Array(event.data),
      });
    });

    socket.addEventListener("error", e => {
      console.log("Socket Error", e);
    });
  }, MILLISECONDS_IN_SECOND);

  sendMessage = (m: AllWebsocketMsgs) => {
    console.log(`FfmpegVideoStreamPlayer sending ${m.type}`);
    this.getSocket()?.send(JSON.stringify(m));
  };

  onFocus = () => {
    this.sendMessage({ type: WebSocketVideoMessageTypes.play });
    this.playVideo();
  };

  onBlur = () => {
    this.sendMessage({ type: WebSocketVideoMessageTypes.pause });
    this.pauseVideo();
  };

  getPlayerId = () => {
    return `player-${encode(this.props.deviceId)}`;
  };

  getVideoUrl = () => {
    return `${WS_BASE_URL}/stream/${encode(this.props.deviceId)}/ffmpeg.ws`;
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
      this.socket = new WebSocket(this.getVideoUrl());
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
