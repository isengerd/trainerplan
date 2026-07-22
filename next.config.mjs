/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker benötigt den Standalone-Server; Vercel erzeugt seine Functions selbst.
  output: process.env.VERCEL ? undefined : "standalone",
  poweredByHeader: false,
  async headers() {
    // Next.js verwendet in seinem Entwicklungs-Bundle eval-basierte Source Maps.
    // Diese Ausnahme bleibt lokal; Produktions-Bundles benötigen und erhalten sie nicht.
    const scriptSource = process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    const contentSecurityPolicy = [
      "default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'",
      "img-src 'self' data: blob:", "font-src 'self' data:", "style-src 'self' 'unsafe-inline'", scriptSource,
      "connect-src 'self'", "frame-src https://www.youtube-nocookie.com"
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" }
    ];

    // Lokal läuft die App per HTTP. Vercel übernimmt dagegen die TLS-Terminierung.
    if (process.env.VERCEL) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains"
      });
    }

    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
