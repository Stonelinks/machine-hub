import {
  LOCAL_DEVICE_ID_NONE,
  REMOTE_DEVICE_ID_NONE,
  REMOTE_MJPEG_STREAM_PATH,
  REMOTE_RTSP_STREAM_PATH,
  REMOTE_SNAPSHOT_PATH,
} from "./constants";
import { AnyDeviceId, RemoteDeviceUrl } from "./types";

export const isLocalDevice = (d: AnyDeviceId) => d.startsWith("/dev");

export const remoteDeviceIdToMjpegStreamUrl = (d: RemoteDeviceUrl) =>
  `${d}${REMOTE_MJPEG_STREAM_PATH}`;

export const remoteDeviceIdToRtspStreamUrl = (d: RemoteDeviceUrl) =>
  `${d.replace("http", "rtsp")}${REMOTE_RTSP_STREAM_PATH}`;

export const remoteDeviceIdToJpegSnapshotUrl = (d: RemoteDeviceUrl) =>
  `${d}${REMOTE_SNAPSHOT_PATH}`;

export const isNullDeviceId = (d: AnyDeviceId) =>
  d === LOCAL_DEVICE_ID_NONE || d === REMOTE_DEVICE_ID_NONE;
