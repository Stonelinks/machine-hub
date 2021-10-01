import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { isNumeric, isPositiveNumeric } from "../common/number";
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
  positiveOnly?: boolean;
}

type Props = PropsFromRedux & OwnProps;

const ConfigNumberInput = ({
  configKey,
  configValue,
  displayText,
  onSetConfigValue,
  positiveOnly,
}: Props) => {
  const [value, setValue] = React.useState(configValue);
  const [isNumber, setIsNumber] = React.useState(true);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfigValue = e.target.value;

    const testFunc = positiveOnly ? isPositiveNumeric : isNumeric;

    if (!testFunc(newConfigValue)) {
      setIsNumber(false);
    } else {
      setIsNumber(true);
      setValue(newConfigValue);
      await onSetConfigValue(configKey, newConfigValue);
    }
  };

  return (
    <div>
      <label>
        {displayText}
        <input value={value} onChange={handleChange} />
        {!isNumber ? (
          <p style={{ display: "inline-block", color: "red" }}>
            must be a{positiveOnly ? " positive" : ""} number
          </p>
        ) : null}
      </label>
    </div>
  );
};

export default connector(ConfigNumberInput);
