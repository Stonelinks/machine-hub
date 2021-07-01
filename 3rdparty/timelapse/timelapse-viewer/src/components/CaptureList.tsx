import moment from "moment";
import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { frontendPath } from "../utils/url";

// tslint:disable-next-line:no-var-requires
const { Link } = require("react-location");

const mapState = (state: RootState) => ({
  captures: state.api.getCaptures.value,
});

const mapDispatch = {
  onGetCaptures: () => apiCall("getCaptures"),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {}

type Props = PropsFromRedux & OwnProps;

const CaptureFileList = ({ captures, onGetCaptures }: Props) => {
  React.useEffect(() => {
    onGetCaptures();
  }, [onGetCaptures]);

  return (
    <div>
      {captures && captures.length
        ? captures.map(
            ({
              name,
              numFiles,
              startTimeMs,
              endTimeMs,
            }: {
              name: string;
              numFiles: number;
              startTimeMs: number;
              endTimeMs: number;
            }) => (
              <div
                style={{
                  width: "calc(25% - 1px)",
                  margin: "0px -1px -1px 0px",
                  padding: "0px",
                  display: "inline-block",
                  border: "1px grey solid",
                }}
              >
                <Link to={frontendPath(`capture/${name}`)}>
                  <pre style={{ textAlign: "center", fontWeight: "bold" }}>
                    {name}
                  </pre>
                  <pre style={{ textAlign: "center" }}>
                    {[
                      `${numFiles} files`,
                      `Duration: ${moment
                        .duration(endTimeMs - startTimeMs)
                        .humanize()}`,
                      `Start: ${moment(startTimeMs).format("M/D/YY h:mma")}`,
                      `End: ${moment(endTimeMs).format("M/D/YY h:mma")}`,
                    ].join("\n")}
                  </pre>
                </Link>
              </div>
            ),
          )
        : null}
    </div>
  );
};

export default connector(CaptureFileList);
