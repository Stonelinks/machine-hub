import * as ffmpegPath from "ffmpeg-static";
import * as ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfmpegPath(ffmpegPath);

export const getFfmpeg = (o?: ffmpeg.FfmpegCommandOptions) => ffmpeg(o);
