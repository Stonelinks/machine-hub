import { Application } from "express-ws";
import { getConfig, setConfigValue } from "../utils/config";
import { decode } from "../common/encode";
import { Config } from "../common/types";
import { isNumeric } from "../common/number";

export const registerConfigRoutes = async (app: Application) => {
  app.get("/config/get", async (req, res) => {
    const c = await getConfig();
    res.send(JSON.stringify(c));
  });

  app.get("/config/:configKey/set/:configValue", async (req, res) => {
    const configKey = decode(req.params.configKey) as keyof Config;
    let configValue = decode(req.params.configValue) as Config[keyof Config];
    if (configValue === "True") {
      configValue = true;
    } else if (configValue === "False") {
      configValue = false;
    } else if (isNumeric(configValue as string)) {
      configValue = parseInt(configValue as string, 10);
    } else if (
      (configValue as string).length &&
      configValue[0] === "[" &&
      configValue[(configValue as string).length - 1] === "]"
    ) {
      configValue = JSON.parse(configValue as string);
    }

    await setConfigValue(configKey, configValue);
    res.send(JSON.stringify(true));
  });
};
