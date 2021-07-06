import { Interval } from "luxon";
import * as fetch from "node-fetch";
import * as shell from "shelljs";
import {
  CAPTURE_FOLDER,
  DEVICE_ID_NONE,
  TIMELAPSE_CHUNK_SIZE,
} from "../common/constants";
import { MILLISECONDS_IN_MINUTE, MILLISECONDS_IN_SECOND } from "../common/time";
import { slugifyDeviceId } from "../common/types";
import {
  getLastUserDisconnectedMs,
  isStreamingVideo,
} from "../routes/streaming";
import { deleteFile } from "../utils/files";
import { cachedDownsize } from "../utils/images";
import { getConfig, setConfigValue } from "./config";
import { DEFAULT_INTERVAL_MS, localNow } from "./cron";
import { getFfmpeg } from "./ffmpeg";
import { getChronologicalFileList, writeFileAsync } from "./files";
import { fileIsGifOrMovie, fileIsImage } from "./images";
import { stop, takeSnapshot } from "./videoDevices";

export const getCaptureDir = async () => {
  const captureDir = `${CAPTURE_FOLDER}`;
  shell.mkdir("-p", captureDir);
  return captureDir;
};

export const getActiveCaptureDir = async () => {
  const captureDir = await getCaptureDir();
  const c = await getConfig();
  const activeCaptureDir = `${captureDir}/${c.captureName}`;
  shell.mkdir("-p", activeCaptureDir);
  return activeCaptureDir;
};

export const getChronologicalTimelapseImageList = async (dir: string) => {
  const files = await getChronologicalFileList(dir);
  return files.filter(fileIsImage);
};

export const getChronologicalResultsList = async (dir: string) => {
  const files = await getChronologicalFileList(dir);
  return files.filter(fileIsGifOrMovie);
};

export const CaptureCronJob = {
  name: "capture",
  intervalMs: async () => {
    const c = await getConfig();
    return c.captureEnable ? c.captureRateMs : DEFAULT_INTERVAL_MS;
  },
  fn: async (nowMs: number) => {
    let c = await getConfig();

    if (c.captureWindowEnable) {
      console.log(`${nowMs}: begin capture window calculations`);
      const [startHours, startMinutes] = c.captureWindowStart.split(":");
      const start = localNow()
        .startOf("day")
        .plus({
          hours: parseInt(startHours, 10),
          minutes: parseInt(startMinutes, 10),
        });
      const [endHours, endMinutes] = c.captureWindowEnd.split(":");
      let end = localNow()
        .startOf("day")
        .plus({
          hours: parseInt(endHours, 10),
          minutes: parseInt(endMinutes, 10),
        });

      // if the end comes before the start, its referring to tomorrow
      if (end.toMillis() < start.toMillis()) {
        console.log(
          `${nowMs}: end comes before start so assume it refers to tomorrow, adding a day`,
        );
        end = end.plus({
          days: 1,
        });
      }

      console.log(
        `${nowMs}: localNow = ${localNow()}, start = ${start}, end = ${end}`,
      );

      if (Interval.fromDateTimes(start, end).contains(localNow())) {
        console.log(`${nowMs}: within capture window interval`);

        if (!c.captureEnable) {
          console.log(`${nowMs}: capture is not enabled, enabling!`);

          if (c.windowExternalTriggerEnable) {
            const u = `${c.windowExternalTriggerUrl}RELAY=ON`;
            console.log(`${nowMs}: enabling external trigger at ${u}`);
            fetch(u);
          }

          await setConfigValue("captureEnable", true);
        }
      } else {
        console.log(`${nowMs}: outside capture window interval`);
        if (c.captureEnable) {
          console.log(`${nowMs}: capture is enabled, disabling!`);

          if (c.windowExternalTriggerEnable) {
            const u = `${c.windowExternalTriggerUrl}RELAY=OFF`;
            console.log(`${nowMs}: disabling external trigger at ${u}`);
            fetch(u);
          }

          await setConfigValue("captureEnable", false);
        }
      }

      // refresh config
      c = await getConfig();
    }

    if (c.captureEnable) {
      console.log(`${nowMs}: taking snapshots for ${c.captureDevices}`);

      // tslint:disable-next-line:prefer-for-of
      for (let index = 0; index < c.captureDevices.length; index++) {
        const deviceId = c.captureDevices[index];
        if (deviceId !== DEVICE_ID_NONE) {
          const snapshot = await takeSnapshot(deviceId);
          const activeCaptureDirForDeviceId = await getActiveCaptureDir();

          await writeFileAsync(
            `${activeCaptureDirForDeviceId}/${slugifyDeviceId(deviceId)}-${
              c.captureName
            }-${nowMs}.jpg`,
            snapshot,
          );
        }
      }
    }
  },
};

