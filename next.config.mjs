/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker benötigt den Standalone-Server; Vercel erzeugt seine Functions selbst.
  output: process.env.VERCEL ? undefined : "standalone",
  poweredByHeader: false,
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'",
      "img-src 'self' data: blob:", "font-src 'self' data:", "style-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'", "frame-src https://www.youtube-nocookie.com", "upgrade-insecure-requests"
    ].join("; ");
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
    ] }];
  },
};

export default nextConfig;
