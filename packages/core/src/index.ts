export type {
  EffectResult,
  Initial,
  Pending,
  Success,
  Failure,
  Refreshing,
} from "./EffectResult.js";

export {
  initial,
  pending,
  success,
  failure,
  refreshing,
  isInitial,
  isPending,
  isSuccess,
  isFailure,
  isRefreshing,
  matchEffectResult,
  hasValue,
  getValue,
} from "./EffectResult.js";
