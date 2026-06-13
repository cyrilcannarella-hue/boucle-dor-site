"use client";

import { useContext } from "react";
import { SalonContext } from "@/components/SalonProvider";
import type { Salon } from "@/lib/salon";

export function useSalon(): Salon {
  const salon = useContext(SalonContext);
  if (!salon) throw new Error("useSalon must be used within SalonProvider");
  return salon;
}
