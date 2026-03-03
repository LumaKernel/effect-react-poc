import { useEffectQuery } from "@effect-react/react";
import { matchEffectResult } from "@effect-react/core";
import type { Task, ApiError } from "./api.js";
import { fetchTasksByProject } from "./api.js";

const priorityColors: Record<Task["priority"], string> = {
  high: "#ff4a4a",
  medium: "#ff9f4a",
  low: "#4a9eff",
};

export const TaskList = ({
  projectId,
}: {
  readonly projectId: string;
}): React.ReactNode => {
  // Key includes projectId → when projectId changes, a new query is triggered automatically
  const result = useEffectQuery<ReadonlyArray<Task>, ApiError>(
    `tasks-${projectId satisfies string}`,
    fetchTasksByProject(projectId),
  );

  return (
    <div
      style={{
        border: "1px solid #4aff6e",
        padding: 16,
        borderRadius: 8,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#4aff6e" }}>3. Tasks</h3>
      {matchEffectResult<ReadonlyArray<Task>, ApiError, React.ReactNode>(
        result,
        {
          Initial: () => <p style={{ color: "#888" }}>Not started</p>,
          Pending: () => (
            <div style={{ color: "#888", padding: 8 }}>Loading tasks...</div>
          ),
          Failure: ({ cause }) => (
            <p style={{ color: "#ff4a4a" }}>Error: {String(cause)}</p>
          ),
          Success: ({ value }) => <TaskItems tasks={value} />,
          Refreshing: ({ value }) => <TaskItems tasks={value} />,
        },
      )}
    </div>
  );
};

const TaskItems = ({
  tasks,
}: {
  readonly tasks: ReadonlyArray<Task>;
}): React.ReactNode => (
  <div>
    {tasks.length === 0 ? (
      <p style={{ color: "#666", margin: 0 }}>No tasks found</p>
    ) : (
      tasks.map((task) => (
        <div
          key={task.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
            borderBottom: "1px solid #333",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: 3,
              background: task.completed ? "#4aff6e" : "#333",
              border: "1px solid #666",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              textDecoration: task.completed ? "line-through" : "none",
              color: task.completed ? "#888" : "#eee",
              fontSize: 14,
              flex: 1,
            }}
          >
            {task.title}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 3,
              background: `${priorityColors[task.priority] satisfies string}22`,
              color: priorityColors[task.priority],
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            {task.priority}
          </span>
        </div>
      ))
    )}
  </div>
);
