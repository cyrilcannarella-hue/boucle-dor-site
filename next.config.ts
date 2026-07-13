import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["salon-test.agenda-plus.fr"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qrhdsaryqivmyluphjcv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
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
