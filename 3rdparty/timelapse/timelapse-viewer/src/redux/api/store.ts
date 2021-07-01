import produce from "immer";
import { APIRequest, APIRequestState, APIStoreState } from "./types";
import { APIActions, API_REQUEST, API_RESPONSE } from "./actions";
import { nothing } from "../../common/nothing";

const makeRequestInitialState = (url: string): APIRequest => ({
  url,
  state: APIRequestState.none,
  value: nothing,
});

const InitialAPIReducerState: APIStoreState = {
  getConfig: makeRequestInitialState("config/get"),
  setConfigValue: makeRequestInitialState("config/:configKey/set/:configValue"),
  devices: makeRequestInitialState("video-device/list"),
  getDeviceFormats: makeRequestInitialState("video-device/:deviceId/formats"),
  getDeviceControls: makeRequestInitialState("video-device/:deviceId/controls"),
  setDevicePositionControl: makeRequestInitialState(
    "video-device/:deviceId/control/:axis/:direction/position",
  ),
  setDeviceSpeedControlStart: makeRequestInitialState(
    "video-device/:deviceId/control/:axis/:direction/speed/start",
  ),
  setDeviceSpeedControlStop: makeRequestInitialState(
    "video-device/:deviceId/control/:axis/speed/stop",
  ),
  setDeviceZoomControl: makeRequestInitialState(
    "video-device/:deviceId/control/zoom/:direction",
  ),
  getCaptures: makeRequestInitialState("timelapse/capture/list"),
  getCaptureFiles: makeRequestInitialState("timelapse/capture/:captureId/list"),
  getResultsFileList: makeRequestInitialState(
    "timelapse/capture/:captureId/listResults",
  ),
};

const APIStore = (
  state = InitialAPIReducerState,
  action: APIActions,
): APIStoreState => {
  switch (action.type) {
    case API_REQUEST:
      return produce(state, draft => {
        draft[action.payload.resource].state = APIRequestState.loading;
      });
    case API_RESPONSE:
      return produce(state, draft => {
        draft[action.payload.resource].state = APIRequestState.done;
        draft[action.payload.resource].value = action.payload.response;
      });
    default:
      return state;
  }
};

export default APIStore;
