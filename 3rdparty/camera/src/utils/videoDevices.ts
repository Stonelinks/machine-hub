import { EventEmitter } from "events";
import * as fs from "fs";
import * as request from "request";
import { CAMERA_INIT_TIMEOUT_MS, VIDEO_FPS } from "../common/constants";
import {
  isLocalDeviceType,
  isRemoteMjpegDeviceType,
  remoteMjpegDeviceToJpegSnapshotUrl,
  remoteWsProxyDeviceIdToJpegSnapshotUrl,
} from "../common/devices";
import { MILLISECONDS_IN_SECOND, now, timeout } from "../common/time";
import { AnyDeviceId, LocalDeviceId } from "../common/types";

// tslint:disable-next-line:no-var-requires
const v4l2camera = require("v4l2camera");

export const listVideoDevices = async (): Promise<string[]> => {
  return new Promise(res => {
    const reg = /^video/i;
    const dir = "/dev/";

    fs.readdir(dir, (err, data) => {
      if (err) {
        throw err;
      }

      const cams = [];
      const dl = data.length;

      for (let i = 0; i < dl; i++) {
        const camPath = data[i];

        if (camPath.match(reg)) {
          cams.push(dir + camPath);
        }
      }

      res(cams);
    });
  });
};

// https://github.com/hypersolution1/v4l2camera/blob/f31d5f3729ecf55d257fa3cf61710a055fc7a0da/readme.md#api
interface Format {
  formatName: "MJPG" | "YUYV" | "BGR3" | "YU12";
  format: number;
  width: number;
  height: number;
  interval: {
    numerator: number;
    denominator: number;
  };
}

interface Control {
  id: number;
  name: string;
  type: "int" | "bool" | "button" | "menu";
  min: number;
  max: number;
  step: number;
  default: number;
  flags: {
    disabled: boolean;
    grabbed: boolean;
    readOnly: boolean;
    update: boolean;
    inactive: boolean;
    slider: boolean;
    writeOnly: boolean;
    volatile: boolean;
  };
  menu: [];
}

interface Cam {
  device: string;
  width: number;
  height: number;

  formats: Format[];
  configGet: () => Format;
  configSet: (f: Format) => void;

  controls: Control[];
  controlGet: (id: number) => number;
  controlSet: (id: number, val: number) => void;

  start: () => void;
  capture: (cb: (success: boolean) => void) => void;
  frameRaw: () => Uint8Array;
  stop: (cb: () => void) => void;
}

enum InitState {
  none = "none",
  inProgress = "inProgress",
  done = "done",
}

interface CameraDeviceState {
  cam: Cam;
  emitter: EventEmitter;
  initState: InitState;
  isOn: boolean;
  zoom: number;
  lastFrame?: Buffer;
}

const cameraDevices: Record<string, CameraDeviceState> = {};

export const getOrCreateCameraDevice = (
  deviceId: LocalDeviceId,
): CameraDeviceState => {
  if (cameraDevices[deviceId]) {
    return cameraDevices[deviceId];
  }

  const cam = new v4l2camera.Camera(deviceId) as Cam;
  const r = {
    cam,
    isOn: false,
    initState: InitState.none,
    emitter: new EventEmitter(),
    zoom: getZoomInfo(cam).default,
  };
  cameraDevices[deviceId] = r;
  return r;
};

export const setCameraDeviceZoom = (deviceId: LocalDeviceId, zoom: number) => {
  cameraDevices[deviceId].zoom = zoom;
};

