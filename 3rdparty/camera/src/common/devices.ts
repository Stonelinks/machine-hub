import { LOCAL_DEVICE_ID_NONE, REMOTE_DEVICE_ID_NONE } from "./constants";
import { AnyDeviceId, RemoteDeviceUrl } from "./types";

export const isLocalDevice = (d: AnyDeviceId) => d.startsWith("/dev");

export const remoteDeviceIdToMjpegStreamUrl = (d: RemoteDeviceUrl) =>
  `${d}:81/stream`;
export const remoteDeviceIdToJpegSnapshotUrl = (d: RemoteDeviceUrl) =>
  `${d}/capture`;

export const isNullDeviceId = (d: AnyDeviceId) =>
  d === LOCAL_DEVICE_ID_NONE || d === REMOTE_DEVICE_ID_NONE;
