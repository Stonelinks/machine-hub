import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { RootState } from "../redux";
import { HTTP_BASE_URL, fillInUrlTemplate, WS_BASE_URL } from "../utils/api";
import { MILLISECONDS_IN_SECOND } from "../common/time";
import { frontendPath, navigate } from "../utils/url";
import { encode } from "../common/encode";

interface Props {
  captureId: string;
  deviceId?: string;
}

interface State {
  log: string;
}

export default class CreateTimelapsePage extends React.Component<Props, State> {
  socket?: WebSocket;
  constructor(props: Props) {
    super(props);
    const { captureId, deviceId } = props;
    this.state = {
      log: `Timelapse creation log for ${captureId}${
        deviceId ? " captured with " + deviceId : ""
      }`,
    };
  }

  appendLog = (m: string) => {
    this.setState({ log: this.state.log + "\n" + m });
    window.scrollTo(0, document.body.scrollHeight);
  };

  componentDidMount() {
    const { captureId, deviceId } = this.props;
    const delayMs = window.prompt("Enter frame delay (ms)", "1000");

    let urlTemplate = `${WS_BASE_URL}/timelapse/capture/:captureId/create/:delayMs`;
    if (deviceId) {
      urlTemplate += `/device/:deviceId`;
    }
    const url = fillInUrlTemplate(urlTemplate, {
      captureId,
      delayMs,
      deviceId,
    });

    this.socket = new WebSocket(url);

    this.socket.addEventListener("message", event => {
      this.appendLog(event.data);
    });

    this.socket.addEventListener("error", e => {
      this.appendLog("Socket Error: " + e);
    });

    this.socket.addEventListener("close", e => {
      this.appendLog("closed");

      setTimeout(() => {
        navigate(frontendPath(`capture/${encode(captureId)}`));
      }, 2 * MILLISECONDS_IN_SECOND);
    });
  }

  componentWillUnmount() {
    this.socket?.close();
  }

  render() {
    return <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.log}</pre>;
  }
}
