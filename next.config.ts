import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live",
  "script-src-elem 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co https://yaoyun.vercel.app https://vercel.live https://*.vercel.live",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-src 'self' https://vercel.live https://*.vercel.live",
  "style-src-attr 'unsafe-inline'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
