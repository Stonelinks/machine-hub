import { Application } from "express-ws";
import { THUMBS_FOLDER_NAME } from "../common/constants";
import { decode } from "../common/encode";
import { slugifyDeviceId } from "../common/types";
import { now } from "../utils/cron";
import { listDirectory, stat } from "../utils/files";
import {
  getCaptureDir,
  getChronologicalResultsList,
  getChronologicalTimelapseImageList,
  makeTimelapseVideo,
} from "../utils/timelapse";

export const registerTimelapseRoutes = async (app: Application) => {
  app.get("/timelapse/capture/list", async (req, res) => {
    const captureDir = await getCaptureDir();
    let captureDirs = await listDirectory(captureDir);
    captureDirs = captureDirs.filter(f => f !== THUMBS_FOLDER_NAME);

    const ret = [];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < captureDirs.length; i++) {
      const c = captureDirs[i];
      const files = await getChronologicalTimelapseImageList(
        `${captureDir}/${c}`,
      );

      let numImageFiles = 0;
      let startTimeMs = 0;
      let endTimeMs = 0;

      if (files.length) {
        const first = await stat(`${captureDir}/${c}/${files[0]}`);
        const last = await stat(`${captureDir}/${c}/${files.pop()}`);

        startTimeMs = first.mtimeMs;
        endTimeMs = last.mtimeMs;
        numImageFiles = files.length;
      }

      ret.push({
        name: c,
        numFiles: numImageFiles,
        startTimeMs,
        endTimeMs,
      });
    }

    res.send(JSON.stringify(ret));
  });

  app.get("/timelapse/capture/:captureId/list", async (req, res) => {
    const captureDir = await getCaptureDir();
    const captureId = decode(req.params.captureId);
    const files = await getChronologicalTimelapseImageList(
      `${captureDir}/${captureId}`,
    );
    res.send(JSON.stringify(files.map(f => `${captureId}/${f}`)));
  });

  app.get("/timelapse/capture/:captureId/listResults", async (req, res) => {
    const captureDir = await getCaptureDir();
    const captureId = decode(req.params.captureId);
    const files = await getChronologicalResultsList(
      `${captureDir}/${captureId}`,
    );
    res.send(JSON.stringify(files.map(f => `${captureId}/${f}`)));
  });

  app.get("/timelapse/capture/:captureId/create/:delayMs", async (req, res) => {
    const captureDir = await getCaptureDir();
    const captureId = decode(req.params.captureId);
    const delayMs = decode(req.params.delayMs);

    const log = (s: string) => {
      console.log(s);
      res.write(`${s}\n`);
    };

    const end = () => res.end();

    res.writeHead(200, { "Content-Type": "text/plain" });
    log("begin timelapse creation");

    const thisCaptureDir = `${captureDir}/${captureId}`;
    let files = await getChronologicalTimelapseImageList(`${thisCaptureDir}`);
    files = files.map(f => `${thisCaptureDir}/${f}`);

    const nowMs = now();
    const outPath = `${thisCaptureDir}/out-${nowMs}.mp4`;

    await makeTimelapseVideo({
      nowMs,
      files,
      log,
      end,
      outPath,
      delayMs,
    });
  });

  app.get(
    "/timelapse/capture/:captureId/create/:delayMs/device/:deviceId",
    async (req, res) => {
      const captureDir = await getCaptureDir();
      const captureId = decode(req.params.captureId);
      const deviceId = decode(req.params.deviceId);
      const delayMs = decode(req.params.delayMs);

      const log = (s: string) => {
        console.log(s);
        res.write(`${s}\n`);
      };

      const end = () => res.end();

      res.writeHead(200, { "Content-Type": "text/plain" });
      log("begin timelapse creation for " + deviceId);

      const thisCaptureDir = `${captureDir}/${captureId}`;
      let files = await getChronologicalTimelapseImageList(`${thisCaptureDir}`);

      const deviceIdSlug = slugifyDeviceId(deviceId);
      files = files.filter(f => f.startsWith(deviceIdSlug));

      files = files.map(f => `${thisCaptureDir}/${f}`);

      const nowMs = now();
      const outPath = `${thisCaptureDir}/out-${deviceIdSlug}-${nowMs}.mp4`;

      await makeTimelapseVideo({
        nowMs,
        files,
        log,
        end,
        outPath,
        delayMs,
      });
    },
  );
};
