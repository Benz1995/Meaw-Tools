"use client";

import { ClipboardCheck, Code2, Download, Image as ImageIcon, LayoutTemplate, Mail, Monitor, Palette, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildEmailSignatureDocument,
  buildEmailSignatureHtml,
  buildEmailSignaturePlainText,
  emailSignatureFilename,
  validateEmailSignature,
  type EmailSignatureDocument,
  type EmailSignatureTemplate,
} from "@/lib/tools/email-signature";

const colorOptions = ["#13795b", "#2563eb", "#7c3aed", "#be123c", "#b45309", "#334155"];
const templateOptions: Array<{ value: EmailSignatureTemplate; label: string; description: string }> = [
  { value: "modern", label: "Modern", description: "รูปหรืออักษรย่อ พร้อมเส้นสีด้านข้าง" },
  { value: "classic", label: "Classic", description: "เรียบเป็นทางการและไม่มีคอลัมน์รูป" },
  { value: "compact", label: "Compact", description: "ประหยัดพื้นที่สำหรับการตอบอีเมล" },
];

function emptySignature(): EmailSignatureDocument {
  return {
    fullName: "",
    jobTitle: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    lineId: "",
    linkedin: "",
    facebook: "",
    instagram: "",
    photoUrl: "",
    accentColor: colorOptions[0]!,
    template: "modern",
    disclaimer: "",
  };
}

function sampleSignature(): EmailSignatureDocument {
  return {
    fullName: "กานต์ แมวดี",
    jobTitle: "Product Designer",
    company: "Meaw Digital Studio",
    email: "kant@meaw.example",
    phone: "081-234-5678",
    website: "meaw-tools.vercel.app",
    address: "กรุงเทพฯ ประเทศไทย",
    lineId: "kantmeaw",
    linkedin: "linkedin.com/in/kant-meaw",
    facebook: "",
    instagram: "instagram.com/kantmeaw",
    photoUrl: "",
    accentColor: "#13795b",
    template: "modern",
    disclaimer: "ข้อความนี้และไฟล์แนบอาจมีข้อมูลที่เป็นความลับ หากได้รับโดยไม่ตั้งใจกรุณาแจ้งผู้ส่งและลบข้อความ",
  };
}

function previewPlaceholder(document: EmailSignatureDocument): EmailSignatureDocument {
  return {
    ...document,
    fullName: document.fullName || "ชื่อ นามสกุล",
    jobTitle: document.jobTitle || "ตำแหน่งงาน",
    company: document.company || "ชื่อบริษัท",
  };
}

function TextField({ id, label, value, onChange, placeholder, type = "text", maxLength = 200, hint }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "url" | "tel";
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: typeof UserRound; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
      <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
    </div>
  );
}

async function copyFormattedSignature(html: string, plainText: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    })]);
    return;
  }

  const container = document.createElement("div");
  container.contentEditable = "true";
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.innerHTML = html;
  document.body.append(container);
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);
  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  container.remove();
  if (!copied) throw new Error("Browser ไม่อนุญาตให้คัดลอกแบบจัดรูป");
}

