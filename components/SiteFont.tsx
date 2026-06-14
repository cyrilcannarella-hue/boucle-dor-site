export function SiteFont({ font }: { font?: string | null }) {
  if (!font) return null;

  const family = font.replace(/ /g, "+");

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700;800&display=swap`}
      />
      <style>{`body { font-family: '${font}', sans-serif; }`}</style>
    </>
  );
}
