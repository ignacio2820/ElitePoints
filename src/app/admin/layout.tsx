import Link from "next/link";
import { redirect } from "next/navigation";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { UserMenu } from "@/components/auth/UserMenu";
import { getSesion } from "@/lib/auth/server";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesion();
  if (!sesion) {
    redirect("/login?intent=admin&redirect=/admin");
  }
  if (sesion.claims.role !== "admin") {
    redirect("/mi-cuenta");
  }

  return (
    <div className="paw-bg min-h-screen">
      <header className="border-b border-bark-100 bg-cream-50/80 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2">
            <HuellitaIcon size={24} className="text-bark-400" />
            <span className="font-display text-lg font-semibold text-bark-700">
              Huellitas
            </span>
            <span className="ml-2 rounded-full bg-cream-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-bark-500">
              Admin · {sesion.claims.localId}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <NavLink href="/admin">Dashboard</NavLink>
            <NavLink href="/admin/nueva-venta" highlight>
              Caja
            </NavLink>
            <NavLink href="/admin/canjes">Canjes</NavLink>
            <NavLink href="/admin/clientes">Clientes</NavLink>
            <NavLink href="/admin/configuracion">Configuración</NavLink>
          </nav>
          <UserMenu />
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 text-sm md:hidden">
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/nueva-venta" highlight>
            Caja
          </NavLink>
          <NavLink href="/admin/canjes">Canjes</NavLink>
          <NavLink href="/admin/clientes">Clientes</NavLink>
          <NavLink href="/admin/configuracion">Configuración</NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  children,
  highlight = false
}: {
  href: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <Link
        href={href}
        className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-gradient-to-r from-amber-100 to-amber-50 px-3 py-2 font-semibold text-amber-700 shadow-sm transition hover:border-amber-500 hover:from-amber-200 hover:to-amber-100"
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-bark-500 transition hover:bg-cream-100 hover:text-bark-700"
    >
      {children}
    </Link>
  );
}
