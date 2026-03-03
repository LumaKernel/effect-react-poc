import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { RegistrationFormComponent } from "./RegistrationForm.js";

/**
 * Demonstrates form validation with Effect Schema.
 *
 * Features:
 * - Schema.decodeUnknownEither for client-side validation
 * - Field-level validation with Schema.pipe (minLength, maxLength, pattern)
 * - Debounced real-time validation as you type
 * - Server-side username availability check via useEffectMutation
 * - Form submission with optimistic UI (loading state + error recovery)
 *
 * Try these usernames to see server validation: admin, root, test, alice, bob
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        background: "#1a1a2e",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#fff", marginBottom: 4 }}>Form with Validation</h1>
      <p
        style={{ color: "#aaa", marginTop: 0, fontSize: 14, marginBottom: 24 }}
      >
        Effect Schema validation with debounced real-time feedback and
        server-side username checks.
      </p>

      <div
        style={{
          border: "1px solid #4a9eff",
          padding: 20,
          borderRadius: 8,
        }}
      >
        <h3 style={{ marginTop: 0, color: "#4a9eff" }}>Registration</h3>
        <RegistrationFormComponent />
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 12,
          background: "#2a2a3e",
          borderRadius: 6,
          fontSize: 12,
          color: "#888",
        }}
      >
        <strong style={{ color: "#aaa" }}>Validation rules:</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          <li>Username: 3-20 chars, alphanumeric + underscores only</li>
          <li>Email: valid email format</li>
          <li>Password: 8+ chars, one uppercase, one number</li>
          <li>
            Taken usernames:{" "}
            <code style={{ color: "#ff9f4a" }}>
              admin, root, test, alice, bob
            </code>
          </li>
        </ul>
      </div>
    </div>
  </EffectProvider>
);
