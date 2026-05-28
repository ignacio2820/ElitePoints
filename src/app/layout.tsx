import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";
import { getSesion } from "@/lib/auth/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElitePoints — Fidelización para comercios",
  description:
    "Motor de puntos multi-tenant para comercios. Configurá tu programa, cuidá tu margen y fidelizá a tus clientes.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ElitePoints",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#064e3b"
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
        <PwaRegistrar />
        <AuthProvider sesionInicial={sesion}>{children}</AuthProvider>
      </body>
    </html>
  );
}
