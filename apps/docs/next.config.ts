import createBundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const withAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    // Replaced by root workspace command
    ignoreDuringBuilds: true,
  },
  staticPageGenerationTimeout: 180, // Increase timeout for static page generation to 3 minutes
  experimental: {
    // Optimize the build process
    optimizePackageImports: ['fumadocs-ui', 'fumadocs-core'],
  },
  webpack: (config, { isServer }) => {
    // Handle binary modules
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });

    // Ensure oxc-transform and related modules are properly handled
    if (isServer) {
      config.externals = [...(config.externals || []), 'oxc-transform'];
    }

    return config;
  },
  serverExternalPackages: [
    'ts-morph',
    'typescript',
    'oxc-transform',
    'twoslash',
    'shiki',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/docs/ui/blocks/layout',
        destination: '/docs/ui/layouts/docs',
        permanent: true,
      },
      {
        source: '/docs/ui/blocks/:path*',
        destination: '/docs/ui/layouts/:path*',
        permanent: true,
      },
    ];
  },
};

const withMDX = createMDX();

export default withAnalyzer(withMDX(config));
