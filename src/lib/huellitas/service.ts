import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  incrementHuellitasActuales,
  leerHuellitasActuales,
  leerHuellitasHistoricas,
  patchHuellitasHistoricas,
  patchIncrementoVenta,
} from "@/lib/huellitas/saldosCliente";
import {
  calcularBonificaciones,
  calcularCanje,
  calcularEmision,
  calcularNivel,
  saldoVigente
} from "./engine";
import {
  CONFIGURACION_DEFAULT,
  ConfiguracionLocalSchema,
  type ConfiguracionLocal,
  type LoteHuellitas,
  type Mascota
} from "./types";
import { enviarEmailReferidoActivado } from "@/lib/email/referido";

/**
 * Servicios server-side: orquestan motor de reglas + Firestore en transacciones.
 *
 * Diferencias clave en este flujo:
 *  - Aplica el `descuentoFijoPct` del NIVEL antes del canje (Gran Guardián 5%).
 *  - Aplica el `multiplicador` del NIVEL al emitir huellitas.
 *  - Suma a `acumuladoHistorico` y RECALCULA el `nivelId` automáticamente.
 *  - Si es la PRIMERA compra y vino por referido, acredita bonus a ambos lados
 *    (idempotente vía `referidoActivado`) y dispara email al referente.
 */

/**
 * Convierte recursivamente Firestore Timestamp → ISO string para que pase
 * el schema Zod (que acepta Date | string, no Timestamp).
 */
function normalizarTimestamps<T>(value: T): T {
  if (value == null) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as unknown as { toDate(): Date }).toDate().toISOString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(normalizarTimestamps) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizarTimestamps(v);
    }
    return out as T;
  }
  return value;
}

export async function getConfiguracion(localId: string): Promise<ConfiguracionLocal> {
  const db = adminDb();
  const snap = await cols.configuracion(db, localId).get();
  if (!snap.exists) {
    return { ...CONFIGURACION_DEFAULT, localId };
  }
  const raw = normalizarTimestamps(snap.data() ?? {});
  return ConfiguracionLocalSchema.parse({ ...raw, localId });
}

export async function setConfiguracion(
  localId: string,
  parcial: Partial<ConfiguracionLocal>,
  actualizadoPor?: string
): Promise<ConfiguracionLocal> {
  const db = adminDb();
  const actual = await getConfiguracion(localId);
  const merged = ConfiguracionLocalSchema.parse({
    ...actual,
    ...parcial,
    localId,
    actualizadoEn: new Date().toISOString(),
    actualizadoPor
  });
  await cols.configuracion(db, localId).set(merged, { merge: true });
  return merged;
}

// ──────────────────────────────────────────────────────────────────────────────
// Registrar venta + emitir huellitas + actualizar nivel (TRANSACCIONAL)
// ──────────────────────────────────────────────────────────────────────────────

export interface RegistrarVentaInput {
  localId: string;
  clienteId: string;
  totalVenta: number;
  huellitasACanjear?: number;
}

export interface RegistrarVentaOutput {
  ventaId: string;
  huellitasBase: number;
  multiplicadorAplicado: number;
  huellitasGeneradas: number;
  huellitasCanjeadas: number;
  descuentoCanje: number;
  descuentoNivel: number;
  totalCobrado: number;
  saldoFinal: number;
  acumuladoHistorico: number;
  nivelId: string;
  /** True si el cliente subió de nivel en esta venta. */
  subioNivel: boolean;
  nivelAnterior: string;
  /** Detalle de bonificaciones especiales aplicadas (cumpleaños, primera compra). */
  bonificaciones: {
    cumpleanos: {
      aplicado: boolean;
      multiplicador: number;
      mascotaId?: string;
      huellitasExtra: number;
    };
    primeraCompra: {
      aplicado: boolean;
      huellitasExtra: number;
    };
  };
  /** Detalle de activación del bonus de referido (si aplicó en esta venta). */
  referidoActivado?: {
    referenteId: string;
    bonusReferente: number;
    bonusBienvenida: number;
    eventoId: string;
  };
}

