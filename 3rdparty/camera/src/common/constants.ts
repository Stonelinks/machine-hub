import * as path from "path";
import { DAYS_IN_WEEK, MILLISECONDS_IN_SECOND } from "./time";

const prefixPath = (s: string) =>
  process.env.BASE_PATH
    ? `${(process as any).env.BASE_PATH}/${s}`
    : path.resolve(s);

export const CACHE_FOLDER = prefixPath(".cache");
export const CACHE_MAX_AGE_DAYS = DAYS_IN_WEEK;

export const CAPTURE_FOLDER = prefixPath("captures");
export const THUMBS_FOLDER_NAME = ".thumbs";
export const VIEWER_FOLDER = path.resolve("./camserver-viewer/build");
export const SERVER_PORT =
  parseInt((process as any).env.SERVER_PORT, 10) || 4001;
export const CONFIG_FILE = prefixPath(
  (process as any).env.CONFIG_FILE
    ? (process as any).env.CONFIG_FILE
    : "config.json",
);
export const CAMERA_INIT_TIMEOUT_MS = 10 * MILLISECONDS_IN_SECOND;

export const VIDEO_FPS = 30;
export const VIDEO_STREAM_WIDTH = 640;
export const VIDEO_STREAM_HEIGHT = 480;

export const LOCAL_DEVICE_ID_NONE = "/dev/null_device_ID";
export const REMOTE_MJPEG_DEVICE_ID_NONE = "http://null_device_mjpeg_url";
export const REMOTE_WS_PROXY_DEVICE_ID_NONE = "ws://null_device ws_url";

export const TIMELAPSE_CHUNK_SIZE = 100;

export const WS_PING_INTERVAL_MS = 10 * MILLISECONDS_IN_SECOND;
export const WS_COMPRESSION_ENABLED = true;

// somehow, intentionally setting this low really reduces latency for mjpeg streams
export const REMOTE_VIDEO_FPS = 5;
export const REMOTE_SNAPSHOT_PATH = `/snapshot`;
export const REMOTE_MJPEG_STREAM_PATH = `/mjpeg`;

export const ENABLE_REMOTE_RTSP_CLIENT = false;
export const REMOTE_RTSP_CLIENT_PORT = 8554;
export const REMOTE_RTSP_CLIENT_STREAM_PATH = `:${REMOTE_RTSP_CLIENT_PORT}/mjpeg/1`;

export const ENABLE_LOCAL_RTSP_SERVER = true;
export const LOCAL_RTSP_SERVER_PORT = 5554;
export const LOCAL_RTSP_CLIENT_PORT = 6554;
export const LOCAL_RTSP_CLIENT_USE_RAWVIDEO_SOURCE = false;

export const NO_CACHE_HEADER =
  "no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0";

export const FFMPEG_STDOUT_LINES = 1;
