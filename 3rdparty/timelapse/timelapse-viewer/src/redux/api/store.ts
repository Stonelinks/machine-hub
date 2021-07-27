import produce from "immer";
import { ApiRequest, ApiRequestState, ApiStoreState } from "./types";
import { APIActions, API_REQUEST, API_RESPONSE } from "./actions";
import { nothing } from "../../common/nothing";

const makeRequestInitialState = (url: string): ApiRequest => ({
  url,
  state: ApiRequestState.none,
  value: nothing,
});

const InitialAPIReducerState: ApiStoreState = {
  getConfig: makeRequestInitialState("config/get"),
  setConfigValue: makeRequestInitialState("config/:configKey/set/:configValue"),
  devices: makeRequestInitialState("video-device/list"),
  getCaptures: makeRequestInitialState("timelapse/capture/list"),
  getCaptureFiles: makeRequestInitialState("timelapse/capture/:captureId/list"),
  getResultsFileList: makeRequestInitialState(
    "timelapse/capture/:captureId/listResults",
  ),
};

const ApiStore = (
  state = InitialAPIReducerState,
  action: APIActions,
): ApiStoreState => {
  switch (action.type) {
    case API_REQUEST:
      return produce(state, draft => {
        draft[action.payload.resource].state = ApiRequestState.loading;
      });
    case API_RESPONSE:
      return produce(state, draft => {
        draft[action.payload.resource].state = ApiRequestState.done;
        draft[action.payload.resource].value = action.payload.response;
      });
    default:
      return state;
  }
};

export default ApiStore;
