"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function TerminosVolverButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/10"
    >
      <ArrowLeft size={16} />
      Volver
    </button>
  );
}
