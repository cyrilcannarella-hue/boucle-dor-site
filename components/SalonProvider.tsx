"use client";

import { createContext } from "react";
import type { Salon } from "@/lib/salon";

export const SalonContext = createContext<Salon | null>(null);

export function SalonProvider({
  salon,
  children,
}: {
  salon: Salon;
  children: React.ReactNode;
}) {
  return <SalonContext.Provider value={salon}>{children}</SalonContext.Provider>;
}
