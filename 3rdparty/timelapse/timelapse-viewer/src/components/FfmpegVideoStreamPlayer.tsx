import _ from "lodash";
import React from "react";
import { VIDEO_STREAM_HEIGHT, VIDEO_STREAM_WIDTH } from "../common/constants";
import { MILLISECONDS_IN_SECOND } from "../common/time";

// tslint:disable-next-line:no-var-requires
const JSMpeg = require("@cycjimmy/jsmpeg-player");

interface Props {
  videoUrl: string;
}

export class FfmpegVideoStreamPlayer extends React.Component<Props> {
  heartBeatInterval?: NodeJS.Timeout;
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
        // hooks: {
        //   play: () => {
        //     const socket = this.getSocket();
        //     this.heartBeatInterval = setInterval(() => {
        //       socket.send(WebSocketVideoMessageTypes.heartbeat);
        //     }, 30 * MILLISECONDS_IN_SECOND);
        //     socket.send(WebSocketVideoMessageTypes.play);
        //   },
        //   pause: () => {
        //     this.getSocket().send(WebSocketVideoMessageTypes.pause)
        //   },
        //   stop: () => {
        //     this.getSocket().send(WebSocketVideoMessageTypes.stop)
        //   },
        //   load: () => {
        //     this.getSocket().send(WebSocketVideoMessageTypes.load)
        //   },
        // },
      },
      {},
    );
  }, MILLISECONDS_IN_SECOND);

  componentWillUnmount() {
    if (this.heartBeatInterval) {
      clearTimeout(this.heartBeatInterval);
    }
  }

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
