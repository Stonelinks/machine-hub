export enum APIRequestState {
  none = "none",
  loading = "loading",
  done = "done",
}

export interface APIRequest {
  url: string;
  state: APIRequestState;
  value: any;
}

export interface APIStoreState {
  getConfig: APIRequest;
  setConfigValue: APIRequest;
  devices: APIRequest;
  getDeviceFormats: APIRequest;
  getDeviceControls: APIRequest;
  setDeviceSpeedControlStart: APIRequest;
  setDeviceSpeedControlStop: APIRequest;
  setDeviceZoomControl: APIRequest;
  getCaptures: APIRequest;
  getCaptureFiles: APIRequest;
  getResultsFileList: APIRequest;
}

export type APIResource = keyof APIStoreState;
