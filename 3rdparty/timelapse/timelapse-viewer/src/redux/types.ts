import { AnyAction } from "redux";
import { ThunkAction } from "redux-thunk";
import { RootState } from ".";

export interface Action<T extends string> extends AnyAction {
  type: T;
  payload?: any;
}

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
