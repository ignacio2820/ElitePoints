"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  PLANES_MEMBRESIA,
  PLANES_PAGO_PUBLICO,
  type PlanPagoPublico
} from "@/lib/huellitas/membresia";

export interface MembresiaCheckoutProps {
  membresiaActiva: boolean;
  fechaVencimiento?: string;
  planes?: readonly (typeof PLANES_MEMBRESIA)[number][];
  trialActivo?: boolean;
}

export function MembresiaCheckout({
  membresiaActiva,
  fechaVencimiento,
  planes = PLANES_PAGO_PUBLICO,
  trialActivo = false
}: MembresiaCheckoutProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanPagoPublico>("semestral");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pagar() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/membresia/pagar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error ?? "No pudimos procesar el pago");
          return;
        }
        router.push("/admin");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  const vencimientoLabel = fechaVencimiento
    ? new Date(fechaVencimiento).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : null;

  return (
    <div className="space-y-8">
      {trialActivo && vencimientoLabel ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-5 py-4 text-sm text-sky-950">
          Tenés acceso de prueba hasta el <strong>{vencimientoLabel}</strong>.
          Podés contratar un plan cuando quieras para seguir operando sin
          interrupciones.
        </div>
      ) : null}

      {membresiaActiva && !trialActivo && vencimientoLabel ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-900">
          Tu membresía está activa hasta el <strong>{vencimientoLabel}</strong>.
          Podés renovar o cambiar de plan cuando quieras.
        </div>
      ) : null}

      {!membresiaActiva ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-bark-700">
          Activá tu membresía para usar la caja y gestionar clientes. El pago es
          simulado por ahora; más adelante conectamos Mercado Pago o Stripe.
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          planes.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"
        )}
      >
        {planes.map((opcion) => {
          const selected = plan === opcion.id;
          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setPlan(opcion.id as PlanPagoPublico)}
              className={cn(
                "rounded-2xl border p-5 text-left transition",
                selected
                  ? "border-amber-400 bg-cream-50 shadow-[0_12px_32px_-16px_rgba(251,191,36,0.45)]"
                  : "border-bark-100 bg-white hover:border-bark-200"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bark-400">
                    {opcion.etiqueta}
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold text-bark-700">
                    ${opcion.precioUsd}
                    <span className="ml-1 text-sm font-medium text-bark-400">USD</span>
                  </p>
                </div>
                {selected ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-bark-900">
                    <Check size={16} />
                  </span>
                ) : null}
              </div>
              {opcion.ahorro ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">
                  Ahorro {opcion.ahorro}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  Renovación mes a mes
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-bark-400">
            <CreditCard size={16} />
            <span className="label-elegant">Pago simulado</span>
          </div>
          <CardTitle className="mt-2">Confirmá tu plan</CardTitle>
          <CardDescription>
            Al tocar &quot;Pagar ahora&quot; activamos tu membresía y calculamos la
            fecha de vencimiento según el plan elegido.
          </CardDescription>
        </CardHeader>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={pagar}
          disabled={pending}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          <Sparkles size={16} />
          {pending ? "Procesando pago..." : "Pagar ahora"}
        </button>
      </Card>
    </div>
  );
}