export const start = async (deviceId: LocalDeviceId): Promise<void> => {
  console.log(`start ${deviceId}`);
  const { cam, isOn, initState } = getOrCreateCameraDevice(deviceId);
  if (isOn) {
    return Promise.resolve();
  }

  return new Promise(async (res, rej) => {
    switch (initState) {
      case InitState.none:
        cameraDevices[deviceId].initState = InitState.inProgress;

        // autoset format
        const f = autoSelectFormat(cam);
        cam.configSet(f);

        // set zoom
        const zoomAbsControl = getControl(cam, `zoom absolute`);
        if (zoomAbsControl) {
          cam.controlSet(zoomAbsControl.id, getZoomInfo(cam).default);
          await timeout(MILLISECONDS_IN_SECOND);
        }

        // init pan and tilt
        // await centerAxis(cam, "tilt", true);
        // await centerAxis(cam, "pan");

        cam.start();
        const fpsMs = getFps(cam.configGet()) / MILLISECONDS_IN_SECOND;

        const captureOnce = (extraCb?: () => void) => {
          cam.capture(success => {
            const frame = cam.frameRaw();
            const frameBuffer = new Buffer(frame);
            cameraDevices[deviceId].lastFrame = frameBuffer;
            if (extraCb) {
              extraCb();
            }
            cameraDevices[deviceId].emitter.emit("frame", frameBuffer);

            if (cameraDevices[deviceId].isOn) {
              setTimeout(captureOnce, fpsMs);
            } else {
              cam.stop(() => {});
              cameraDevices[deviceId].initState = InitState.none;
            }
          });
        };
        captureOnce(() => {
          cameraDevices[deviceId].isOn = true;
          cameraDevices[deviceId].initState = InitState.done;
          res();
        });
        break;
      case InitState.inProgress:
        // wait while camera initializes, with timeout
        const waitingStart = now();
        let latestInitState: InitState = initState;
        while (latestInitState !== InitState.done) {
          console.log("another init already in progress, waiting");
          const { initState: iState } = getOrCreateCameraDevice(deviceId);
          latestInitState = iState;
          await timeout(2 * MILLISECONDS_IN_SECOND);
          if (now() > waitingStart + CAMERA_INIT_TIMEOUT_MS) {
            rej(`timed out waiting for ${deviceId} to init`);
          }
        }
        res();
        break;
      case InitState.done:
      default:
        break;
    }
  });
};

export const stop = (deviceId: LocalDeviceId) => {
  console.log(`stop ${deviceId}`);
  if (isLocalDeviceType(deviceId)) {
    const { isOn } = getOrCreateCameraDevice(deviceId);
    if (isOn) {
      cameraDevices[deviceId].isOn = false;
    }
  }
};

const imgRequest = request.defaults({ encoding: null });
export const takeSnapshot = async (deviceId: AnyDeviceId): Promise<Buffer> => {
  if (isLocalDeviceType(deviceId)) {
    await start(deviceId);

    while (!cameraDevices[deviceId].lastFrame) {
      await timeout(50);
    }

    return cameraDevices[deviceId].lastFrame;
  } else {
    return new Promise((resolve, reject) => {
      const url = isRemoteMjpegDeviceType(deviceId)
        ? remoteMjpegDeviceToJpegSnapshotUrl(deviceId)
        : remoteWsProxyDeviceIdToJpegSnapshotUrl(deviceId);
      console.log(`attempting snapshot for remote device at ${url}`);
      imgRequest.get(url, (err, res, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      });
    });
  }
};

export const getFps = (f: Format) => {
  return f.interval.denominator / f.interval.numerator;
};

export const autoSelectFormat = (cam: Cam) => {
  const mjpegFormats = cam.formats.filter(f => f.formatName === "MJPG");
  let largestFormat: Format = mjpegFormats[0];

  mjpegFormats.forEach((f: Format, i: number) => {
    // console.log(`autoSelectFormat: format ${i}`, f);
    const { width, height } = f;
    const thisFps = getFps(f);
    // const fastestFps = getFps(largestFormat as Format);
    const largestWidth = largestFormat.width;
    const largestHeight = largestFormat.height;

    // find the largest size format
    if (width > largestWidth || height > largestHeight) {
      largestFormat = f;
    } else if (width === largestWidth && height === largestHeight) {
      // also select framerate
      if (thisFps === VIDEO_FPS) {
        largestFormat = f;
      }
    }
  });

  console.log(`autoSelectFormat: selecting ${JSON.stringify(largestFormat)}`);
  if (getFps(largestFormat) !== VIDEO_FPS) {
    throw Error(
      `can't find matching FPS for format: ${getFps(
        largestFormat,
      )} !== ${VIDEO_FPS}`,
    );
  }

  return largestFormat;
};

