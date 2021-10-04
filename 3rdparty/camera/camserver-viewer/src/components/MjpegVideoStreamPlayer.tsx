import JMuxer from "jmuxer";
import React from "react";
import { VIDEO_STREAM_HEIGHT, VIDEO_STREAM_WIDTH } from "../common/constants";
import { encode } from "../common/encode";
import { now } from "../common/time";
import {
  AllVideoWebSocketMsgs,
  PingPayload,
  VideoWebSocketMsg,
  VideoWebSocketMsgTypes,
} from "../common/types";
import { HTTP_BASE_URL, WS_BASE_URL } from "../utils/api";
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

export class MjpegVideoStreamPlayer extends React.Component<Props, State> {
  mux?: JMuxer;

  state = {
    lastLagMs: 0,
  };

  componentWillUnmount = () => {
    this.getSocket()?.close();
  };

  componentDidMount = () => {
    const socket = this.getSocket();

    if (socket) {
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
            console.error(e);
          }
        }
      });

      socket.addEventListener("error", e => {
        console.log("Socket Error", e);
      });
    }
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
  getSocket = () => {
    if (this.props.enableControls && !this.socket) {
      this.socket = new WebSocket(this.getWsUrl());
      this.socket.binaryType = "arraybuffer";
    }
    return this.socket;
  };

  getImgId = () => `img-${encode(this.props.deviceId)}`;

  captureScreenFrame = () => {
    const img = document.getElementById(this.getImgId()) as HTMLImageElement;
    img.setAttribute("crossorigin", "anonymous");

    if (img) {
      const w = img.width;
      const h = img.height;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);

        canvasToImage(canvas, {
          name: `frame-${now()}`,
          type: "png",
          quality: 1,
        });
      }
    }
  };

  render = () => {
    console.log(`MjpegVideoStreamPlayer render`);
    const { enableControls, deviceId } = this.props;
    return (
      <div>
        <img
          id={this.getImgId()}
          style={{
            width: `${VIDEO_STREAM_WIDTH}px`,
            height: `${VIDEO_STREAM_HEIGHT}px`,
          }}
          src={this.getMjpegVideoUrl()}
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
