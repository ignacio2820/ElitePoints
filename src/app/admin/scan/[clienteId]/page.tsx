import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ScanLine } from "lucide-react";
import { getSesion } from "@/lib/auth/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { NivelBadge } from "@/components/NivelBadge";
import { FichaMascota } from "@/components/FichaMascota";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { calcularNivel, progresoNivel } from "@/lib/huellitas/engine";
import {
  CONFIGURACION_DEFAULT,
  type ConfiguracionLocal,
  type Mascota
} from "@/lib/huellitas/types";
import { fusionarMascotasCliente } from "@/lib/huellitas/fusionarMascotasCliente";
import { formatARS, formatNumber } from "@/lib/utils";

interface DatosScan {
  cliente: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    saldoHuellitas: number;
    acumuladoHistorico: number;
    nivelId: string;
    mascotas: Mascota[];
  };
  cfg: ConfiguracionLocal;
}

const DEMO_DATA: DatosScan = {
  cliente: {
    id: "demo",
    nombre: "Lucía Romero",
    email: "lucia@example.com",
    telefono: "+54 9 341 555-0123",
    saldoHuellitas: 142,
    acumuladoHistorico: 1340,
    nivelId: "explorador",
    mascotas: [
      {
        id: "m1",
        nombre: "Coco",
        especie: "perro",
        raza: "Caniche toy",
        fechaNacimiento: new Date(Date.now() - 4 * 365 * 86_400_000)
          .toISOString()
          .slice(0, 10),
        sexo: "macho",
        color: "Blanco",
        pesoKg: 4.2,
        esterilizado: true,
        alergias: "Pollo",
        medicacionActual: "Antiparasitario mensual",
        veterinario: "Dra. Sosa — Clínica Patitas",
        planAlimenticio: "balanceado-premium",
        marcaAlimentoFavorita: "Royal Canin Mini",
        notas:
          "Le tiene miedo a los petardos. Le encantan los peluches con sonido."
      },
      {
        id: "m2",
        nombre: "Luna",
        especie: "gato",
        raza: "Siamés",
        fechaNacimiento: new Date().toISOString().slice(0, 10),
        sexo: "hembra",
        color: "Crema con orejas chocolate",
        pesoKg: 3.1,
        esterilizado: true,
        alergias: "",
        planAlimenticio: "balanceado-premium",
        marcaAlimentoFavorita: "Hill's Adult Indoor"
      }
    ]
  },
  cfg: { ...CONFIGURACION_DEFAULT, localId: "demo" }
};

async function loadScan(
  localId: string,
  clienteId: string
): Promise<DatosScan | null> {
  if (clienteId === "demo") {
    return {
      ...DEMO_DATA,
      cfg: { ...DEMO_DATA.cfg, localId }
    };
  }
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { cols } = await import("@/lib/firebase/collections");
    const { getConfiguracion } = await import("@/lib/huellitas/service");
    const db = adminDb();
    const cliSnap = await cols.cliente(db, localId, clienteId).get();
    if (!cliSnap.exists) return null;
    const cli = cliSnap.data() as DatosScan["cliente"] & {
      mascotas?: Mascota[];
    };
    const mascotasSnap = await cols.mascotas(db, localId, clienteId).get();
    const subcoleccion = mascotasSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Mascota)
    }));
    const mascotas = fusionarMascotasCliente(cli.mascotas, subcoleccion);
    const cfg = await getConfiguracion(localId);
    return {
      cliente: {
        id: cliSnap.id,
        nombre: cli.nombre,
        email: cli.email,
        telefono: cli.telefono,
        saldoHuellitas: cli.saldoHuellitas ?? 0,
        acumuladoHistorico: cli.acumuladoHistorico ?? 0,
        nivelId: cli.nivelId ?? "cachorro",
        mascotas
      },
      cfg
    };
  } catch {
    return null;
  }
}

export default async function ScanClientePage({
  params
}: {
  params: { clienteId: string };
}) {
  const sesion = await getSesion();
  if (!sesion?.claims.localId || sesion.claims.role !== "admin") {
    redirect("/login?intent=admin&redirect=/admin");
  }
  const data = await loadScan(sesion.claims.localId, params.clienteId);
  if (!data) {
    return (
      <div className="paw-bg min-h-screen p-10">
        <p className="text-bark-500">Cliente no encontrado.</p>
      </div>
    );
  }

  const { cliente, cfg } = data;
  const nivel = calcularNivel(cliente.acumuladoHistorico, cfg.niveles);
  const prog = progresoNivel(cliente.acumuladoHistorico, cfg.niveles);

  return (
    <div>
      <Link
        href="/admin/clientes"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-bark-700"
      >
        <ArrowLeft size={14} /> Volver a clientes
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-bark-400">
            <ScanLine size={16} />
            <span className="label-elegant">Lectura de QR</span>
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
            {cliente.nombre}
          </h1>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            {cliente.email ?? ""}
            {cliente.email && cliente.telefono ? " · " : ""}
            {cliente.telefono ?? ""}
          </div>
        </div>
        <NivelBadge nivel={nivel} size="lg" showMultiplier />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saldo disponible</CardTitle>
            <CardDescription>Para canjear hoy.</CardDescription>
          </CardHeader>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-black tabular-nums text-[#FB8500] [text-shadow:0_1px_0_rgb(255_255_255),0_0_20px_rgba(255_255_255,0.9)]">
              {formatNumber(cliente.saldoHuellitas)}
            </span>
            <HuellitaIcon
              size={20}
              className="text-[#FB8500] drop-shadow-[0_1px_0_rgba(255,255,255,1)]"
            />
          </div>
          <div className="mt-1 text-sm text-bark-500">
            Equivalen a{" "}
            <strong>
              {formatARS(cliente.saldoHuellitas * cfg.valorMonetarioHuellita)}
            </strong>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acumulado histórico</CardTitle>
            <CardDescription>Define el rango.</CardDescription>
          </CardHeader>
          <div className="font-display text-4xl font-semibold text-bark-700">
            {formatNumber(cliente.acumuladoHistorico)}
          </div>
          <div className="mt-1 text-sm text-bark-500">
            {prog.nivelSiguiente
              ? `Faltan ${formatNumber(prog.huellitasFaltantes)} para ${prog.nivelSiguiente.nombre}`
              : "Rango máximo alcanzado"}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Beneficios activos</CardTitle>
            <CardDescription>Aplican en este ticket.</CardDescription>
          </CardHeader>
          <ul className="space-y-1.5 text-sm text-bark-500">
            <li>
              Multiplicador:{" "}
              <strong className="text-bark-700">{nivel.multiplicador}×</strong>
            </li>
            <li>
              Descuento fijo:{" "}
              <strong className="text-bark-700">
                {Math.round(nivel.descuentoFijoPct * 100)}%
              </strong>
            </li>
            <li>
              Mascotas en ficha:{" "}
              <strong className="text-bark-700">{cliente.mascotas.length}</strong>
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-10 mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-bark-700">
          Mascotas
        </h2>
        <span className="text-sm text-[color:var(--muted)]">
          {cliente.mascotas.length}{" "}
          {cliente.mascotas.length === 1 ? "registrada" : "registradas"}
        </span>
      </div>

      {cliente.mascotas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bark-200 p-8 text-center text-sm text-[color:var(--muted)]">
          Este cliente todavía no completó la ficha de su mascota.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cliente.mascotas.map((m) => (
            <FichaMascota key={m.id ?? m.nombre} mascota={m} />
          ))}
        </div>
      )}
    </div>
  );
}
