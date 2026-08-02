import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { StaticPage } from "@/components/layout/static-page";
import { Card, CardContent } from "@/components/ui/card";
export const metadata:Metadata={title:"บทความสำหรับนักพัฒนา",description:"บทความภาษาไทยเกี่ยวกับ JSON, JWT, UUID, Timestamp, SQL, Regex และ Cron",alternates:{canonical:"/blog"}};
const posts=["JSON คืออะไร และทำไม Syntax จึงสำคัญ","วิธีอ่าน JWT โดยไม่สับสนกับการ Verify","UUID v4 ใช้ทำอะไร","Unix Timestamp และ Timezone สำหรับนักพัฒนา","Regex สำหรับมือใหม่","Cron Expression แบบ 5 ช่อง"];
export default function BlogPage(){return <StaticPage eyebrow="DEVTHAI BLOG" title="บทความภาษาไทยสำหรับ Developer" description="คลังความรู้กำลังทยอยเปิด บทความจะเน้นตัวอย่างที่นำไปใช้ได้จริงและเชื่อมกับเครื่องมือในเว็บไซต์"><div className="grid gap-4 sm:grid-cols-2">{posts.map((post)=><Card key={post}><CardContent className="p-5"><BookOpen className="size-5 text-primary"/><h2 className="mt-3 font-semibold">{post}</h2><p className="mt-2 text-sm text-muted-foreground">กำลังจัดทำ</p></CardContent></Card>)}</div></StaticPage>}
