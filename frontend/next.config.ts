import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactCompiler: true,
  reactStrictMode: true,
  transpilePackages: ["@gibyeol/protocol"],
};

export default nextConfig;
