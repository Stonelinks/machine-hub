import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { isLocalDeviceType, isNullDeviceId } from "../common/devices";
import { AnyDeviceId, VideoStreamTypes } from "../common/types";
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
  deviceId: AnyDeviceId;
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
    VideoStreamTypes.ffmpegRawVideo,
  );
  const onToggleVideoStreamType = () => {
    switch (videoStreamType) {
      case VideoStreamTypes.ffmpegRawVideo:
        setVideoStreamType(VideoStreamTypes.mjpeg);
        break;
      case VideoStreamTypes.mjpeg:
        setVideoStreamType(VideoStreamTypes.ffmpegRawVideo);
        break;
      default:
        break;
    }
  };

  if (isNullDeviceId(deviceId)) {
    return null;
  }

  let VideoStreamComponent = null;
  switch (videoStreamType) {
    case VideoStreamTypes.ffmpegRawVideo:
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
        <pre
          style={{
            display: "inline-block",
          }}
        >
          {deviceId}
        </pre>
        {isLocalDeviceType(deviceId) ? (
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
              videoStreamType === VideoStreamTypes.ffmpegRawVideo
                ? VideoStreamTypes.mjpeg
                : VideoStreamTypes.ffmpegRawVideo
            }`}
          </a>
        ) : null}
      </div>
      {VideoStreamComponent}
    </div>
  );
};

export default connector(VideoDeviceViewer);
