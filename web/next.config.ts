import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Avoid "Failed to fetch" / blocked HMR when opening via 127.0.0.1 vs localhost
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.0.166"],
};

export default nextConfig;
