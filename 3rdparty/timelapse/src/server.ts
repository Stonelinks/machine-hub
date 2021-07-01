import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as url from "url";
import * as express from "express";
import { SERVER_PORT, VIEWER_FOLDER, CAPTURE_FOLDER } from "./common/constants";
import { initConfig } from "./utils/config";
import { cron } from "./utils/cron";
import { registerVideoDeviceRoutes } from "./routes/videoDevices";
import { registerConfigRoutes } from "./routes/config";
import { registerTimelapseRoutes } from "./routes/timelapse";
import { getThumbnail } from "./utils/images";
import { decode } from "./common/encode";
import * as expressWs from "express-ws";

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

app.get("/ping", (req, res) => {
  res.send(JSON.stringify({ pong: "pong" }));
});

// Clients poll this, so when the server restarts it'll restart clients
let shouldRestart = true;
app.get("/update-apps", (req, res) => {
  res.send(JSON.stringify({ shouldRestart }));
  shouldRestart = false;
});

app.get("/thumb/:imageFilePath", async (req, res) => {
  const imageFilePath = decode(req.params.imageFilePath);
  const thumbPath = await getThumbnail(imageFilePath);
  res.sendFile(thumbPath);
});

(async () => {
  try {
    await initConfig();
    await registerVideoDeviceRoutes(app);
    await registerConfigRoutes(app);
    await registerTimelapseRoutes(app);
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
