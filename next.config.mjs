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
  }
};

export default nextConfig;
