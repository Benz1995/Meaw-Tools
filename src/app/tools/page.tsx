import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolDirectory } from "@/components/tools/tool-directory";

export const metadata: Metadata = { title: "เครื่องมือทั้งหมด", description: "รวมเครื่องมือออนไลน์สำหรับนักพัฒนา JSON, SQL, JWT, UUID, Regex, Cron และอื่น ๆ", alternates: { canonical: "/tools" } };
export default function ToolsPage() { return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">TOOL DIRECTORY</p><h1 className="mt-2 text-4xl font-bold tracking-tight">เครื่องมือทั้งหมด</h1><p className="mt-3 text-muted-foreground">ค้นหาและกรองเครื่องมือ ทุกอย่างทำงานใน Browser โดยไม่ต้องสมัครสมาชิก</p></div><div className="mt-8"><Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}><ToolDirectory /></Suspense></div></div>; }
