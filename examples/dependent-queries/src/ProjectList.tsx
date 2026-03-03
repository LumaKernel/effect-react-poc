import { useEffectQuery } from "@effect-react/react";
import { matchEffectResult } from "@effect-react/core";
import type { Project, ApiError } from "./api.js";
import { fetchProjectsByUser } from "./api.js";

export const ProjectList = ({
  userId,
  selectedProjectId,
  onSelect,
}: {
  readonly userId: string;
  readonly selectedProjectId: string | null;
  readonly onSelect: (projectId: string) => void;
}): React.ReactNode => {
  // Key includes userId → when userId changes, a new query is triggered automatically
  const result = useEffectQuery<ReadonlyArray<Project>, ApiError>(
    `projects-${userId satisfies string}`,
    fetchProjectsByUser(userId),
  );

  return (
    <div
      style={{
        border: "1px solid #ff9f4a",
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#ff9f4a" }}>2. Select Project</h3>
      {matchEffectResult<ReadonlyArray<Project>, ApiError, React.ReactNode>(
        result,
        {
          Initial: () => <p style={{ color: "#888" }}>Not started</p>,
          Pending: () => (
            <div style={{ color: "#888", padding: 8 }}>Loading projects...</div>
          ),
          Failure: ({ cause }) => (
            <p style={{ color: "#ff4a4a" }}>Error: {String(cause)}</p>
          ),
          Success: ({ value }) => (
            <ProjectItems
              projects={value}
              selectedProjectId={selectedProjectId}
              onSelect={onSelect}
            />
          ),
          Refreshing: ({ value }) => (
            <ProjectItems
              projects={value}
              selectedProjectId={selectedProjectId}
              onSelect={onSelect}
            />
          ),
        },
      )}
    </div>
  );
};

const ProjectItems = ({
  projects,
  selectedProjectId,
  onSelect,
}: {
  readonly projects: ReadonlyArray<Project>;
  readonly selectedProjectId: string | null;
  readonly onSelect: (projectId: string) => void;
}): React.ReactNode => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {projects.length === 0 ? (
      <p style={{ color: "#666", margin: 0 }}>No projects found</p>
    ) : (
      projects.map((project) => (
        <button
          key={project.id}
          onClick={() => {
            onSelect(project.id);
          }}
          style={{
            padding: "8px 16px",
            background:
              selectedProjectId === project.id ? project.color : "#2a2a3e",
            color: selectedProjectId === project.id ? "#000" : "#eee",
            border:
              selectedProjectId === project.id
                ? `2px solid ${project.color satisfies string}`
                : "2px solid #444",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: selectedProjectId === project.id ? "bold" : "normal",
            fontSize: 14,
            transition: "all 0.2s ease",
          }}
        >
          {project.name}
        </button>
      ))
    )}
  </div>
);
