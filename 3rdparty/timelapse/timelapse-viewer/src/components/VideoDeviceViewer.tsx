import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DEVICE_ID_NONE } from "../common/constants";
import { DeviceId, VideoStreamTypes } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { FfmpegVideoStreamPlayer } from "./FfmpegVideoStreamPlayer";
import { MjpegVideoStreamPlayer } from "./MjpegVideoStreamPlayer";

const mapState = (state: RootState) => ({
  controlsDevice: state.api.getConfig?.value?.controlsDevice,
});

const mapDispatch = {
  onGetConfig: () => apiCall("getConfig"),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {
  deviceId: DeviceId;
}

type Props = PropsFromRedux & OwnProps;

const VideoDeviceViewer = ({
  deviceId,
  controlsDevice,
  onGetConfig,
}: Props) => {
  React.useEffect(() => {
    onGetConfig();
  }, [onGetConfig]);

  const [videoStreamType, setVideoStreamType] = React.useState(
    VideoStreamTypes.ffmpeg,
  );
  const onToggleVideoStreamType = () => {
    switch (videoStreamType) {
      case VideoStreamTypes.ffmpeg:
        setVideoStreamType(VideoStreamTypes.mjpeg);
        break;
      case VideoStreamTypes.mjpeg:
        setVideoStreamType(VideoStreamTypes.ffmpeg);
        break;
      default:
        break;
    }
  };

  if (deviceId === DEVICE_ID_NONE) {
    return null;
  }

  let VideoStreamComponent = null;
  switch (videoStreamType) {
    case VideoStreamTypes.ffmpeg:
      VideoStreamComponent = (
        <FfmpegVideoStreamPlayer
          deviceId={deviceId}
          enableControls={deviceId === controlsDevice}
        />
      );
      break;
    case VideoStreamTypes.mjpeg:
      VideoStreamComponent = (
        <MjpegVideoStreamPlayer
          deviceId={deviceId}
          enableControls={deviceId === controlsDevice}
        />
      );
      break;
    default:
      break;
  }

  return (
    <div>
      <div>
        <h3 style={{ display: "inline-block" }}>{deviceId}</h3>
        <a
          style={{
            marginLeft: "10px",
            backgroundColor: "lightgrey",
            paddingLeft: "4px",
            paddingRight: "4px",
            cursor: "pointer",
          }}
          onClick={onToggleVideoStreamType}
        >
          {`click to use ${
            videoStreamType === VideoStreamTypes.ffmpeg
              ? VideoStreamTypes.mjpeg
              : VideoStreamTypes.ffmpeg
          }`}
        </a>
      </div>
      {VideoStreamComponent}
    </div>
  );
};

export default connector(VideoDeviceViewer);
