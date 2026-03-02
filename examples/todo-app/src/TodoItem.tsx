import type { Todo } from "./TodoSchema.js";
import { useTodoActions } from "./useTodos.js";

interface TodoItemProps {
  readonly todo: Todo;
}

export const TodoItem = ({ todo }: TodoItemProps): React.ReactNode => {
  const { toggle, remove } = useTodoActions();

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.25rem 0",
      }}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => {
          toggle(todo.id);
        }}
      />
      <span
        style={{
          textDecoration: todo.completed ? "line-through" : "none",
          flex: 1,
        }}
      >
        {todo.title}
      </span>
      <button
        type="button"
        onClick={() => {
          remove(todo.id);
        }}
        style={{ color: "red", cursor: "pointer" }}
      >
        Delete
      </button>
    </li>
  );
};
