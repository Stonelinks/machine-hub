import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DEVICE_ID_NONE } from "../common/constants";
import { DeviceId } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { FfmpegVideoStreamPlayer } from "./FfmpegVideoStreamPlayer";

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

  if (deviceId === DEVICE_ID_NONE) {
    return null;
  }

  return (
    <div>
      <h3>{deviceId}</h3>
      <FfmpegVideoStreamPlayer
        deviceId={deviceId}
        enableControls={deviceId === controlsDevice}
      />
    </div>
  );
};

export default connector(VideoDeviceViewer);
