/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  output: "standalone",              // ← required for the container Dockerfile
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
};
