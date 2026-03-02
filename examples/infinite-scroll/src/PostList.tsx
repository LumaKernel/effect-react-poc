import { useCallback, useEffect, useRef } from "react";
import { matchEffectResult } from "@effect-react/core";
import { useInfiniteScroll } from "./useInfiniteScroll.js";

/**
 * Post list component with infinite scroll.
 *
 * Uses useInfiniteScroll hook for paginated data fetching
 * and IntersectionObserver to detect when the sentinel element
 * (at the bottom of the list) becomes visible, triggering loadMore().
 *
 * Demonstrates: IntersectionObserver, useEffectStream, matchEffectResult
 */
export const PostList = (): React.ReactNode => {
  const { result, loadMore } = useInfiniteScroll();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  // Set up IntersectionObserver on the sentinel element.
  // When the sentinel becomes visible (user scrolled to bottom),
  // call loadMore() to fetch the next page.
  const observerCallback = useCallback(
    (entries: readonly IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry?.isIntersecting === true) {
        loadMoreRef.current();
      }
    },
    [],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (sentinel === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        observerCallback(entries);
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [observerCallback]);

  return matchEffectResult(result, {
    Initial: () => <p>Ready to load posts...</p>,
    Pending: () => <p>Loading first page...</p>,
    Success: ({ value: pageState }) => (
      <div>
        <p style={{ color: "#666" }}>
          Loaded {String(pageState.posts.length)} posts (page{" "}
          {String(pageState.currentPage + 1)})
          {pageState.hasMore ? " — scroll down for more" : " — all loaded!"}
        </p>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {pageState.posts.map((post) => (
            <li
              key={post.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "8px",
              }}
            >
              <strong>
                #{String(post.id)} {post.title}
              </strong>
              <p style={{ color: "#555", margin: "4px 0 0" }}>{post.body}</p>
            </li>
          ))}
        </ul>

        {pageState.hasMore ? (
          <div
            ref={sentinelRef}
            style={{ padding: "20px", textAlign: "center", color: "#888" }}
          >
            Loading more posts...
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "#888" }}>
            All posts loaded.
          </p>
        )}
      </div>
    ),
    Failure: ({ cause }) => (
      <p style={{ color: "red" }}>Error: {String(cause)}</p>
    ),
    Refreshing: ({ value: pageState }) => (
      <div>
        <p>Refreshing... ({String(pageState.posts.length)} posts loaded)</p>
      </div>
    ),
  });
};
