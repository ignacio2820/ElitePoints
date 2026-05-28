import Link from "next/link";

const RUTA_TERMINOS = "/terminos-y-condiciones";

type Props = {
  /** Variante para fondos oscuros (login) o claros (registro). */
  variant?: "dark" | "light";
  className?: string;
};

export function EnlaceTerminos({ variant = "light", className = "" }: Props) {
  const base =
    variant === "dark"
      ? "text-bark-200/80 hover:text-white"
      : "text-bark-500 hover:text-bark-700";

  return (
    <p className={`text-center text-xs leading-relaxed ${className}`}>
      Al participar aceptás los{" "}
      <Link
        href={RUTA_TERMINOS}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-medium underline underline-offset-2 ${base}`}
      >
        Términos y Condiciones
      </Link>{" "}
      del programa ElitePoints.
    </p>
  );
}
