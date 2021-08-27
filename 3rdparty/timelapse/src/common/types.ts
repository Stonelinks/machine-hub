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

export enum VideoStreamTypes {
  ffmpeg = "ffmpeg",
  mjpeg = "mjpeg",
}

export enum VideoWebSocketMsgTypes {
  ping = "ping",
  pong = "pong",
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

type AllVideoWebSocketMsgPayloads =
  | ZoomControlPayload
  | SpeedControlStartPayload
  | SpeedControlStopPayload;

export interface VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes;
  msg?: AllVideoWebSocketMsgPayloads;
}

export interface PingVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.ping;
}

export interface PongVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.pong;
}

export interface PlayVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.play;
}

export interface PauseVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.pause;
}

export interface ZoomControlVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.zoomControl;
  msg: ZoomControlPayload;
}

export interface SpeedControlStartVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.speedControlStart;
  msg: SpeedControlStartPayload;
}
export interface SpeedControlStopVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.speedControlStop;
  msg: SpeedControlStopPayload;
}

export type AllVideoWebSocketMsgs =
  | PingVideoWebSocketMsg
  | PongVideoWebSocketMsg
  | PlayVideoWebSocketMsg
  | PauseVideoWebSocketMsg
  | ZoomControlVideoWebSocketMsg
  | SpeedControlStartVideoWebSocketMsg
  | SpeedControlStopVideoWebSocketMsg;
