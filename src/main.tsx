import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

const STORAGE_KEY = "banklefy_user_settings";

const applyInitialTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const darkMode = stored ? Boolean(JSON.parse(stored)?.darkMode) : true;
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch {
    document.documentElement.classList.add("dark");
  }
};

applyInitialTheme();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
