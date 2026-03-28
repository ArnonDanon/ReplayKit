import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the local tracker package
  transpilePackages: ['replaykit-tracker'],
};

export default nextConfig;
