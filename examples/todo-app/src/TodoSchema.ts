import { Schema } from "effect";

/**
 * Todo item schema using Schema.TaggedClass for structural equality
 * and serialization support.
 */
export class Todo extends Schema.TaggedClass<Todo>()("Todo", {
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
}) {}

/**
 * Schema for encoding/decoding a list of todos to/from JSON.
 */
export const TodoList = Schema.Array(Todo);

export type TodoList = typeof TodoList.Type;
