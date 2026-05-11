"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/nueva-venta", label: "Caja" },
  { href: "/admin/canjes", label: "Canjes" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/premios", label: "Premios" },
  { href: "/admin/configuracion", label: "Configuración" }
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className={cn("flex items-end gap-1", className)}>
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 pb-2.5 pt-1 text-sm transition-colors",
              active
                ? "border-amber-500 font-semibold text-bark-700"
                : "border-transparent font-medium text-bark-500 hover:text-bark-700"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
