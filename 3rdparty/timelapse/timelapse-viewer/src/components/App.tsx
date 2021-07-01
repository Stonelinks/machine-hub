import React from "react";
import { decode } from "../common/encode";
import { apiFetch } from "../utils/api";
import { frontendPath, isLocalhost, reload } from "../utils/url";
import CaptureFileList from "./CaptureFileList";
import CaptureList from "./CaptureList";
import ConfigEditor from "./ConfigEditor";
import CreateTimelapseButtons from "./CreateTimelapseButtons";
import CreateTimelapsePage from "./CreateTimelapsePage";
import NavItem from "./NavItem";
import ResultsFileList from "./ResultsFileList";
import VideoDeviceViewer from "./VideoDeviceViewer";

// tslint:disable-next-line:no-var-requires
const { Match, MatchFirst } = require("react-location");

enum CONNECTIVITY_STATE {
  unknown = "Loading...",
  connected = "Connected",
  disconnected = "Disconnected",
}

const App = () => {
  const [connectivityState, setConnectivityState] = React.useState(
    isLocalhost ? CONNECTIVITY_STATE.unknown : CONNECTIVITY_STATE.connected,
  );

  React.useEffect(() => {
    (async () => {
      switch (connectivityState) {
        case CONNECTIVITY_STATE.unknown:
          try {
            const ping = await apiFetch("ping");
            if (ping.pong === "pong") {
              setConnectivityState(CONNECTIVITY_STATE.connected);
            } else {
              reload();
            }
          } catch (e) {
            setConnectivityState(CONNECTIVITY_STATE.disconnected);
          }
          break;
        default:
          break;
      }
    })();
  }, [connectivityState]);

  return (
    <div>
      {connectivityState === CONNECTIVITY_STATE.connected ? (
        <div>
          <div style={{ display: "flex", borderBottom: "1px solid black" }}>
            <div style={{ flex: "1" }}>
              <h1>Timelapse</h1>
            </div>
          </div>

          <div>
            <NavItem to={frontendPath("/")} title="Config" />
            <NavItem to={frontendPath("cameras")} title="Cameras" />
            <NavItem to={frontendPath("captures")} title="Captures" />
          </div>
          <div>
            <MatchFirst>
              <Match path={frontendPath("captures")}>
                <CaptureList />
              </Match>

              <Match
                path={frontendPath(
                  "capture/:captureId/createTimelapse/:deviceId",
                )}
              >
                {({
                  captureId,
                  deviceId,
                }: {
                  captureId: string;
                  deviceId: string;
                }) => (
                  <div>
                    <h2>Please wait...</h2>
                    <p>You will be automatically redirected</p>
                    <CreateTimelapsePage
                      captureId={captureId}
                      deviceId={decode(deviceId)}
                    />
                  </div>
                )}
              </Match>

              <Match path={frontendPath("capture/:captureId/createTimelapse")}>
                {({ captureId }: { captureId: string }) => (
                  <div>
                    <h2>Please wait...</h2>
                    <p>You will be automatically redirected</p>
                    <CreateTimelapsePage captureId={captureId} />
                  </div>
                )}
              </Match>

              <Match path={frontendPath("capture/:captureId")}>
                {({ captureId }: { captureId: string }) => (
                  <div>
                    <CreateTimelapseButtons captureId={captureId} />
                    <ResultsFileList captureId={captureId} />
                    <CaptureFileList captureId={captureId} />
                  </div>
                )}
              </Match>

              <Match path={frontendPath("cameras")}>
                <VideoDeviceViewer />
              </Match>

              {/* Catchall has to go last */}
              <Match path={frontendPath("/")}>
                <ConfigEditor />
              </Match>
            </MatchFirst>
          </div>
        </div>
      ) : (
        connectivityState
      )}
    </div>
  );
};

export default App;
