"use client";

import { ArrowDown, ArrowUp, BadgeCheck, BriefcaseBusiness, Download, FileText, GraduationCap, Languages, Plus, SearchCheck, ShieldCheck, Sparkles, Trash2, UserRound } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, ExampleButton, WorkspaceFrame, downloadBlob, downloadText } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ResumePreview } from "@/features/tools/resume-preview";
import {
  RESUME_EDUCATION_LIMIT,
  RESUME_EXPERIENCE_LIMIT,
  RESUME_JOB_DESCRIPTION_LIMIT,
  analyzeKeywordCoverage,
  buildResumePlainText,
  resumeFilename,
  validateResume,
  type ResumeDocument,
  type ResumeEducation,
  type ResumeExperience,
  type ResumeLocale,
  type ResumeStyle,
} from "@/lib/tools/resume";

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "url";
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
};

function TextField({ id, label, value, onChange, placeholder, type = "text", maxLength = 200, required = false, disabled = false }: TextFieldProps) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="leading-5">{label}{required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} required={required} disabled={disabled} />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, action }: { icon: typeof UserRound; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
        <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
      </div>
      {action}
    </div>
  );
}

function emptyResume(): ResumeDocument {
  return {
    locale: "th",
    style: "classic",
    contact: { fullName: "", headline: "", email: "", phone: "", location: "", website: "" },
    summary: "",
    experiences: [],
    education: [],
    skills: "",
    languages: "",
    certifications: "",
  };
}

function sampleResume(): ResumeDocument {
  return {
    locale: "th",
    style: "modern",
    contact: {
      fullName: "กานต์ แมวดี",
      headline: "Frontend Developer",
      email: "kant@example.com",
      phone: "081-234-5678",
      location: "กรุงเทพฯ",
      website: "https://linkedin.com/in/kant-example",
    },
    summary: "Frontend Developer ประสบการณ์ 4 ปี เชี่ยวชาญ React และ TypeScript เน้นสร้างเว็บที่เร็ว เข้าถึงได้ และวัดผลจากข้อมูลจริง ทำงานร่วมกับ Designer และ Backend เพื่อส่งมอบผลิตภัณฑ์ตั้งแต่แนวคิดถึง Production",
    experiences: [
      {
        id: "sample-exp-1",
        role: "Frontend Developer",
        employer: "Meaw Digital Studio",
        location: "กรุงเทพฯ",
        startDate: "2023",
        endDate: "",
        current: true,
        highlights: "พัฒนา Dashboard ด้วย React และ TypeScript ให้ทีมบริการลูกค้า 40 คน\nลด Largest Contentful Paint จาก 3.8 เหลือ 1.9 วินาทีด้วย code splitting และ image optimization\nออกแบบ component library ที่ผ่าน WCAG AA และลดเวลาเขียนหน้าซ้ำ 30%",
      },
      {
        id: "sample-exp-2",
        role: "Junior Web Developer",
        employer: "Siam Commerce Lab",
        location: "นนทบุรี",
        startDate: "2021",
        endDate: "2023",
        current: false,
        highlights: "ดูแลเว็บไซต์ร้านค้า Next.js จำนวน 6 โปรเจกต์และแก้ Core Web Vitals\nเขียน automated tests ด้วย Playwright ครอบคลุม checkout flow สำคัญ",
      },
    ],
    education: [
      { id: "sample-edu-1", degree: "วท.บ. วิทยาการคอมพิวเตอร์", institution: "มหาวิทยาลัยตัวอย่าง", location: "กรุงเทพฯ", startDate: "2017", endDate: "2021", details: "เกียรตินิยมอันดับ 2 · โครงงานระบบวิเคราะห์ Accessibility อัตโนมัติ" },
    ],
    skills: "React, Next.js, TypeScript, JavaScript, HTML, CSS, Tailwind CSS, Playwright, Accessibility, Git",
    languages: "ไทย — เจ้าของภาษา\nอังกฤษ — ใช้ทำงานได้",
    certifications: "Google UX Design Certificate\nWeb Accessibility Fundamentals",
  };
}

function newExperience(): ResumeExperience {
  return { id: crypto.randomUUID(), role: "", employer: "", location: "", startDate: "", endDate: "", current: false, highlights: "" };
}

function newEducation(): ResumeEducation {
  return { id: crypto.randomUUID(), degree: "", institution: "", location: "", startDate: "", endDate: "", details: "" };
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
  return next;
}

