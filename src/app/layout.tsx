import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getSesion } from "@/lib/auth/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huellitas — Fidelidad para Pet Shops",
  description:
    "Motor de fidelización multi-tenant para Pet Shops. Configurá tu programa, cuidá tu margen y enamorá a tus clientes.",
  icons: { icon: "/favicon.svg" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B4332"
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesion();
  return (
    <html lang="es">
      <body className="min-h-screen paw-bg text-cream-50">
        <AuthProvider sesionInicial={sesion}>{children}</AuthProvider>
      </body>
    </html>
  );
}
