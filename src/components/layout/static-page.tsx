export function StaticPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><header className="border-b pb-8"><p className="text-sm font-semibold text-primary">{eyebrow}</p><h1 className="mt-2 text-4xl font-bold tracking-tight">{title}</h1><p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{description}</p></header><article className="prose prose-slate mt-8 max-w-none space-y-8 text-foreground dark:prose-invert">{children}</article></div>;
}
