import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { encode } from "../common/encode";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { HTTP_BASE_URL } from "../utils/api";
import ExpandableSection from "./ExpandableSection";

const mapState = (state: RootState) => ({
  getResultsFileList: state.api.getResultsFileList.value,
});

const mapDispatch = {
  onGetCaptureFiles: (captureId: string) =>
    apiCall("getResultsFileList", { captureId }),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {
  captureId: string;
}

type Props = PropsFromRedux & OwnProps;

const ResultsFileList = ({
  captureId,
  getResultsFileList,
  onGetCaptureFiles,
}: Props) => {
  React.useEffect(() => {
    onGetCaptureFiles(captureId);
  }, [onGetCaptureFiles, captureId]);

  const hasFiles = getResultsFileList && getResultsFileList.length;

  const t = hasFiles
    ? `${getResultsFileList.length} timelapses`
    : "No timelapses computed yet";

  const title = <h2>{t}</h2>;

  return hasFiles ? (
    <ExpandableSection title={title} startOpened={true}>
      {getResultsFileList.map((f: string) => (
        <div
          style={{
            width: "calc(25% - 1px)",
            margin: "0px -1px -1px 0px",
            padding: "0px",
            display: "inline-block",
            border: "1px grey solid",
          }}
        >
          {f.endsWith("mp4") || f.endsWith("webm") ? (
            <video style={{ width: "100%", height: "auto" }} controls>
              <source
                src={`${HTTP_BASE_URL}/${f}`}
                type={`video/${f.split(".").pop()}`}
              />
            </video>
          ) : (
            <img
              src={`${HTTP_BASE_URL}/${f}`}
              style={{ width: "100%", height: "auto" }}
            />
          )}

          <div>
            <pre
              style={{
                marginLeft: "10px",
                float: "left",
              }}
            >
              {f.split("/").pop()}
            </pre>
            <pre
              style={{
                marginRight: "10px",
                float: "right",
              }}
            >
              <a target="_blank" href={`${HTTP_BASE_URL}/${f}`}>
                Download
              </a>
              {"\n"}
              <button
                onClick={async () => {
                  if (window.confirm("Do you really want delete this?")) {
                    await window.fetch(`${HTTP_BASE_URL}/delete/${encode(f)}`);
                    onGetCaptureFiles(captureId);
                  }
                }}
              >
                Delete
              </button>
            </pre>
          </div>
        </div>
      ))}
    </ExpandableSection>
  ) : (
    title
  );
};

export default connector(ResultsFileList);
