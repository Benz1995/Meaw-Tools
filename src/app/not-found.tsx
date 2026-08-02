import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound(){return <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center"><div><p className="font-mono text-sm text-primary">404 · MEAW?</p><h1 className="mt-3 text-4xl font-bold">Meaw หาเมนูนี้ไม่เจอ</h1><p className="mt-3 text-muted-foreground">ลิงก์อาจไม่ถูกต้อง หรือเครื่องมือนี้ยังไม่มีใน Meaw Tools</p><Button asChild className="mt-6 rounded-full"><Link href="/tools">กลับไปดูเครื่องมือทั้งหมด</Link></Button></div></div>}