export const CameraStreamTimeoutCronJob = {
  name: "camera stream timeout",
  intervalMs: 2 * MILLISECONDS_IN_MINUTE,
  fn: async () => {
    const c = await getConfig();
    // tslint:disable-next-line:prefer-for-of
    for (let index = 0; index < c.captureDevices.length; index++) {
      const deviceId = c.captureDevices[index];
      if (
        !(
          c.captureEnable ||
          isStreamingVideo(deviceId) ||
          getLastUserDisconnectedMs(deviceId) < MILLISECONDS_IN_MINUTE
        )
      ) {
        stop(deviceId);
      }
    }
  },
};

// export const PanCronJob = {
//   name: "pan",
//   intervalMs: async () => {
//     const c = await getConfig();
//     return c.panStepEnable ? c.panStepRateMs : DEFAULT_INTERVAL_MS;
//   },
//   fn: async () => {
//     const c = await getConfig();
//     if (c.panStepEnable) {
//       const { cam } = getOrCreateCameraDevice(c.controlsDevice);
//       moveAxisSpeedStart(cam, "pan", c.panStepDirection);
//       await timeout(0.2 * MILLISECONDS_IN_SECOND);
//       moveAxisSpeedStop(cam, "pan");
//     }
//   },
// };

// export const TiltCronJob = {
//   name: "tilt",
//   intervalMs: async () => {
//     const c = await getConfig();
//     return c.tiltStepEnable ? c.tiltStepRateMs : DEFAULT_INTERVAL_MS;
//   },
//   fn: async () => {
//     const c = await getConfig();
//     if (c.tiltStepEnable) {
//       const { cam } = getOrCreateCameraDevice(c.controlsDevice);
//       moveAxisSpeedStart(cam, "tilt", c.tiltStepDirection);
//       await timeout(0.2 * MILLISECONDS_IN_SECOND);
//       moveAxisSpeedStop(cam, "tilt");
//     }
//   },
// };

interface MakeTimelapseVideoOpts {
  nowMs: number;
  files: string[];
  outPath: string;
  delayMs: string;
  log: (s: string) => void;
  end: () => void;
}

interface MakeTimelapseVideoChunkOpts extends MakeTimelapseVideoOpts {
  chunkIndex: number;
  singleChunk: boolean;
}

export const makeTimelapseVideoChunk = async ({
  chunkIndex,
  singleChunk,
  nowMs,
  files,
  log,
  end,
  outPath,
  delayMs,
}: MakeTimelapseVideoChunkOpts) => {
  const fileListPath = singleChunk
    ? `/tmp/timelapse-out-${nowMs}.txt`
    : `/tmp/timelapse-out-${nowMs}-chunk${chunkIndex}.txt`;

  const delaySeconds = `${parseInt(delayMs, 10) / MILLISECONDS_IN_SECOND}`;
  let ffmpegInstructions = "";

  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const downsizePath = await cachedDownsize(file, 0.5);
    log(`(${i + 1}/${files.length}) downsized ${file}`);
    ffmpegInstructions += `file '${downsizePath}'\n`;
    ffmpegInstructions += `duration ${delaySeconds}\n`;
  }

  // due to a quirk, the last file needs to be specified twice (see concat demuxer here https://trac.ffmpeg.org/wiki/Slideshow)
  ffmpegInstructions += `file '${files[files.length - 1]}'\n`;

  await writeFileAsync(fileListPath, ffmpegInstructions);
  log(`made a list of ${files.length} images to ${fileListPath}`);

  getFfmpeg()
    .addInput(fileListPath)
    .inputOptions(["-f", "concat", "-safe", "0"])
    .videoCodec("libx264")
    .noAudio()
    .on("start", command => {
      log("ffmpeg process started: " + command);
    })
    .on("progress", progress => {
      log("processing: " + progress.percent + "% done");
    })
    .on("error", (err, stdout, stderr) => {
      log("Error: " + err);
      log("ffmpeg stderr: " + stderr);

      setTimeout(() => {
        end();
      }, MILLISECONDS_IN_MINUTE / 2);
    })
    .on("end", async () => {
      log("video created in: " + outPath);
      log("done!");
      if (singleChunk) {
        log("you should be automatically redirected");
      }
      await deleteFile(fileListPath);
      end();
    })
    .save(outPath);
};

