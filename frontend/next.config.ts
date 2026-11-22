import type { NextConfig } from 'next';

// Where the Express API runs. Read when the dev server starts / at build time.
const API_URL = process.env.API_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  // Small self-contained server for the Docker image.
  output: 'standalone',

  // The browser calls /api/... on THIS origin and Next.js forwards it to
  // Express. One origin = no CORS, and the SameSite refresh cookie works.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
