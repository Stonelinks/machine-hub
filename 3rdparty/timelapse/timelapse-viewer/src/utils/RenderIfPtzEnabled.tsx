import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { RootState } from "../redux";
import { apiCall } from "../redux/api/actions";

const mapState = (state: RootState) => ({
  controlsEnable: state.api.getConfig?.value?.controlsEnable,
});

const mapDispatch = {
  onGetConfig: () => apiCall("getConfig"),
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {
  WrappedComponent: React.ComponentType<any>;
}

type Props = PropsFromRedux & OwnProps;

const RenderIfPtzEnabled = ({
  WrappedComponent,
  controlsEnable,
  onGetConfig,
}: Props) => {
  React.useEffect(() => {
    onGetConfig();
  }, [onGetConfig]);

  return controlsEnable ? <WrappedComponent /> : null;
};

export default connector(RenderIfPtzEnabled);
