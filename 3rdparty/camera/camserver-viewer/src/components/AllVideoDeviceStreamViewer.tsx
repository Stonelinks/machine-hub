import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { isNullDeviceId } from "../common/devices";
import { encode } from "../common/encode";
import { LocalDeviceId } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { frontendPath } from "../utils/url";
import VideoDeviceViewer from "./VideoDeviceViewer";

// tslint:disable-next-line:no-var-requires
const { Link } = require("react-location");

const mapState = (state: RootState) => ({
  captureDevices: state.api.getConfig?.value?.captureDevices,
});

const mapDispatch = {
  onGetConfig: () => apiCall("getConfig"),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {}

type Props = PropsFromRedux & OwnProps;

const AllVideoDeviceStreamViewer = ({ captureDevices, onGetConfig }: Props) => {
  React.useEffect(() => {
    onGetConfig();
  }, [onGetConfig]);

  return (
    <div>
      {captureDevices && captureDevices.length
        ? captureDevices.map((deviceId: LocalDeviceId, index: number) => {
            if (isNullDeviceId(deviceId)) {
              return null;
            }
            return (
              <div
                style={{
                  display: "inline-block",
                }}
              >
                <Link to={frontendPath(`stream/${encode(deviceId)}`)}>
                  <VideoDeviceViewer deviceId={deviceId} />
                </Link>
              </div>
            );
          })
        : null}
    </div>
  );
};

export default connector(AllVideoDeviceStreamViewer);
