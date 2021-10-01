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
  configKey: keyof Config;
  configValue: any; // TODO
  displayText: string;
}

type Props = PropsFromRedux & OwnProps;

const ConfigStringInput = ({
  configKey,
  configValue,
  displayText,
  onSetConfigValue,
}: Props) => {
  const [value, setValue] = React.useState(configValue);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfigValue = e.target.value;
    setValue(newConfigValue);
    await onSetConfigValue(configKey, newConfigValue);
  };

  return (
    <div>
      <label>
        {displayText}
        <input value={value} onChange={handleChange} />
      </label>
    </div>
  );
};

export default connector(ConfigStringInput);
