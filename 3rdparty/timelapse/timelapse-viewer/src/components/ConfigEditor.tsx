import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DEVICE_ID_NONE } from "../common/constants";
import { nothing } from "../common/nothing";
import { Config } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";
import { reload } from "../utils/url";
import ConfigBooleanInput from "./ConfigBooleanInput";
import ConfigNumberInput from "./ConfigNumberInput";
import ConfigSelectionInput from "./ConfigSelectionInput";
import ConfigStringInput from "./ConfigStringInput";
import ConfigTimeInput from "./ConfigTimeInput";
import DeviceConfigSelector from "./DeviceConfigSelector";

const mapState = (state: RootState) => ({
  config: state.api.getConfig.value as Config | typeof nothing,
});

const mapDispatch = {
  onGetConfig: () => apiCall("getConfig"),
  onSetCaptureDevicesConfigValue: (captureDevices: Config["captureDevices"]) =>
    apiCall("setConfigValue", {
      configKey: "captureDevices",
      configValue: JSON.stringify(captureDevices),
    }),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {}

type Props = PropsFromRedux & OwnProps;

enum INPUT_TYPES {
  HEADING,
  DEVICE,
  STRING,
  BOOLEAN,
  NUMBER,
  SELECT,
  TIME,
}

interface ConfigEditorItem {
  type: INPUT_TYPES;
  displayText: string;
  configKey?: keyof Config;
  options?: string[];
  positiveOnly?: boolean;
}

const ConfigEditorItems: ConfigEditorItem[] = [
  { type: INPUT_TYPES.HEADING, displayText: "Capture config" },
  {
    type: INPUT_TYPES.STRING,
    configKey: "captureName",
    displayText: "Capture Name",
  },
  {
    type: INPUT_TYPES.BOOLEAN,
    configKey: "captureEnable",
    displayText: "Capture Enable",
  },
  {
    type: INPUT_TYPES.NUMBER,
    configKey: "captureRateMs",
    displayText: "Capture Rate (ms)",
    positiveOnly: true,
  },
  { type: INPUT_TYPES.HEADING, displayText: "Window settings" },
  {
    type: INPUT_TYPES.BOOLEAN,
    configKey: "captureWindowEnable",
    displayText: "Window enable",
  },
  {
    type: INPUT_TYPES.TIME,
    configKey: "captureWindowStart",
    displayText: "Window start",
  },
  {
    type: INPUT_TYPES.TIME,
    configKey: "captureWindowEnd",
    displayText: "Window end",
  },
  {
    type: INPUT_TYPES.BOOLEAN,
    configKey: "windowExternalTriggerEnable",
    displayText: "Exernal trigger enable",
  },
  {
    type: INPUT_TYPES.STRING,
    configKey: "windowExternalTriggerUrl",
    displayText: "Exernal trigger URL",
  },
  { type: INPUT_TYPES.HEADING, displayText: "Controls config" },
  {
    type: INPUT_TYPES.BOOLEAN,
    configKey: "controlsEnable",
    displayText: "Controls Enable",
  },
  {
    type: INPUT_TYPES.DEVICE,
    configKey: "controlsDevice",
    displayText: "Controls device",
  },
  // {
  //   type: INPUT_TYPES.HEADING,
  //   displayText: "Pan config",
  //   isPtzControlRelated: true,
  // },
  // {
  //   type: INPUT_TYPES.BOOLEAN,
  //   configKey: "panStepEnable",
  //   displayText: "Pan Enable",
  //   isPtzControlRelated: true,
  // },
  // {
  //   type: INPUT_TYPES.NUMBER,
  //   configKey: "panStepRateMs",
  //   displayText: "Pan Rate (ms)",
  //   positiveOnly: true,
  //   isPtzControlRelated: true,
  // },
  // {
  //   type: INPUT_TYPES.SELECT,
  //   configKey: "panStepDirection",
  //   displayText: "Pan step direction",
  //   options: ["left", "right"],
  //   isPtzControlRelated: true,
  // },
  // {
  //   type: INPUT_TYPES.HEADING,
  //   displayText: "Tilt config",
  //   isPtzControlRelated: true,
  // },
  // {
  //   type: INPUT_TYPES.BOOLEAN,
  //   configKey: "tiltStepEnable",
  //   displayText: "Tilt Enable",
  //   isPtzControlRelated: true,
  // },
  // {
  //   type: INPUT_TYPES.NUMBER,
  //   configKey: "tiltStepRateMs",
  //   displayText: "Tilt Rate (ms)",
  //   positiveOnly: true,
  //   isPtzControlRelated: true,
  // },
  // {
  //   type: INPUT_TYPES.SELECT,
  //   configKey: "tiltStepDirection",
  //   displayText: "Tilt step direction",
  //   options: ["up", "down"],
  //   isPtzControlRelated: true,
  // },
];

const ConfigEditor = ({
  config,
  onGetConfig,
  onSetCaptureDevicesConfigValue,
}: Props) => {
  React.useEffect(() => {
    onGetConfig();
  }, [onGetConfig]);

  if (config === nothing) {
    return null;
  }

  const captureDevices = new Array(...config.captureDevices);

  return (
    <div>
      {/* <Debug d={config} /> */}
      <h3>Device config</h3>
      <div>
        {captureDevices.length ? (
          captureDevices.map((deviceId, index) => {
            return (
              <div key={"capture device"}>
                <DeviceConfigSelector
                  displayText={`Capture device ${index + 1}`}
                  configValue={deviceId}
                  onHandleChange={newDeviceId => {
                    captureDevices[index] = newDeviceId;
                    onSetCaptureDevicesConfigValue(captureDevices);
                  }}
                />
                <button
                  style={{ marginLeft: "10px" }}
                  onClick={async () => {
                    captureDevices.splice(index, 1);
                    await onSetCaptureDevicesConfigValue(captureDevices);
                    reload();
                  }}
                >{`X`}</button>
              </div>
            );
          })
        ) : (
          <div>No capture devices</div>
        )}
        <button
          onClick={async () => {
            captureDevices.push(DEVICE_ID_NONE);
            await onSetCaptureDevicesConfigValue(captureDevices);
            reload();
          }}
        >
          Add device
        </button>
      </div>
      {ConfigEditorItems.map(
        ({ type, displayText, configKey, options, positiveOnly }, index) => {
          configKey = configKey || "";
          options = options || [];
          positiveOnly = positiveOnly || false;
          switch (type) {
            case INPUT_TYPES.HEADING:
              return <h3 key={index}>{displayText}</h3>;
            case INPUT_TYPES.DEVICE:
              return (
                <DeviceConfigSelector
                  key={index}
                  configKey={configKey}
                  displayText={displayText}
                  configValue={config[configKey]}
                />
              );
            case INPUT_TYPES.STRING:
              return (
                <ConfigStringInput
                  key={index}
                  configKey={configKey}
                  displayText={displayText}
                  configValue={config[configKey]}
                />
              );
            case INPUT_TYPES.TIME:
              return (
                <ConfigTimeInput
                  key={index}
                  configKey={configKey}
                  displayText={displayText}
                  configValue={config[configKey]}
                />
              );
            case INPUT_TYPES.BOOLEAN:
              return (
                <ConfigBooleanInput
                  key={index}
                  configKey={configKey}
                  displayText={displayText}
                  configValue={config[configKey]}
                />
              );
            case INPUT_TYPES.NUMBER:
              return (
                <ConfigNumberInput
                  key={index}
                  configKey={configKey}
                  displayText={displayText}
                  configValue={config[configKey]}
                  positiveOnly={positiveOnly}
                />
              );
            case INPUT_TYPES.SELECT:
              return (
                <ConfigSelectionInput
                  key={index}
                  configKey={configKey}
                  displayText={displayText}
                  configValue={config[configKey]}
                  options={options}
                />
              );
            default:
              return null;
          }
        },
      )}
    </div>
  );
};

export default connector(ConfigEditor);
