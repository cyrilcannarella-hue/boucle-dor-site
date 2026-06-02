"use client";

import { memo } from "react";

type Props = {
  name: string;
  goldColor?: string;
  goldEndColor?: string;
};

export const SalonNameGradient = memo(function SalonNameGradient({
  name,
  goldColor = "#d8a646",
  goldEndColor = "#b98b3d",
}: Props) {
  const normalized = (name || "Boucle d’Or").replace(/[‘’’‛]/g, "’");
  return (
    <span
      className="bg-clip-text text-transparent [backface-visibility:hidden]"
      style={{ backgroundImage: `linear-gradient(to right, ${goldColor}, ${goldEndColor})` }}
    >
      {normalized}
    </span>
  );
});
