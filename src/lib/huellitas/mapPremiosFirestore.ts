import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { Premio } from "./types";

/** Mapea documentos Firestore de premios al tipo de dominio. */
export function mapPremiosFromDocs(
  docs: QueryDocumentSnapshot[]
): Premio[] {
  return docs.map((d) => {
    const data = d.data() as Omit<Premio, "id">;
    return {
      id: d.id,
      localId: String(data.localId ?? ""),
      nombre: String(data.nombre ?? ""),
      descripcion: data.descripcion ? String(data.descripcion) : "",
      costoHuellitas: Number(data.costoHuellitas ?? 0),
      valorDescuento:
        typeof data.valorDescuento === "number" && data.valorDescuento >= 0
          ? data.valorDescuento
          : undefined,
      nivelMinimoId: String(data.nivelMinimoId ?? "bronce"),
      categoria: data.categoria,
      stock: typeof data.stock === "number" ? data.stock : null,
      imagen:
        typeof data.imagen === "string" && data.imagen.trim()
          ? data.imagen.trim()
          : undefined,
      activo: data.activo !== false
    };
  });
}
