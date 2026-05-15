const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
let serverActionOrigins = ["*"];

if (rawAppUrl) {
  try {
    serverActionOrigins = [new URL(rawAppUrl).origin];
  } catch {
    // Mantener el valor por defecto si la URL no es válida en build.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: process.env.NEXT_OUTPUT === "default" ? undefined : "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins
    }
  },
  async rewrites() {
    return [
      { source: "/dashboard", destination: "/admin" },
      { source: "/dashboard/:path*", destination: "/admin/:path*" },
      { source: "/portal", destination: "/mi-cuenta" },
      { source: "/portal/:path*", destination: "/mi-cuenta/:path*" }
    ];
  }
};

export default nextConfig;
