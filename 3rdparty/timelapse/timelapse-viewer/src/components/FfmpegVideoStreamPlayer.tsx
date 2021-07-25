import _ from "lodash";
import React from "react";
import { VIDEO_STREAM_HEIGHT, VIDEO_STREAM_WIDTH } from "../common/constants";
import { MILLISECONDS_IN_SECOND } from "../common/time";
import { AllWebsocketMsgs, WebSocketVideoMessageTypes } from "../common/types";
import { encode } from "../common/encode";
import { WS_BASE_URL } from "../utils/api";
import VideoDeviceControl from "./VideoDeviceControl";

// tslint:disable-next-line:no-var-requires
const JSMpeg = require("@cycjimmy/jsmpeg-player");

interface Props {
  deviceId: string;
  enableControls: boolean;
}

export class FfmpegVideoStreamPlayer extends React.Component<Props> {
  constructor(props: Props) {
    super(props);

    this.els = {
      videoWrapper: null,
    };
  }

  video?: any;
  els: any;

  getVideoUrl = () => {
    return `${WS_BASE_URL}/stream/${encode(this.props.deviceId)}/ffmpeg.ws`;
  };

  getSocket = (): WebSocket | undefined => {
    return this.video?.player.source.socket;
  };

  sendMessage = (m: AllWebsocketMsgs) => {
    console.log(`FfmpegVideoStreamPlayer sending ${m.type}`);
    this.getSocket()?.send(JSON.stringify(m));
  };

  componentDidMount = _.debounce(() => {
    // Reference documentation, pay attention to the order of parameters.
    // https://github.com/cycjimmy/jsmpeg-player#usage
    this.video = new JSMpeg.VideoElement(
      this.els.videoWrapper,
      this.getVideoUrl(),
      {
        audio: false,
        hooks: {
          play: () => {
            this.sendMessage({ type: WebSocketVideoMessageTypes.play });
          },
          pause: () => {
            this.sendMessage({ type: WebSocketVideoMessageTypes.pause });
          },
          stop: () => {
            this.sendMessage({ type: WebSocketVideoMessageTypes.stop });
          },
        },
      },
      {},
    );
  }, MILLISECONDS_IN_SECOND);

  play() {
    console.log(`FfmpegVideoStreamPlayer play`);
    this.video.play();
  }

  pause() {
    console.log(`FfmpegVideoStreamPlayer pause`);
    this.video.pause();
  }

  stop() {
    console.log(`FfmpegVideoStreamPlayer stop`);
    this.video.stop();
  }

  destroy() {
    console.log(`FfmpegVideoStreamPlayer destroy`);
    this.video.destroy();
  }

  render() {
    console.log(`FfmpegVideoStreamPlayer render`);
    const { enableControls, deviceId } = this.props;
    return (
      <>
        <div
          style={{
            width: `${VIDEO_STREAM_WIDTH}px`,
            height: `${VIDEO_STREAM_HEIGHT}px`,
          }}
          ref={videoWrapper => (this.els.videoWrapper = videoWrapper)}
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