export const makeTimelapseVideo = async ({
  nowMs,
  files,
  log,
  end,
  outPath,
  delayMs,
}: MakeTimelapseVideoOpts) => {
  try {
    if (files.length < TIMELAPSE_CHUNK_SIZE) {
      log("processing a single chunk");
      await makeTimelapseVideoChunk({
        singleChunk: true,
        chunkIndex: 0,
        nowMs,
        files,
        log,
        end,
        outPath,
        delayMs,
      });
    } else {
      log("generating chunks...");
      const baseOutPath = outPath
        .split(".")
        .slice(0, -1)
        .join(".");
      const chunkInputFiles = [[]];
      const chunkOutputFiles = [];
      let chunkIndex = 0;

      const addChunkOutputFile = () => {
        chunkOutputFiles.push(`${baseOutPath}.chunk${chunkIndex}.mp4`);
      };
      addChunkOutputFile();

      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (chunkInputFiles[chunkIndex].length >= TIMELAPSE_CHUNK_SIZE) {
          chunkIndex++;
          addChunkOutputFile();
          log(`creating empty chunk ${chunkIndex}`);
          chunkInputFiles[chunkIndex] = [];
        }

        chunkInputFiles[chunkIndex].push(file);
      }

      let chunkConcatFfmpegInstructions = "";
      const delaySeconds = `${parseInt(delayMs, 10) / MILLISECONDS_IN_SECOND}`;
      log(`have ${chunkInputFiles.length} chunks to process`);

      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < chunkInputFiles.length; i++) {
        const chunkInputs = chunkInputFiles[i];
        const chunkOutputPath = chunkOutputFiles[i];
        log(`begin chunk ${i}`);

        const buildChunkPromise = new Promise<void>(async (res, rej) => {
          await makeTimelapseVideoChunk({
            singleChunk: false,
            chunkIndex: i,
            nowMs,
            files: chunkInputs,
            log,
            end: res,
            outPath: chunkOutputPath,
            delayMs,
          });
        });

        await buildChunkPromise;
        log(`end chunk ${i}`);

        chunkConcatFfmpegInstructions += `file '${chunkOutputPath}'\n`;
        chunkConcatFfmpegInstructions += `duration ${parseInt(
          delaySeconds,
          10,
        ) * chunkInputs.length}\n`;
      }

      log(`done all chunks, final concat`);

      const chunkConcatListPath = `/tmp/timelapse-out-${nowMs}.txt`;

      await writeFileAsync(chunkConcatListPath, chunkConcatFfmpegInstructions);
      log(`made a list of chunks to ${chunkConcatListPath}`);

      getFfmpeg()
        .addInput(chunkConcatListPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .videoCodec("libx264")
        .noAudio()
        .on("start", command => {
          log(`ffmpeg process started: ${command}`);
        })
        .on("progress", progress => {
          log(`processing: ${progress.percent}% done`);
        })
        .on("error", (err, stdout, stderr) => {
          log(`Error: ${err}`);
          log(`ffmpeg stderr: ${stderr}`);

          setTimeout(() => {
            end();
          }, MILLISECONDS_IN_MINUTE / 2);
        })
        .on("end", async () => {
          log(`video created in: ${outPath}`);
          log("done! you should be automatically redirected");
          await deleteFile(chunkConcatListPath);

          // tslint:disable-next-line:prefer-for-of
          for (let i = 0; i < chunkOutputFiles.length; i++) {
            const chunkOutputPath = chunkOutputFiles[i];
            await deleteFile(chunkOutputPath);
          }

          end();
        })
        .save(outPath);
    }
  } catch (e) {
    log(`problem making timelapse!`);
    log(e.stack);
  }
};
