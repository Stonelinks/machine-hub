import { Action, AppThunk } from "../types";
import { ApiResource } from "./types";
import { apiFetch, fillInUrlTemplate } from "../../utils/api";

export const API_REQUEST = "API_REQUEST";
export const API_RESPONSE = "API_RESPONSE";

export interface APIRequestAction extends Action<typeof API_REQUEST> {
  type: typeof API_REQUEST;
  payload: {
    resource: ApiResource;
  };
}
export const apiRequestAction = ({
  resource,
}: APIRequestAction["payload"]): APIRequestAction => ({
  type: API_REQUEST,
  payload: {
    resource,
  },
});

export interface APIResponseAction extends Action<typeof API_RESPONSE> {
  type: typeof API_RESPONSE;
  payload: {
    resource: ApiResource;
    response: any;
  };
}
export const apiResponseAction = ({
  resource,
  response,
}: APIResponseAction["payload"]): APIResponseAction => ({
  type: API_RESPONSE,
  payload: {
    resource,
    response,
  },
});

export const apiCall = (
  resource: ApiResource,
  urlOptions?: object,
): AppThunk<void> => async (dispatch, getState) => {
  console.log(
    `API call: ${resource} ${urlOptions ? JSON.stringify(urlOptions) : ""}`,
  );
  dispatch(apiRequestAction({ resource }));
  const state = getState();
  const apiState = state.api;
  const { url } = apiState[resource];
  const finalUrl = fillInUrlTemplate(url, urlOptions);
  const r = await apiFetch(finalUrl);
  dispatch(apiResponseAction({ resource, response: r }));
};

export type APIActions = APIRequestAction | APIResponseAction;
