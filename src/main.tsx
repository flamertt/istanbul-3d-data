import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppIspark from "./AppIspark.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppIspark />
  </StrictMode>,
);
