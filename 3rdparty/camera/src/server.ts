import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as expressWs from "express-ws";
import * as path from "path";
import * as url from "url";
import { CAPTURE_FOLDER, SERVER_PORT, VIEWER_FOLDER } from "./common/constants";
import { decode } from "./common/encode";
import { registerConfigRoutes } from "./routes/config";
import { streamingRoutes } from "./routes/streaming";
import { registerTimelapseRoutes } from "./routes/timelapse";
import { registerVideoDeviceRoutes } from "./routes/videoDevices";
import { initConfig } from "./utils/config";
import { cron } from "./utils/cron";
import { deleteDir, deleteFile } from "./utils/files";
import { getThumbnail } from "./utils/images";
import { initRtspServer } from "./utils/rtsp";

const app = (express() as unknown) as expressWs.Application;

expressWs(app, null, {
  wsOptions: {
    perMessageDeflate: false,
  },
});

app.use(express.static(VIEWER_FOLDER));
app.use(express.static(CAPTURE_FOLDER));

app.use(cors());

app.use(
  bodyParser.json({
    limit: "1gb", // heaven help us if we ever get more than a gig of JSON
  }),
);

app.get("/thumb/:imageFilePath", async (req, res) => {
  const imageFilePath = decode(req.params.imageFilePath);
  const thumbPath = await getThumbnail(imageFilePath);
  res.sendFile(thumbPath);
});

app.get("/delete/:filePath", async (req, res) => {
  const filePath = decode(req.params.filePath);
  await deleteFile(path.join(CAPTURE_FOLDER, filePath));
  res.send(200);
});

app.get("/deleteAll/:filePath", async (req, res) => {
  const filePath = decode(req.params.filePath);
  await deleteDir(path.join(CAPTURE_FOLDER, filePath));
  res.send(200);
});

(async () => {
  try {
    await initConfig();
    await registerVideoDeviceRoutes(app);
    await streamingRoutes(app);
    await registerConfigRoutes(app);
    await registerTimelapseRoutes(app);
    await initRtspServer();
  } catch (e) {
    console.error(e);
  } finally {
    // register catchall route
    app.get("*", (req, res) => {
      console.log(
        `missed URL: ${url.format({
          protocol: req.protocol,
          host: req.get("host"),
          pathname: req.originalUrl,
        })}`,
      );
      res.sendFile(`${VIEWER_FOLDER}/index.html`);
    });

    // start the server
    app.listen(SERVER_PORT, () => {
      console.log(`server listening on ${SERVER_PORT}`);
    });
  }

  cron.start();
})();
