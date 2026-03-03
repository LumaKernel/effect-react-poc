import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- root element is guaranteed in index.html
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
