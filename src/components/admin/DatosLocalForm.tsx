"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImageIcon, Phone, Save, Store } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { comprimirImagenEnCliente } from "@/lib/images/compressImageClient";
import type { InfoLocal } from "@/lib/huellitas/localService";

const LOGO_ACCEPT = "image/jpeg,image/png,.jpg,.jpeg,.png";

export interface DatosLocalFormProps {
  initial: InfoLocal;
}

function esLogoPermitido(file: File): boolean {
  const tipo = file.type.toLowerCase();
  if (tipo === "image/jpeg" || tipo === "image/png") return true;
  const nombre = file.name.toLowerCase();
  return nombre.endsWith(".jpg") || nombre.endsWith(".jpeg") || nombre.endsWith(".png");
}

function esBlobUrl(url: string | null): url is string {
  return !!url && url.startsWith("blob:");
}

export function DatosLocalForm({ initial }: DatosLocalFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState(initial.nombre);
  /** URL del logo ya guardado en Firebase (persistido). */
  const [savedLogoUrl, setSavedLogoUrl] = useState(initial.logoUrl ?? "");
  /** Vista previa local (solo blob:); null = mostrar savedLogoUrl. */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** Archivo elegido por el usuario; no se limpia salvo éxito o “Quitar logo”. */
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [telefonoWhatsapp, setTelefono] = useState(initial.telefonoWhatsapp ?? "");
  const [direccion, setDireccion] = useState(initial.direccion ?? "");
  const [pending, startTransition] = useTransition();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displaySrc =
    (previewUrl && previewUrl.length > 0 ? previewUrl : null) ??
    (savedLogoUrl.trim() ? savedLogoUrl.trim() : null);

  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;

  useEffect(() => {
    return () => {
      const u = previewUrlRef.current;
      if (esBlobUrl(u)) {
        URL.revokeObjectURL(u);
      }
    };
  }, []);

  useEffect(() => {
    setNombre(initial.nombre);
    setSavedLogoUrl((initial.logoUrl ?? "").trim());
    setTelefono(initial.telefonoWhatsapp ?? "");
    setDireccion(initial.direccion ?? "");
  }, [initial.nombre, initial.logoUrl, initial.telefonoWhatsapp, initial.direccion]);

  function reemplazarPreviewBlob(nuevoBlobUrl: string | null) {
    setPreviewUrl((prev) => {
      if (esBlobUrl(prev)) {
        URL.revokeObjectURL(prev);
      }
      return nuevoBlobUrl;
    });
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/local/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre,
            logoUrl: savedLogoUrl.trim() || "",
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
        router.refresh();
        if (!data.membresiaActiva) {
          router.push("/admin/pagos");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  async function onLogoSeleccionado(file: File | undefined) {
    if (!file) return;
    if (!esLogoPermitido(file)) {
      setError("Solo aceptamos imágenes JPG o PNG.");
      return;
    }

    setError(null);
    setLogoFile(file);
    const blobUrl = URL.createObjectURL(file);
    reemplazarPreviewBlob(blobUrl);
    setUploadingLogo(true);

    try {
      const comprimida = await comprimirImagenEnCliente(file);
      const form = new FormData();
      form.append("file", comprimida);
      const res = await fetch("/api/admin/local/logo", {
        method: "POST",
        body: form
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No pudimos subir el logo");
      }
      const url = (data.logoUrl as string) ?? "";
      reemplazarPreviewBlob(null);
      setSavedLogoUrl(url.trim());
      setLogoFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      // Mantener preview blob y logoFile: no revocar ni pisar con saved vacío
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-terracotta-500">
          <Store size={16} />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
            Datos del local
          </span>
        </div>
        <CardTitle className="mt-2 text-2xl font-bold text-bark-700">
          Identidad y contacto
        </CardTitle>
        <CardDescription className="text-bark-600">
          Estos datos se muestran al cliente en su portal. El WhatsApp habilita
          el botón flotante de consultas.
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
          hint="Subí un JPG o PNG. Se guarda en Firebase y se muestra en el panel y en Mi Cuenta."
        >
          <div className="flex flex-wrap items-start gap-4">
            {displaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={displaySrc}
                src={displaySrc}
                alt={`Logo de ${nombre || "tu local"}`}
                className="h-16 w-16 rounded-xl border border-amber-200/70 bg-white object-cover shadow-soft"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-bark-200 bg-cream-50 text-bark-300">
                <ImageIcon size={22} />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={LOGO_ACCEPT}
                disabled={uploadingLogo || pending}
                className="block w-full cursor-pointer text-sm text-bark-600 file:mr-4 file:rounded-xl file:border file:border-amber-200/80 file:bg-cream-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-bark-700 hover:file:border-amber-300 hover:file:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void onLogoSeleccionado(file);
                }}
              />
              <p className="text-xs text-bark-600">
                {uploadingLogo
                  ? "Subiendo logo a Firebase Storage…"
                  : savedLogoUrl.trim()
                    ? "Logo listo. Podés cambiarlo o guardar el resto de los datos."
                    : logoFile
                      ? "Vista previa lista. Si falla la subida, la imagen se mantiene hasta que probés de nuevo."
                      : "Elegí una imagen para ver la vista previa y subirla."}
              </p>
              {savedLogoUrl.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    reemplazarPreviewBlob(null);
                    setSavedLogoUrl("");
                    setLogoFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
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
