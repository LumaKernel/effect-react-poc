import { useState, useRef, useCallback, useEffect } from "react";
import { Schema, Either } from "effect";
import { useEffectMutation } from "@effect-react/react";
import { Username, Email, Password, RegistrationForm } from "./schema.js";
import type { ValidationError, SubmitError } from "./api.js";
import { checkUsernameAvailability, submitRegistration } from "./api.js";
import { FormField } from "./FormField.js";

type FieldErrors = {
  readonly username: string | null;
  readonly email: string | null;
  readonly password: string | null;
};

type UsernameServerStatus = "idle" | "checking" | "valid" | "invalid";

const initialErrors: FieldErrors = {
  username: null,
  email: null,
  password: null,
};

/**
 * Validates a single field using its Schema.
 * Returns error message or null if valid.
 */
const validateField = (
  field: "username" | "email" | "password",
  value: string,
): string | null => {
  if (value === "") return null; // Don't validate empty fields until submit
  const schema =
    field === "username" ? Username : field === "email" ? Email : Password;
  const result = Schema.decodeUnknownEither(schema)(value);
  if (Either.isRight(result)) return null;
  // Extract the first error message from ParseError
  const issue = result.left.issue;
  if ("message" in issue && typeof issue.message === "string") {
    return issue.message;
  }
  return "Invalid value";
};

/**
 * Validates the entire form.
 * Returns field errors for all fields.
 */
const validateForm = (form: {
  readonly username: string;
  readonly email: string;
  readonly password: string;
}): FieldErrors => {
  const validateRequired = (
    field: "username" | "email" | "password",
    value: string,
  ): string | null => {
    if (value === "")
      return `${field.charAt(0).toUpperCase() satisfies string}${field.slice(1) satisfies string} is required`;
    return validateField(field, value);
  };
  return {
    username: validateRequired("username", form.username),
    email: validateRequired("email", form.email),
    password: validateRequired("password", form.password),
  };
};

const hasErrors = (errors: FieldErrors): boolean =>
  errors.username !== null || errors.email !== null || errors.password !== null;

export const RegistrationFormComponent = (): React.ReactNode => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(initialErrors);
  const [usernameServerStatus, setUsernameServerStatus] =
    useState<UsernameServerStatus>("idle");
  const [usernameServerError, setUsernameServerError] = useState<string | null>(
    null,
  );
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced field validation on input change
  const handleFieldChange = useCallback(
    (field: "username" | "email" | "password", value: string) => {
      if (field === "username") {
        setUsername(value);
        setUsernameServerStatus("idle");
        setUsernameServerError(null);
      } else if (field === "email") {
        setEmail(value);
      } else {
        setPassword(value);
      }

      // Clear submit success on any change
      setSubmitSuccess(null);

      // Debounce validation
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        const error = validateField(field, value);
        setFieldErrors((prev) => ({ ...prev, [field]: error }));
      }, 300);
    },
    [],
  );

  // Cleanup debounce timer
  useEffect(
    () => () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  // Server-side username check
  const { mutate: checkUsername } = useEffectMutation<
    string,
    string,
    ValidationError
  >((name: string) => checkUsernameAvailability(name), {
    onSuccess: () => {
      setUsernameServerStatus("valid");
      setUsernameServerError(null);
    },
    onError: (_cause) => {
      setUsernameServerStatus("invalid");
      setUsernameServerError("Username is not available");
    },
  });

  // Trigger server check when username field validation passes (debounced)
  const prevUsernameRef = useRef("");
  useEffect(() => {
    if (username === prevUsernameRef.current) return;
    prevUsernameRef.current = username;

    if (username.length < 3 || fieldErrors.username !== null) {
      setUsernameServerStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      setUsernameServerStatus("checking");
      checkUsername(username);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [username, fieldErrors.username, checkUsername]);

  // Submit mutation
  const { mutate: submit, result: submitResult } = useEffectMutation<
    RegistrationForm,
    { readonly message: string; readonly userId: string },
    SubmitError
  >((form: RegistrationForm) => submitRegistration(form), {
    onSuccess: (value) => {
      setSubmitSuccess(value.message);
      setUsername("");
      setEmail("");
      setPassword("");
      setFieldErrors(initialErrors);
      setUsernameServerStatus("idle");
      setUsernameServerError(null);
    },
  });

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      const form = { username, email, password };

      // Full form validation
      const errors = validateForm(form);
      setFieldErrors(errors);
      if (hasErrors(errors)) return;

      // Check Schema decode on whole form
      const decoded = Schema.decodeUnknownEither(RegistrationForm)(form);
      if (Either.isLeft(decoded)) return;

      // Check server validation isn't showing error
      if (usernameServerStatus === "invalid") return;

      submit(decoded.right);
    },
    [username, email, password, usernameServerStatus, submit],
  );

  const isSubmitting = submitResult._tag === "Pending";

  return (
    <form onSubmit={handleSubmit}>
      <FormField
        label="Username"
        type="text"
        value={username}
        onChange={(v) => {
          handleFieldChange("username", v);
        }}
        error={fieldErrors.username ?? usernameServerError}
        serverStatus={usernameServerStatus}
      />

      <FormField
        label="Email"
        type="email"
        value={email}
        onChange={(v) => {
          handleFieldChange("email", v);
        }}
        error={fieldErrors.email}
      />

      <FormField
        label="Password"
        type="password"
        value={password}
        onChange={(v) => {
          handleFieldChange("password", v);
        }}
        error={fieldErrors.password}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "12px 24px",
          background: isSubmitting ? "#555" : "#4a9eff",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          fontWeight: "bold",
          fontSize: 15,
          marginTop: 8,
          transition: "background 0.2s ease",
        }}
      >
        {isSubmitting ? "Registering..." : "Register"}
      </button>

      {submitResult._tag === "Failure" && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: "#2a1a1a",
            border: "1px solid #ff4a4a",
            borderRadius: 6,
            color: "#ff6b6b",
            fontSize: 13,
          }}
        >
          Registration failed. Please try again.
        </div>
      )}

      {submitSuccess !== null && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: "#1a2a1a",
            border: "1px solid #4aff6e",
            borderRadius: 6,
            color: "#4aff6e",
            fontSize: 13,
          }}
        >
          {submitSuccess}
        </div>
      )}
    </form>
  );
};
