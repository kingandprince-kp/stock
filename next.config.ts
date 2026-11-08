import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/so-honey",
        destination: "/stockchecker/so-honey",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
