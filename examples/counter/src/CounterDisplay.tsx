import { useCounterValue } from "./useCounter.js";

/**
 * Displays the current counter value.
 * Multiple instances of this component share the same SubscriptionRef
 * through the Counter Layer, demonstrating real-time shared state.
 */
export const CounterDisplay = ({
  label,
}: {
  readonly label: string;
}): React.ReactNode => {
  const value = useCounterValue();

  return (
    <div>
      <strong>{label}: </strong>
      <span>{value ?? "..."}</span>
    </div>
  );
};
