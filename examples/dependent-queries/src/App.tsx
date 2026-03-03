import { useState, useCallback } from "react";
import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { UserSelector } from "./UserSelector.js";
import { ProjectList } from "./ProjectList.js";
import { TaskList } from "./TaskList.js";

/**
 * Demonstrates dependent (cascading) queries with effect-react.
 *
 * Pattern: Each query key includes the parent's ID.
 * When the parent selection changes, the key changes,
 * which automatically triggers a fresh query and cleans up the old one.
 *
 * 1. Select a user → fetches that user's projects
 * 2. Select a project → fetches that project's tasks
 * 3. Change the user → project selection resets, new projects load
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        background: "#1a1a2e",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#fff", marginBottom: 4 }}>Dependent Queries</h1>
      <p style={{ color: "#aaa", marginTop: 0, fontSize: 14 }}>
        Cascading data fetching: User → Projects → Tasks. Each level
        automatically re-fetches when the parent selection changes.
      </p>
      <DependentQueryChain />
    </div>
  </EffectProvider>
);

const DependentQueryChain = (): React.ReactNode => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  const handleUserSelect = useCallback((userId: string) => {
    setSelectedUserId(userId);
    // Reset project selection when user changes
    setSelectedProjectId(null);
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  return (
    <div>
      <UserSelector
        selectedUserId={selectedUserId}
        onSelect={handleUserSelect}
      />

      {selectedUserId === null ? (
        <div
          style={{
            padding: 16,
            border: "1px dashed #444",
            borderRadius: 8,
            color: "#666",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Select a user to see their projects
        </div>
      ) : (
        <ProjectList
          userId={selectedUserId}
          selectedProjectId={selectedProjectId}
          onSelect={handleProjectSelect}
        />
      )}

      {selectedProjectId === null ? (
        <div
          style={{
            padding: 16,
            border: "1px dashed #444",
            borderRadius: 8,
            color: "#666",
            textAlign: "center",
          }}
        >
          {selectedUserId === null
            ? "Select a user first, then a project to see tasks"
            : "Select a project to see its tasks"}
        </div>
      ) : (
        <TaskList projectId={selectedProjectId} />
      )}
    </div>
  );
};
