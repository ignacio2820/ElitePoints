import Link from "next/link";

export default function EncuestaNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface)] px-4 text-center">
      <h1 className="text-xl font-bold text-emerald-900">Enlace no válido</h1>
      <p className="mt-2 max-w-sm text-sm text-bark-600">
        Esta encuesta no existe o el enlace expiró. Si creés que es un error,
        contactá a tu Pet Shop.
      </p>
      <Link
        href="/login"
        className="btn-primary mt-6 text-sm"
      >
        Ir al portal
      </Link>
    </main>
  );
}
