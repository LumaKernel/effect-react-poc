import { Effect, Data } from "effect";

// --- Error types ---

export class ApiError extends Data.TaggedError("ApiError")<{
  readonly message: string;
}> {}

// --- Data types ---

export interface User {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
}

export interface Project {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly color: string;
}

export interface Task {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly completed: boolean;
  readonly priority: "low" | "medium" | "high";
}

// --- Simulated data ---

const users: ReadonlyArray<User> = [
  { id: "user-1", name: "Alice", avatar: "👩‍💻" },
  { id: "user-2", name: "Bob", avatar: "👨‍🔧" },
  { id: "user-3", name: "Carol", avatar: "👩‍🎨" },
];

const projects: ReadonlyArray<Project> = [
  { id: "proj-1", userId: "user-1", name: "Frontend App", color: "#4a9eff" },
  { id: "proj-2", userId: "user-1", name: "Design System", color: "#ff9f4a" },
  { id: "proj-3", userId: "user-2", name: "API Server", color: "#4aff6e" },
  { id: "proj-4", userId: "user-2", name: "CLI Tool", color: "#ff4a9e" },
  { id: "proj-5", userId: "user-3", name: "Illustrations", color: "#c74aff" },
];

const tasks: ReadonlyArray<Task> = [
  {
    id: "task-1",
    projectId: "proj-1",
    title: "Set up routing",
    completed: true,
    priority: "high",
  },
  {
    id: "task-2",
    projectId: "proj-1",
    title: "Implement login form",
    completed: false,
    priority: "high",
  },
  {
    id: "task-3",
    projectId: "proj-1",
    title: "Add dark mode",
    completed: false,
    priority: "low",
  },
  {
    id: "task-4",
    projectId: "proj-2",
    title: "Define color palette",
    completed: true,
    priority: "high",
  },
  {
    id: "task-5",
    projectId: "proj-2",
    title: "Create button variants",
    completed: false,
    priority: "medium",
  },
  {
    id: "task-6",
    projectId: "proj-3",
    title: "Set up Express server",
    completed: true,
    priority: "high",
  },
  {
    id: "task-7",
    projectId: "proj-3",
    title: "Add auth middleware",
    completed: false,
    priority: "high",
  },
  {
    id: "task-8",
    projectId: "proj-3",
    title: "Write API tests",
    completed: false,
    priority: "medium",
  },
  {
    id: "task-9",
    projectId: "proj-4",
    title: "Parse CLI arguments",
    completed: true,
    priority: "high",
  },
  {
    id: "task-10",
    projectId: "proj-4",
    title: "Add --verbose flag",
    completed: false,
    priority: "low",
  },
  {
    id: "task-11",
    projectId: "proj-5",
    title: "Sketch hero banner",
    completed: false,
    priority: "high",
  },
  {
    id: "task-12",
    projectId: "proj-5",
    title: "Finalize icon set",
    completed: false,
    priority: "medium",
  },
];

// --- API functions with simulated latency ---

const randomDelay = (): Effect.Effect<void> =>
  Effect.sleep(300 + Math.floor(Math.random() * 500));

export const fetchUsers: Effect.Effect<
  ReadonlyArray<User>,
  ApiError
> = Effect.gen(function* () {
  yield* randomDelay();
  return users;
});

export const fetchProjectsByUser = (
  userId: string,
): Effect.Effect<ReadonlyArray<Project>, ApiError> =>
  Effect.gen(function* () {
    yield* randomDelay();
    const result = projects.filter((p) => p.userId === userId);
    return result;
  });

export const fetchTasksByProject = (
  projectId: string,
): Effect.Effect<ReadonlyArray<Task>, ApiError> =>
  Effect.gen(function* () {
    yield* randomDelay();
    const result = tasks.filter((t) => t.projectId === projectId);
    return result;
  });
