import * as fs from "fs";
import * as shell from "shelljs";
import * as flatCache from "flat-cache";
import { CACHE_FOLDER, CACHE_MAX_AGE_DAYS } from "../common/constants";
import { MILLISECONDS_IN_DAY } from "../common/time";
import { localNow } from "./cron";
import { deleteFile, recursivelyListDir, stat } from "./files";

const caches = {};

export const makeCachedFn = (id: string, fn: (...args: any[]) => any) => {
  const cacheName = id.split(".")[0];
  if (!caches[cacheName]) {
    caches[cacheName] = flatCache.load(cacheName, CACHE_FOLDER);
  }
  const cache = caches[cacheName];
  const cachedFn = async (...args) => {
    let cacheKey = `${id}`;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === "function") {
        console.error(`${cacheKey} is not cacheable`);
        return fn(...args);
      } else if (typeof arg === "object") {
        cacheKey = `${cacheKey}.${JSON.stringify(arg)}`;
      } else {
        cacheKey = `${cacheKey}.${arg}`;
      }
    }

    const c = cache.getKey(cacheKey);
    if (c) {
      console.log(`${cacheKey} cache hit`);
      return c;
    } else {
      let r;
      let success = true;
      try {
        r = await fn(...args);
      } catch (e) {
        console.error(e);
        success = false;
      }
      if (success) {
        cache.setKey(cacheKey, r);
      }
      return r;
    }
  };
  return cachedFn;
};

export const saveCaches = () => {
  Object.values(caches).forEach(c => (c as any).save(true));
};

export const CacheCleanCronJob = {
  name: "cache clean",
  intervalMs: 2 * MILLISECONDS_IN_DAY,
  fn: async () => {
    const files = await recursivelyListDir(CACHE_FOLDER);

    const stats = [];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const s = await stat(file);
      if (s.isFile()) {
        stats.push({
          name: file,
          ...s,
        });
      }
    }

    const cacheMaxAgeMs = localNow()
      .minus({
        days: CACHE_MAX_AGE_DAYS,
      })
      .toMillis();

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];

      if (s.mtimeMs < cacheMaxAgeMs) {
        console.log(`${s.name} is ${cacheMaxAgeMs - s.mtimeMs}ms too old`);
        await deleteFile(s.name);
      }
    }
  },
};
