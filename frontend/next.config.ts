import type { NextConfig } from "next";

const basePath = process.env.PAGES_BASE_PATH?.trim() ?? "";

if (basePath !== "" && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error("PAGES_BASE_PATH는 /로 시작하고 /로 끝나지 않아야 합니다.");
}

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  reactStrictMode: true,
  transpilePackages: ["@gibyeol/protocol"],
};

export default nextConfig;
