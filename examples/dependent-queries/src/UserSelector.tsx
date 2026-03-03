import { useEffectQuery } from "@effect-react/react";
import { matchEffectResult } from "@effect-react/core";
import type { User, ApiError } from "./api.js";
import { fetchUsers } from "./api.js";

export const UserSelector = ({
  selectedUserId,
  onSelect,
}: {
  readonly selectedUserId: string | null;
  readonly onSelect: (userId: string) => void;
}): React.ReactNode => {
  const result = useEffectQuery<ReadonlyArray<User>, ApiError>(
    "users",
    fetchUsers,
  );

  return (
    <div
      style={{
        border: "1px solid #4a9eff",
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#4a9eff" }}>1. Select User</h3>
      {matchEffectResult<ReadonlyArray<User>, ApiError, React.ReactNode>(
        result,
        {
          Initial: () => <p style={{ color: "#888" }}>Not started</p>,
          Pending: () => (
            <div style={{ color: "#888", padding: 8 }}>Loading users...</div>
          ),
          Failure: ({ cause }) => (
            <p style={{ color: "#ff4a4a" }}>Error: {String(cause)}</p>
          ),
          Success: ({ value }) => (
            <UserList
              users={value}
              selectedUserId={selectedUserId}
              onSelect={onSelect}
            />
          ),
          Refreshing: ({ value }) => (
            <UserList
              users={value}
              selectedUserId={selectedUserId}
              onSelect={onSelect}
            />
          ),
        },
      )}
    </div>
  );
};

const UserList = ({
  users,
  selectedUserId,
  onSelect,
}: {
  readonly users: ReadonlyArray<User>;
  readonly selectedUserId: string | null;
  readonly onSelect: (userId: string) => void;
}): React.ReactNode => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {users.map((user) => (
      <button
        key={user.id}
        onClick={() => {
          onSelect(user.id);
        }}
        style={{
          padding: "8px 16px",
          background: selectedUserId === user.id ? "#4a9eff" : "#2a2a3e",
          color: selectedUserId === user.id ? "#000" : "#eee",
          border:
            selectedUserId === user.id ? "2px solid #4a9eff" : "2px solid #444",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: selectedUserId === user.id ? "bold" : "normal",
          fontSize: 14,
          transition: "all 0.2s ease",
        }}
      >
        {user.avatar} {user.name}
      </button>
    ))}
  </div>
);
