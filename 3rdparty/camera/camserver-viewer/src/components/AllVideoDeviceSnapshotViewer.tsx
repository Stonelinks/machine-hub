import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { isNullDeviceId } from "../common/devices";
import { encode } from "../common/encode";
import { MILLISECONDS_IN_SECOND, now } from "../common/time";
import { LocalDeviceId } from "../common/types";
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

interface OwnProps {
  refreshSnapshots?: boolean;
  big?: boolean;
}

type Props = PropsFromRedux & OwnProps;

const AllVideoDeviceSnapshotViewer = ({
  captureDevices,
  onGetConfig,
  refreshSnapshots,
  big,
}: Props) => {
  const [snapshotRefresh, setSnapshotRefresh] = React.useState(now());

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (refreshSnapshots) {
      interval = setInterval(() => {
        setSnapshotRefresh(now());
      }, 10 * MILLISECONDS_IN_SECOND);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [snapshotRefresh, setSnapshotRefresh]);

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
                  width: big ? "auto" : "calc(33% - 1px)",
                  margin: "0px -1px -1px 0px",
                  padding: "0px",
                  display: "inline-block",
                  border: "1px grey solid",
                }}
              >
                <Link to={frontendPath(`stream/${encode(deviceId)}`)}>
                  <img
                    src={`${HTTP_BASE_URL}/stream/${encode(
                      deviceId,
                    )}/snapshot?_n=${snapshotRefresh}`}
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
