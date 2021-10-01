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
export const CONFIG_FILE = prefixPath("config.json");

export const VIDEO_FPS = 30;
export const VIDEO_STREAM_WIDTH = 640;
export const VIDEO_STREAM_HEIGHT = 480;

export const LOCAL_DEVICE_ID_NONE = "/dev/Null device ID";
export const REMOTE_DEVICE_ID_NONE = "http://null device url";

export const TIMELAPSE_CHUNK_SIZE = 100;

export const WS_PING_INTERVAL_MS = 10 * MILLISECONDS_IN_SECOND;
export const WS_COMPRESSION_ENABLED = true;
