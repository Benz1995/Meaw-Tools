import type { MetadataRoute } from "next";
import { categoryConfigs, tools } from "@/config/tools";
import { siteConfig } from "@/config/site";
export default function sitemap():MetadataRoute.Sitemap{const staticRoutes=["","/tools","/categories","/about","/privacy-policy","/terms","/contact","/blog"];return [...staticRoutes.map((path)=>({url:`${siteConfig.url}${path}`,changeFrequency:path===""?"weekly" as const:"monthly" as const,priority:path===""?1:0.6})),...categoryConfigs.map((category)=>({url:`${siteConfig.url}/categories/${category.value}`,changeFrequency:"monthly" as const,priority:0.7})),...tools.map((tool)=>({url:`${siteConfig.url}/${tool.slug}`,changeFrequency:"monthly" as const,priority:0.8}))]}
