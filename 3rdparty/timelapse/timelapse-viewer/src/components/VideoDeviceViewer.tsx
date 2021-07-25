import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DEVICE_ID_NONE } from "../common/constants";
import { DeviceId } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { FfmpegVideoStreamPlayer } from "./FfmpegVideoStreamPlayer";

const mapState = (state: RootState) => ({
  captureDevices: state.api.getConfig?.value?.captureDevices,
  controlsDevice: state.api.getConfig?.value?.controlsDevice,
});

const mapDispatch = {
  onGetConfig: () => apiCall("getConfig"),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {}

type Props = PropsFromRedux & OwnProps;

const VideoDeviceViewer = ({
  captureDevices,
  controlsDevice,
  onGetConfig,
}: Props) => {
  React.useEffect(() => {
    onGetConfig();
  }, [onGetConfig]);

  return (
    <div>
      {captureDevices && captureDevices.length
        ? captureDevices.map((deviceId: DeviceId, index: number) => {
            if (deviceId === DEVICE_ID_NONE) {
              return null;
            }
            return (
              <div key={deviceId + index}>
                <h3>{deviceId}</h3>
                {/* <img
                  src={`${HTTP_BASE_URL}/stream/${encode(
                    deviceId,
                  )}/stream.mjpg`}
                  // src={`${BASE_URL}/video-device/${encode(
                  //   deviceId,
                  // )}/snapshot.jpg`}
                  style={{
                    width: "auto",
                    height: "auto",
                    maxHeight: "70vh",
                    maxWidth: "100%",
                  }}
                /> */}
                <FfmpegVideoStreamPlayer
                  deviceId={deviceId}
                  enableControls={deviceId === controlsDevice}
                />
              </div>
            );
          })
        : null}
    </div>
  );
};

export default connector(VideoDeviceViewer);
