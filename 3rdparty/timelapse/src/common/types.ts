import { JsonObject } from "./json";

// a camera device node -- /dev/video0 for example
export type DeviceId = string;

export const slugifyDeviceId = (deviceId: DeviceId) =>
  deviceId.slice(1).replace("/", "-");

export const deviceIdFromSlug = (deviceIdSlug: string) =>
  `/${deviceIdSlug.replace("-", "/")}`;

export interface Config extends JsonObject {
  captureDevices: DeviceId[];

  captureEnable: boolean;
  captureName: string;
  captureRateMs: number;

  captureWindowEnable: boolean;
  captureWindowStart: string;
  captureWindowEnd: string;

  controlsEnable: boolean;
  controlsDevice: DeviceId;

  windowExternalTriggerEnable: boolean;
  windowExternalTriggerUrl: string;

  // panStepEnable: boolean;
  // panStepRateMs: number;
  // panStepDirection: "left" | "right";

  // tiltStepEnable: boolean;
  // tiltStepRateMs: number;
  // tiltStepDirection: "up" | "down";

  // zoomStepEnable: boolean;
  // zoomStepRateMs: number;
  // zoomStepStart: number;
  // zoomStepEnd: number;
  // zoomStepDirection: "in" | "out";
}

export enum WebSocketVideoMessageTypes {
  play = "play",
  pause = "pause",
  zoomControl = "zoomControl",
  speedControlStart = "speedControlStart",
  speedControlStop = "speedControlStop",
}

export interface ZoomControlPayload {
  deviceId: DeviceId;
  direction: "in" | "out";
}

export interface SpeedControlStartPayload {
  deviceId: DeviceId;
  axis: "pan" | "tilt";
  direction: "up" | "down" | "left" | "right";
}

export interface SpeedControlStopPayload {
  deviceId: DeviceId;
  axis: "pan" | "tilt";
}

type AllPayloads =
  | ZoomControlPayload
  | SpeedControlStartPayload
  | SpeedControlStopPayload;

export interface WebSocketMsg {
  type: WebSocketVideoMessageTypes;
  msg?: AllPayloads;
}

export interface PlayWebsocketMsg extends WebSocketMsg {
  type: WebSocketVideoMessageTypes.play;
}

export interface PauseWebsocketMsg extends WebSocketMsg {
  type: WebSocketVideoMessageTypes.pause;
}

export interface ZoomControlWebsocketMsg extends WebSocketMsg {
  type: WebSocketVideoMessageTypes.zoomControl;
  msg: ZoomControlPayload;
}

export interface SpeedControlStartWebsocketMsg extends WebSocketMsg {
  type: WebSocketVideoMessageTypes.speedControlStart;
  msg: SpeedControlStartPayload;
}
export interface SpeedControlStopWebsocketMsg extends WebSocketMsg {
  type: WebSocketVideoMessageTypes.speedControlStop;
  msg: SpeedControlStopPayload;
}

export type AllWebsocketMsgs =
  | PlayWebsocketMsg
  | PauseWebsocketMsg
  | ZoomControlWebsocketMsg
  | SpeedControlStartWebsocketMsg
  | SpeedControlStopWebsocketMsg;
