"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center"><div><p className="font-mono text-sm text-destructive">ERROR</p><h1 className="mt-3 text-3xl font-bold">เครื่องมือพบข้อผิดพลาด</h1><p className="mt-3 text-muted-foreground">ข้อมูลของคุณยังอยู่ใน Browser ลองใหม่อีกครั้งหรือล้าง input ที่มีขนาดใหญ่</p><Button className="mt-6" onClick={reset}>ลองใหม่</Button></div></div>}
