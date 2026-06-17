export function SiteFont({ font, salonNameFont }: { font?: string | null; salonNameFont?: string | null }) {
  if (!font && !salonNameFont) return null;

  const families = [
    font ? `family=${font.replace(/ /g, "+")}:wght@300;400;500;600;700;800` : null,
    salonNameFont && salonNameFont !== font ? `family=${salonNameFont.replace(/ /g, "+")}:wght@400;600;700;900` : null,
  ].filter(Boolean).join("&");

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${families}&display=swap`} />
      <style>{`
        ${font ? `body { font-family: '${font}', sans-serif; }` : ""}
        :root { --font-salon-name: ${salonNameFont ? `'${salonNameFont}', sans-serif` : "inherit"}; }
      `}</style>
    </>
  );
}
