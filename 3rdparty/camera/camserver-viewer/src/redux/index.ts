import { combineReducers } from "redux";
import api from "./api/store";

const rootReducer = combineReducers({
  api,
});

export default rootReducer;

export type RootState = ReturnType<typeof rootReducer>;
