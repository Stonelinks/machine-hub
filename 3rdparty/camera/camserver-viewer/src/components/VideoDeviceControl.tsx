import throttle from "lodash.throttle";
import * as mousetrap from "mousetrap";
import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { MILLISECONDS_IN_SECOND } from "../common/time";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import RenderIfPtzEnabled from "../utils/RenderIfPtzEnabled";
import {
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaMinus,
} from "react-icons/fa";
import {
  AllVideoWebSocketMsgs,
  LocalDeviceId,
  VideoWebSocketMsgTypes,
} from "../common/types";

interface OwnProps {
  deviceId: LocalDeviceId;
  sendMessage: (m: AllVideoWebSocketMsgs) => void;
}

type Props = OwnProps;

interface State {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  in: boolean;
  out: boolean;
}

type KeyOrMouseEvent = any;
// | KeyboardEvent
// TODO why doesn't below work?
// | MouseEvent<HTMLButtonElement, MouseEvent>;

class VideoDeviceControl extends React.Component<Props, State> {
  panLeftStart: (e: KeyOrMouseEvent) => void;
  panLeftEnd: (e: KeyOrMouseEvent) => void;
  panRightStart: (e: KeyOrMouseEvent) => void;
  panRightEnd: (e: KeyOrMouseEvent) => void;
  tiltUpStart: (e: KeyOrMouseEvent) => void;
  tiltUpEnd: (e: KeyOrMouseEvent) => void;
  tiltDownStart: (e: KeyOrMouseEvent) => void;
  tiltDownEnd: (e: KeyOrMouseEvent) => void;
  zoomIn: any;
  zoomOut: any;

  constructor(props: Props) {
    super(props);

    this.state = {
      left: false,
      right: false,
      up: false,
      down: false,
      in: false,
      out: false,
    };

    this.panLeftStart = this.makeKeyDownHandler("pan", "left");
    this.panLeftEnd = this.makeKeyUpHandler("pan", "left");
    this.panRightStart = this.makeKeyDownHandler("pan", "right");
    this.panRightEnd = this.makeKeyUpHandler("pan", "right");
    this.tiltUpStart = this.makeKeyDownHandler("tilt", "up");
    this.tiltUpEnd = this.makeKeyUpHandler("tilt", "up");
    this.tiltDownStart = this.makeKeyDownHandler("tilt", "down");
    this.tiltDownEnd = this.makeKeyUpHandler("tilt", "down");
    this.zoomIn = this.makeZoomHandler("in");
    this.zoomOut = this.makeZoomHandler("out");
  }

  makeKeyDownHandler = (
    axis: "pan" | "tilt",
    direction: "left" | "right" | "up" | "down",
  ) => {
    return (e: KeyOrMouseEvent) => {
      e.preventDefault();
      if (!this.state[direction]) {
        const { sendMessage, deviceId } = this.props;
        console.log("start", axis, direction);
        sendMessage({
          type: VideoWebSocketMsgTypes.speedControlStart,
          msg: { deviceId, axis, direction },
        });
        (this.setState as any)({ [direction]: true });
      }
    };
  };

  makeKeyUpHandler = (
    axis: "pan" | "tilt",
    direction: "left" | "right" | "up" | "down",
  ) => {
    return (e: KeyOrMouseEvent) => {
      e.preventDefault();
      const { sendMessage, deviceId } = this.props;
      console.log("stop", axis);
      sendMessage({
        type: VideoWebSocketMsgTypes.speedControlStop,
        msg: { deviceId, axis },
      });
      (this.setState as any)({ [direction]: false });
    };
  };

  makeZoomHandler = (direction: "in" | "out") => {
    return throttle(() => {
      const { sendMessage, deviceId } = this.props;
      sendMessage({
        type: VideoWebSocketMsgTypes.zoomControl,
        msg: { deviceId, direction },
      });
      (this.setState as any)({ [direction]: true });
      setTimeout(() => {
        (this.setState as any)({ [direction]: false });
      }, 0.5 * MILLISECONDS_IN_SECOND);
      console.log("zoom", direction);
    }, 0.1 * MILLISECONDS_IN_SECOND);
  };

