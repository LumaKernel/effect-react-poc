import { matchEffectResult } from "@effect-react/core";
import { useEffectQuery } from "@effect-react/react";
import type { Post } from "./api.js";
import { fetchPosts } from "./api.js";

/**
 * Non-suspense version of data fetching using useEffectQuery.
 *
 * Demonstrates explicit state handling with matchEffectResult:
 * - Initial: before the effect runs
 * - Pending: while fetching
 * - Success: data is available
 * - Failure: error occurred
 * - Refreshing: re-fetching while showing stale data
 */
export const QueryView = (): React.ReactNode => {
  const result = useEffectQuery("posts", fetchPosts);

  return (
    <div>
      <h3>useEffectQuery (non-suspense)</h3>
      <p>
        Manually handles all states: Initial, Pending, Success, Failure,
        Refreshing.
      </p>
      {matchEffectResult(result, {
        Initial: () => <p>Initializing...</p>,
        Pending: () => <p>Loading posts...</p>,
        Success: ({ value }) => <PostList posts={value} />,
        Failure: ({ cause }) => (
          <p style={{ color: "red" }}>Error: {String(cause)}</p>
        ),
        Refreshing: ({ value }) => (
          <div>
            <p>Refreshing...</p>
            <PostList posts={value} />
          </div>
        ),
      })}
    </div>
  );
};

const PostList = ({
  posts,
}: {
  readonly posts: readonly Post[];
}): React.ReactNode => (
  <ul>
    {posts.slice(0, 5).map((post) => (
      <li key={post.id}>
        <strong>{post.title}</strong>
        <p>{post.body.slice(0, 100)}...</p>
      </li>
    ))}
    {posts.length > 5 && <li>...and {posts.length - 5} more posts</li>}
  </ul>
);
