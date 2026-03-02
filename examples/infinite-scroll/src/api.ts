import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
} from "@effect/platform";
import { Data, Effect, Schema } from "effect";

/**
 * Post schema for jsonplaceholder API responses.
 */
const Post = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  body: Schema.String,
  userId: Schema.Number,
});

export type Post = typeof Post.Type;

const Posts = Schema.Array(Post);

/**
 * Typed error for API failures.
 */
export class ApiError extends Data.TaggedError("ApiError")<{
  readonly message: string;
}> {}

/**
 * Number of posts to fetch per page.
 */
export const PAGE_SIZE = 10;

/**
 * Fetches a page of posts from jsonplaceholder API.
 * Uses _start and _limit query parameters for offset-based pagination.
 * JSONPlaceholder has 100 posts total (IDs 1-100).
 */
export const fetchPage = (
  page: number,
): Effect.Effect<readonly Post[], ApiError> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const start = page * PAGE_SIZE;
    const url = `https://jsonplaceholder.typicode.com/posts?_start=${String(start) satisfies string}&_limit=${String(PAGE_SIZE) satisfies string}`;
    const response = yield* client.get(url);
    return yield* HttpClientResponse.schemaBodyJson(Posts)(response);
  }).pipe(
    Effect.scoped,
    Effect.mapError(
      (error) =>
        new ApiError({
          message: `Failed to fetch page ${String(page) satisfies string}: ${String(error) satisfies string}`,
        }),
    ),
    Effect.provide(FetchHttpClient.layer),
  );

/**
 * State emitted by the paginated posts stream.
 * Contains the accumulated list of all posts loaded so far,
 * whether more pages are available, and loading status.
 */
export interface PageState {
  readonly posts: readonly Post[];
  readonly hasMore: boolean;
  readonly currentPage: number;
  readonly isLoadingMore: boolean;
}
