"use client";

import { useMemo } from "react";

export interface FloatingWhatsAppProps {
  /** Telefono con codigo de pais, sin + ni espacios. Ej: 5491155512345 */
  telefono?: string | null;
  /** Plantilla con placeholders {nombre} y {saldo}. */
  plantilla?: string;
  nombreCliente: string;
  saldoHuellitas: number;
  nombreLocal: string;
  /** Si true, el botón usa la paleta dorada premium. */
  premium?: boolean;
}

const PLANTILLA_DEFAULT =
  "Hola! Soy {nombre}, queria consultar por mi saldo de {saldo} Huellitas en {local}.";

function normalizarTelefono(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const limpio = raw.replace(/[^0-9]/g, "");
  if (limpio.length < 8) return null;
  return limpio;
}

function renderPlantilla(plantilla: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, v),
    plantilla
  );
}

/**
 * Boton flotante WhatsApp para que el cliente consulte rapido al local.
 * Si no hay telefono cargado, no se renderiza (silencioso).
 */
export function FloatingWhatsApp({
  telefono,
  plantilla = PLANTILLA_DEFAULT,
  nombreCliente,
  saldoHuellitas,
  nombreLocal,
  premium = false
}: FloatingWhatsAppProps) {
  const tel = normalizarTelefono(telefono);

  const href = useMemo(() => {
    if (!tel) return null;
    const mensaje = renderPlantilla(plantilla, {
      nombre: nombreCliente,
      saldo: String(saldoHuellitas),
      local: nombreLocal
    });
    return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
  }, [tel, plantilla, nombreCliente, saldoHuellitas, nombreLocal]);

  if (!href) return null;

  const baseCls =
    "fixed bottom-20 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 font-semibold shadow-2xl transition active:scale-95";
  const themeCls = premium
    ? "bg-gradient-to-r from-terracotta-400 via-terracotta-400 to-terracotta-500 text-white shadow-soft"
    : "bg-[#25D366] text-white shadow-emerald-700/30 hover:bg-[#1EBE5C]";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseCls} ${themeCls}`}
      aria-label="Consultar por WhatsApp"
    >
      <svg
        viewBox="0 0 32 32"
        className="h-5 w-5"
        fill="currentColor"
        aria-hidden
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.715.315-.515.515-.788 1.262-.788 1.992 0 .47.13.97.27 1.4.41 1.272 2.09 3.71 4.045 4.96 1.144.73 2.806 1.405 4.045 1.405.946 0 1.78-.405 2.16-.95.215-.31.385-.69.385-1.075 0-.158-.058-.33-.115-.487-.158-.343-1.86-1.165-2.205-1.165zM16.215 2C8.93 2 3.07 7.86 3.07 15.145c0 2.486.71 4.937 2.025 7.052L3 30l8.106-2.106A13.073 13.073 0 0 0 29.43 15.145C29.43 7.86 23.5 2 16.215 2z"/>
      </svg>
      <span className="hidden text-sm sm:inline">Consultar por WhatsApp</span>
    </a>
  );
}
