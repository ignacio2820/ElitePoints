"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Mail,
  MapPin,
  Phone,
  X,
  LifeBuoy
} from "lucide-react";
import { CONTACT_EMAIL, mailtoContact } from "@/lib/contact";
import { cn } from "@/lib/utils";

export interface DatosContactoLocal {
  nombreLocal: string;
  direccion?: string;
  telefonoWhatsapp?: string;
  telefonoUrgencias?: string;
  email?: string;
  horariosAtencion?: string;
}

function telHref(raw: string): string {
  const d = raw.replace(/[^0-9+]/g, "");
  return d.startsWith("+") ? `tel:${d}` : `tel:+${d.replace(/^\+/, "")}`;
}

function waHref(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "");
  return d ? `https://wa.me/${d}` : "#";
}

interface AyudaContactoModalProps {
  open: boolean;
  onClose: () => void;
  datos: DatosContactoLocal;
}

export function AyudaContactoModal({
  open,
  onClose,
  datos
}: AyudaContactoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const tieneLocal =
    datos.direccion?.trim() ||
    datos.telefonoWhatsapp?.trim() ||
    datos.telefonoUrgencias?.trim() ||
    datos.email?.trim() ||
    datos.horariosAtencion?.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ayuda-contacto-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-bark-900/60 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-bark-100">
        <div className="flex items-start justify-between gap-3 border-b border-bark-100 bg-cream-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-500">
              <LifeBuoy size={22} aria-hidden />
            </div>
            <div className="text-left">
              <h2
                id="ayuda-contacto-titulo"
                className="font-display text-lg font-semibold text-bark-800"
              >
                Ayuda y contacto
              </h2>
              <p className="text-sm text-bark-500">{datos.nombreLocal}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-bark-500 transition hover:bg-bark-100 hover:text-bark-800"
            aria-label="Cerrar ventana de ayuda"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto px-5 py-5">
          {!tieneLocal ? (
            <p className="text-sm leading-relaxed text-bark-600">
              Tu veterinaria aún no cargó todos los datos de contacto. Podés
              escribirnos a soporte de MascotPoints mientras tanto.
            </p>
          ) : null}

          {datos.direccion?.trim() ? (
            <FilaContacto
              icono={<MapPin size={18} />}
              titulo="Dirección"
              contenido={datos.direccion.trim()}
            />
          ) : null}

          {datos.telefonoUrgencias?.trim() ? (
            <FilaContacto
              icono={<Phone size={18} />}
              titulo="Teléfono de urgencias"
              contenido={
                <a
                  href={telHref(datos.telefonoUrgencias)}
                  className="font-semibold text-terracotta-600 hover:underline"
                >
                  {datos.telefonoUrgencias}
                </a>
              }
            />
          ) : null}

          {datos.telefonoWhatsapp?.trim() ? (
            <FilaContacto
              icono={<Phone size={18} />}
              titulo="WhatsApp / consultas"
              contenido={
                <a
                  href={waHref(datos.telefonoWhatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#128C7E] hover:underline"
                >
                  {formatearTelefonoVisible(datos.telefonoWhatsapp)}
                </a>
              }
            />
          ) : null}

          {datos.horariosAtencion?.trim() ? (
            <FilaContacto
              icono={<Clock size={18} />}
              titulo="Horarios de atención"
              contenido={datos.horariosAtencion.trim()}
            />
          ) : null}

          {datos.email?.trim() ? (
            <FilaContacto
              icono={<Mail size={18} />}
              titulo="Email del local"
              contenido={
                <a
                  href={`mailto:${datos.email.trim()}`}
                  className="font-semibold text-bark-800 hover:underline"
                >
                  {datos.email.trim()}
                </a>
              }
            />
          ) : null}

          <FilaContacto
            icono={<Mail size={18} />}
            titulo="Soporte MascotPoints"
            contenido={
              <a
                href={mailtoContact("Consulta desde la app cliente")}
                className="font-semibold text-bark-800 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            }
          />
        </div>

        <div className="border-t border-bark-100 bg-cream-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary w-full justify-center"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaContacto({
  icono,
  titulo,
  contenido
}: {
  icono: React.ReactNode;
  titulo: string;
  contenido: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-cream-50 p-4 ring-1 ring-bark-100/80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-terracotta-500 shadow-sm">
        {icono}
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bark-500">
          {titulo}
        </p>
        <div className="mt-1 text-sm leading-relaxed text-bark-700">
          {contenido}
        </div>
      </div>
    </div>
  );
}

function formatearTelefonoVisible(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "");
  if (d.length <= 10) return d || raw;
  return `+${d}`;
}

/** Botón de navegación «Ayuda» que abre el modal de contacto. */
export function AyudaNavButton({
  datos,
  className
}: {
  datos: DatosContactoLocal;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const cerrar = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15",
          className
        )}
      >
        Ayuda
      </button>
      <AyudaContactoModal open={open} onClose={cerrar} datos={datos} />
    </>
  );
}
