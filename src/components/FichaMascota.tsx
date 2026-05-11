import {
  Apple,
  Cake,
  Heart,
  PawPrint,
  Stethoscope,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { edadMascotaAnios, esCumpleanos } from "@/lib/huellitas/engine";
import type { Especie, Mascota } from "@/lib/huellitas/types";

const especieEmoji: Record<Especie, string> = {
  perro: "🐶",
  gato: "🐱",
  ave: "🐦",
  reptil: "🦎",
  otro: "🐾"
};

const especieLabel: Record<Especie, string> = {
  perro: "Perro",
  gato: "Gato",
  ave: "Ave",
  reptil: "Reptil",
  otro: "Otro"
};

/**
 * Vista detallada de la mascota — pensada para que el ADMIN del local
 * la consulte al escanear el QR del cliente. Muestra todo lo cargado.
 */
export function FichaMascota({ mascota }: { mascota: Mascota }) {
  const edad = edadMascotaAnios(mascota);
  const cumple = esCumpleanos(mascota);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-start gap-4 border-b border-bark-100 bg-gradient-to-br from-cream-50 to-cream-100 p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-4xl ring-1 ring-bark-100">
          <span aria-hidden>{especieEmoji[mascota.especie]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl font-semibold text-bark-700 truncate">
              {mascota.nombre}
            </h3>
            {cumple ? (
              <Badge tone="ajustado">
                <Cake size={12} /> Cumple hoy
              </Badge>
            ) : null}
          </div>
          <div className="text-sm text-[color:var(--muted)]">
            {especieLabel[mascota.especie]}
            {mascota.raza ? ` · ${mascota.raza}` : ""}
            {" · "}
            {edad === 0 ? "Recién nacido" : `${edad} ${edad === 1 ? "año" : "años"}`}
            {mascota.sexo && mascota.sexo !== "desconocido"
              ? ` · ${mascota.sexo === "hembra" ? "Hembra" : "Macho"}`
              : ""}
          </div>
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-bark-100">
        <SectionRO Icon={PawPrint} title="Identidad">
          <Row label="Color">{mascota.color || "—"}</Row>
          <Row label="Peso">
            {mascota.pesoKg ? `${mascota.pesoKg} kg` : "—"}
          </Row>
          <Row label="Nacimiento">
            {formatFecha(mascota.fechaNacimiento)}
          </Row>
        </SectionRO>

        <SectionRO Icon={Stethoscope} title="Salud">
          <Row label="Esterilizado">
            {mascota.esterilizado === undefined
              ? "—"
              : mascota.esterilizado
              ? "Sí"
              : "No"}
          </Row>
          <Row label="Alergias">{mascota.alergias || "—"}</Row>
          <Row label="Medicación">{mascota.medicacionActual || "—"}</Row>
          <Row label="Veterinario">{mascota.veterinario || "—"}</Row>
        </SectionRO>

        <SectionRO Icon={Apple} title="Alimentación">
          <Row label="Plan">{mascota.planAlimenticio || "—"}</Row>
          <Row label="Marca favorita">
            {mascota.marcaAlimentoFavorita || "—"}
          </Row>
        </SectionRO>

        <SectionRO Icon={Heart} title="Notas">
          <p className="text-sm leading-relaxed text-bark-500">
            {mascota.notas || "Sin notas adicionales."}
          </p>
        </SectionRO>
      </div>
    </div>
  );
}

function SectionRO({
  Icon,
  title,
  children
}: {
  Icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} className="text-bark-400" />
        <span className="label-elegant">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-[color:var(--muted)]">{label}</span>
      <span className="text-sm font-medium text-bark-700 text-right max-w-[60%] truncate">
        {children}
      </span>
    </div>
  );
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
