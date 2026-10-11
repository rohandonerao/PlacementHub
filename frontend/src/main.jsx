import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { TopLoader } from "./components/ui";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TopLoader />
    <App />
  </React.StrictMode>
);
