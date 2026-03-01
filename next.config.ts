import type { NextConfig } from "next";

const PROJECT_ROOT = "/Users/vimalshetty/Projects/protexi";

const nextConfig: NextConfig = {
  outputFileTracingRoot: PROJECT_ROOT,
  turbopack: {
    root: PROJECT_ROOT,
  },
};

export default nextConfig;
