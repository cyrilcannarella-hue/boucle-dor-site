"use client";

import { memo } from "react";

type Props = {
  name: string;
  goldColor?: string;
};

export const SalonNameGradient = memo(function SalonNameGradient({
  name,
  goldColor = "#d8a646",
}: Props) {
  const normalized = (name || "Votre salon").replace(/[‘’’‛]/g, "’");
  return (
    <span
      className="[backface-visibility:hidden]"
      style={{ color: goldColor, fontFamily: "var(--font-salon-name)" }}
    >
      {normalized}
    </span>
  );
});
