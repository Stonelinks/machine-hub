import * as fs from "fs";
import { timeout, MILLISECONDS_IN_SECOND } from "../common/time";
import { EventEmitter } from "events";
import { DeviceId } from "../common/types";

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
  type: "int";
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
  deviceId: DeviceId,
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

export const setCameraDeviceZoom = (deviceId: DeviceId, zoom: number) => {
  cameraDevices[deviceId].zoom = zoom;
};

export const start = async (deviceId: DeviceId): Promise<void> => {
  console.log(`start ${deviceId}`);
  const { cam, isOn, initState } = getOrCreateCameraDevice(deviceId);
  if (isOn) {
    return Promise.resolve();
  }

  return new Promise(async res => {
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
        const fpsMs = fpsToMs(getFps(cam.configGet()));

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
        // wait while camera initializes
        let latestInitState: InitState = initState;
        while (latestInitState !== InitState.done) {
          console.log("another init already in progress, waiting");
          const { initState: iState } = getOrCreateCameraDevice(deviceId);
          latestInitState = iState;
          await timeout(300);
        }
        res();
        break;

      case InitState.done:
      default:
        break;
    }
  });
};

export const stop = (deviceId: DeviceId) => {
  console.log(`stop ${deviceId}`);
  const { isOn } = getOrCreateCameraDevice(deviceId);
  if (isOn) {
    cameraDevices[deviceId].isOn = false;
  }
};

export const takeSnapshot = async (deviceId: DeviceId): Promise<Buffer> => {
  await start(deviceId);

  while (!cameraDevices[deviceId].lastFrame) {
    await timeout(50);
  }

  return cameraDevices[deviceId].lastFrame;
};

export const getFps = (f: Format) => {
  return f.interval.numerator / f.interval.denominator;
};

export const fpsToMs = (fps: number) => fps * MILLISECONDS_IN_SECOND;

export const autoSelectFormat = (cam: Cam) => {
  const mjpegFormats = cam.formats.filter(f => f.formatName === "MJPG");
  let largestFormat: Format = mjpegFormats[0];

  mjpegFormats.forEach((f: Format) => {
    const { width, height } = f;
    const thisFps = getFps(f);
    const fastestFps = getFps(largestFormat as Format);
    const largestWidth = largestFormat.width;
    const largestHeight = largestFormat.height;

    // find the largest size format
    if (width > largestWidth || height > largestHeight) {
      largestFormat = f;
    } else if (width === largestWidth && height === largestHeight) {
      // also select fastest framerate
      if (thisFps > fastestFps) {
        largestFormat = f;
      }
    }
  });

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

export const assertCameraIsOn = async (deviceId: DeviceId) => {
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
