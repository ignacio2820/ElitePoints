"use client";

import { useMemo, useState, useTransition } from "react";
import { Cake, Gift, PartyPopper, Save, Sparkles } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, NumberInput } from "@/components/ui/Field";
import { Slider } from "@/components/ui/Slider";
import { MargenWarning } from "@/components/MargenWarning";
import { HuellitaIcon, HuellitasStack } from "@/components/HuellitaIcon";
import type { ConfiguracionLocal } from "@/lib/huellitas/types";
import { calcularEmision } from "@/lib/huellitas/engine";
import { formatARS, formatNumber } from "@/lib/utils";

export type SaveResult = { ok: true } | { ok: false; error: string };

export function ConfiguracionForm({
  initial,
  onSave
}: {
  initial: ConfiguracionLocal;
  onSave?: (cfg: ConfiguracionLocal) => Promise<SaveResult>;
}) {
  const [cfg, setCfg] = useState<ConfiguracionLocal>(initial);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ConfiguracionLocal>(k: K, v: ConfiguracionLocal[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const previewTicket = 25000;
  const preview = useMemo(() => {
    try {
      return calcularEmision(previewTicket, cfg);
    } catch {
      return { huellitasGeneradas: 0, resto: previewTicket, fechaVencimiento: "" };
    }
  }, [cfg]);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = (await onSave?.(cfg)) ?? { ok: true };
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString("es-AR"));
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-terracotta-500">
              <Sparkles size={16} />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                Reglas del programa
              </span>
            </div>
            <CardTitle className="mt-2 text-2xl font-bold text-bark-700">
              Configurá tu programa Huellitas
            </CardTitle>
            <CardDescription className="text-bark-600">
              Ajustá cuánto cuesta acumular, cuánto vale cada canje y el plazo
              de vencimiento. Los cambios afectan a las próximas ventas.
            </CardDescription>
          </CardHeader>

          <div className="space-y-7">
            {/* Costo de Acumulación */}
            <div>
              <Field
                label="Costo de Acumulación"
                hint={
                  <>
                    Cantidad de pesos para generar <strong>1 huellita</strong>.
                    Cuanto más alto, más conservador es tu programa.
                  </>
                }
              >
                <div className="flex items-center gap-4">
                  <NumberInput
                    min={100}
                    max={100000}
                    step={100}
                    value={cfg.montoParaUnaHuellita}
                    onChange={(e) =>
                      setField("montoParaUnaHuellita", Number(e.target.value))
                    }
                    className="max-w-[160px]"
                  />
                  <Slider
                    min={100}
                    max={20000}
                    step={100}
                    value={Math.min(cfg.montoParaUnaHuellita, 20000)}
                    onChange={(v) => setField("montoParaUnaHuellita", v)}
                  />
                </div>
              </Field>
              <div className="mt-2 text-sm text-bark-600">
                Hoy: cada{" "}
                <strong className="text-bark-700">
                  {formatARS(cfg.montoParaUnaHuellita)}
                </strong>{" "}
                = 1{" "}
                <HuellitaIcon
                  size={14}
                  className="-mt-0.5 inline-block text-terracotta-400"
                />
              </div>
            </div>

            {/* Valor de Canje */}
            <div>
              <Field
                label="Valor de Canje"
                hint={
                  <>
                    Cuánto descuenta <strong>1 huellita</strong> al canjearse. Te
                    recomendamos mantenerlo bien por debajo del costo de
                    acumulación para proteger tu margen.
                  </>
                }
              >
                <div className="flex items-center gap-4">
                  <NumberInput
                    min={0}
                    max={cfg.montoParaUnaHuellita}
                    step={1}
                    value={cfg.valorMonetarioHuellita}
                    onChange={(e) =>
                      setField("valorMonetarioHuellita", Number(e.target.value))
                    }
                    className="max-w-[160px]"
                  />
                  <Slider
                    min={0}
                    max={Math.max(50, Math.floor(cfg.montoParaUnaHuellita * 0.2))}
                    step={1}
                    value={Math.min(
                      cfg.valorMonetarioHuellita,
                      Math.max(50, Math.floor(cfg.montoParaUnaHuellita * 0.2))
                    )}
                    onChange={(v) => setField("valorMonetarioHuellita", v)}
                  />
                </div>
              </Field>
            </div>

            {/* Vencimiento */}
            <div>
              <Field
                label="Días de Vencimiento"
                hint="Plazo en días desde la emisión para que las huellitas expiren."
              >
                <div className="flex items-center gap-4">
                  <NumberInput
                    min={30}
                    max={3650}
                    step={30}
                    value={cfg.diasVencimiento}
                    onChange={(e) =>
                      setField("diasVencimiento", Number(e.target.value))
                    }
                    className="max-w-[140px]"
                  />
                  <Slider
                    min={30}
                    max={730}
                    step={30}
                    value={Math.min(cfg.diasVencimiento, 730)}
                    onChange={(v) => setField("diasVencimiento", v)}
                  />
                  <span className="min-w-[80px] text-sm font-medium text-bark-600">
                    {cfg.diasVencimiento} días
                  </span>
                </div>
              </Field>
            </div>

            {/* Mínimo y tope */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Mínimo de Huellitas para canje"
                hint="Evita micro-canjes incómodos para el local."
              >
                <NumberInput
                  min={0}
                  max={1000}
                  step={1}
                  value={cfg.minimoHuellitasCanje}
                  onChange={(e) =>
                    setField("minimoHuellitasCanje", Number(e.target.value))
                  }
                />
              </Field>
              <Field
                label="Tope de descuento por venta"
                hint={
                  <>
                    Máximo del ticket que puede pagarse con huellitas (
                    {Math.round(cfg.topeDescuentoPorcentual * 100)}%).
                  </>
                }
              >
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(cfg.topeDescuentoPorcentual * 100)}
                  onChange={(v) => setField("topeDescuentoPorcentual", v / 100)}
                />
              </Field>
            </div>

            {/* Cumpleaños */}
            <div className="rounded-2xl bg-cream-100 p-5">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.emailsCumpleanosActivos}
                  onChange={(e) =>
                    setField("emailsCumpleanosActivos", e.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-bark-400"
                />
                <div>
                  <div className="font-semibold text-bark-700">
                    Felicitar el cumpleaños de cada mascota
                  </div>
                  <p className="text-sm text-bark-500 mt-1">
                    Enviamos un email automático al cliente el día del cumpleaños
                    de su mascota, con un saludo y un regalo configurable.
                  </p>
                </div>
              </label>
            </div>


            {/* Encuestas de satisfacción */}
            <div className="rounded-2xl bg-cream-100 p-5">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.emailsEncuestaActivos ?? true}
                  onChange={(e) =>
                    setField("emailsEncuestaActivos", e.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-bark-400"
                />
                <div>
                  <div className="font-semibold text-bark-700">
                    Encuesta de satisfacción post-compra
                  </div>
                  <p className="text-sm text-bark-500 mt-1">
                    24 h después de una compra con Huellitas, enviamos un email
                    con el enlace para calificar y ganar 5 Huellitas de regalo.
                  </p>
                </div>
              </label>
            </div>

            {/* Bonificaciones especiales */}
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-100 p-5 space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-amber-200 text-amber-500">
                  <PartyPopper size={16} />
                </div>
                <div>
                  <div className="font-semibold text-bark-700">
                    Bonificaciones especiales
                  </div>
                  <p className="text-sm text-bark-500 mt-1">
                    Reglas opcionales que se aplican automáticamente al
                    registrar la venta. No alteran el cálculo base, solo lo
                    potencian cuando corresponde.
                  </p>
                </div>
              </div>

              {/* Bono Cumpleaños */}
              <div className="rounded-xl bg-white/70 ring-1 ring-amber-100 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.bonificaciones.cumpleanos.activo}
                    onChange={(e) =>
                      setField("bonificaciones", {
                        ...cfg.bonificaciones,
                        cumpleanos: {
                          ...cfg.bonificaciones.cumpleanos,
                          activo: e.target.checked
                        }
                      })
                    }
                    className="mt-1 h-5 w-5 accent-bark-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-bark-700">
                      <Cake size={16} className="text-amber-500" />
                      Bono Cumpleaños
                    </div>
                    <p className="text-sm text-bark-500 mt-1">
                      Si HOY es cumpleaños de alguna mascota del cliente, las
                      huellitas emitidas en la venta se multiplican.
                    </p>
                  </div>
                </label>

                {cfg.bonificaciones.cumpleanos.activo ? (
                  <div className="mt-4 pl-8 max-w-[260px]">
                    <Field
                      label="Multiplicador de cumpleaños"
                      hint={`Cuántas veces se multiplican las huellitas (recomendado: 2x).`}
                    >
                      <NumberInput
                        min={1}
                        max={10}
                        step={1}
                        value={cfg.bonificaciones.cumpleanos.multiplicador}
                        onChange={(e) =>
                          setField("bonificaciones", {
                            ...cfg.bonificaciones,
                            cumpleanos: {
                              ...cfg.bonificaciones.cumpleanos,
                              multiplicador: Number(e.target.value)
                            }
                          })
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              {/* Bono Primera Compra */}
              <div className="rounded-xl bg-white/70 ring-1 ring-amber-100 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.bonificaciones.primeraCompra.activo}
                    onChange={(e) =>
                      setField("bonificaciones", {
                        ...cfg.bonificaciones,
                        primeraCompra: {
                          ...cfg.bonificaciones.primeraCompra,
                          activo: e.target.checked
                        }
                      })
                    }
                    className="mt-1 h-5 w-5 accent-bark-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-bark-700">
                      <Gift size={16} className="text-amber-500" />
                      Bono Primera Compra
                    </div>
                    <p className="text-sm text-bark-500 mt-1">
                      Lote fijo de huellitas extra de bienvenida en la primera
                      venta del cliente. Se acreditan como un lote propio con
                      el mismo vencimiento que el resto.
                    </p>
                  </div>
                </label>

                {cfg.bonificaciones.primeraCompra.activo ? (
                  <div className="mt-4 pl-8 max-w-[260px]">
                    <Field
                      label="Huellitas extra de bienvenida"
                      hint="Recomendado: 100 huellitas."
                    >
                      <NumberInput
                        min={0}
                        max={10000}
                        step={10}
                        value={cfg.bonificaciones.primeraCompra.huellitasExtra}
                        onChange={(e) =>
                          setField("bonificaciones", {
                            ...cfg.bonificaciones,
                            primeraCompra: {
                              ...cfg.bonificaciones.primeraCompra,
                              huellitasExtra: Number(e.target.value)
                            }
                          })
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Referidos */}
            <div className="rounded-2xl bg-sage-50 ring-1 ring-sage-100 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-sage-200 text-sage-300">
                  <Gift size={16} />
                </div>
                <div className="flex-1">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.referidos.activo}
                      onChange={(e) =>
                        setField("referidos", {
                          ...cfg.referidos,
                          activo: e.target.checked
                        })
                      }
                      className="mt-1 h-5 w-5 accent-bark-400"
                    />
                    <div>
                      <div className="font-semibold text-bark-700">
                        Activar programa "Boca en boca"
                      </div>
                      <p className="text-sm text-bark-500 mt-1">
                        Cada cliente recibe un código único. Cuando un nuevo
                        cliente se registra con un código y hace su primera
                        compra, ambos reciben huellitas de regalo.
                      </p>
                    </div>
                  </label>

                  {cfg.referidos.activo ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Bonus de bienvenida"
                        hint="Huellitas que recibe el NUEVO cliente al hacer su primera compra."
                      >
                        <NumberInput
                          min={0}
                          max={1000}
                          step={1}
                          value={cfg.referidos.bonusBienvenida}
                          onChange={(e) =>
                            setField("referidos", {
                              ...cfg.referidos,
                              bonusBienvenida: Number(e.target.value)
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Bonus al referente"
                        hint="Huellitas que recibe quien hizo la recomendación."
                      >
                        <NumberInput
                          min={0}
                          max={1000}
                          step={1}
                          value={cfg.referidos.bonusReferente}
                          onChange={(e) =>
                            setField("referidos", {
                              ...cfg.referidos,
                              bonusReferente: Number(e.target.value)
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Mensaje de WhatsApp"
                        className="sm:col-span-2"
                        hint="Usá {local}, {codigo} y {url} como reemplazos automáticos."
                      >
                        <textarea
                          className="input-elegant min-h-[72px] resize-y"
                          maxLength={500}
                          value={cfg.referidos.mensajeWhatsApp}
                          onChange={(e) =>
                            setField("referidos", {
                              ...cfg.referidos,
                              mensajeWhatsApp: e.target.value
                            })
                          }
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-bark-100 pt-6">
            <div className="text-xs font-medium text-bark-600">
              {error ? (
                <span className="text-terracotta-500">⚠ {error}</span>
              ) : savedAt ? (
                `Guardado a las ${savedAt}`
              ) : (
                "Cambios sin guardar"
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={pending}
              className="btn-primary inline-flex items-center gap-2 text-white"
            >
              <Save size={16} />
              {pending ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <MargenWarning cfg={cfg} />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-bark-700">
              Vista previa de una venta
            </CardTitle>
            <CardDescription className="text-bark-600">
              Así se verá el ticket con tu configuración actual.
            </CardDescription>
          </CardHeader>
          <div className="rounded-2xl bg-cream-50 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-bark-600">
                Total venta
              </span>
              <span className="font-display text-xl font-bold text-bark-700">
                {formatARS(previewTicket)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-bark-600">
                Huellitas que suma
              </span>
              <span className="inline-flex items-center gap-2 font-display text-2xl font-extrabold text-bark-700">
                +{formatNumber(preview.huellitasGeneradas)}
                <HuellitaIcon size={18} className="text-terracotta-400" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm font-medium text-bark-600">
                Equivalen a (cuando canjee)
              </span>
              <span className="font-semibold text-bark-700">
                {formatARS(
                  preview.huellitasGeneradas * cfg.valorMonetarioHuellita
                )}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between text-xs text-bark-600">
              <span>Vencen el</span>
              <span className="font-medium text-bark-700">
                {preview.fechaVencimiento}
              </span>
            </div>
            <HuellitasStack
              count={Math.min(preview.huellitasGeneradas, 6)}
              className="mt-5"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
