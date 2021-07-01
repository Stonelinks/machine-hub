import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";
import { initUpdateCheckInterval } from "./utils/api";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import rootReducer from "./redux";
import { isLocalhost } from "./utils/url";

// tslint:disable-next-line:no-var-requires
const { LocationProvider } = require("react-location");

if (isLocalhost) initUpdateCheckInterval();

const store = createStore(rootReducer, applyMiddleware(thunk));

ReactDOM.render(
  <LocationProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </LocationProvider>,
  document.getElementById("root"),
);
