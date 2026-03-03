/**
 * Reusable form field component with validation state display.
 */
export const FormField = ({
  label,
  type,
  value,
  onChange,
  error,
  serverStatus,
}: {
  readonly label: string;
  readonly type: "text" | "email" | "password";
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error: string | null;
  readonly serverStatus?: "idle" | "checking" | "valid" | "invalid";
}): React.ReactNode => (
  <div style={{ marginBottom: 16 }}>
    <label
      style={{
        display: "block",
        marginBottom: 4,
        color: "#ccc",
        fontSize: 13,
        fontWeight: "bold",
      }}
    >
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        style={{
          width: "100%",
          padding: "10px 12px",
          paddingRight: serverStatus !== undefined ? 36 : 12,
          background: "#2a2a3e",
          border: `2px solid ${
            (error !== null
              ? "#ff4a4a"
              : serverStatus === "valid"
                ? "#4aff6e"
                : serverStatus === "invalid"
                  ? "#ff4a4a"
                  : "#444") satisfies string
          }`,
          borderRadius: 6,
          color: "#eee",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s ease",
        }}
      />
      {serverStatus !== undefined && serverStatus !== "idle" && (
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14,
          }}
        >
          {serverStatus === "checking"
            ? "⏳"
            : serverStatus === "valid"
              ? "✅"
              : "❌"}
        </span>
      )}
    </div>
    {error !== null && (
      <p
        style={{
          color: "#ff6b6b",
          fontSize: 12,
          margin: "4px 0 0",
        }}
      >
        {error}
      </p>
    )}
  </div>
);
