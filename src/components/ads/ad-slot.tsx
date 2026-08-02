export function AdSlot({ name }: { name: string }) {
  if (process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== "true") return null;
  return <aside className="mx-auto my-6 flex min-h-24 max-w-7xl items-center justify-center border-y bg-muted/30 px-4 text-xs text-muted-foreground" aria-label={`พื้นที่โฆษณา ${name}`}>พื้นที่โฆษณา</aside>;
}
