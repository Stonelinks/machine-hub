import * as fs from "fs";
import { CONFIG_FILE } from "../common/constants";
import {
  MILLISECONDS_IN_SECOND,
  timeout,
  MILLISECONDS_IN_MINUTE,
} from "../common/time";
import { Config } from "../common/types";
import { readJsonAsync, writeJsonAsync } from "./files";
import { listVideoDevices } from "./videoDevices";

let config: Config | undefined;

const makeDefaultConfig = async (): Promise<Config> => {
  const devices = await listVideoDevices();
  const firstDevice = devices.length ? devices[0] : "unknown";
  return {
    captureDevices: [firstDevice],

    captureName: "capture",
    captureEnable: false,
    captureRateMs: MILLISECONDS_IN_MINUTE,

    captureWindowEnable: false,
    captureWindowStart: "10:00",
    captureWindowEnd: "11:00",
    windowExternalTriggerEnable: false,
    windowExternalTriggerUrl: "http://192.168.50.121/",

    controlsEnable: false,
    controlsDevice: firstDevice,

    // panStepEnable: false,
    // panStepRateMs: 2000,
    // panStepDirection: "left",

    // tiltStepEnable: false,
    // tiltStepRateMs: 2000,
    // tiltStepDirection: "up",
  };
};

export const getConfig = async () => {
  while (!config) {
    await timeout(MILLISECONDS_IN_SECOND * 0.5);
  }
  return config;
};

export const setConfigValue = async <K extends keyof Config>(
  k: K,
  v: Config[K],
) => {
  config[k] = v;
  await saveConfig();
};

const saveConfig = async (c?: Config) => {
  if (!c) {
    c = config;
  }

  console.log("writing config", c);
  await writeJsonAsync(CONFIG_FILE, c);
};

export const initConfig = async () => {
  // init a default config
  const defaultConfig = await makeDefaultConfig();
  if (!fs.existsSync(CONFIG_FILE)) {
    await saveConfig(defaultConfig);
  }
  config = await readJsonAsync(CONFIG_FILE);

  let dirty = false;
  for (const key in defaultConfig) {
    if (defaultConfig.hasOwnProperty(key)) {
      const defaultValue = defaultConfig[key];
      if (!config.hasOwnProperty(key)) {
        dirty = true;
        config[key] = defaultValue;
      }
    }
  }
  if (dirty) {
    await saveConfig(config);
  }
};
