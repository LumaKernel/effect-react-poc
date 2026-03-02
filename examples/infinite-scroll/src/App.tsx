import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { PostList } from "./PostList.js";

/**
 * Infinite scroll example demonstrating:
 *
 * 1. Stream.paginateChunkEffect for cursor-based pagination
 * 2. Deferred for user-controlled page gating (load more on demand)
 * 3. Stream.mapAccum for accumulating results across pages
 * 4. useEffectStream for subscribing to the paginated stream
 * 5. IntersectionObserver for scroll-based load triggering
 *
 * Uses jsonplaceholder API (100 posts, 10 per page).
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <h1>effect-react Infinite Scroll</h1>
    <p>
      Uses <code>Stream.paginateChunkEffect</code> for cursor-based pagination
      with <code>useEffectStream</code>. Scroll down to load more posts
      automatically via <code>IntersectionObserver</code>.
    </p>
    <PostList />
  </EffectProvider>
);
