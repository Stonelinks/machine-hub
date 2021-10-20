import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import rootReducer from "./redux";

// tslint:disable-next-line:no-var-requires
const { LocationProvider } = require("react-location");

const store = createStore(rootReducer, applyMiddleware(thunk));

ReactDOM.render(
  <LocationProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </LocationProvider>,
  document.getElementById("root"),
);
