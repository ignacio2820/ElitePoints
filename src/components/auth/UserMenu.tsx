"use client";

import { LogOut, User } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function UserMenu({ tone = "light" }: { tone?: "light" | "forest" }) {
  const { sesion, cerrarSesion } = useAuth();
  if (!sesion) return null;

  const onForest = tone === "forest";
  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-3 py-1.5 text-xs ${
        onForest
          ? "border-white/25 bg-white/10 text-white"
          : "border-bark-100 bg-cream-50 text-bark-600"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          onForest ? "bg-terracotta-400/25 text-terracotta-200" : "bg-bark-50 text-bark-500"
        }`}
      >
        <User size={14} />
      </span>
      <span className="hidden font-medium sm:inline">{sesion.email ?? "Usuario"}</span>
      <button
        onClick={cerrarSesion}
        title="Cerrar sesión"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          onForest
            ? "hover:bg-white/15 hover:text-rose-200"
            : "hover:bg-cream-100 hover:text-rose-600"
        }`}
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
