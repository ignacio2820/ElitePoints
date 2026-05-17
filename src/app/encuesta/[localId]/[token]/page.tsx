import { notFound } from "next/navigation";
import { EncuestaSatisfaccionForm } from "@/components/encuesta/EncuestaSatisfaccionForm";
import { obtenerVistaEncuesta } from "@/lib/huellitas/encuestasService";

export const metadata = {
  title: "Encuesta de satisfacción — Huellitas"
};

type Props = {
  params: { localId: string; token: string };
};

export default async function EncuestaPage({ params }: Props) {
  const vista = await obtenerVistaEncuesta(params.localId, params.token);
  if (!vista) notFound();

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-lg">
        <EncuestaSatisfaccionForm
          localId={params.localId}
          token={params.token}
          vistaInicial={vista}
        />
        <p className="mt-8 text-center text-xs text-bark-500">
          MascotPoints · Programa de lealtad con Huellitas
        </p>
      </div>
    </main>
  );
}
