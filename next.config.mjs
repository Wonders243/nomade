/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const cspDirectives = [
  "default-src 'self'",
  "img-src 'self' data: https: blob:",
  "media-src 'self' data: blob: https://*.supabase.co",
  `script-src 'self' 'unsafe-inline' blob: ${isProd ? '' : "'unsafe-eval'"} https://js.stripe.com https://va.vercel-scripts.com https://unpkg.com https://cdn.jsdelivr.net`.replace(/\s+/g, ' ').trim(),
  "style-src 'self' 'unsafe-inline'",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "connect-src 'self' https://api.stripe.com https://js.stripe.com https://*.supabase.co https://*.vercel-insights.com https://vitals.vercel-insights.com https://unpkg.com",
  "worker-src 'self' blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
];

const nextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  images: {
    qualities: [75],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hsfxhydtrntmublewdmq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.nomade-artisan.fr' }],
        destination: 'https://scolta.nomade-artisan.fr/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;