import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { Config } from "../common/types";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";

import "react-toggle/style.css";
import Toggle from "react-toggle";

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

const ConfigBooleanInput = ({
  configKey,
  configValue,
  displayText,
  onSetConfigValue,
}: Props) => {
  const [value, setValue] = React.useState(configValue);
  const handleChange = async (e: any) => {
    const checked = Boolean(e.target.checked);
    setValue(checked);
    await onSetConfigValue(configKey, checked ? "True" : "False");
  };

  return (
    <div>
      <label>
        <span>{displayText}</span>
        <Toggle
          defaultChecked={value}
          value={value ? "yes" : "no"}
          onChange={handleChange}
        />
      </label>
    </div>
  );
};

export default connector(ConfigBooleanInput);
