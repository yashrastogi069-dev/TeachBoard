import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json exists in the user home directory, which makes
  // Next.js infer the wrong workspace root. Pin the root to this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
