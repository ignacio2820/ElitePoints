"use client";

import { LogOut, User } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function UserMenu({
  tone = "light",
  showSignOutLabel = false
}: {
  tone?: "light" | "forest";
  /** Texto visible "Cerrar sesión" (p. ej. panel admin). */
  showSignOutLabel?: boolean;
}) {
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
      <span
        className={`min-w-0 font-medium ${
          onForest && showSignOutLabel
            ? "inline-block max-w-[min(42vw,11rem)] truncate text-[11px] sm:max-w-[16rem] sm:text-xs"
            : "hidden max-w-[10rem] sm:inline"
        }`}
        title={sesion.email ?? undefined}
      >
        {sesion.email ?? "Usuario"}
      </span>
      {showSignOutLabel ? (
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] transition ${
            onForest
              ? "bg-white/15 text-white hover:bg-rose-500/30 hover:text-rose-100"
              : "bg-bark-100 text-bark-700 hover:bg-rose-100 hover:text-rose-700"
          }`}
        >
          <LogOut size={12} className="shrink-0" aria-hidden />
          Cerrar sesión
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          title="Cerrar sesión"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
            onForest
              ? "hover:bg-white/15 hover:text-rose-200"
              : "hover:bg-cream-100 hover:text-rose-600"
          }`}
        >
          <LogOut size={14} />
        </button>
      )}
    </div>
  );
}
