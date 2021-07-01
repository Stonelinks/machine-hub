import * as path from "path";

const prefixPath = (s: string) =>
  process.env.BASE_PATH
    ? `${(process as any).env.BASE_PATH}/${s}`
    : path.resolve(s);

export const CACHE_FOLDER = prefixPath(".cache");
export const CAPTURE_FOLDER = prefixPath("captures");
export const THUMBS_FOLDER_NAME = ".thumbs";
export const VIEWER_FOLDER = path.resolve("./timelapse-viewer/build");
export const SERVER_PORT =
  parseInt((process as any).env.SERVER_PORT, 10) || 4001;
export const CONFIG_FILE = prefixPath("config.json");

export const VIDEO_STREAM_WIDTH = 640;
export const VIDEO_STREAM_HEIGHT = 480;

export const DEVICE_ID_NONE = "Null device ID";
