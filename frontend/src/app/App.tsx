import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { assertEnv } from "../config/env";
import { router } from "./router";

const STORAGE_KEY = "theme-preference";

function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }
}

initTheme();

export default function App() {
  assertEnv();

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
