"use client";

import { useState } from "react";
import { AlertTriangle, Users } from "lucide-react";
import { BuscadorClientes } from "@/components/admin/BuscadorClientes";
import { AlertasEncuestasPanel } from "@/components/admin/encuestas/AlertasEncuestasPanel";
import type { ClienteResumen } from "@/lib/huellitas/clientesService";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { cn } from "@/lib/utils";

type Tab = "cartera" | "alertas";

interface Props {
  clientesIniciales: ClienteResumen[];
  premios: Premio[];
  niveles: NivelLealtad[];
  valorMonetarioHuellita: number;
  montoParaUnaHuellita: number;
  alertasIniciales: number;
}

export function ClientesAdminTabs({
  clientesIniciales,
  premios,
  niveles,
  valorMonetarioHuellita,
  montoParaUnaHuellita,
  alertasIniciales
}: Props) {
  const [tab, setTab] = useState<Tab>("cartera");
  const [badgeAlertas, setBadgeAlertas] = useState(alertasIniciales);

  return (
    <div className="space-y-6">
      <div
        className="inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-bark-100"
        role="tablist"
        aria-label="Secciones de clientes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cartera"}
          onClick={() => setTab("cartera")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
            tab === "cartera"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-bark-600 hover:bg-cream-50"
          )}
        >
          <Users size={16} />
          Cartera
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "alertas"}
          onClick={() => setTab("alertas")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
            tab === "alertas"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-bark-600 hover:bg-cream-50"
          )}
        >
          <AlertTriangle
            size={16}
            className={tab === "alertas" ? "text-[#fb8500]" : undefined}
          />
          Alertas
          {badgeAlertas > 0 ? (
            <span
              className={cn(
                "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
                tab === "alertas"
                  ? "bg-red-500 text-white"
                  : "bg-red-100 text-red-800"
              )}
            >
              {badgeAlertas > 99 ? "99+" : badgeAlertas}
            </span>
          ) : null}
        </button>
      </div>

      {tab === "cartera" ? (
        <BuscadorClientes
          clientesIniciales={clientesIniciales}
          premios={premios}
          niveles={niveles}
          valorMonetarioHuellita={valorMonetarioHuellita}
          montoParaUnaHuellita={montoParaUnaHuellita}
        />
      ) : (
        <AlertasEncuestasPanel
          onCountChange={setBadgeAlertas}
        />
      )}
    </div>
  );
}
