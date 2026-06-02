import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = "Cloud Alert Hub — Página no encontrada";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="mx-auto max-w-lg rounded-lg border bg-white p-6">
        <div className="text-sm font-semibold text-gray-900">
          Cloud Alert Hub
        </div>
        <h1 className="mt-2 text-lg font-semibold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-gray-600">La ruta no existe.</p>
        <Link
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
          to={isAuthenticated ? "/dashboard" : "/"}
        >
          {isAuthenticated ? "Ir al Centro de Monitoreo" : "Volver al inicio"}
        </Link>
      </div>
    </div>
  );
}
