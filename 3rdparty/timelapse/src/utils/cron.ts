import { DateTime } from "luxon";
import {
  MILLISECONDS_IN_MINUTE,
  MILLISECONDS_IN_SECOND,
  timeout,
} from "../common/time";
import { CacheCleanCronJob } from "./cache";
import { CameraStreamTimeoutCronJob, CaptureCronJob } from "./timelapse";

export const DEFAULT_INTERVAL_MS = MILLISECONDS_IN_MINUTE;

export const now = () => Date.now();

export const localNow = () =>
  DateTime.fromMillis(now()).setZone("America/Los_Angeles");

interface CronJobs {
  name: string;
  intervalMs: (() => Promise<number>) | number;
  fn: (nowMs: number) => Promise<any> | void;
}

class Cron {
  jobs: CronJobs[];
  lastRunMs: number[] = [];
  constructor(jobs: CronJobs[]) {
    this.jobs = jobs;
  }

  async start() {
    while (true) {
      await timeout(MILLISECONDS_IN_SECOND);
      await this.tick();
    }
  }

  async tick() {
    for (let i = 0; i < this.jobs.length; i++) {
      const { intervalMs, fn, name } = this.jobs[i];

      let iMs: number = DEFAULT_INTERVAL_MS;
      if (typeof intervalMs === "function") {
        iMs = await intervalMs();
      } else if (typeof intervalMs === "number") {
        iMs = intervalMs;
      }

      const lastRunMs = this.lastRunMs[i];
      const nowMs = now();
      let shouldRun = false;
      if (!lastRunMs) {
        shouldRun = true;
      } else if (lastRunMs + iMs < nowMs) {
        shouldRun = true;
      }

      if (shouldRun) {
        this.lastRunMs[i] = nowMs;
        try {
          console.log(`cron: running ${name}`);
          await fn(nowMs);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}

const crons = [CaptureCronJob, CameraStreamTimeoutCronJob, CacheCleanCronJob];

// if (ENABLE_PTZ) {
//   crons.push(PanCronJob);
//   crons.push(TiltCronJob);
// }

export const cron = new Cron(crons);
