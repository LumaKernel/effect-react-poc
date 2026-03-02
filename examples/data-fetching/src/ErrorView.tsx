import { useEffectSuspense } from "@effect-react/react";
import { fetchInvalid } from "./api.js";

/**
 * Component that intentionally fetches an invalid resource.
 * Used to demonstrate ErrorBoundary handling with EffectBoundary.
 *
 * The fetchInvalid effect will fail with an ApiError,
 * which is caught by the parent EffectBoundary's renderError prop.
 */
export const ErrorView = (): React.ReactNode => {
  const post = useEffectSuspense("invalid-post", fetchInvalid);

  return (
    <div>
      <p>This should not render: {post.title}</p>
    </div>
  );
};
