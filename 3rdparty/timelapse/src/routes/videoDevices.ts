import { Application } from "express-ws";
import { decode } from "../common/encode";
import { MILLISECONDS_IN_SECOND, timeout } from "../common/time";
import {
  getControl,
  getOrCreateCameraDevice,
  getZoomInfo,
  listVideoDevices,
  moveAxisRelative,
  moveAxisSpeedStart,
  moveAxisSpeedStop,
  setCameraDeviceZoom,
  takeSnapshot,
} from "../utils/videoDevices";

export const registerVideoDeviceRoutes = async (app: Application) => {
  app.get("/video-device/list", async (req, res) => {
    const l = await listVideoDevices();
    res.send(JSON.stringify(l));
  });

  app.get("/video-device/:deviceId/snapshot.jpg", async (req, res) => {
    const deviceId = decode(req.params.deviceId);
    const data = await takeSnapshot(deviceId);
    res.send(data);
  });

  app.get("/video-device/:deviceId/formats", (req, res) => {
    const deviceId = decode(req.params.deviceId);
    const { cam } = getOrCreateCameraDevice(deviceId);
    res.send(JSON.stringify(cam.formats));
  });

  app.get("/video-device/:deviceId/controls", (req, res) => {
    const deviceId = decode(req.params.deviceId);
    const { cam } = getOrCreateCameraDevice(deviceId);
    res.send(JSON.stringify(cam.controls));
  });

  app.get(
    "/video-device/:deviceId/control/:axis/:direction/position",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const axis = decode(req.params.axis) as any;
      const direction = decode(req.params.direction) as any;

      const { cam } = getOrCreateCameraDevice(deviceId);
      moveAxisRelative(cam, axis, direction, 128);
      await timeout(2 * MILLISECONDS_IN_SECOND);

      res.send(true);
    },
  );

  app.get(
    "/video-device/:deviceId/control/zoom/:direction",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const direction = decode(req.params.direction);

      const { cam, zoom } = getOrCreateCameraDevice(deviceId);
      const zoomAbsControl = getControl(cam, `zoom absolute`);
      if (zoomAbsControl) {
        const { min, max } = getZoomInfo(cam);
        const zoomDelta = (direction === "in" ? 1 : -1) * 10;

        let newZoom = zoom + zoomDelta;

        if (zoom < min) {
          newZoom = min;
        } else if (zoom > max) {
          newZoom = max;
        }

        setCameraDeviceZoom(deviceId, newZoom);

        console.log("zoom", direction, newZoom, "delta", zoomDelta);

        cam.controlSet(zoomAbsControl.id, newZoom);
      }

      res.send(true);
    },
  );

  app.get(
    "/video-device/:deviceId/control/:axis/:direction/speed/start",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const axis = decode(req.params.axis) as any;
      const direction = decode(req.params.direction) as any;

      const { cam } = getOrCreateCameraDevice(deviceId);
      moveAxisSpeedStart(cam, axis, direction);

      res.send(true);
    },
  );

  app.get(
    "/video-device/:deviceId/control/:axis/speed/stop",
    async (req, res) => {
      const deviceId = decode(req.params.deviceId);
      const axis = decode(req.params.axis) as any;

      const { cam } = getOrCreateCameraDevice(deviceId);
      moveAxisSpeedStop(cam, axis);

      res.send(true);
    },
  );
};
