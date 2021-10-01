import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { Config } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";

const mapState = (state: RootState) => ({});

const mapDispatch = {
  onSetConfigValue: (configKey: keyof Config, configValue: any) =>
    apiCall("setConfigValue", { configKey, configValue }),
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

const RemoteDeviceConfigInput = ({
  configKey,
  configValue,
  displayText,
  onSetConfigValue,
  onHandleChange,
}: Props) => {
  const [value, setValue] = React.useState(configValue);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfigValue = e.target.value;
    setValue(newConfigValue);
    if (onHandleChange) onHandleChange(newConfigValue);
  };

  return (
    <div style={{ display: "inline-block" }}>
      <label>
        {`${displayText}: ${value} `}
        <input value={value} onChange={handleChange} />
      </label>
    </div>
  );
};

export default connector(RemoteDeviceConfigInput);
