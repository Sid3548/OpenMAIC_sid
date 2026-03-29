import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  transpilePackages: ['mathml2omml', 'pptxgenjs'],
  serverExternalPackages: ['@langchain/langgraph', '@langchain/core', 'js-yaml', 'undici', 'sharp'],
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
};

export default nextConfig;
