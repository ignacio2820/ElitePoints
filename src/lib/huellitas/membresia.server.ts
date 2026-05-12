import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  MESES_POR_PLAN,
  type PlanPagoPublico
} from "./membresia.shared";

function sumarMeses(base: Date, meses: number): Date {
  const vencimiento = new Date(base);
  vencimiento.setMonth(vencimiento.getMonth() + meses);
  return vencimiento;
}

export async function activarMembresiaSimulada(
  localId: string,
  plan: PlanPagoPublico
): Promise<{ fechaVencimiento: Date }> {
  const db = adminDb();
  const ref = cols.local(db, localId);
  const snap = await ref.get();
  const data = snap.data() as { fechaVencimiento?: Timestamp } | undefined;

  const ahora = new Date();
  let base = ahora;
  if (data?.fechaVencimiento) {
    const vigente = data.fechaVencimiento.toDate();
    if (vigente.getTime() > ahora.getTime()) {
      base = vigente;
    }
  }

  const fechaVencimiento = sumarMeses(base, MESES_POR_PLAN[plan]);
  const ts = Timestamp.fromDate(fechaVencimiento);

  await ref.set(
    {
      estadoMembresia: "activo",
      membresiaEstado: "activo",
      membresiaPlan: plan,
      fechaVencimiento: ts,
      actualizadoEn: Timestamp.now()
    },
    { merge: true }
  );

  return { fechaVencimiento };
}
