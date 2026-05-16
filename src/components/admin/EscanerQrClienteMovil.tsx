"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, X } from "lucide-react";
import { extraerClienteIdDesdeQr } from "@/lib/huellitas/parseClienteQr";

interface Props {
  onClienteId: (id: string) => void;
}

/**
 * Botón solo móvil + modal de cámara para leer el QR del cliente (ruta /admin/scan/:id).
 */
export function EscanerQrClienteMovil({ onClienteId }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const regionId = useRef(`qr-region-${typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now()}`);
  const scannerRef = useRef<{ stop: () => Promise<unknown> } | null>(null);

  useEffect(() => {
    if (!abierto) return;

    let cancelado = false;
    let instancia: InstanceType<
      (typeof import("html5-qrcode"))["Html5Qrcode"]
    > | null = null;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelado) return;
      instancia = new Html5Qrcode(regionId.current, { verbose: false });
      scannerRef.current = instancia;

      try {
        await instancia.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const m = Math.min(viewfinderWidth, viewfinderHeight);
              const s = Math.min(280, Math.floor(m * 0.72));
              return { width: s, height: s };
            },
            aspectRatio: 1
          },
          (decoded) => {
            const id = extraerClienteIdDesdeQr(decoded);
            if (!id) {
              setMensaje("No pudimos leer un ID de cliente. Probá de nuevo.");
              return;
            }
            void instancia
              ?.stop()
              .catch(() => {})
              .finally(() => {
                setAbierto(false);
                setMensaje(null);
                onClienteId(id);
              });
          },
          () => {}
        );
      } catch (e) {
        if (!cancelado) {
          setMensaje(
            e instanceof Error
              ? e.message
              : "No se pudo usar la cámara. Revisá permisos."
          );
        }
      }
    })();

    return () => {
      cancelado = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      void s?.stop().catch(() => {});
    };
  }, [abierto, onClienteId]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMensaje(null);
          setAbierto(true);
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-bark-200 bg-white px-4 py-3.5 text-sm font-semibold text-bark-700 shadow-soft transition active:scale-[0.99] sm:py-3 md:hidden"
      >
        <QrCode size={20} className="shrink-0 text-bark-500" aria-hidden />
        Escanear QR del cliente
      </button>

      {abierto ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-bark-950/98 md:hidden"
          role="dialog"
          aria-modal
          aria-label="Escanear código QR"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="text-sm font-semibold text-white">
              Apuntá al QR del cliente
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-full p-2 text-white/90 transition hover:bg-white/10"
              aria-label="Cerrar escáner"
            >
              <X size={24} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div
              id={regionId.current}
              className="mx-auto h-full min-h-[50vh] w-full max-w-md overflow-hidden rounded-2xl bg-black"
            />
            {mensaje ? (
              <p className="mt-3 text-center text-sm text-amber-200">{mensaje}</p>
            ) : (
              <p className="mt-3 text-center text-xs text-white/60">
                El QR se genera en Mi cuenta → Mi código QR
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
