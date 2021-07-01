import * as flatCache from "flat-cache";
import { CACHE_FOLDER } from "../common/constants";

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
