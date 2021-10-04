import {
  LOCAL_DEVICE_ID_NONE,
  REMOTE_MJPEG_DEVICE_ID_NONE,
  REMOTE_MJPEG_STREAM_PATH,
  REMOTE_RTSP_STREAM_PATH,
  REMOTE_SNAPSHOT_PATH,
  REMOTE_WS_PROXY_DEVICE_ID_NONE,
} from "./constants";
import {
  AnyDeviceId,
  DeviceIdType,
  RemoteMjpegDeviceUrl,
  RemoteWsProxyDeviceUrl,
} from "./types";

export const isLocalDeviceType = (d: AnyDeviceId) => d.startsWith("/dev");
export const isRemoteMjpegDeviceType = (d: AnyDeviceId) => d.startsWith("http");
export const isRemoteWsProxyDeviceType = (d: AnyDeviceId) => d.startsWith("ws");

export const getDeviceIdType = (d: AnyDeviceId) => {
  if (isLocalDeviceType(d)) {
    return DeviceIdType.LocalDeviceId;
  } else if (isRemoteMjpegDeviceType(d)) {
    return DeviceIdType.RemoteMjpegDeviceUrl;
  } else if (isRemoteWsProxyDeviceType(d)) {
    return DeviceIdType.RemoteWsDeviceUrl;
  } else {
    throw Error(`unknown device id type: ${d}`);
  }
};

export const isNullDeviceId = (d: AnyDeviceId) =>
  d === LOCAL_DEVICE_ID_NONE ||
  d === REMOTE_MJPEG_DEVICE_ID_NONE ||
  d === REMOTE_WS_PROXY_DEVICE_ID_NONE;

export const remoteDeviceIdToMjpegStreamUrl = (d: RemoteMjpegDeviceUrl) =>
  `${d}${REMOTE_MJPEG_STREAM_PATH}`;

export const remoteMjpegDeviceIdToRtspStreamUrl = (d: RemoteMjpegDeviceUrl) =>
  `${d.replace("http", "rtsp")}${REMOTE_RTSP_STREAM_PATH}`;

export const remoteMjpegDeviceToJpegSnapshotUrl = (d: RemoteMjpegDeviceUrl) =>
  `${d}${REMOTE_SNAPSHOT_PATH}`;

export const remoteWsProxyDeviceIdToJpegSnapshotUrl = (
  d: RemoteWsProxyDeviceUrl,
) => `${d.replace("ws://", "http://").replace("/ws", REMOTE_SNAPSHOT_PATH)}`;
