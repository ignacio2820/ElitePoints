import { LogOut } from "lucide-react";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { ProgressBar } from "@/components/ProgressBar";
import { NivelBadge } from "@/components/NivelBadge";
import { CodigoClienteChip } from "@/components/cliente/CodigoClienteChip";
import type { NivelLealtad } from "@/lib/huellitas/types";
import { cn, formatARS, formatNumber } from "@/lib/utils";

export interface MiCuentaStickyHeaderProps {
  nombreLocal: string;
  logoUrl?: string | null;
  primerNombre: string;
  saldoHuellitas: number;
  valorMonetarioHuellita: number;
  nivelActual: NivelLealtad;
  temaNivel: NivelLealtad["tema"];
  pctTramo: number;
  nivelSiguienteNombre: string | null;
  huellitasFaltantes: number;
  esLeyenda: boolean;
  esTopTier: boolean;
  heroGradient: string;
  /** Código corto del cliente (ej "ABC-123") para que lo dicte en caja. */
  codigoCliente?: string;
}

/**
 * Banner de bienvenida en flujo normal (no sticky): scrollea con la página.
 * En móvil la altura máxima es 30vh para dejar espacio al catálogo.
 */
export function MiCuentaStickyHeader({
  nombreLocal,
  logoUrl,
  primerNombre,
  saldoHuellitas,
  valorMonetarioHuellita,
  nivelActual,
  temaNivel,
  pctTramo,
  nivelSiguienteNombre,
  huellitasFaltantes,
  esLeyenda,
  esTopTier,
  heroGradient,
  codigoCliente
}: MiCuentaStickyHeaderProps) {
  const valorPesos = saldoHuellitas * valorMonetarioHuellita;
  const barTrack = esTopTier ? "bg-white/15" : "bg-white/25";

  return (
    <header
      className={cn(
        "relative overflow-hidden border-b border-white/10",
        /* Móvil: como máximo 30% del viewport para que “Tus Recompensas” entre en pantalla */
        "max-sm:max-h-[30vh] max-sm:overflow-y-auto max-sm:overscroll-contain",
        "bg-gradient-to-br py-2 sm:py-3",
        heroGradient,
        esTopTier ? "text-amber-50" : "text-cream-50"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          esTopTier ? "opacity-[0.05]" : "opacity-[0.06]"
        )}
        aria-hidden
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <defs>
            <pattern
              id="paws-banner"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="14" r="3" fill={esTopTier ? "#fbbf24" : "currentColor"} />
              <circle cx="14" cy="22" r="2" fill={esTopTier ? "#fbbf24" : "currentColor"} />
              <circle cx="26" cy="22" r="2" fill={esTopTier ? "#fbbf24" : "currentColor"} />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#paws-banner)" />
        </svg>
      </div>

      {esTopTier ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-400/12 blur-3xl max-sm:h-28 max-sm:w-28"
        />
      ) : null}

      <div className="relative mx-auto max-w-6xl px-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <LocalBrandMark
              nombreLocal={nombreLocal}
              logoUrl={logoUrl}
              size={34}
              imageClassName={cn(
                "border-white/20 bg-white/95",
                esTopTier ? "ring-1 ring-amber-300/30" : ""
              )}
              iconClassName={esTopTier ? "text-amber-200" : "text-cream-50"}
            />
            <div className="min-w-0">
            <p
              className={cn(
                "truncate font-sans text-[9px] font-semibold uppercase tracking-[0.16em] sm:text-[10px]",
                esTopTier ? "text-amber-200/85" : "text-cream-50/75"
              )}
            >
              {nombreLocal}
            </p>
            <h1
              className={cn(
                "truncate font-sans text-base font-semibold tracking-tight sm:text-lg",
                esTopTier ? "text-amber-50" : ""
              )}
            >
              Hola, {primerNombre}
            </h1>
            {codigoCliente && (
              <div className="mt-1.5 flex">
                <CodigoClienteChip codigo={codigoCliente} esTopTier={esTopTier} />
              </div>
            )}
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full backdrop-blur transition sm:h-9 sm:w-9",
                esTopTier
                  ? "bg-amber-400/15 text-amber-100 hover:bg-amber-400/25"
                  : "bg-white/10 text-cream-50 hover:bg-white/20"
              )}
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>

        {/* Saldo + rango en una fila desde sm; apilado ultra compacto en móvil */}
        <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
          <div className="min-w-0 sm:flex-1">
            <p
              className={cn(
                "font-sans text-[9px] font-semibold uppercase tracking-[0.18em] sm:text-[10px]",
                esTopTier ? "text-amber-200/75" : "text-cream-50/65"
              )}
            >
              Tu saldo
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 sm:gap-2">
              <HuellitaIcon
                size={22}
                className={cn(
                  "shrink-0 max-sm:h-5 max-sm:w-5 sm:h-6 sm:w-6",
                  esTopTier ? "text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]" : "text-cream-50"
                )}
              />
              <span
                className={cn(
                  "font-sans font-bold tabular-nums leading-none tracking-tight",
                  /* Un poco más pequeño que antes; brillo dorado conservado */
                  "text-3xl max-sm:text-[1.65rem] sm:text-4xl md:text-5xl",
                  esTopTier
                    ? "bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_1px_14px_rgba(251,191,36,0.28)]"
                    : "text-cream-50"
                )}
              >
                {formatNumber(saldoHuellitas)}
              </span>
            </div>
            <p
              className={cn(
                "mt-1 font-sans text-[11px] leading-tight sm:text-xs",
                esTopTier ? "text-amber-100/90" : "text-cream-50/85"
              )}
            >
              Equivale a{" "}
              <span className={cn("font-semibold", esTopTier ? "text-amber-50" : "")}>
                {formatARS(valorPesos)}
              </span>
            </p>
          </div>

          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 font-sans sm:max-w-[240px] sm:flex-1 sm:rounded-2xl sm:px-3 sm:py-2",
              esTopTier
                ? "border-amber-400/25 bg-black/35"
                : "border-white/15 bg-white/10"
            )}
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-widest sm:text-[10px]",
                  esTopTier ? "text-amber-200/80" : "text-cream-50/70"
                )}
              >
                Tu rango
              </p>
              <p
                className={cn(
                  "truncate text-xs font-semibold tracking-tight sm:text-sm",
                  esTopTier ? "text-amber-50" : ""
                )}
              >
                {nivelActual.nombre}
              </p>
            </div>
            <NivelBadge nivel={nivelActual} size="sm" showMultiplier />
          </div>
        </div>

        <div className="mt-2 sm:mt-2.5">
          <div className="mb-1 flex items-center justify-between font-sans text-[9px] uppercase tracking-wide sm:text-[10px]">
            <span className={esTopTier ? "text-amber-200/75" : "text-cream-50/70"}>
              {esLeyenda
                ? "Nivel máximo"
                : nivelSiguienteNombre
                ? `Siguiente: ${nivelSiguienteNombre}`
                : ""}
            </span>
            {!esLeyenda && nivelSiguienteNombre ? (
              <span className={esTopTier ? "text-amber-100" : "text-cream-50"}>
                Faltan {formatNumber(huellitasFaltantes)}
              </span>
            ) : null}
          </div>
          <ProgressBar value={pctTramo} tema={temaNivel} size="sm" className={barTrack} />
        </div>
      </div>
    </header>
  );
}
