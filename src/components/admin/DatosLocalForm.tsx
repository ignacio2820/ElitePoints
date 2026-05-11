"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImageIcon, Phone, Save, Store, Upload } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import type { InfoLocal } from "@/lib/huellitas/localService";

export interface DatosLocalFormProps {
  initial: InfoLocal;
}

export function DatosLocalForm({ initial }: DatosLocalFormProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(initial.nombre);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [telefonoWhatsapp, setTelefono] = useState(initial.telefonoWhatsapp ?? "");
  const [direccion, setDireccion] = useState(initial.direccion ?? "");
  const [pending, startTransition] = useTransition();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/local/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre,
            logoUrl: logoUrl.trim() || "",
            telefonoWhatsapp,
            direccion
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error ?? "No pudimos guardar");
          return;
        }
        setSavedAt(new Date().toLocaleTimeString("es-AR"));
        if (!data.membresiaActiva) {
          router.push("/admin/pagos");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-bark-400">
          <Store size={16} />
          <span className="label-elegant">Datos del local</span>
        </div>
        <CardTitle className="mt-2">Identidad y contacto</CardTitle>
        <CardDescription>
          Estos datos se muestran al cliente en su portal. El WhatsApp habilita el
          boton flotante de consultas.
        </CardDescription>
      </CardHeader>

      <div className="space-y-5">
        <Field label="Nombre del local" hint="Lo ve el cliente arriba de su saldo.">
          <input
            className="input-elegant"
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Field>

        <Field
          label="Logo del local"
          hint="Pegá una URL pública o subí un archivo. Se muestra en el panel admin y en Mi Cuenta."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={`Logo de ${nombre || "tu local"}`}
                  className="h-14 w-14 rounded-xl border border-bark-100 bg-white object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-bark-200 bg-cream-50 text-bark-300">
                  <ImageIcon size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <input
                  type="url"
                  className="input-elegant"
                  maxLength={500}
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  setUploadingLogo(true);
                  try {
                    const form = new FormData();
                    form.append("file", file);
                    const res = await fetch("/api/admin/local/logo", {
                      method: "POST",
                      body: form
                    });
                    const data = await res.json();
                    if (!res.ok || !data.ok) {
                      throw new Error(data.error ?? "No pudimos subir el logo");
                    }
                    setLogoUrl(data.logoUrl ?? "");
                    setSavedAt(new Date().toLocaleTimeString("es-AR"));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Error");
                  } finally {
                    setUploadingLogo(false);
                    e.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo || pending}
                className="inline-flex items-center gap-2 rounded-xl border border-bark-200 bg-white px-4 py-2 text-sm font-medium text-bark-700 transition hover:border-bark-300 hover:bg-cream-50 disabled:opacity-50"
              >
                <Upload size={16} />
                {uploadingLogo ? "Subiendo…" : "Subir archivo"}
              </button>
              {logoUrl ? (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-sm text-bark-500 transition hover:text-bark-700"
                >
                  Quitar logo
                </button>
              ) : null}
            </div>
            </div>
        </Field>

        <Field
          label="Telefono WhatsApp"
          hint="Solo digitos, con codigo de pais y area. Ej: 5491155512345."
        >
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-bark-400" />
            <input
              className="input-elegant"
              maxLength={20}
              inputMode="numeric"
              value={telefonoWhatsapp}
              onChange={(e) =>
                setTelefono(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="5491155512345"
            />
          </div>
        </Field>

        <Field label="Direccion (opcional)">
          <input
            className="input-elegant"
            maxLength={300}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-bark-100 pt-5">
        <div className="text-xs text-[color:var(--muted)]">
          {error ? (
            <span className="text-terracotta-500">⚠ {error}</span>
          ) : savedAt ? (
            `Guardado a las ${savedAt}`
          ) : (
            "Cambios sin guardar"
          )}
        </div>
        <button
          onClick={guardar}
          disabled={pending}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Save size={16} />
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Card>
  );
}
