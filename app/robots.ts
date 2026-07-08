import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/back-office", "/login", "/auth", "/api", "/espace-client"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