export function EmailSignatureGeneratorTool() {
  const [documentData, setDocumentData] = useState<EmailSignatureDocument>(emptySignature);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const output = useMemo(() => {
    try {
      validateEmailSignature(documentData);
      return {
        html: buildEmailSignatureHtml(documentData),
        plainText: buildEmailSignaturePlainText(documentData),
        standaloneHtml: buildEmailSignatureDocument(documentData),
        error: "",
      };
    } catch (caught) {
      return { html: "", plainText: "", standaloneHtml: "", error: caught instanceof Error ? caught.message : "ข้อมูลลายเซ็นไม่ถูกต้อง" };
    }
  }, [documentData]);

  const preview = useMemo(() => {
    try {
      return buildEmailSignatureDocument(previewPlaceholder(documentData));
    } catch {
      return "";
    }
  }, [documentData]);

  const update = <Key extends keyof EmailSignatureDocument>(key: Key, value: EmailSignatureDocument[Key]) => {
    setDocumentData((current) => ({ ...current, [key]: value }));
  };

  const handleRichCopy = async () => {
    if (!output.html) { toast.error(output.error); return; }
    try {
      await copyFormattedSignature(output.html, output.plainText);
      toast.success("คัดลอกลายเซ็นแบบจัดรูปแล้ว");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "คัดลอกลายเซ็นไม่สำเร็จ");
    }
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-600" />
        <AlertTitle>ไม่มีบัญชี ไม่มี watermark และไม่มี tracking pixel</AlertTitle>
        <AlertDescription>ข้อมูลฟอร์มและ HTML ถูกสร้างใน Browser ของคุณ หากใส่ URL รูปภาพ Browser และผู้รับอีเมลจะโหลดรูปจากเว็บไซต์ต้นทางโดยตรง จึงควรใช้รูปที่เผยแพร่สาธารณะและไม่ผูก token ส่วนตัว</AlertDescription>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <div className="space-y-6">
          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="signature-identity-title">
            <SectionHeader icon={UserRound} title="ข้อมูลผู้ส่ง" description="กรอกเฉพาะข้อมูลที่ต้องการแสดงต่อผู้รับอีเมล" />
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <TextField id="signature-full-name" label="ชื่อและนามสกุล *" value={documentData.fullName} onChange={(value) => update("fullName", value)} placeholder="กานต์ แมวดี" />
              <TextField id="signature-job-title" label="ตำแหน่งงาน" value={documentData.jobTitle} onChange={(value) => update("jobTitle", value)} placeholder="Product Designer" />
              <TextField id="signature-company" label="บริษัท / แบรนด์" value={documentData.company} onChange={(value) => update("company", value)} placeholder="Meaw Digital Studio" />
              <TextField id="signature-email" label="อีเมล" value={documentData.email} onChange={(value) => update("email", value)} placeholder="name@example.com" type="email" />
              <TextField id="signature-phone" label="โทรศัพท์" value={documentData.phone} onChange={(value) => update("phone", value)} placeholder="081-234-5678" type="tel" />
              <TextField id="signature-website" label="เว็บไซต์" value={documentData.website} onChange={(value) => update("website", value)} placeholder="example.com" type="url" />
              <div className="sm:col-span-2"><TextField id="signature-address" label="ที่อยู่ / พื้นที่ทำงาน" value={documentData.address} onChange={(value) => update("address", value)} placeholder="กรุงเทพฯ ประเทศไทย" /></div>
            </div>
          </section>

          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="signature-links-title">
            <SectionHeader icon={Mail} title="ช่องทางติดต่อและรูปภาพ" description="URL ที่ไม่ใส่ protocol จะถูกเติม https:// ให้โดยอัตโนมัติ" />
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <TextField id="signature-line" label="LINE ID" value={documentData.lineId} onChange={(value) => update("lineId", value)} placeholder="kantmeaw" />
              <TextField id="signature-linkedin" label="LinkedIn URL" value={documentData.linkedin} onChange={(value) => update("linkedin", value)} placeholder="linkedin.com/in/name" type="url" />
              <TextField id="signature-facebook" label="Facebook URL" value={documentData.facebook} onChange={(value) => update("facebook", value)} placeholder="facebook.com/name" type="url" />
              <TextField id="signature-instagram" label="Instagram URL" value={documentData.instagram} onChange={(value) => update("instagram", value)} placeholder="instagram.com/name" type="url" />
              <div className="sm:col-span-2"><TextField id="signature-photo-url" label="URL รูปโปรไฟล์ / โลโก้" value={documentData.photoUrl} onChange={(value) => update("photoUrl", value)} placeholder="https://example.com/profile.jpg" type="url" hint="ควรเป็น HTTPS สาธารณะ รูปสี่เหลี่ยม และไฟล์เล็ก หากเว้นว่างจะใช้อักษรย่อแทน" /></div>
            </div>
          </section>

          <section className="rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="signature-style-title">
            <SectionHeader icon={Palette} title="รูปแบบและสี" description="ใช้ฟอนต์ระบบ ตาราง และ inline style เพื่อความเข้ากันได้กับ email client" />
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="เทมเพลตลายเซ็นอีเมล">
              {templateOptions.map((option) => <button key={option.value} type="button" role="radio" aria-checked={documentData.template === option.value} onClick={() => update("template", option.value)} className={`rounded-xl border p-3 text-left transition-colors ${documentData.template === option.value ? "border-primary bg-primary/8 ring-2 ring-primary/15" : "bg-background hover:border-primary/40"}`}><span className="block text-sm font-semibold">{option.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span></button>)}
            </div>
            <div className="mt-5 space-y-2.5">
              <Label htmlFor="signature-accent-color">สีหลัก</Label>
              <div className="flex flex-wrap items-center gap-2">
                {colorOptions.map((color) => <button key={color} type="button" className="size-9 rounded-full border-2 border-background shadow-sm ring-1 ring-border transition-transform hover:scale-105 aria-pressed:ring-2 aria-pressed:ring-primary" style={{ backgroundColor: color }} onClick={() => update("accentColor", color)} aria-label={`เลือกสี ${color}`} aria-pressed={documentData.accentColor === color} />)}
                <Input id="signature-accent-color" type="color" value={documentData.accentColor} onChange={(event) => update("accentColor", event.target.value)} className="h-10 w-14 cursor-pointer p-1" aria-label="เลือกสีหลักแบบกำหนดเอง" />
                <code className="text-xs text-muted-foreground">{documentData.accentColor}</code>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              <Label htmlFor="signature-disclaimer">ข้อความท้ายอีเมล / Disclaimer</Label>
              <Textarea id="signature-disclaimer" value={documentData.disclaimer} onChange={(event) => update("disclaimer", event.target.value)} rows={3} maxLength={500} placeholder="ข้อความความลับ เงื่อนไขบริษัท หรือเว้นว่างได้" />
              <p className="text-right text-xs text-muted-foreground">{documentData.disclaimer.length}/500</p>
            </div>
          </section>
        </div>

        <section className="xl:sticky xl:top-24" aria-labelledby="signature-preview-title">
          <div className="rounded-xl border bg-muted/10 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><LayoutTemplate className="size-4" /></span><div><h2 id="signature-preview-title" className="font-semibold">ตัวอย่างลายเซ็นอีเมล</h2><p className="mt-1 text-xs text-muted-foreground">พื้นขาวจำลองหน้าต่างเขียนอีเมล</p></div></div>
              <div className="flex rounded-lg border bg-background p-1" aria-label="ขนาดตัวอย่าง">
                <Button type="button" size="sm" variant={previewMode === "desktop" ? "secondary" : "ghost"} aria-pressed={previewMode === "desktop"} onClick={() => setPreviewMode("desktop")}><Monitor />Desktop</Button>
                <Button type="button" size="sm" variant={previewMode === "mobile" ? "secondary" : "ghost"} aria-pressed={previewMode === "mobile"} onClick={() => setPreviewMode("mobile")}><Smartphone />Mobile</Button>
              </div>
            </div>
            {preview ? <div className="overflow-x-auto rounded-xl border bg-white p-3 sm:p-5"><div className="mx-auto transition-[max-width]" style={{ maxWidth: previewMode === "desktop" ? 600 : 360 }}><iframe title="ตัวอย่างลายเซ็นอีเมล" srcDoc={preview} sandbox="" className="h-[310px] w-full border-0 bg-white" data-testid="email-signature-preview" /></div></div> : <div className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">ตรวจ URL และข้อมูลที่กรอกเพื่อแสดงตัวอย่าง</div>}

            {output.error ? <p role="alert" className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">{output.error}</p> : null}
            <div className="mt-5 border-t pt-5">
              <ActionBar>
                <Button type="button" onClick={() => void handleRichCopy()} disabled={!output.html} data-testid="signature-copy-rich"><ClipboardCheck />คัดลอกแบบจัดรูป</Button>
                <Button type="button" variant="outline" onClick={() => void copyText(output.html, "คัดลอก HTML แล้ว")} disabled={!output.html} data-testid="signature-copy-html"><Code2 />คัดลอก HTML</Button>
                <Button type="button" variant="outline" onClick={() => downloadText(output.standaloneHtml, emailSignatureFilename(documentData.fullName), "text/html;charset=utf-8")} disabled={!output.html} data-testid="signature-download-html"><Download />ดาวน์โหลด HTML</Button>
                <ExampleButton onExample={() => setDocumentData(sampleSignature())} />
                <ClearButton onClear={() => setDocumentData(emptySignature())} />
              </ActionBar>
            </div>
          </div>

          <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
            <ImageIcon className="text-sky-600" /><AlertTitle>วิธีใช้กับ Gmail และ Outlook</AlertTitle><AlertDescription>กด “คัดลอกแบบจัดรูป” แล้ววางในช่อง Signature ของโปรแกรมอีเมล หากรูปไม่แสดงให้ตรวจว่า URL รูปเปิดได้สาธารณะ และควรส่งอีเมลทดสอบหาอุปกรณ์ของตัวเองก่อนใช้จริง</AlertDescription>
          </Alert>
        </section>
      </div>
    </WorkspaceFrame>
  );
}
