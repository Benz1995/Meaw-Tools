"use client";

import { ArrowDown, ArrowUp, FileImage, FileOutput, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMAGE_FILE_COUNT_LIMIT, IMAGE_FILE_LIMIT_BYTES, IMAGE_TOTAL_LIMIT_BYTES } from "@/lib/tools/limits";
import { fitRectangle } from "@/lib/tools/popular";

type PageMode = "a4-portrait" | "a4-landscape" | "fit-image";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function JpgToPdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>("a4-portrait");
  const [margin, setMargin] = useState(24);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);
  const [lastOutput, setLastOutput] = useState<{ pages: number; bytes: number } | null>(null);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  const clear = () => {
    setFiles([]);
    setError("");
    setLastOutput(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFiles = (selectedFiles: File[]) => {
    try {
      if (!selectedFiles.length) return;
      if (selectedFiles.length > IMAGE_FILE_COUNT_LIMIT) throw new Error(`เลือกได้สูงสุด ${IMAGE_FILE_COUNT_LIMIT} รูปต่อครั้ง`);
      if (selectedFiles.some((file) => !["image/jpeg", "image/png"].includes(file.type))) throw new Error("รองรับเฉพาะไฟล์ JPG, JPEG และ PNG");
      if (selectedFiles.some((file) => file.size > IMAGE_FILE_LIMIT_BYTES)) throw new Error("แต่ละไฟล์ต้องมีขนาดไม่เกิน 10 MB");
      if (selectedFiles.reduce((sum, file) => sum + file.size, 0) > IMAGE_TOTAL_LIMIT_BYTES) throw new Error("ขนาดไฟล์รวมต้องไม่เกิน 50 MB");
      setFiles(selectedFiles);
      setError("");
      setLastOutput(null);
    } catch (caught) {
      setFiles([]);
      setLastOutput(null);
      setError(caught instanceof Error ? caught.message : "เลือกไฟล์ไม่สำเร็จ");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    setFiles((current) => {
      const next = [...current];
      const sourceFile = next[index];
      const targetFile = next[target];
      if (!sourceFile || !targetFile) return current;
      next[index] = targetFile;
      next[target] = sourceFile;
      return next;
    });
    setLastOutput(null);
  };

  const convert = async () => {
    if (!files.length) { setError("กรุณาเลือกรูปอย่างน้อย 1 ไฟล์"); return; }
    setConverting(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const document = await PDFDocument.create();
      document.setTitle("Images converted by Meaw Tools");
      document.setCreator("Meaw Tools");

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const image = file.type === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
        let pageWidth = 595.28;
        let pageHeight = 841.89;
        if (pageMode === "a4-landscape") [pageWidth, pageHeight] = [pageHeight, pageWidth];
        if (pageMode === "fit-image") {
          pageWidth = image.width * 0.75 + margin * 2;
          pageHeight = image.height * 0.75 + margin * 2;
        }
        const fitted = fitRectangle(image.width, image.height, pageWidth, pageHeight, margin);
        const page = document.addPage([pageWidth, pageHeight]);
        page.drawImage(image, fitted);
      }

      const pdfBytes = await document.save();
      const outputBuffer = new Uint8Array(pdfBytes).buffer;
      downloadBlob(new Blob([outputBuffer], { type: "application/pdf" }), "meaw-images.pdf");
      setLastOutput({ pages: files.length, bytes: pdfBytes.byteLength });
      toast.success(`สร้าง PDF ${files.length} หน้าแล้ว`);
    } catch (caught) {
      setLastOutput(null);
      setError(caught instanceof Error ? caught.message : "แปลงรูปเป็น PDF ไม่สำเร็จ");
    } finally {
      setConverting(false);
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 lg:grid-cols-[1fr_13rem_11rem]">
        <div>
          <Label htmlFor="jpg-pdf-files">เลือกรูป JPG หรือ PNG</Label>
          <Input ref={inputRef} id="jpg-pdf-files" type="file" accept="image/jpeg,image/png" multiple onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} />
          <p className="mt-2 text-xs text-muted-foreground">สูงสุด 20 รูป · ไฟล์ละ 10 MB · รวมไม่เกิน 50 MB</p>
        </div>
        <div>
          <Label htmlFor="pdf-page-mode">ขนาดหน้ากระดาษ</Label>
          <Select value={pageMode} onValueChange={(value) => setPageMode(value as PageMode)}>
            <SelectTrigger id="pdf-page-mode" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="a4-portrait">A4 แนวตั้ง</SelectItem><SelectItem value="a4-landscape">A4 แนวนอน</SelectItem><SelectItem value="fit-image">พอดีกับรูป</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pdf-margin">ระยะขอบ</Label>
          <Select value={String(margin)} onValueChange={(value) => setMargin(Number(value))}>
            <SelectTrigger id="pdf-margin" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="0">ไม่มีขอบ</SelectItem><SelectItem value="24">ขอบเล็ก</SelectItem><SelectItem value="48">ขอบกลาง</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        {files.length ? (
          <div className="overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 text-sm"><span className="font-medium">ลำดับหน้า PDF</span><span className="text-muted-foreground">{files.length} รูป · {formatBytes(totalBytes)}</span></div>
            <ol className="max-h-80 divide-y overflow-y-auto">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                  <FileImage className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p></div>
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`เลื่อน ${file.name} ขึ้น`}><ArrowUp /></Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label={`เลื่อน ${file.name} ลง`}><ArrowDown /></Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => { setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index)); setLastOutput(null); }} aria-label={`ลบ ${file.name}`}><Trash2 /></Button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : <EmptyOutput size="compact" text="เลือกรูปหลายไฟล์ แล้วเรียงลำดับก่อนสร้าง PDF" />}
      </div>
      <div className="mt-4">
        <ActionBar><Button onClick={() => void convert()} disabled={converting}><FileOutput className="size-4" />{converting ? "กำลังสร้าง PDF..." : "สร้างและดาวน์โหลด PDF"}</Button><ClearButton onClear={clear} /></ActionBar>
      </div>
      {lastOutput ? <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm" aria-live="polite"><p className="font-medium text-green-700 dark:text-green-300">ดาวน์โหลด PDF สำเร็จ</p><p className="mt-1 text-muted-foreground">{lastOutput.pages} หน้า · {formatBytes(lastOutput.bytes)} · ไฟล์ไม่ถูกอัปโหลดขึ้น Server</p></div> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">หมายเหตุ: รูปจากกล้องบางไฟล์อาจมี EXIF Orientation ต่างกัน ควรตรวจ PDF หลังดาวน์โหลดก่อนส่งงานหรือพิมพ์จริง</p>
    </WorkspaceFrame>
  );
}