  componentDidMount() {
    mousetrap.bind("left", this.panLeftStart, "keydown");
    mousetrap.bind("left", this.panLeftEnd, "keyup");
    mousetrap.bind("right", this.panRightStart, "keydown");
    mousetrap.bind("right", this.panRightEnd, "keyup");
    mousetrap.bind("up", this.tiltUpStart, "keydown");
    mousetrap.bind("up", this.tiltUpEnd, "keyup");
    mousetrap.bind("down", this.tiltDownStart, "keydown");
    mousetrap.bind("down", this.tiltDownEnd, "keyup");
    mousetrap.bind("a", this.panLeftStart, "keydown");
    mousetrap.bind("a", this.panLeftEnd, "keyup");
    mousetrap.bind("d", this.panRightStart, "keydown");
    mousetrap.bind("d", this.panRightEnd, "keyup");
    mousetrap.bind("w", this.tiltUpStart, "keydown");
    mousetrap.bind("w", this.tiltUpEnd, "keyup");
    mousetrap.bind("s", this.tiltDownStart, "keydown");
    mousetrap.bind("s", this.tiltDownEnd, "keyup");

    mousetrap.bind("q", this.zoomIn);
    mousetrap.bind("e", this.zoomOut);
    mousetrap.bind("+", this.zoomIn);
    mousetrap.bind("-", this.zoomOut);
    mousetrap.bind("=", this.zoomIn);
  }

  componentWillUnmount() {
    mousetrap.unbind("q");
    mousetrap.unbind("e");
    mousetrap.bind("+", this.zoomIn);
    mousetrap.bind("=", this.zoomIn);
    mousetrap.bind("-", this.zoomOut);

    mousetrap.unbind("left");
    mousetrap.unbind("right");
    mousetrap.unbind("up");
    mousetrap.unbind("down");
    mousetrap.unbind("a");
    mousetrap.unbind("d");
    mousetrap.unbind("w");
    mousetrap.unbind("s");
  }

  render() {
    return (
      <table>
        <tr>
          <td></td>
          <td>
            <button
              style={{
                backgroundColor: `${this.state.up ? "" : "light"}gray`,
              }}
              onMouseDown={this.tiltUpStart}
              onMouseUp={this.tiltUpEnd}
            >
              <FaChevronUp />
            </button>
          </td>
          <td></td>
          <td></td>
          <td></td>
          <td>
            <button
              style={{
                backgroundColor: `${this.state.in ? "" : "light"}gray`,
              }}
              onMouseDown={this.zoomIn}
            >
              <FaPlus />
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <button
              style={{
                backgroundColor: `${this.state.left ? "" : "light"}gray`,
              }}
              onMouseDown={this.panLeftStart}
              onMouseUp={this.panLeftEnd}
            >
              <FaChevronLeft />
            </button>
          </td>
          <td>
            <button
              style={{
                backgroundColor: `${this.state.down ? "" : "light"}gray`,
              }}
              onMouseDown={this.tiltDownStart}
              onMouseUp={this.tiltDownEnd}
            >
              <FaChevronDown />
            </button>
          </td>
          <td>
            <button
              style={{
                backgroundColor: `${this.state.right ? "" : "light"}gray`,
              }}
              onMouseDown={this.panRightStart}
              onMouseUp={this.panRightEnd}
            >
              <FaChevronRight />
            </button>
          </td>
          <td></td>
          <td></td>
          <td>
            <button
              style={{
                backgroundColor: `${this.state.out ? "" : "light"}gray`,
              }}
              onMouseDown={this.zoomOut}
            >
              <FaMinus />
            </button>
          </td>
        </tr>
      </table>
    );
  }
}

const VideoDeviceWrapperControl = (origProps: OwnProps) => {
  return (
    <RenderIfPtzEnabled
      WrappedComponent={() => <VideoDeviceControl {...origProps} />}
    />
  );
};

export default VideoDeviceWrapperControl;
