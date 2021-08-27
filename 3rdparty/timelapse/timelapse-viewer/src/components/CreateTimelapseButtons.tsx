import { connect, ConnectedProps } from "react-redux";
import React from "react";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { frontendPath } from "../utils/url";
import { deviceIdFromSlug } from "../common/types";
import { encode } from "../common/encode";

// tslint:disable-next-line:no-var-requires
const { Link } = require("react-location");

const mapState = (state: RootState) => ({
  captureFiles: state.api.getCaptureFiles.value,
});

const mapDispatch = {
  onGetCaptureFiles: (captureId: string) =>
    apiCall("getCaptureFiles", { captureId }),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {
  captureId: string;
}

type Props = PropsFromRedux & OwnProps;

const CreateTimelapseButtons = ({
  captureId,
  captureFiles,
  onGetCaptureFiles,
}: Props) => {
  React.useEffect(() => {
    onGetCaptureFiles(captureId);
  }, [onGetCaptureFiles, captureId]);

  const deviceIds: string[] = [];
  if (captureFiles && captureFiles.length) {
    captureFiles.forEach((f: string) => {
      const filenameParts = f
        .split("/")
        .pop()
        ?.split("-");

      if (filenameParts?.length && filenameParts[0] === "dev") {
        const deviceId = deviceIdFromSlug(
          `${filenameParts[0]}-${filenameParts[1]}`,
        );
        if (!deviceIds.includes(deviceId)) {
          deviceIds.push(deviceId);
        }
      }
    });
  }

  return (
    <div>
      {deviceIds.length ? (
        deviceIds.map((d: string) => {
          return (
            <Link
              to={frontendPath(
                `capture/${encode(captureId)}/createTimelapse/${encode(d)}`,
              )}
            >
              <button>Create Timelapse for {d}</button>
            </Link>
          );
        })
      ) : (
        <Link to={frontendPath(`capture/${encode(captureId)}/createTimelapse`)}>
          <button>Create Timelapse</button>
        </Link>
      )}
    </div>
  );
};

export default connector(CreateTimelapseButtons);
