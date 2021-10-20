import { RtspRequest } from "rtsp-server";
import RtspServer, { Mount } from "rtsp-streaming-server";
import {
  ENABLE_LOCAL_RTSP_SERVER,
  LOCAL_RTSP_CLIENT_PORT,
  LOCAL_RTSP_SERVER_PORT,
} from "../common/constants";
import { decode } from "../common/encode";
import { MILLISECONDS_IN_SECOND, timeout } from "../common/time";
import { LocalDeviceId, VideoStreamTypes } from "../common/types";
import {
  getOrCreateStreamingInfo,
  startFfmpegRtspStreamer,
  videoStreamUserConnected,
  videoStreamUserDisconnected,
} from "./streaming";
import { listVideoDevices } from "./videoDevices";

const log = (...args: any[]) => console.log("rtsp server:", ...args);
const err = (...args: any[]) => console.error("rtsp server:", ...args);

export const initRtspServer = () => {
  if (ENABLE_LOCAL_RTSP_SERVER) {
    const RTSPServerConfig = {
      // serverPort: port to listen to incoming RTSP/RTP streams from producers on
      serverPort: LOCAL_RTSP_SERVER_PORT,

      // clientPort: port to listen to incoming RTSP requests from clients on
      clientPort: LOCAL_RTSP_CLIENT_PORT,

      // rtpPortStart: UDP port to start at for requests
      rtpPortStart: 10000,

      // rtpPortCount: Number of UDP Ports to use for requests. This needs to be a multiple of 2 as pairs of ports are assigned for RTP sessions. If this is set too low and it runs out then no more streams will work
      rtpPortCount: 10000,
    };
    const server = new RtspServer({
      ...RTSPServerConfig,
      // publishServerHooks: object of hooks for the publishing server
      publishServerHooks: {},
      // clientServerHooks: object of hooks for the client server
      clientServerHooks: {
        checkMount: async (req: RtspRequest): Promise<boolean> => {
          const url = new URL(req.uri);
          const videoDevices = await listVideoDevices();
          const deviceId = decode(url.pathname.slice(1)) as LocalDeviceId;
          log(`attempting to start rtsp connection for ${deviceId}`);

          // tslint:disable-next-line:prefer-for-of
          for (let i = 0; i < videoDevices.length; i++) {
            const videoDevice = videoDevices[i];
            if (deviceId === videoDevice) {
              log("starting rtsp stream for", deviceId);
              videoStreamUserConnected(deviceId, VideoStreamTypes.ffmpegRtsp);
              const { ffmpegRtspHandle } = getOrCreateStreamingInfo(deviceId);
              if (!ffmpegRtspHandle) {
                await startFfmpegRtspStreamer(deviceId);
              }

              // waiting for stream to start
              await timeout(3 * MILLISECONDS_IN_SECOND);

              return true;
            }
          }

          err("could not find device for", deviceId);

          return false;
        },
        clientClose: async (mount: Mount): Promise<void> => {
          const deviceId = decode(mount.path.slice(1)) as LocalDeviceId;
          const videoDevices = await listVideoDevices();
          log(`client has disconnected from ${deviceId}`);

          let hasFoundVideoDevice = false;

          // tslint:disable-next-line:prefer-for-of
          for (let i = 0; i < videoDevices.length; i++) {
            const videoDevice = videoDevices[i];
            if (deviceId === videoDevice) {
              hasFoundVideoDevice = true;
            }
          }

          if (!hasFoundVideoDevice) {
            err("could not find device for", deviceId);
          } else {
            videoStreamUserDisconnected(deviceId, VideoStreamTypes.ffmpegRtsp);
          }
        },
      },
    });

    log("starting with config", RTSPServerConfig);

    server.start();
  }
};
