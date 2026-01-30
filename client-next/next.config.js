const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily ignore TypeScript errors during migration
  // TODO: Fix all TypeScript errors and remove this
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  webpack: (config) => {
    config.resolve.alias['@shared'] = path.resolve(__dirname, '../shared');
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  transpilePackages: ['@shared'],
};

module.exports = nextConfig;