export function ResumeBuilderTool() {
  const [documentData, setDocumentData] = useState<ResumeDocument>(() => emptyResume());
  const [jobDescription, setJobDescription] = useState("");
  const deferredJobDescription = useDeferredValue(jobDescription);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const plainText = useMemo(() => buildResumePlainText(documentData), [documentData]);
  const keywordCoverage = useMemo(
    () => analyzeKeywordCoverage(plainText, deferredJobDescription, documentData.locale),
    [deferredJobDescription, documentData.locale, plainText],
  );

  const updateContact = (field: keyof ResumeDocument["contact"], value: string) => {
    setDocumentData((current) => ({ ...current, contact: { ...current.contact, [field]: value } }));
    setIssues([]);
    setStatus("");
  };
  const updateExperience = (id: string, patch: Partial<ResumeExperience>) => {
    setDocumentData((current) => ({ ...current, experiences: current.experiences.map((item) => item.id === id ? { ...item, ...patch } : item) }));
    setIssues([]);
    setStatus("");
  };
  const updateEducation = (id: string, patch: Partial<ResumeEducation>) => {
    setDocumentData((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, ...patch } : item) }));
    setIssues([]);
    setStatus("");
  };
  const changeDocument = <K extends keyof ResumeDocument>(field: K, value: ResumeDocument[K]) => {
    setDocumentData((current) => ({ ...current, [field]: value }));
    setIssues([]);
    setStatus("");
  };

  const loadExample = () => {
    setDocumentData(sampleResume());
    setJobDescription("มองหา Frontend Developer ที่มีประสบการณ์ React, Next.js และ TypeScript เข้าใจ Accessibility, Core Web Vitals, Playwright และทำงานร่วมกับ Designer กับ Backend ได้ดี");
    setIssues([]);
    setStatus("");
    toast.success("โหลดตัวอย่างเรซูเม่แล้ว");
  };
  const clear = () => {
    setDocumentData(emptyResume());
    setJobDescription("");
    setIssues([]);
    setStatus("");
  };
  const validate = () => {
    const nextIssues = validateResume(documentData);
    setIssues(nextIssues);
    if (nextIssues.length) toast.error(nextIssues[0]);
    return nextIssues.length === 0;
  };
  const downloadPlainText = () => {
    if (!validate()) return;
    downloadText(plainText, resumeFilename(documentData.contact.fullName, "txt"));
    setStatus("ดาวน์โหลด Plain text สำเร็จ");
  };
  const downloadPdf = async () => {
    if (!validate()) return;
    setBusy(true);
    setStatus("");
    try {
      const { createResumePdf } = await import("@/lib/tools/resume-pdf");
      const bytes = await createResumePdf(documentData);
      const filename = resumeFilename(documentData.contact.fullName, "pdf");
      downloadBlob(new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }), filename);
      setStatus(`สร้าง ${filename} สำเร็จ · ${bytes.length.toLocaleString("th-TH")} bytes`);
      toast.success("สร้างและดาวน์โหลด Resume PDF แล้ว");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "สร้าง Resume PDF ไม่สำเร็จ";
      setIssues([message]);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WorkspaceFrame>
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-sm leading-6">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div><p className="font-semibold">เรซูเม่อยู่ใน Browser ของคุณ</p><p className="text-muted-foreground">ไม่ส่งชื่อ อีเมล ประวัติการทำงาน หรือ Job Description ไป Server · ไม่บันทึก LocalStorage · PDF/TXT ไม่มีลายน้ำและไม่ต้อง Login</p></div>
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border bg-muted/10 p-4 sm:grid-cols-2">
        <div className="space-y-2.5"><Label htmlFor="resume-locale">ภาษาหัวข้อในเรซูเม่</Label><Select value={documentData.locale} onValueChange={(value) => changeDocument("locale", value as ResumeLocale)}><SelectTrigger id="resume-locale" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="th">ภาษาไทย</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select></div>
        <div className="space-y-2.5"><Label htmlFor="resume-style">สไตล์ PDF</Label><Select value={documentData.style} onValueChange={(value) => changeDocument("style", value as ResumeStyle)}><SelectTrigger id="resume-style" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="classic">Classic — น้ำเงินเข้ม</SelectItem><SelectItem value="modern">Modern — เขียว Teal</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">ทั้งสองแบบเป็น Single column ไม่มีรูป ตาราง หรือกล่องข้อความ</p></div>
      </div>

      <div className="mt-5">
        <ActionBar>
          <Button type="button" onClick={() => void downloadPdf()} disabled={busy}><Download />{busy ? "กำลังสร้าง PDF..." : "สร้างและดาวน์โหลด PDF"}</Button>
          <Button type="button" variant="outline" onClick={downloadPlainText} disabled={busy}><FileText />ดาวน์โหลด Plain text</Button>
          <CopyButton value={plainText} label="คัดลอก Plain text" />
          <ExampleButton onExample={loadExample} disabled={busy} />
          <ClearButton onClear={clear} disabled={busy} />
        </ActionBar>
        {issues.length ? <div role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><p className="font-semibold">กรุณาตรวจข้อมูล</p><ul className="mt-1 list-disc space-y-1 pl-5">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
        {status ? <p data-testid="resume-output" aria-live="polite" className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">{status}</p> : null}
      </div>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(24rem,0.98fr)]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5">
            <SectionHeader icon={UserRound} title="ข้อมูลติดต่อและโปรไฟล์" description="ใช้ข้อมูลที่ recruiter ติดต่อกลับได้จริง และใส่ URL แบบเต็มเพื่อให้ parser อ่านได้" />
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <TextField id="resume-full-name" label="ชื่อ–นามสกุล" value={documentData.contact.fullName} onChange={(value) => updateContact("fullName", value)} maxLength={100} required />
              <TextField id="resume-headline" label="ตำแหน่งงานเป้าหมาย" value={documentData.contact.headline} onChange={(value) => updateContact("headline", value)} placeholder="Frontend Developer" maxLength={120} />
              <TextField id="resume-email" label="อีเมล" type="email" value={documentData.contact.email} onChange={(value) => updateContact("email", value)} placeholder="name@example.com" maxLength={160} />
              <TextField id="resume-phone" label="โทรศัพท์" value={documentData.contact.phone} onChange={(value) => updateContact("phone", value)} placeholder="081-234-5678" maxLength={50} />
              <TextField id="resume-location" label="เมือง / จังหวัด" value={documentData.contact.location} onChange={(value) => updateContact("location", value)} placeholder="กรุงเทพฯ" maxLength={120} />
              <TextField id="resume-website" label="LinkedIn / Portfolio URL" type="url" value={documentData.contact.website} onChange={(value) => updateContact("website", value)} placeholder="https://linkedin.com/in/..." maxLength={240} />
              <div className="space-y-2.5 sm:col-span-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="resume-summary">สรุปโปรไฟล์</Label><span className="text-xs text-muted-foreground">{documentData.summary.length}/1,200</span></div><Textarea id="resume-summary" value={documentData.summary} onChange={(event) => changeDocument("summary", event.target.value)} maxLength={1200} rows={5} placeholder="สรุปประสบการณ์ จุดแข็ง และคุณค่าที่คุณสร้างได้ 2–4 ประโยค" /></div>
            </div>
          </section>

          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5">
            <SectionHeader icon={BriefcaseBusiness} title="ประสบการณ์ทำงาน" description="เรียงล่าสุดก่อน ใช้หนึ่งบรรทัดต่อหนึ่งผลงาน และใส่ตัวเลขเมื่อมีหลักฐาน" action={<Button type="button" size="sm" variant="outline" disabled={documentData.experiences.length >= RESUME_EXPERIENCE_LIMIT} onClick={() => changeDocument("experiences", [...documentData.experiences, newExperience()])}><Plus />เพิ่มงาน</Button>} />
            {documentData.experiences.length ? <div className="space-y-4">{documentData.experiences.map((item, index) => (
              <div key={item.id} data-testid="resume-experience" className="rounded-xl border bg-background/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-semibold">งานที่ {index + 1}</p><div className="flex gap-1"><Button type="button" size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => changeDocument("experiences", moveItem(documentData.experiences, index, -1))} aria-label={`เลื่อนงานที่ ${index + 1} ขึ้น`}><ArrowUp /></Button><Button type="button" size="icon-sm" variant="ghost" disabled={index === documentData.experiences.length - 1} onClick={() => changeDocument("experiences", moveItem(documentData.experiences, index, 1))} aria-label={`เลื่อนงานที่ ${index + 1} ลง`}><ArrowDown /></Button><Button type="button" size="icon-sm" variant="ghost" onClick={() => changeDocument("experiences", documentData.experiences.filter((entry) => entry.id !== item.id))} aria-label={`ลบงานที่ ${index + 1}`}><Trash2 /></Button></div></div>
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2"><TextField id={`resume-role-${item.id}`} label="ตำแหน่ง" value={item.role} onChange={(value) => updateExperience(item.id, { role: value })} maxLength={120} required /><TextField id={`resume-employer-${item.id}`} label="องค์กร" value={item.employer} onChange={(value) => updateExperience(item.id, { employer: value })} maxLength={160} required /><TextField id={`resume-exp-location-${item.id}`} label="สถานที่" value={item.location} onChange={(value) => updateExperience(item.id, { location: value })} maxLength={120} /><TextField id={`resume-exp-start-${item.id}`} label="เริ่ม" value={item.startDate} onChange={(value) => updateExperience(item.id, { startDate: value })} placeholder="2023 หรือ ม.ค. 2023" maxLength={40} /><TextField id={`resume-exp-end-${item.id}`} label="สิ้นสุด" value={item.endDate} onChange={(value) => updateExperience(item.id, { endDate: value })} placeholder="2025" maxLength={40} disabled={item.current} /><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm"><input type="checkbox" checked={item.current} onChange={(event) => updateExperience(item.id, { current: event.target.checked, endDate: event.target.checked ? "" : item.endDate })} className="size-4 accent-primary" /><span>ทำงานที่นี่อยู่</span></label><div className="space-y-2.5 sm:col-span-2"><Label htmlFor={`resume-highlights-${item.id}`}>ผลงานสำคัญ · 1 บรรทัดต่อ 1 ข้อ</Label><Textarea id={`resume-highlights-${item.id}`} value={item.highlights} onChange={(event) => updateExperience(item.id, { highlights: event.target.value })} rows={5} maxLength={1600} placeholder={"พัฒนา... ส่งผลให้...\nลดเวลา... จาก... เหลือ..."} /></div></div>
              </div>
            ))}</div> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">ยังไม่มีประสบการณ์ เด็กจบใหม่สามารถข้ามส่วนนี้และเน้นการศึกษา โครงงาน และทักษะได้</p>}
          </section>

          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5">
            <SectionHeader icon={GraduationCap} title="การศึกษา" description="ใส่วุฒิ สถาบัน ช่วงเวลา และรายละเอียดที่เกี่ยวข้องกับงาน" action={<Button type="button" size="sm" variant="outline" disabled={documentData.education.length >= RESUME_EDUCATION_LIMIT} onClick={() => changeDocument("education", [...documentData.education, newEducation()])}><Plus />เพิ่มการศึกษา</Button>} />
            {documentData.education.length ? <div className="space-y-4">{documentData.education.map((item, index) => (
              <div key={item.id} data-testid="resume-education" className="rounded-xl border bg-background/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-semibold">การศึกษาที่ {index + 1}</p><div className="flex gap-1"><Button type="button" size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => changeDocument("education", moveItem(documentData.education, index, -1))} aria-label={`เลื่อนการศึกษาที่ ${index + 1} ขึ้น`}><ArrowUp /></Button><Button type="button" size="icon-sm" variant="ghost" disabled={index === documentData.education.length - 1} onClick={() => changeDocument("education", moveItem(documentData.education, index, 1))} aria-label={`เลื่อนการศึกษาที่ ${index + 1} ลง`}><ArrowDown /></Button><Button type="button" size="icon-sm" variant="ghost" onClick={() => changeDocument("education", documentData.education.filter((entry) => entry.id !== item.id))} aria-label={`ลบการศึกษาที่ ${index + 1}`}><Trash2 /></Button></div></div>
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2"><TextField id={`resume-degree-${item.id}`} label="วุฒิ / สาขา" value={item.degree} onChange={(value) => updateEducation(item.id, { degree: value })} maxLength={180} required /><TextField id={`resume-institution-${item.id}`} label="สถาบัน" value={item.institution} onChange={(value) => updateEducation(item.id, { institution: value })} maxLength={180} required /><TextField id={`resume-edu-location-${item.id}`} label="สถานที่" value={item.location} onChange={(value) => updateEducation(item.id, { location: value })} maxLength={120} /><div className="grid grid-cols-2 gap-3"><TextField id={`resume-edu-start-${item.id}`} label="เริ่ม" value={item.startDate} onChange={(value) => updateEducation(item.id, { startDate: value })} maxLength={40} /><TextField id={`resume-edu-end-${item.id}`} label="จบ" value={item.endDate} onChange={(value) => updateEducation(item.id, { endDate: value })} maxLength={40} /></div><div className="space-y-2.5 sm:col-span-2"><Label htmlFor={`resume-edu-details-${item.id}`}>รายละเอียด / โครงงาน / เกียรตินิยม</Label><Textarea id={`resume-edu-details-${item.id}`} value={item.details} onChange={(event) => updateEducation(item.id, { details: event.target.value })} rows={3} maxLength={600} /></div></div>
              </div>
            ))}</div> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">กด “เพิ่มการศึกษา” เพื่อเริ่มกรอกข้อมูล</p>}
          </section>

          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5">
            <SectionHeader icon={Languages} title="ทักษะ ภาษา และใบรับรอง" description="ใช้ชื่อทักษะที่ตรงกับงานจริงและคุณสามารถอธิบายหรือสาธิตได้" />
            <div className="space-y-5"><div className="space-y-2.5"><Label htmlFor="resume-skills">ทักษะ · คั่นด้วย comma หรือขึ้นบรรทัดใหม่</Label><Textarea id="resume-skills" value={documentData.skills} onChange={(event) => changeDocument("skills", event.target.value)} rows={4} maxLength={1200} placeholder="React, TypeScript, Project Management" /></div><div className="space-y-2.5"><Label htmlFor="resume-languages">ภาษา · 1 รายการต่อบรรทัด</Label><Textarea id="resume-languages" value={documentData.languages} onChange={(event) => changeDocument("languages", event.target.value)} rows={3} maxLength={600} placeholder={"ไทย — เจ้าของภาษา\nอังกฤษ — ใช้ทำงานได้"} /></div><div className="space-y-2.5"><Label htmlFor="resume-certifications">ใบรับรอง / รางวัล / ผลงาน</Label><Textarea id="resume-certifications" value={documentData.certifications} onChange={(event) => changeDocument("certifications", event.target.value)} rows={3} maxLength={1000} /></div></div>
          </section>

          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5">
            <SectionHeader icon={SearchCheck} title="เทียบ Keyword กับ Job Description" description="วัดเพียงคำสำคัญที่พบร่วมกัน ไม่ใช่คะแนน ATS และไม่รับประกันการคัดเลือก" />
            <div className="space-y-2.5"><div className="flex items-center justify-between gap-3"><Label htmlFor="resume-job-description">รายละเอียดงาน</Label><span className="text-xs text-muted-foreground">{jobDescription.length}/{RESUME_JOB_DESCRIPTION_LIMIT.toLocaleString("en-US")}</span></div><Textarea id="resume-job-description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={8} maxLength={RESUME_JOB_DESCRIPTION_LIMIT} placeholder="วาง Job Description เพื่อดูคำที่มีแล้วและคำที่ควรตรวจว่าคุณมีประสบการณ์จริงหรือไม่" /></div>
            {deferredJobDescription.trim() ? <div data-testid="resume-keyword-coverage" className="mt-4 rounded-xl border bg-background/70 p-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">Keyword coverage</p><p className="mt-1 text-3xl font-bold text-primary">{keywordCoverage.percent}%</p></div><p className="text-xs text-muted-foreground">พบ {keywordCoverage.matched.length} จาก {keywordCoverage.total} คำสำคัญสูงสุด</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><BadgeCheck className="size-4" />มีในเรซูเม่</p><div className="mt-2 flex flex-wrap gap-1.5">{keywordCoverage.matched.length ? keywordCoverage.matched.map((keyword) => <span key={keyword} className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs">{keyword}</span>) : <span className="text-xs text-muted-foreground">ยังไม่พบ</span>}</div></div><div><p className="text-xs font-semibold text-amber-700 dark:text-amber-300">ควรตรวจประสบการณ์ก่อนเพิ่ม</p><div className="mt-2 flex flex-wrap gap-1.5">{keywordCoverage.missing.length ? keywordCoverage.missing.map((keyword) => <span key={keyword} className="rounded-full bg-amber-500/10 px-2 py-1 text-xs">{keyword}</span>) : <span className="text-xs text-muted-foreground">ครอบคลุมคำสำคัญชุดนี้แล้ว</span>}</div></div></div><p className="mt-4 text-xs leading-5 text-muted-foreground">อย่าใส่ keyword ที่คุณไม่มีประสบการณ์จริง เครื่องมือนับคำแบบ deterministic และไม่ทราบกฎของ ATS แต่ละบริษัท</p></div> : null}
          </section>
        </div>

        <aside className="min-w-0 self-start xl:sticky xl:top-24" aria-label="ตัวอย่างเรซูเม่แบบสด">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h2 className="font-semibold">Live Preview</h2></div><span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">A4 · Single column · Text-based</span></div>
          <div className="min-w-0 overflow-hidden rounded-xl border bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] p-2 sm:p-4"><ResumePreview documentData={documentData} /></div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border bg-muted/10 p-3 text-xs leading-5 text-muted-foreground"><BriefcaseBusiness className="mt-0.5 size-4 shrink-0" /><p>PDF ฝังฟอนต์ Sarabun และสร้างข้อความจริง ไม่แปลงหน้าเป็นรูป แต่ parser ของแต่ละระบบต่างกัน ควรเปิด Plain text ตรวจลำดับและอ่านประกาศรับสมัครก่อนส่ง</p></div>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}
