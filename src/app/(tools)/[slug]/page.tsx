import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPageContent } from "@/components/tools/tool-page-content";
import { getTool, tools } from "@/config/tools";
import { defaultSocialImage, siteConfig } from "@/config/site";
import { buildToolSeoDescription, buildToolSeoTitle } from "@/lib/seo/tool-seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return tools.map((tool) => ({ slug: tool.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const tool = getTool(slug); if (!tool) return {}; const title = buildToolSeoTitle(tool); const description = buildToolSeoDescription(tool); return { title, description, alternates: { canonical: `/${slug}` }, robots: { index: true, follow: true }, openGraph: { title: `${title} | ${siteConfig.name}`, description, url: `/${slug}`, type: "website", images: [defaultSocialImage] }, twitter: { card: "summary_large_image", title, description, images: [defaultSocialImage] } }; }
export default async function ToolPage({ params }: Props) { const { slug } = await params; const tool = getTool(slug); if (!tool) notFound(); return <ToolPageContent tool={tool} />; }
