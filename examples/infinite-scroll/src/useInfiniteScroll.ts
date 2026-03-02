import { useCallback, useMemo, useRef } from "react";
import { Chunk, Deferred, Effect, Option, Stream } from "effect";
import { useEffectStream } from "@effect-react/react";
import { isSuccess, type EffectResult } from "@effect-react/core";
import type { ApiError, PageState, Post } from "./api.js";
import { fetchPage, PAGE_SIZE } from "./api.js";

/**
 * Result returned by useInfiniteScroll hook.
 */
export interface InfiniteScrollResult {
  /** Current page state wrapped in EffectResult. */
  readonly result: EffectResult<PageState, ApiError>;
  /** Trigger loading the next page. No-op if already loading or no more pages. */
  readonly loadMore: () => void;
}

/**
 * Custom hook for infinite scroll with user-controlled pagination.
 *
 * Architecture:
 * - Uses Stream.paginateChunkEffect for cursor-based pagination
 * - Between pages, the stream awaits a Deferred that `loadMore()` resolves
 * - Stream.mapAccum accumulates posts across pages into PageState
 * - useEffectStream subscribes to the accumulated stream
 * - IntersectionObserver (in the component) calls loadMore() when sentinel is visible
 *
 * The first page is fetched automatically. Subsequent pages require loadMore().
 *
 * Demonstrates: Stream.paginateChunkEffect, Deferred for gating, mapAccum, useEffectStream
 */
export const useInfiniteScroll = (): InfiniteScrollResult => {
  // Mutable ref to hold the resolve function for the current Deferred gate.
  // When loadMore() is called, it resolves the deferred, allowing the stream
  // to proceed to the next page.
  const resolveRef = useRef<(() => void) | null>(null);

  // Build the gated paginated stream once (stable reference via useMemo).
  const stream = useMemo((): Stream.Stream<PageState, ApiError> => {
    // Raw paginated stream with Deferred gates between pages.
    // Page 0: fetched immediately (no gate)
    // Page N (N>0): stream awaits a Deferred before fetching
    const rawStream: Stream.Stream<readonly Post[], ApiError> =
      Stream.paginateChunkEffect(0, (page) =>
        Effect.gen(function* () {
          // For pages after the first, wait for loadMore()
          if (page > 0) {
            const deferred = yield* Deferred.make<undefined>();
            resolveRef.current = () => {
              Effect.runSync(Deferred.succeed(deferred, undefined));
            };
            yield* Deferred.await(deferred);
          }

          const posts = yield* fetchPage(page);
          return [
            Chunk.of(posts),
            posts.length < PAGE_SIZE
              ? Option.none<number>()
              : Option.some(page + 1),
          ] as const;
        }),
      );

    // Accumulate pages into PageState
    return rawStream.pipe(
      Stream.mapAccum(
        { posts: [] as readonly Post[], currentPage: -1 },
        (acc, pagePosts) => {
          const nextPage = acc.currentPage + 1;
          const accumulated: readonly Post[] = [...acc.posts, ...pagePosts];
          const state: PageState = {
            posts: accumulated,
            hasMore: pagePosts.length >= PAGE_SIZE,
            currentPage: nextPage,
            isLoadingMore: false,
          };
          return [{ posts: accumulated, currentPage: nextPage }, state];
        },
      ),
    );
  }, []);

  const { result } = useEffectStream(stream);

  const loadMore = useCallback(() => {
    // Only allow loading more if we have data and there are more pages
    if (isSuccess(result)) {
      const pageState = result.value;
      if (pageState.hasMore && resolveRef.current !== null) {
        resolveRef.current();
        resolveRef.current = null;
      }
    }
  }, [result]);

  return { result, loadMore };
};
