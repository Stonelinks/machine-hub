import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { Config } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";

const mapState = (state: RootState) => ({
  devices: state.api.devices.value as string[],
});

const mapDispatch = {
  onSetConfigValue: (configKey: keyof Config, configValue: any) =>
    apiCall("setConfigValue", { configKey, configValue }),
  onFetchDevices: () => apiCall("devices"),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {
  configKey?: keyof Config;
  configValue: any; // TODO
  displayText: string;
  onHandleChange?: (newDeviceId: string) => void;
}

type Props = PropsFromRedux & OwnProps;

const LocalDeviceConfigSelector = ({
  devices,
  onFetchDevices,
  configKey,
  configValue,
  displayText,
  onSetConfigValue,
  onHandleChange,
}: Props) => {
  const [value, setValue] = React.useState(configValue);

  React.useEffect(() => {
    onFetchDevices();
  }, [onFetchDevices]);

  if (!devices.length) {
    return null;
  }

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value as any;
    if (onHandleChange) {
      setValue(newDeviceId);
      onHandleChange(newDeviceId);
    } else if (configKey) {
      setValue(newDeviceId);
      await onSetConfigValue(configKey, newDeviceId);
    }
  };

  return (
    <div style={{ display: "inline-block" }}>
      <label>
        {`${displayText}: ${value} `}
        <select value={value} onChange={handleChange}>
          {devices.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default connector(LocalDeviceConfigSelector);
