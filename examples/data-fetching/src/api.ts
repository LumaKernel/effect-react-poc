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

/**
 * Array of Posts schema.
 */
const Posts = Schema.Array(Post);

/**
 * Typed error for API failures.
 */
export class ApiError extends Data.TaggedError("ApiError")<{
  readonly message: string;
}> {}

/**
 * Fetches a list of posts from jsonplaceholder API.
 * The effect is self-contained: FetchHttpClient.layer is provided internally.
 *
 * Demonstrates: HttpClient.get → schemaBodyJson → typed result
 */
export const fetchPosts: Effect.Effect<readonly Post[], ApiError> = Effect.gen(
  function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client.get(
      "https://jsonplaceholder.typicode.com/posts",
    );
    return yield* HttpClientResponse.schemaBodyJson(Posts)(response);
  },
).pipe(
  Effect.scoped,
  Effect.mapError(
    (error) =>
      new ApiError({
        message: `Failed to fetch posts: ${String(error) satisfies string}`,
      }),
  ),
  Effect.provide(FetchHttpClient.layer),
);

/**
 * Fetches a single post by ID from jsonplaceholder API.
 * The effect is self-contained: FetchHttpClient.layer is provided internally.
 *
 * Demonstrates: HttpClient.get with dynamic URL → schemaBodyJson
 */
export const fetchPost = (id: number): Effect.Effect<Post, ApiError> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client.get(
      `https://jsonplaceholder.typicode.com/posts/${String(id) satisfies string}`,
    );
    return yield* HttpClientResponse.schemaBodyJson(Post)(response);
  }).pipe(
    Effect.scoped,
    Effect.mapError(
      (error) =>
        new ApiError({
          message: `Failed to fetch post ${String(id) satisfies string}: ${String(error) satisfies string}`,
        }),
    ),
    Effect.provide(FetchHttpClient.layer),
  );

/**
 * An effect that always fails, used to demonstrate error handling.
 */
export const fetchInvalid: Effect.Effect<Post, ApiError> = Effect.gen(
  function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client.get(
      "https://jsonplaceholder.typicode.com/posts/invalid-id",
    );
    return yield* HttpClientResponse.schemaBodyJson(Post)(response);
  },
).pipe(
  Effect.scoped,
  Effect.mapError(
    (error) =>
      new ApiError({
        message: `Failed to fetch invalid post: ${String(error) satisfies string}`,
      }),
  ),
  Effect.provide(FetchHttpClient.layer),
);
