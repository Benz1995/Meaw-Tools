import { ShieldCheck } from "lucide-react";

export function PrivacyNotice({ compact = false, shareableUrl = false }: { compact?: boolean; shareableUrl?: boolean }) {
  if (compact) {
    return <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 shrink-0 text-primary" /><span><strong className="font-medium text-foreground">ประมวลผลใน Browser</strong> · {shareableUrl ? "ลิงก์แชร์มีค่าที่คุณเลือก" : "ไม่ส่งข้อมูลไป Server"}</span></div>;
  }
  return <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-medium">ประมวลผลภายใน Browser</p><p className="mt-1 text-muted-foreground">{shareableUrl ? "ค่าจะอยู่ใน URL เมื่อคุณเลือกแชร์ จึงไม่ควรใส่ข้อมูลลับ" : "ข้อมูลที่คุณกรอกจะไม่ถูกส่งไปยัง Server และไม่ถูกบันทึกโดย Meaw Tools"}</p></div></div>;
}
