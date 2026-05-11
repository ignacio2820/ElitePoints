"use client";

import { LogOut, User } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function UserMenu({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { sesion, cerrarSesion } = useAuth();
  if (!sesion) return null;

  const isDark = tone === "dark";
  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-3 py-1.5 text-xs ${
        isDark
          ? "border-zinc-700 bg-zinc-900/60 text-zinc-300"
          : "border-bark-100 bg-cream-50 text-bark-600"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          isDark ? "bg-amber-400/15 text-amber-300" : "bg-bark-50 text-bark-500"
        }`}
      >
        <User size={14} />
      </span>
      <span className="hidden font-medium sm:inline">{sesion.email ?? "Usuario"}</span>
      <button
        onClick={cerrarSesion}
        title="Cerrar sesión"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          isDark
            ? "hover:bg-zinc-800 hover:text-rose-300"
            : "hover:bg-cream-100 hover:text-rose-600"
        }`}
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
