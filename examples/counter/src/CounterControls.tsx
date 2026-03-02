import { useCounterActions } from "./useCounter.js";

/**
 * Provides increment/decrement buttons that modify the shared Counter state.
 * Changes are immediately reflected in all CounterDisplay instances.
 */
export const CounterControls = (): React.ReactNode => {
  const { increment, decrement } = useCounterActions();

  return (
    <div>
      <button onClick={decrement}>-</button>
      <button onClick={increment}>+</button>
    </div>
  );
};
