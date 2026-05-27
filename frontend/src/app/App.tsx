import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { assertEnv } from "../config/env";
import { router } from "./router";

export default function App() {
  assertEnv();

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
