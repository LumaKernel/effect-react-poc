import { useEffectSuspense } from "@effect-react/react";
import type { Post } from "./api.js";
import { fetchPost } from "./api.js";

/**
 * Suspense-based version of data fetching using useEffectSuspense.
 *
 * Demonstrates:
 * - Automatic Suspense integration (loading handled by parent Suspense boundary)
 * - Direct value access (no need to match on states)
 * - ErrorBoundary integration for error handling (handled by parent EffectBoundary)
 */
export const SuspenseView = (): React.ReactNode => {
  const post = useEffectSuspense("post-1", fetchPost(1));

  return (
    <div>
      <PostDetail post={post} />
    </div>
  );
};

const PostDetail = ({ post }: { readonly post: Post }): React.ReactNode => (
  <div>
    <h4>{post.title}</h4>
    <p>{post.body}</p>
    <p>
      <em>
        Post ID: {post.id}, User ID: {post.userId}
      </em>
    </p>
  </div>
);
