import { useEffectSuspense } from "@effect-react/react";
import { fetchUserProfile } from "./api.js";

/**
 * Component that uses useEffectSuspense to fetch a user profile.
 * When the effect fails, the error is caught by the parent EffectBoundary,
 * which receives a Cause<AppError> and can pattern-match on the error type.
 *
 * Demonstrates: useEffectSuspense + EffectBoundary + Cause<E> pattern matching.
 */
export const BoundaryDemo = (): React.ReactNode => {
  const result = useEffectSuspense("user-boundary", fetchUserProfile("99"));

  return (
    <p style={{ color: "#059669" }}>
      <strong>{result}</strong>
    </p>
  );
};
