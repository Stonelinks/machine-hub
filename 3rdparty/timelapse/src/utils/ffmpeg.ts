import * as ffmpegPath from "ffmpeg-static";
import * as ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfmpegPath(ffmpegPath);

export const getFfmpeg = (o?: ffmpeg.FfmpegCommandOptions) => ffmpeg(o);

const minNaluPerChunk = 30;

export const extractChunks = (buffer: Buffer) => {
  let i = 0;
  const length = buffer.byteLength;
  let naluCount = 0;
  let value: number;
  let unit: Buffer | number[];
  let ntype: number;
  let state = 0;
  let lastIndex = 0;
  const result = [];

  while (i < length) {
    value = buffer[i++];
    // finding 3 or 4-byte start codes (00 00 01 OR 00 00 00 01)
    switch (state) {
      case 0:
        if (value === 0) {
          state = 1;
        }
        break;
      case 1:
        if (value === 0) {
          state = 2;
        } else {
          state = 0;
        }
        break;
      case 2:
      case 3:
        if (value === 0) {
          state = 3;
        } else if (value === 1 && i < length) {
          if (lastIndex) {
            unit = buffer.slice(lastIndex, i - state - 1);
            // tslint:disable-next-line:no-bitwise
            ntype = unit[0] & 0x1f;
            naluCount++;
          }
          if (naluCount >= minNaluPerChunk && ntype !== 1 && ntype !== 5) {
            result.push(lastIndex - state - 1);
            naluCount = 0;
          }
          state = 0;
          lastIndex = i;
        } else {
          state = 0;
        }
        break;
      default:
        break;
    }
  }
  if (naluCount > 0) {
    result.push(lastIndex);
  }
  return result;
};
