/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enterprise performance optimizations
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Next.js 15 performance features
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack'],
      },
    },
    // Enable modern JavaScript features
    esmExternals: true,
    // Optimize for production builds
    optimizeCss: true,
    // Enable partial pre-rendering (PPR)
    ppr: 'incremental',
  },
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? { properties: ['^data-testid$'] } : false,
  },
  // Performance optimizations
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Enterprise image optimization
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.xano.io',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enable bundle analyzer in development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')();
      config.plugins.push(new BundleAnalyzerPlugin());
      return config;
    },
  }),
  // Enterprise security and performance headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    return [
      {
        source: '/(.*)',
        headers: [
          // Enterprise Security Headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), interest-cohort=()',
          },
          // Strict Transport Security (HTTPS only in production)
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }] : []),
          // Content Security Policy (enhanced)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev https://js.stripe.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://*.xano.io https://*.supabase.co https://*.clerk.com https://*.cloudinary.com https://*.amazonaws.com https://images.unsplash.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
              "connect-src 'self' https://*.xano.io https://*.supabase.co https://*.clerk.com https://*.clerk.accounts.dev https://api.stripe.com https://api.instantdb.com wss://api.instantdb.com https://api.anthropic.com https://api.openai.com https://api.cohere.ai",
              "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              isProduction ? "upgrade-insecure-requests" : ""
            ].filter(Boolean).join('; '),
          },
          // Cross-Origin Headers
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          // Server Information (remove in production)
          {
            key: 'Server',
            value: 'Enterprise-SaaS/1.0',
          },
          // Performance headers
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          // API Security Headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-RateLimit-Policy',
            value: 'sliding-window',
          },
          // CORS Headers
          {
            key: 'Access-Control-Allow-Origin',
            value: isProduction ? process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com' : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Version',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
          // API Caching
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      // Security headers for sensitive endpoints
      {
        source: '/api/auth/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      // Health check endpoints
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      // Tenant-specific routes
      {
        source: '/tenant/:path*',
        headers: [
          {
            key: 'X-Tenant-Route',
            value: 'true',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600',
          },
        ],
      },
    ];
  },
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/xano/:path*',
        destination: `${process.env.NEXT_PUBLIC_XANO_API_URL}/:path*`,
      },
    ];
  },

};

module.exports = nextConfig;