export async function registrarVenta(
  input: RegistrarVentaInput
): Promise<RegistrarVentaOutput> {
  const db = adminDb();
  const cfg = await getConfiguracion(input.localId);

  // Ejecutamos la TX y, si gatilló referido, mandamos el email FUERA de la tx.
  type TxOutput = RegistrarVentaOutput & {
    _email?: {
      to: string;
      payload: Parameters<typeof enviarEmailReferidoActivado>[0];
      eventoRef: FirebaseFirestore.DocumentReference;
    };
  };

  const result = await db.runTransaction<TxOutput>(async (tx) => {
    const clienteRef = cols.cliente(db, input.localId, input.clienteId);
    const clienteSnap = await tx.get(clienteRef);
    if (!clienteSnap.exists) throw new Error("Cliente inexistente");
    const cliente = clienteSnap.data() as {
      acumuladoHistorico?: number;
      nivelId?: string;
      saldoHuellitas?: number;
      referidoPor?: string;
      referidoActivado?: boolean;
      primerCompraRegistrada?: boolean;
      nombre?: string;
    };
    const acumuladoActual = leerHuellitasHistoricas(cliente);
    const nivelAnteriorId = cliente.nivelId ?? "cachorro";

    // ¿Es la PRIMERA compra Y vino por referido Y todavía no se activó?
    const debeActivarReferido =
      cfg.referidos.activo &&
      !cliente.primerCompraRegistrada &&
      !cliente.referidoActivado &&
      !!cliente.referidoPor;

    // Pre-leemos el referente DENTRO de la tx (lecturas antes de escrituras).
    let referenteSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    if (debeActivarReferido && cliente.referidoPor) {
      referenteSnap = await tx.get(
        cols.cliente(db, input.localId, cliente.referidoPor)
      );
      if (!referenteSnap.exists) {
        // Referente inexistente (anomalía) → seguimos sin activar.
        referenteSnap = null;
      }
    }

    // Nivel ANTES de la venta — define multiplicador y descuento fijo aplicado.
    const nivelEnVenta = calcularNivel(acumuladoActual, cfg.niveles);

    const lotesSnap = await tx.get(
      cols.huellitas(db, input.localId, input.clienteId)
    );
    const lotes: LoteHuellitas[] = lotesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LoteHuellitas, "id">)
    }));

    // Mascotas del cliente — necesarias para evaluar el bono de cumpleaños.
    const mascotasSnap = await tx.get(
      cols.mascotas(db, input.localId, input.clienteId)
    );
    const mascotas: Array<Pick<Mascota, "id" | "fechaNacimiento">> =
      mascotasSnap.docs.map((d) => ({
        id: d.id,
        fechaNacimiento:
          (d.data() as { fechaNacimiento?: string }).fechaNacimiento ?? ""
      }));

    // Bonificaciones (cumpleaños + primera compra), respetando los toggles.
    const bonus = calcularBonificaciones({
      bonificaciones: cfg.bonificaciones,
      mascotas,
      esPrimeraCompra: !cliente.primerCompraRegistrada
    });

    // 1. DESCUENTO FIJO POR NIVEL (Gran Guardián 5%, etc.)
    const descuentoNivel = +(input.totalVenta * nivelEnVenta.descuentoFijoPct).toFixed(2);
    const totalTrasNivel = Math.max(0, input.totalVenta - descuentoNivel);

    // 2. CANJE de huellitas (sobre el total ya descontado por nivel)
    let huellitasCanjeadas = 0;
    let descuentoCanje = 0;
    let planConsumo: { loteId: string; consumidas: number }[] = [];

    if (input.huellitasACanjear && input.huellitasACanjear > 0) {
      const canje = calcularCanje({
        totalVenta: totalTrasNivel,
        huellitasSolicitadas: input.huellitasACanjear,
        saldoLotes: lotes,
        cfg
      });
      huellitasCanjeadas = canje.huellitasCanjeadas;
      descuentoCanje = canje.descuento;
      planConsumo = canje.plan;
    }

    const totalCobrado = Math.max(0, totalTrasNivel - descuentoCanje);

    // 3. EMISIÓN: combina multiplicador del NIVEL × multiplicador de CUMPLEAÑOS
    //    (si hoy cumple alguna mascota del cliente y el toggle está activo).
    const multiplicadorTotal =
      nivelEnVenta.multiplicador * bonus.multiplicadorCumple;
    const emision = calcularEmision(
      totalCobrado,
      cfg,
      new Date(),
      multiplicadorTotal
    );

    // Diferencial atribuible al bono de cumpleaños (sobre la emisión del nivel),
    // útil para auditoría / mostrar en caja.
    const huellitasEmisionSinCumple = Math.round(
      emision.huellitasBase * nivelEnVenta.multiplicador
    );
    const huellitasExtraCumple = Math.max(
      0,
      emision.huellitasGeneradas - huellitasEmisionSinCumple
    );

    // 4. ACUMULADO HISTÓRICO (incluye multiplicador y bonus) → recalcula nivel
    const acumuladoBase =
      acumuladoActual +
      emision.huellitasGeneradas +
      bonus.huellitasExtraPrimeraCompra;
    const nivelNuevo = calcularNivel(acumuladoBase, cfg.niveles);
    const subioNivel = nivelNuevo.id !== nivelAnteriorId;

    // 5. ESCRITURAS
    const ventaRef = cols.ventas(db, input.localId).doc();
    tx.set(ventaRef, {
      localId: input.localId,
      clienteId: input.clienteId,
      totalVenta: input.totalVenta,
      huellitasBase: emision.huellitasBase,
      multiplicadorAplicado: multiplicadorTotal,
      multiplicadorNivel: nivelEnVenta.multiplicador,
      multiplicadorCumple: bonus.multiplicadorCumple,
      huellitasGeneradas: emision.huellitasGeneradas,
      huellitasExtraCumple,
      huellitasExtraPrimeraCompra: bonus.huellitasExtraPrimeraCompra,
      huellitasCanjeadas,
      descuentoAplicado: descuentoCanje,
      descuentoNivel,
      totalCobrado,
      nivelEnVenta: nivelEnVenta.id,
      bonificaciones: {
        cumpleanos: {
          aplicado: bonus.esCumpleanos,
          multiplicador: bonus.multiplicadorCumple,
          mascotaId: bonus.mascotaCumpleId ?? null
        },
        primeraCompra: {
          aplicado:
            bonus.esPrimeraCompra && bonus.huellitasExtraPrimeraCompra > 0
        }
      },
      fecha: FieldValue.serverTimestamp()
    });

    for (const c of planConsumo) {
      const loteRef = cols
        .huellitas(db, input.localId, input.clienteId)
        .doc(c.loteId);
      tx.update(loteRef, {
        huellitasRestantes: FieldValue.increment(-c.consumidas)
      });
    }

    if (emision.huellitasGeneradas > 0) {
      const nuevoLoteRef = cols
        .huellitas(db, input.localId, input.clienteId)
        .doc();
      tx.set(nuevoLoteRef, {
        clienteId: input.clienteId,
        ventaId: ventaRef.id,
        huellitasIniciales: emision.huellitasGeneradas,
        huellitasRestantes: emision.huellitasGeneradas,
        fechaEmision: new Date().toISOString().slice(0, 10),
        fechaVencimiento: emision.fechaVencimiento,
        origen: "venta"
      });
    }

    // Lote bonus por PRIMERA COMPRA (regalo de bienvenida configurable).
    // Se crea como lote independiente para mantener trazabilidad y FIFO sano.
    if (bonus.huellitasExtraPrimeraCompra > 0) {
      const loteBienvenidaRef = cols
        .huellitas(db, input.localId, input.clienteId)
        .doc();
      tx.set(loteBienvenidaRef, {
        clienteId: input.clienteId,
        ventaId: ventaRef.id,
        huellitasIniciales: bonus.huellitasExtraPrimeraCompra,
        huellitasRestantes: bonus.huellitasExtraPrimeraCompra,
        fechaEmision: new Date().toISOString().slice(0, 10),
        fechaVencimiento: emision.fechaVencimiento,
        origen: "bonus_primera_compra"
      });
    }

    if (huellitasCanjeadas > 0) {
      const canjeRef = cols.canjes(db, input.localId).doc();
      tx.set(canjeRef, {
        localId: input.localId,
        clienteId: input.clienteId,
        ventaId: ventaRef.id,
        huellitasCanjeadas,
        descuento: descuentoCanje,
        plan: planConsumo,
        fecha: FieldValue.serverTimestamp()
      });
    }

    let saldoEstimado =
      saldoVigente(lotes) -
      huellitasCanjeadas +
      emision.huellitasGeneradas +
      bonus.huellitasExtraPrimeraCompra;

    // 6. ACTIVACIÓN DE REFERIDO (idempotente, una sola vez en la vida)
    let referidoActivado: RegistrarVentaOutput["referidoActivado"];
    let emailJob: TxOutput["_email"];

    if (debeActivarReferido && referenteSnap) {
      const referente = referenteSnap.data() as {
        nombre?: string;
        email?: string;
        saldoHuellitas?: number;
        acumuladoHistorico?: number;
      };
      const bonusBienvenida = cfg.referidos.bonusBienvenida;
      const bonusReferente = cfg.referidos.bonusReferente;

      const venc = new Date();
      venc.setUTCHours(0, 0, 0, 0);
      venc.setUTCDate(venc.getUTCDate() + cfg.referidos.diasVencimientoBonus);
      const fechaVencBonus = venc.toISOString().slice(0, 10);
      const hoyISO = new Date().toISOString().slice(0, 10);

      // 6a. Lote bonus para el cliente NUEVO
      if (bonusBienvenida > 0) {
        const loteRef = cols
          .huellitas(db, input.localId, input.clienteId)
          .doc();
        tx.set(loteRef, {
          clienteId: input.clienteId,
          ventaId: ventaRef.id,
          huellitasIniciales: bonusBienvenida,
          huellitasRestantes: bonusBienvenida,
          fechaEmision: hoyISO,
          fechaVencimiento: fechaVencBonus
        });
        saldoEstimado += bonusBienvenida;
      }

      // 6b. Lote bonus para el REFERENTE
      if (bonusReferente > 0 && cliente.referidoPor) {
        const loteRef = cols
          .huellitas(db, input.localId, cliente.referidoPor)
          .doc();
        tx.set(loteRef, {
          clienteId: cliente.referidoPor,
          ventaId: ventaRef.id,
          huellitasIniciales: bonusReferente,
          huellitasRestantes: bonusReferente,
          fechaEmision: hoyISO,
          fechaVencimiento: fechaVencBonus
        });

        // Saldo y acumulado histórico del REFERENTE
        const refAcum = leerHuellitasHistoricas(referente) + bonusReferente;
        const refNivelNuevo = calcularNivel(refAcum, cfg.niveles);
        tx.update(referenteSnap.ref, {
          ...incrementHuellitasActuales(bonusReferente),
          ...patchHuellitasHistoricas(refAcum),
          nivelId: refNivelNuevo.id,
          referidosActivados: FieldValue.increment(1)
        });
      }

      // 6c. Acumulado histórico del NUEVO incluye su bonus de bienvenida
      // (hace que sume a su nivel).
      const acumuladoConBonus = acumuladoBase + bonusBienvenida;
      const nivelTrasBonus = calcularNivel(acumuladoConBonus, cfg.niveles);

      // 6d. Auditoría + idempotencia
      const eventoRef = cols.eventosReferido(db, input.localId).doc();
      tx.set(eventoRef, {
        localId: input.localId,
        codigo: "", // se completa con el código del referente abajo si está
        referenteId: cliente.referidoPor!,
        invitadoId: input.clienteId,
        ventaId: ventaRef.id,
        bonusBienvenida,
        bonusReferente,
        emailEnviado: false,
        fecha: FieldValue.serverTimestamp()
      });

      const saldoDocRef = leerHuellitasActuales(cliente);
      const deltaSaldoRef = saldoEstimado - saldoDocRef;
      const deltaAcumRef = acumuladoConBonus - acumuladoActual;
      tx.update(clienteRef, {
        ...patchIncrementoVenta(deltaSaldoRef, deltaAcumRef),
        nivelId: nivelTrasBonus.id,
        referidoActivado: true,
        primerCompraRegistrada: true
      });

      referidoActivado = {
        referenteId: cliente.referidoPor!,
        bonusReferente,
        bonusBienvenida,
        eventoId: eventoRef.id
      };

      // Encolamos el email para enviarlo FUERA de la transacción.
      if (referente.email) {
        emailJob = {
          to: referente.email,
          eventoRef,
          payload: {
            emailReferente: referente.email,
            nombreReferente: referente.nombre ?? "amigo",
            nombreInvitado: cliente.nombre ?? "tu amigo",
            huellitasGanadas: bonusReferente,
            nombreLocal: input.localId, // se sobreescribe abajo si hay nombre real
            saldoActualReferente:
              leerHuellitasActuales(referente) + bonusReferente
          }
        };
      }

      return {
        ventaId: ventaRef.id,
        huellitasBase: emision.huellitasBase,
        multiplicadorAplicado: multiplicadorTotal,
        huellitasGeneradas: emision.huellitasGeneradas,
        huellitasCanjeadas,
        descuentoCanje,
        descuentoNivel,
        totalCobrado,
        saldoFinal: saldoEstimado,
        acumuladoHistorico: acumuladoConBonus,
        nivelId: nivelTrasBonus.id,
        subioNivel: nivelTrasBonus.id !== nivelAnteriorId,
        nivelAnterior: nivelAnteriorId,
        bonificaciones: {
          cumpleanos: {
            aplicado: bonus.esCumpleanos,
            multiplicador: bonus.multiplicadorCumple,
            mascotaId: bonus.mascotaCumpleId,
            huellitasExtra: huellitasExtraCumple
          },
          primeraCompra: {
            aplicado:
              bonus.esPrimeraCompra && bonus.huellitasExtraPrimeraCompra > 0,
            huellitasExtra: bonus.huellitasExtraPrimeraCompra
          }
        },
        referidoActivado,
        _email: emailJob
      };
    }

    // 7. Caso normal (sin activación de referido)
    const saldoDoc = leerHuellitasActuales(cliente);
    const deltaSaldo = saldoEstimado - saldoDoc;
    const deltaAcum = acumuladoBase - acumuladoActual;
    tx.update(clienteRef, {
      ...patchIncrementoVenta(deltaSaldo, deltaAcum),
      nivelId: nivelNuevo.id,
      primerCompraRegistrada: true
    });

    return {
      ventaId: ventaRef.id,
      huellitasBase: emision.huellitasBase,
      multiplicadorAplicado: multiplicadorTotal,
      huellitasGeneradas: emision.huellitasGeneradas,
      huellitasCanjeadas,
      descuentoCanje,
      descuentoNivel,
      totalCobrado,
      saldoFinal: saldoEstimado,
      acumuladoHistorico: acumuladoBase,
      nivelId: nivelNuevo.id,
      subioNivel,
      nivelAnterior: nivelAnteriorId,
      bonificaciones: {
        cumpleanos: {
          aplicado: bonus.esCumpleanos,
          multiplicador: bonus.multiplicadorCumple,
          mascotaId: bonus.mascotaCumpleId,
          huellitasExtra: huellitasExtraCumple
        },
        primeraCompra: {
          aplicado:
            bonus.esPrimeraCompra && bonus.huellitasExtraPrimeraCompra > 0,
          huellitasExtra: bonus.huellitasExtraPrimeraCompra
        }
      }
    };
  });

  // Side-effect: email transaccional al referente FUERA de la transacción.
  if (result._email) {
    try {
      // Resolver nombre real del local
      const localSnap = await cols.local(adminDb(), input.localId).get();
      const nombreLocal =
        (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
        result._email.payload.nombreLocal;
      await enviarEmailReferidoActivado({
        ...result._email.payload,
        nombreLocal
      });
      await result._email.eventoRef.update({ emailEnviado: true });
    } catch {
      // El bonus YA está acreditado. Si el email falla, queda emailEnviado:false
      // y un cron de retry puede reintentar (no rompe la idempotencia).
    }
  }

  // Limpiamos el job interno antes de devolver al caller.
  const { _email, ...output } = result;
  return output;
}
