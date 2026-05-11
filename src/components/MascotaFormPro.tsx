"use client";

import { useState, useTransition } from "react";
import {
  Apple,
  CalendarDays,
  Heart,
  PawPrint,
  Plus,
  Stethoscope,
  type LucideIcon
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, NumberInput, Select, TextInput } from "@/components/ui/Field";
import {
  EspecieSchema,
  MascotaSchema,
  SexoSchema,
  type Especie,
  type Mascota,
  type Sexo
} from "@/lib/huellitas/types";

const especieEmoji: Record<Especie, string> = {
  perro: "🐶",
  gato: "🐱",
  ave: "🐦",
  reptil: "🦎",
  otro: "🐾"
};

interface SectionProps {
  title: string;
  description?: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}

function Section({ title, description, Icon, children }: SectionProps) {
  return (
    <div className="rounded-2xl border border-bark-100 bg-white/60 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-bark-500">
          <Icon size={16} />
        </div>
        <div>
          <h4 className="font-display text-base font-semibold text-bark-700">
            {title}
          </h4>
          {description ? (
            <p className="text-xs text-[color:var(--muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

interface MascotaFormProProps {
  initial?: Partial<Mascota>;
  onSubmit?: (m: Mascota) => Promise<void> | void;
  submitLabel?: string;
}

export function MascotaFormPro({
  initial,
  onSubmit,
  submitLabel = "Guardar ficha"
}: MascotaFormProProps) {
  const [m, setM] = useState<Partial<Mascota>>({
    nombre: "",
    especie: "perro",
    raza: "",
    fechaNacimiento: "",
    sexo: undefined,
    color: "",
    pesoKg: undefined,
    esterilizado: undefined,
    alergias: "",
    medicacionActual: "",
    veterinario: "",
    planAlimenticio: "",
    marcaAlimentoFavorita: "",
    notas: "",
    ...initial
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof Mascota>(k: K, v: Mascota[K]) =>
    setM((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    setError(null);
    const candidato = { ...m };
    // Limpiamos strings vacíos para que opcionales no fallen.
    for (const k of Object.keys(candidato) as (keyof Mascota)[]) {
      const v = candidato[k];
      if (v === "" || v === undefined) delete candidato[k];
    }
    const parsed = MascotaSchema.safeParse(candidato);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    start(async () => {
      await onSubmit?.(parsed.data);
    });
  };

  const especie = (m.especie ?? "perro") as Especie;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-bark-400">
              <PawPrint size={16} />
              <span className="label-elegant">Ficha de mascota</span>
            </div>
            <CardTitle className="mt-2 text-xl">Contános de tu mascota</CardTitle>
            <CardDescription>
              Cuanto más completa esté la ficha, mejor podemos cuidarla. Sólo el
              nombre, especie y fecha de nacimiento son obligatorios.
            </CardDescription>
          </div>
          {/* Avatar grande */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-cream-100 to-cream-200 text-5xl shadow-soft ring-1 ring-bark-100">
            <span aria-hidden>{especieEmoji[especie]}</span>
          </div>
        </div>
      </CardHeader>

      <div className="space-y-5">
        <Section
          title="Identidad"
          description="Lo básico para reconocerla."
          Icon={PawPrint}
        >
          <Field label="Nombre">
            <TextInput
              value={m.nombre ?? ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Coco"
            />
          </Field>
          <Field label="Especie">
            <Select
              value={m.especie ?? "perro"}
              onChange={(e) =>
                set("especie", EspecieSchema.parse(e.target.value))
              }
            >
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="ave">Ave</option>
              <option value="reptil">Reptil</option>
              <option value="otro">Otro</option>
            </Select>
          </Field>
          <Field label="Raza">
            <TextInput
              value={m.raza ?? ""}
              onChange={(e) => set("raza", e.target.value)}
              placeholder="Caniche toy"
            />
          </Field>
          <Field
            label="Fecha de nacimiento"
            hint="Para saludarla en su cumpleaños."
          >
            <TextInput
              type="date"
              value={m.fechaNacimiento ?? ""}
              onChange={(e) => set("fechaNacimiento", e.target.value)}
            />
          </Field>
          <Field label="Sexo">
            <Select
              value={m.sexo ?? ""}
              onChange={(e) =>
                set(
                  "sexo",
                  e.target.value
                    ? (SexoSchema.parse(e.target.value) as Sexo)
                    : (undefined as unknown as Sexo)
                )
              }
            >
              <option value="">Sin especificar</option>
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
              <option value="desconocido">Desconocido</option>
            </Select>
          </Field>
          <Field label="Color / pelaje">
            <TextInput
              value={m.color ?? ""}
              onChange={(e) => set("color", e.target.value)}
              placeholder="Blanco con manchas"
            />
          </Field>
        </Section>

        <Section
          title="Salud"
          description="Datos clínicos que nos ayudan a recomendarte mejor."
          Icon={Stethoscope}
        >
          <Field label="Peso (kg)">
            <NumberInput
              step={0.1}
              min={0}
              value={m.pesoKg ?? ""}
              onChange={(e) =>
                set(
                  "pesoKg",
                  e.target.value ? Number(e.target.value) : (undefined as unknown as number)
                )
              }
              placeholder="3.5"
            />
          </Field>
          <Field label="¿Está esterilizada/o?">
            <Select
              value={
                m.esterilizado === undefined ? "" : m.esterilizado ? "si" : "no"
              }
              onChange={(e) =>
                set(
                  "esterilizado",
                  e.target.value === ""
                    ? (undefined as unknown as boolean)
                    : e.target.value === "si"
                )
              }
            >
              <option value="">Sin especificar</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </Field>
          <Field label="Alergias conocidas">
            <TextInput
              value={m.alergias ?? ""}
              onChange={(e) => set("alergias", e.target.value)}
              placeholder="Pollo, ácaros…"
            />
          </Field>
          <Field label="Medicación actual">
            <TextInput
              value={m.medicacionActual ?? ""}
              onChange={(e) => set("medicacionActual", e.target.value)}
              placeholder="Antiparasitario mensual"
            />
          </Field>
          <Field label="Veterinario de cabecera" className="sm:col-span-2">
            <TextInput
              value={m.veterinario ?? ""}
              onChange={(e) => set("veterinario", e.target.value)}
              placeholder="Dra. Sosa — Clínica Patitas"
            />
          </Field>
        </Section>

        <Section
          title="Alimentación"
          description="Para que el local te recomiende productos consistentes."
          Icon={Apple}
        >
          <Field label="Plan alimenticio">
            <Select
              value={m.planAlimenticio ?? ""}
              onChange={(e) => set("planAlimenticio", e.target.value)}
            >
              <option value="">Sin especificar</option>
              <option value="balanceado-premium">Balanceado premium</option>
              <option value="balanceado-comun">Balanceado común</option>
              <option value="medicado">Alimento medicado</option>
              <option value="natural">Dieta natural / BARF</option>
              <option value="mixto">Mixto</option>
            </Select>
          </Field>
          <Field label="Marca favorita">
            <TextInput
              value={m.marcaAlimentoFavorita ?? ""}
              onChange={(e) => set("marcaAlimentoFavorita", e.target.value)}
              placeholder="Royal Canin Mini"
            />
          </Field>
        </Section>

        <Section
          title="Notas del cliente"
          description="Cosas que nos quieras contar (miedos, comportamientos…)."
          Icon={Heart}
        >
          <Field label="Notas" className="sm:col-span-2">
            <textarea
              className="input-elegant min-h-[88px] resize-y"
              value={m.notas ?? ""}
              onChange={(e) => set("notas", e.target.value)}
              maxLength={500}
              placeholder="Le tiene miedo a los ruidos fuertes, le encanta jugar con peluches…"
            />
          </Field>
        </Section>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl bg-terracotta-50 px-4 py-2 text-sm text-terracotta-500">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-bark-100 pt-5">
        <p className="text-xs text-[color:var(--muted)] flex items-center gap-1.5">
          <CalendarDays size={12} />
          Tu información está protegida y sólo es visible para este local.
        </p>
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={16} />
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </Card>
  );
}
