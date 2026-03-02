import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { BrowserStorageLive, TodosLive } from "./TodoService.js";
import { TodoForm } from "./TodoForm.js";
import { TodoList } from "./TodoList.js";

/**
 * Compose the application layer:
 * TodosLive requires Storage, which is provided by BrowserStorageLive.
 */
const AppLayer = TodosLive.pipe(Layer.provide(BrowserStorageLive));

export const App = (): React.ReactNode => (
  <EffectProvider layer={AppLayer}>
    <h1>effect-react Todo App</h1>
    <p>
      Demonstrates Layer/DI, Schema.TaggedClass, CRUD operations, and
      localStorage persistence via a StorageService abstraction.
    </p>
    <TodoForm />
    <TodoList />
  </EffectProvider>
);
