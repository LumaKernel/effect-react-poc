import { useTodoList } from "./useTodos.js";
import { TodoItem } from "./TodoItem.js";

export const TodoList = (): React.ReactNode => {
  const todos = useTodoList();

  if (todos.length === 0) {
    return <p style={{ color: "#888" }}>No todos yet. Add one above!</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
};
