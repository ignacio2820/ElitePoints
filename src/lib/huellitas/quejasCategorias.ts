/** Categorías básicas por palabras clave en comentarios de encuestas negativas. */

export type CategoriaQuejaId = "atencion" | "tiempos" | "calidad" | "otros";

export const CATEGORIAS_QUEJA: {
  id: CategoriaQuejaId;
  nombre: string;
  color: string;
  keywords: string[];
}[] = [
  {
    id: "atencion",
    nombre: "Atención",
    color: "#FB8500",
    keywords: [
      "atencion",
      "atención",
      "trato",
      "amabil",
      "personal",
      "vendedor",
      "vendedora",
      "mala onda",
      "groser",
      "educacion",
      "educación"
    ]
  },
  {
    id: "tiempos",
    nombre: "Tiempos",
    color: "#E67700",
    keywords: [
      "tiempo",
      "espera",
      "demora",
      "lento",
      "lenta",
      "fila",
      "tard",
      "rapidez",
      "demorado"
    ]
  },
  {
    id: "calidad",
    nombre: "Calidad",
    color: "#1B4332",
    keywords: [
      "calidad",
      "producto",
      "precio",
      "caro",
      "stock",
      "rotura",
      "vencido",
      "sucio",
      "defectu",
      "marca"
    ]
  },
  {
    id: "otros",
    nombre: "Otros",
    color: "#52796F",
    keywords: []
  }
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function clasificarComentarioQueja(
  comentario?: string
): CategoriaQuejaId {
  const t = normalizar(comentario?.trim() ?? "");
  if (!t) return "otros";

  for (const cat of CATEGORIAS_QUEJA) {
    if (cat.id === "otros") continue;
    if (cat.keywords.some((k) => t.includes(normalizar(k)))) {
      return cat.id;
    }
  }
  return "otros";
}
