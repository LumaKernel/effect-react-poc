import { Effect } from "effect";
import { useEffectQuery } from "@effect-react/react";
import { matchEffectResult } from "@effect-react/core";

/**
 * Demonstrates useEffectQuery with a simple synchronous Effect.
 * The result goes through Initial → Pending → Success states.
 */
export const QueryExample = (): React.ReactNode => {
  const result = useEffectQuery("hello", Effect.succeed("Hello from Effect!"));

  return matchEffectResult(result, {
    Initial: () => <p>Initializing...</p>,
    Pending: () => <p>Loading...</p>,
    Success: ({ value }) => <p>{value}</p>,
    Failure: () => <p>Error occurred</p>,
    Refreshing: ({ value }) => <p>{value} (refreshing...)</p>,
  });
};
