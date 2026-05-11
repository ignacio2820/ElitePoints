import Link from "next/link";
import { ArrowLeft, Gift, Heart } from "lucide-react";
import { RegistroForm } from "./RegistroForm";
import { CONFIGURACION_DEFAULT } from "@/lib/huellitas/types";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { normalizarCodigo } from "@/lib/huellitas/referidos";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const LOCAL_DEMO_ID = "demo";

async function getCfg(localId: string) {
  try {
    const { getConfiguracion } = await import("@/lib/huellitas/service");
    return await getConfiguracion(localId);
  } catch {
    return { ...CONFIGURACION_DEFAULT, localId };
  }
}

export default async function RegistroPage({
  searchParams
}: {
  searchParams: { ref?: string; localId?: string };
}) {
  const localId = searchParams.localId?.trim() || LOCAL_DEMO_ID;
  const cfg = await getCfg(localId);
  const codigoRef = searchParams.ref ? normalizarCodigo(searchParams.ref) : "";
  const tieneRef = codigoRef.length >= 4;

  return (
    <main className="paw-bg min-h-screen">
      <header className="border-b border-bark-100 bg-cream-50/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <HuellitaIcon size={22} className="text-bark-400" />
            <span className="font-display text-lg font-semibold text-bark-700">
              Huellitas
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-bark-500 hover:text-bark-700 inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center">
          <span className="label-elegant">Bienvenida</span>
          <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
            Sumate a Huellitas
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[color:var(--muted)]">
            Cargá tus datos y los de tu mascota. En tu primera compra empezás a
            sumar huellitas que después podés canjear por premios.
          </p>
        </div>

        {tieneRef ? (
          <div className="mt-8 rounded-3xl bg-gradient-to-br from-sage-50 to-cream-100 p-1">
            <div className="rounded-3xl bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-300">
                  <Gift size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-sage-300">
                    <Heart size={11} /> Te invitó un amigo
                  </div>
                  <h2 className="mt-1 font-display text-xl font-semibold text-bark-700">
                    Estás registrándote con código{" "}
                    <code className="font-display text-bark-700 tracking-wider">
                      {codigoRef}
                    </code>
                  </h2>
                  <p className="mt-1 text-sm text-bark-500">
                    Cuando hagas tu primera compra, vas a recibir{" "}
                    <strong className="text-bark-700">
                      {cfg.referidos.bonusBienvenida} huellitas de bienvenida
                    </strong>
                    , y tu amigo va a sumar{" "}
                    <strong className="text-bark-700">
                      {cfg.referidos.bonusReferente} huellitas
                    </strong>{" "}
                    de regalo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Tus datos</CardTitle>
              <CardDescription>
                Sólo necesitamos lo básico. Después podrás completar la ficha
                de tu mascota y empezar a sumar huellitas.
              </CardDescription>
            </CardHeader>
            <RegistroForm
              localId={localId}
              codigoReferido={codigoRef || undefined}
              bonusBienvenida={cfg.referidos.bonusBienvenida}
              referidosActivos={cfg.referidos.activo}
            />
          </Card>
        </div>
      </section>
    </main>
  );
}
