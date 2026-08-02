import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPageContent } from "@/components/tools/tool-page-content";
import { getTool, tools } from "@/config/tools";
import { siteConfig } from "@/config/site";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return tools.map((tool) => ({ slug: tool.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const tool = getTool(slug); if (!tool) return {}; const title = `${tool.thaiName}ฟรี`; return { title, description: `${tool.description} ข้อมูลประมวลผลภายใน Browser`, alternates: { canonical: `/${slug}` }, openGraph: { title: `${title} | ${siteConfig.name}`, description: tool.shortDescription, url: `/${slug}`, type: "website" }, twitter: { card: "summary_large_image", title, description: tool.shortDescription } }; }
export default async function ToolPage({ params }: Props) { const { slug } = await params; const tool = getTool(slug); if (!tool) notFound(); return <ToolPageContent tool={tool} />; }
