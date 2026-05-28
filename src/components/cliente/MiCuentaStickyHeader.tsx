import { LogOut } from "lucide-react";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import { PuntoIcon } from "@/components/PuntoIcon";
import { ProgressBar } from "@/components/ProgressBar";
import { NivelBadge } from "@/components/NivelBadge";
import { CodigoClienteChip } from "@/components/cliente/CodigoClienteChip";
import type { NivelLealtad } from "@/lib/huellitas/types";
import {
  cn,
  formatARS,
  formatHuellitas,
  formatNumber,
  huellitasEnteras
} from "@/lib/utils";

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
  codigoCliente?: string;
}

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
  codigoCliente
}: MiCuentaStickyHeaderProps) {
  const saldoEntero = formatHuellitas(saldoHuellitas);
  const valorPesos = huellitasEnteras(saldoHuellitas) * valorMonetarioHuellita;

  return (
    <header className="sticky top-0 z-10 border-b border-bark-100/80 bg-cream-50/90 backdrop-blur py-3 sm:py-4">
      <div className="relative mx-auto max-w-6xl px-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex max-w-[120px] shrink-0 items-center">
              <LocalBrandMark
                nombreLocal={nombreLocal}
                logoUrl={logoUrl}
                fit="contain"
                maxWidth={120}
                maxHeight={40}
                iconClassName="text-bark-500"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-bark-500 sm:text-[10px]">
                {nombreLocal}
              </p>
              <h1 className="truncate font-display text-base font-semibold tracking-tight text-bark-700 sm:text-lg">
                Hola, {primerNombre}
              </h1>
              {codigoCliente ? (
                <div className="mt-1.5 flex">
                  <CodigoClienteChip codigo={codigoCliente} esTopTier={esTopTier} />
                </div>
              ) : null}
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bark-100 bg-white text-bark-600 shadow-sm transition hover:bg-cream-100 sm:h-9 sm:w-9"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
          <div className="min-w-0 sm:flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-bark-500 sm:text-[10px]">
              Tu saldo
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 sm:gap-2">
              <PuntoIcon
                size={22}
                className="shrink-0 text-bark-500 max-sm:h-5 max-sm:w-5 sm:h-6 sm:w-6"
              />
              <span
                className={cn(
                  "font-display font-bold tabular-nums leading-none tracking-tight text-bark-700",
                  "text-3xl max-sm:text-[1.65rem] sm:text-4xl md:text-5xl",
                  esTopTier &&
                    "bg-gradient-to-b from-bark-500 via-bark-400 to-terracotta-500 bg-clip-text text-transparent"
                )}
              >
                {saldoEntero}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-bark-600 sm:text-xs">
              Puntos acumulados
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-bark-500 sm:text-xs">
              Equivale a{" "}
              <span className="font-semibold text-bark-700">
                {formatARS(valorPesos)}
              </span>
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-2xl border border-bark-100 bg-white px-3 py-2.5 shadow-soft sm:w-auto sm:min-w-[12rem] sm:max-w-[min(100%,18rem)]">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-bark-500 sm:text-[10px]">
              Tu rango
            </p>
            <NivelBadge
              nivel={nivelActual}
              size="sm"
              showMultiplier
              className="max-w-full flex-wrap whitespace-normal"
            />
          </div>
        </div>

        <div className="mt-2 sm:mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-bark-500 sm:text-[10px]">
            <span>
              {esLeyenda
                ? "Nivel máximo"
                : nivelSiguienteNombre
                  ? `Siguiente: ${nivelSiguienteNombre}`
                  : ""}
            </span>
            {!esLeyenda && nivelSiguienteNombre ? (
              <span className="text-bark-700">
                Faltan {formatNumber(huellitasFaltantes)}
              </span>
            ) : null}
          </div>
          <ProgressBar
            value={pctTramo}
            tema={temaNivel}
            size="sm"
            className="bg-cream-100"
          />
        </div>
      </div>
    </header>
  );
}
