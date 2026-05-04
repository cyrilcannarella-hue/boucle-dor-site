import type { Metadata, Viewport } from "next";
import { BRAND_NAME_PRO } from "@/lib/theme";

export const metadata: Metadata = {
  title: BRAND_NAME_PRO,
  manifest: "/manifest-backoffice.json?v=2",
  icons: {
    icon: "/icon-pro-192.png?v=2",
    apple: "/icon-pro-192.png?v=2",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5EBDD",
};

export default function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="overflow-x-hidden">{children}</div>;
}
