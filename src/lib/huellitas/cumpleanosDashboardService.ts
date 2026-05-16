import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  CUMPLEANOS_DIAS_MAX,
  CUMPLEANOS_DIAS_MIN,
  CUMPLEANOS_ESTA_SEMANA_MAX,
  CUMPLEANOS_ESTA_SEMANA_MIN,
  diasHastaProximoCumple,
  estaEnVentanaProximosCumpleanos,
  etiquetaDiaCumple,
  fechaProximoCumple
} from "./cumpleanosProximos";
import { fusionarMascotasCliente } from "./fusionarMascotasCliente";
import { normalizarFechaNacimientoMascota } from "./fechaNacimientoMascota";
import type { Cliente, Mascota } from "@/lib/huellitas/types";

export interface CumpleanoProximo {
  mascotaId: string;
  nombreMascota: string;
  nombreDueno: string;
  clienteId: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  fechaCumple: Date;
  diaCumpleEtiqueta: string;
  diasRestantes: number;
}

const LIMITE_CLIENTES = 2000;
const CONCURRENCIA = 25;

async function mapEnLotes<T, R>(
  items: T[],
  tamano: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += tamano) {
    const lote = items.slice(i, i + tamano);
    const parcial = await Promise.all(lote.map(fn));
    out.push(...parcial);
  }
  return out;
}

function agregarMascotaSiAplica(
  acumulado: CumpleanoProximo[],
  visto: Set<string>,
  args: {
    mascotaId: string;
    mascota: Partial<Mascota>;
    clienteId: string;
    nombreDueno: string;
    email: string;
    telefono: string;
    hoy: Date;
    minDias: number;
    maxDias: number;
  }
): void {
  const clave = `${args.clienteId}:${args.mascotaId}`;
  if (visto.has(clave)) return;

  const nombreMascota = args.mascota.nombre?.trim();
  if (!nombreMascota) return;

  const fechaISO = normalizarFechaNacimientoMascota(args.mascota.fechaNacimiento);
  if (!fechaISO) return;

  const dias = diasHastaProximoCumple(fechaISO, args.hoy);
  if (dias === null || !estaEnVentanaProximosCumpleanos(dias, args.minDias, args.maxDias)) {
    return;
  }

  const fechaCumple = fechaProximoCumple(fechaISO, args.hoy);
  if (!fechaCumple) return;

  visto.add(clave);
  acumulado.push({
    mascotaId: args.mascotaId,
    nombreMascota,
    nombreDueno: args.nombreDueno,
    clienteId: args.clienteId,
    email: args.email,
    telefono: args.telefono,
    fechaNacimiento: fechaISO,
    fechaCumple,
    diaCumpleEtiqueta: etiquetaDiaCumple(fechaCumple),
    diasRestantes: dias
  });
}

/**
 * Próximos cumpleaños de mascotas del local (subcolección Mascotas + array embebido en Cliente).
 */
export async function listarProximosCumpleanosMascotas(
  localId: string,
  opts?: { minDias?: number; maxDias?: number; hoy?: Date }
): Promise<CumpleanoProximo[]> {
  const hoy = opts?.hoy ?? new Date();
  const minDias = opts?.minDias ?? CUMPLEANOS_DIAS_MIN;
  const maxDias = opts?.maxDias ?? CUMPLEANOS_DIAS_MAX;

  const db = adminDb();
  const clientesSnap = await cols.clientes(db, localId).limit(LIMITE_CLIENTES).get();

  const porCliente = await mapEnLotes(
    clientesSnap.docs,
    CONCURRENCIA,
    async (cDoc) => {
      const filas: CumpleanoProximo[] = [];
      const visto = new Set<string>();
      const cliente = cDoc.data() as Partial<Cliente>;
      const nombreDueno = (cliente.nombre ?? "—").trim() || "—";
      const email = (cliente.email as string | undefined)?.trim() ?? "";
      const telefono = (cliente.telefono as string | undefined)?.trim() ?? "";
      const base = {
        clienteId: cDoc.id,
        nombreDueno,
        email,
        telefono,
        hoy,
        minDias,
        maxDias
      };

      const embebidas = (cliente.mascotas ?? []) as Mascota[];
      let subcoleccion: Mascota[] = [];
      try {
        const mascotasSnap = await cols.mascotas(db, localId, cDoc.id).get();
        subcoleccion = mascotasSnap.docs.map((mDoc) => ({
          id: mDoc.id,
          ...(mDoc.data() as Mascota)
        }));
      } catch {
        // Subcolección ausente en clientes legacy.
      }

      for (const m of fusionarMascotasCliente(embebidas, subcoleccion)) {
        agregarMascotaSiAplica(filas, visto, {
          ...base,
          mascotaId: m.id ?? m.nombre,
          mascota: m
        });
      }

      return filas;
    }
  );

  return porCliente
    .flat()
    .sort((a, b) => a.diasRestantes - b.diasRestantes || a.nombreMascota.localeCompare(b.nombreMascota, "es"));
}

export interface CumpleanosDashboardAgrupados {
  estaSemana: CumpleanoProximo[];
  proximasSemanas: CumpleanoProximo[];
}

const ordenar = (a: CumpleanoProximo, b: CumpleanoProximo) =>
  a.diasRestantes - b.diasRestantes ||
  a.nombreMascota.localeCompare(b.nombreMascota, "es");

/**
 * Una sola pasada por clientes/mascotas; divide en «esta semana» (0–6 d) y «próximas semanas» (7–30 d).
 */
export async function listarCumpleanosDashboardAgrupados(
  localId: string,
  opts?: { hoy?: Date }
): Promise<CumpleanosDashboardAgrupados> {
  const hoy = opts?.hoy ?? new Date();
  const todos = await listarProximosCumpleanosMascotas(localId, {
    hoy,
    minDias: CUMPLEANOS_ESTA_SEMANA_MIN,
    maxDias: CUMPLEANOS_DIAS_MAX
  });

  const estaSemana: CumpleanoProximo[] = [];
  const proximasSemanas: CumpleanoProximo[] = [];

  for (const c of todos) {
    if (
      estaEnVentanaProximosCumpleanos(
        c.diasRestantes,
        CUMPLEANOS_ESTA_SEMANA_MIN,
        CUMPLEANOS_ESTA_SEMANA_MAX
      )
    ) {
      estaSemana.push(c);
    } else if (
      estaEnVentanaProximosCumpleanos(
        c.diasRestantes,
        CUMPLEANOS_DIAS_MIN,
        CUMPLEANOS_DIAS_MAX
      )
    ) {
      proximasSemanas.push(c);
    }
  }

  estaSemana.sort(ordenar);
  proximasSemanas.sort(ordenar);
  return { estaSemana, proximasSemanas };
}
