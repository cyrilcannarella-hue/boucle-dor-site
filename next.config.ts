import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["salon-test.agenda-plus.fr"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "boucle-dor.vercel.app" }],
        destination: "https://boucle-dor.agenda-plus.fr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
