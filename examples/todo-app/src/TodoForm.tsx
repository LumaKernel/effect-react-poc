import { useState } from "react";
import { useTodoActions } from "./useTodos.js";

export const TodoForm = (): React.ReactNode => {
  const [title, setTitle] = useState("");
  const { add } = useTodoActions();

  const handleSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length > 0) {
      add(trimmed);
      setTitle("");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
        }}
        placeholder="What needs to be done?"
        style={{ padding: "0.5rem", fontSize: "1rem", width: "300px" }}
      />
      <button
        type="submit"
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          marginLeft: "0.5rem",
        }}
      >
        Add
      </button>
    </form>
  );
};
