import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { startWebVitalsObserver } from "./lib/webVitals";

const STORAGE_KEY = "banklefy_user_settings";

const applyInitialTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const themeMode = parsed?.themeMode ?? (typeof parsed?.darkMode === "boolean" ? (parsed.darkMode ? "dark" : "light") : "system");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = themeMode === "system" ? (systemPrefersDark ? "dark" : "light") : themeMode;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
};

applyInitialTheme();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

startWebVitalsObserver();
