import { JsonObject } from "./json";

// a camera device node -- /dev/video0 for example
export type LocalDeviceId = string;

// an address to an external mjpeg camera -- http://192.168.50.120:81 for example
// we assume /stream has an mjpeg stream, and /capture gives you a snapshot
export type RemoteMjpegDeviceUrl = string;

// an address to a websocket handler for another instance of camserver
// like ws://localhost:4001/stream/JTJGZGV2JTJGdmlkZW8w/ws
export type RemoteWsProxyDeviceUrl = string;

export enum DeviceIdType {
  LocalDeviceId = "LocalDeviceId",
  RemoteMjpegDeviceUrl = "RemoteMjpegDeviceUrl",
  RemoteWsDeviceUrl = "RemoteWsDeviceUrl",
}

export type AnyDeviceId =
  | LocalDeviceId
  | RemoteMjpegDeviceUrl
  | RemoteWsProxyDeviceUrl;

export const slugifyDeviceId = (deviceId: LocalDeviceId) =>
  deviceId.slice(1).replace("/", "-");

export const deviceIdFromSlug = (deviceIdSlug: string) =>
  `/${deviceIdSlug.replace("-", "/")}`;

export interface Config extends JsonObject {
  captureDevices: AnyDeviceId[];

  captureEnable: boolean;
  captureName: string;
  captureRateMs: number;

  captureWindowEnable: boolean;
  captureWindowStart: string;
  captureWindowEnd: string;

  controlsEnable: boolean;
  controlsDevice: LocalDeviceId;

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
  ffmpegRawVideo = "ffmpegRawVideo",
  ffmpegRtsp = "ffmpegRtsp",
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

export interface PingPayload {
  ts: number;
  lastLagMs?: number;
}

export interface PongPayload {
  ts: number;
}

export interface ZoomControlPayload {
  deviceId: LocalDeviceId;
  direction: "in" | "out";
}

export interface SpeedControlStartPayload {
  deviceId: LocalDeviceId;
  axis: "pan" | "tilt";
  direction: "up" | "down" | "left" | "right";
}

export interface SpeedControlStopPayload {
  deviceId: LocalDeviceId;
  axis: "pan" | "tilt";
}

type AllVideoWebSocketMsgPayloads =
  | PingPayload
  | PongPayload
  | ZoomControlPayload
  | SpeedControlStartPayload
  | SpeedControlStopPayload;

export interface VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes;
  msg?: AllVideoWebSocketMsgPayloads;
}

export interface PingVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.ping;
  msg: PingPayload;
}

export interface PongVideoWebSocketMsg extends VideoWebSocketMsg {
  type: VideoWebSocketMsgTypes.pong;
  msg: PongPayload;
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
