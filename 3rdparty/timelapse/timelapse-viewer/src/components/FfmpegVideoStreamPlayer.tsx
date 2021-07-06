import _ from "lodash";
import React from "react";
import { VIDEO_STREAM_HEIGHT, VIDEO_STREAM_WIDTH } from "../common/constants";
import { MILLISECONDS_IN_SECOND } from "../common/time";
import { WebSocketVideoMessageTypes } from "../common/types";

// tslint:disable-next-line:no-var-requires
const JSMpeg = require("@cycjimmy/jsmpeg-player");

interface Props {
  videoUrl: string;
}

export class FfmpegVideoStreamPlayer extends React.Component<Props> {
  constructor(props: Props) {
    super(props);

    this.els = {
      videoWrapper: null,
    };
  }

  video: any;
  els: any;

  getSocket = (): WebSocket => {
    return this.video.player.source.socket;
  };

  componentDidMount = _.debounce(() => {
    console.log(`FfmpegVideoStreamPlayer componentDidMount`);
    // Reference documentation, pay attention to the order of parameters.
    // https://github.com/cycjimmy/jsmpeg-player#usage
    this.video = new JSMpeg.VideoElement(
      this.els.videoWrapper,
      this.props.videoUrl,
      {
        audio: false,
        hooks: {
          play: () => {
            console.log("FfmpegVideoStreamPlayer: play hook");
            this.getSocket().send(WebSocketVideoMessageTypes.play);
          },
          pause: () => {
            console.log("FfmpegVideoStreamPlayer: pause hook");
            this.getSocket().send(WebSocketVideoMessageTypes.pause);
          },
          stop: () => {
            console.log("FfmpegVideoStreamPlayer: stop hook");
            this.getSocket().send(WebSocketVideoMessageTypes.stop);
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
    return (
      <div
        style={{
          width: `${VIDEO_STREAM_WIDTH}px`,
          height: `${VIDEO_STREAM_HEIGHT}px`,
        }}
        ref={videoWrapper => (this.els.videoWrapper = videoWrapper)}
      />
    );
  }
}