export const getControl = (cam: Cam, searchString: string) => {
  const searchTokens = searchString.split(" ");

  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < cam.controls.length; i++) {
    const control = cam.controls[i];
    let include = true;

    searchTokens.forEach(token => {
      include =
        include && control.name.toLowerCase().includes(token.toLowerCase());
    });

    if (include) {
      return control;
    }
  }
  return undefined;
};

export const centerAxis = async (cam: Cam, axis: string, backwards = false) => {
  const speedControl = getControl(cam, `${axis} speed`);
  const relControl = getControl(cam, `${axis} relative`);

  // move camera to extremes
  console.log(`move ${axis} to min`);
  cam.controlSet(speedControl.id, -1);
  await timeout(10 * MILLISECONDS_IN_SECOND);
  console.log(`stop ${axis}`);
  cam.controlSet(speedControl.id, 0);
  await timeout(2 * MILLISECONDS_IN_SECOND);
  console.log(`move ${axis} to center`);
  const numSteps = 3;
  for (let i = 0; i < numSteps + 1; i++) {
    console.log(`step ${i}`);
    cam.controlSet(
      relControl.id,
      ((backwards ? -1 : 1) * relControl.max) / numSteps,
    );
    await timeout(2 * MILLISECONDS_IN_SECOND);
  }
  cam.controlSet(
    relControl.id,
    ((backwards ? -1 : 1) * relControl.max) / (2 * numSteps),
  );
  await timeout(2 * MILLISECONDS_IN_SECOND);
};

export const assertCameraIsOn = async (deviceId: LocalDeviceId) => {
  while (!(cameraDevices[deviceId] && cameraDevices[deviceId].isOn)) {
    console.log("assertCameraIsOn", deviceId);
    await timeout(500);
  }
};

export const getZoomInfo = (cam: Cam) => {
  const zoomControl = getControl(cam, `zoom absolute`);
  return zoomControl
    ? {
        min: zoomControl.min,
        max: zoomControl.max,
        default: zoomControl.default,
      }
    : {
        min: 0,
        max: 0,
        default: 0,
      };
};

export const getZoomRelativeControl = (cam: Cam) => {
  const zoomAbsControl = getControl(cam, `zoom absolute`);

  return zoomAbsControl
    ? (zoom: number, direction: "in" | "out") => {
        const { min, max } = getZoomInfo(cam);
        const zoomDelta = (direction === "in" ? 1 : -1) * 10;

        let newZoom = zoom + zoomDelta;

        if (zoom < min) {
          newZoom = min;
        } else if (zoom > max) {
          newZoom = max;
        }

        setCameraDeviceZoom(cam.device, newZoom);

        console.log("zoom", direction, newZoom, "delta", zoomDelta);

        cam.controlSet(zoomAbsControl.id, newZoom);
      }
    : () => {
        console.log(`no zoom control found for ${cam.device}`);
      };
};

export const moveAxisRelative = (
  cam: Cam,
  axis: "pan" | "tilt",
  direction: "up" | "down" | "left" | "right",
  amount: number,
) => {
  const posRelControl = getControl(cam, `${axis} relative`);
  if (posRelControl) {
    console.log(cam.device, axis, direction, amount);
    cam.controlSet(
      posRelControl.id,
      (direction === "up" || direction === "right" ? 1 : -1) * amount,
    );
  }
};

export const moveAxisSpeedStart = (
  cam: Cam,
  axis: "pan" | "tilt",
  direction: "up" | "down" | "left" | "right",
) => {
  const speedControl = getControl(cam, `${axis} speed`);
  if (speedControl) {
    console.log(cam.device, axis, "start", direction);
    cam.controlSet(
      speedControl.id,
      direction === "up" || direction === "right" ? 1 : -1,
    );
  }
};

export const moveAxisSpeedStop = (cam: Cam, axis: "pan" | "tilt") => {
  const speedControl = getControl(cam, `${axis} speed`);
  if (speedControl) {
    console.log(cam.device, axis, "stop");
    cam.controlSet(speedControl.id, 0);
  }
};
