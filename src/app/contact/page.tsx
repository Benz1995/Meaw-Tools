import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { StaticPage } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
export const metadata:Metadata={title:"ติดต่อ",description:"ติดต่อทีม Meaw Tools",alternates:{canonical:"/contact"}};
export default function ContactPage(){return <StaticPage eyebrow="CONTACT" title="แจ้งปัญหาหรือเสนอเครื่องมือใหม่" description="MVP ไม่มี contact form และไม่รับข้อมูลผ่าน Server คุณสามารถส่งอีเมลจากโปรแกรมของคุณได้โดยตรง"><section className="rounded-xl border bg-card p-6"><h2 className="text-xl font-semibold">ก่อนส่งข้อความ</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">อย่าแนบ JWT, API key, source code ลับ หรือข้อมูลส่วนบุคคลจริง หากรายงาน bug ให้ใช้ข้อมูลจำลองที่ reproduce ปัญหาได้</p><Button asChild className="mt-5"><Link href={`mailto:${siteConfig.email}`}><Mail className="size-4"/>ส่งอีเมลถึงเรา</Link></Button></section></StaticPage>}
