import { Schema } from "effect";

/**
 * Schema for the registration form with field-level validation constraints.
 *
 * Each field uses Schema.pipe to compose validation rules.
 * Schema.decodeUnknownEither returns Either<RegistrationForm, ParseError>
 * for safe validation without throwing.
 */

export const Username = Schema.String.pipe(
  Schema.minLength(3, {
    message: () => "Username must be at least 3 characters",
  }),
  Schema.maxLength(20, {
    message: () => "Username must be at most 20 characters",
  }),
  Schema.pattern(/^[a-zA-Z0-9_]+$/, {
    message: () =>
      "Username can only contain letters, numbers, and underscores",
  }),
);

export const Email = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Email is required" }),
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Please enter a valid email address",
  }),
);

export const Password = Schema.String.pipe(
  Schema.minLength(8, {
    message: () => "Password must be at least 8 characters",
  }),
  Schema.pattern(/[A-Z]/, {
    message: () => "Password must contain at least one uppercase letter",
  }),
  Schema.pattern(/[0-9]/, {
    message: () => "Password must contain at least one number",
  }),
);

export const RegistrationForm = Schema.Struct({
  username: Username,
  email: Email,
  password: Password,
});

export type RegistrationForm = typeof RegistrationForm.Type;
