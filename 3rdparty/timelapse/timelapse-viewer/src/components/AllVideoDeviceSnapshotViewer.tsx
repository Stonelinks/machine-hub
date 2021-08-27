import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DEVICE_ID_NONE } from "../common/constants";
import { encode } from "../common/encode";
import { DeviceId } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { HTTP_BASE_URL } from "../utils/api";
import { frontendPath } from "../utils/url";

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

const AllVideoDeviceSnapshotViewer = ({
  captureDevices,
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
              <div
                style={{
                  width: "calc(33% - 1px)",
                  margin: "0px -1px -1px 0px",
                  padding: "0px",
                  display: "inline-block",
                  border: "1px grey solid",
                }}
              >
                <Link to={frontendPath(`stream/${encode(deviceId)}`)}>
                  <img
                    src={`${HTTP_BASE_URL}/stream/${encode(deviceId)}/snapshot`}
                    style={{
                      width: "auto",
                      height: "auto",
                      maxWidth: "100%",
                    }}
                  />

                  <pre style={{ textAlign: "center", fontWeight: "bold" }}>
                    {deviceId}
                  </pre>
                </Link>
              </div>
            );
          })
        : null}
    </div>
  );
};

export default connector(AllVideoDeviceSnapshotViewer);
