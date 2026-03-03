import { Effect, Data } from "effect";

// --- Error types ---

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

export class SubmitError extends Data.TaggedError("SubmitError")<{
  readonly message: string;
}> {}

// --- Simulated taken usernames ---

const takenUsernames = new Set(["admin", "root", "test", "alice", "bob"]);

/**
 * Simulates a server-side username availability check.
 * Returns the username if available, or fails with ValidationError.
 */
export const checkUsernameAvailability = (
  username: string,
): Effect.Effect<string, ValidationError> =>
  Effect.gen(function* () {
    yield* Effect.sleep(600 + Math.floor(Math.random() * 400));
    if (takenUsernames.has(username.toLowerCase())) {
      return yield* Effect.fail(
        new ValidationError({
          field: "username",
          message: `"${username satisfies string}" is already taken`,
        }),
      );
    }
    return username;
  });

/**
 * Simulates form submission (registration).
 * Has a 20% chance of random server error for demo purposes.
 */
export const submitRegistration = (form: {
  readonly username: string;
  readonly email: string;
  readonly password: string;
}): Effect.Effect<
  { readonly message: string; readonly userId: string },
  SubmitError
> =>
  Effect.gen(function* () {
    yield* Effect.sleep(800 + Math.floor(Math.random() * 700));
    if (Math.random() < 0.2) {
      return yield* Effect.fail(
        new SubmitError({ message: "Server error. Please try again." }),
      );
    }
    return {
      message: `Welcome, ${form.username satisfies string}!`,
      userId: `user-${String(Math.floor(Math.random() * 10000)) satisfies string}`,
    };
  });
