import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { RootState } from "../redux";
import { HTTP_BASE_URL, fillInUrlTemplate } from "../utils/api";
import { MILLISECONDS_IN_SECOND } from "../common/time";
import { frontendPath, navigate } from "../utils/url";
import { encode } from "../common/encode";

const mapState = (state: RootState) => ({});

const mapDispatch = {};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {
  captureId: string;
  deviceId?: string;
}

type Props = PropsFromRedux & OwnProps;

const CreateTimelapsePage = ({ captureId, deviceId }: Props) => {
  const [response, setResponse] = React.useState(
    `Timelapse creation log for ${captureId}${
      deviceId ? " captured with " + deviceId : ""
    }`,
  );

  React.useEffect(() => {
    const delayMs = window.prompt("Enter frame delay (ms)", "1000");

    let urlTemplate = `${HTTP_BASE_URL}/timelapse/capture/:captureId/create/:delayMs`;
    if (deviceId) {
      urlTemplate += `/device/:deviceId`;
    }
    const url = fillInUrlTemplate(urlTemplate, {
      captureId,
      delayMs,
      deviceId,
    });

    const xhr = new XMLHttpRequest();
    xhr.responseType = "text";

    xhr.onload = () => {
      setResponse(xhr.response);
      setTimeout(() => {
        navigate(frontendPath(`capture/${encode(captureId)}`));
      }, 2 * MILLISECONDS_IN_SECOND);
    };
    xhr.onprogress = () => {
      setResponse(xhr.response);
    };

    xhr.open("GET", url, true);
    xhr.send();
  }, [setResponse, captureId, deviceId]);

  return <pre style={{ whiteSpace: "pre-wrap" }}>{response}</pre>;
};

export default CreateTimelapsePage;
