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
import { HTTP_BASE_URL, WS_BASE_URL } from "../utils/api";
import VideoDeviceControl from "./VideoDeviceControl";

interface Props {
  deviceId: string;
  enableControls: boolean;
}

export class MjpegVideoStreamPlayer extends React.Component<Props> {
  mux?: JMuxer;

  componentWillUnmount() {
    this.getSocket().close();
  }

  componentDidMount = () => {
    const socket = this.getSocket();

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
      }
    });

    socket.addEventListener("error", e => {
      console.log("Socket Error", e);
    });
  };

  sendMessage = (m: AllVideoWebSocketMsgs) => {
    console.log(`MjpegVideoStreamPlayer sending ${m.type}`);
    this.getSocket()?.send(JSON.stringify(m));
  };

  getWsUrl = () => {
    return `${WS_BASE_URL}/stream/${encode(
      this.props.deviceId,
    )}/ws_controls_only`;
  };

  getMjpegVideoUrl = () => {
    return `${HTTP_BASE_URL}/stream/${encode(this.props.deviceId)}/mjpeg`;
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
    console.log(`MjpegVideoStreamPlayer render`);
    const { enableControls, deviceId } = this.props;
    return (
      <>
        <img
          style={{
            width: `${VIDEO_STREAM_WIDTH}px`,
            height: `${VIDEO_STREAM_HEIGHT}px`,
          }}
          src={this.getMjpegVideoUrl()}
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
