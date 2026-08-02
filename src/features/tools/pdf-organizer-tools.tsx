"use client";

import { ArrowDown, ArrowUp, Download, FileOutput, Files, Scissors, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PDF_FILE_COUNT_LIMIT,
  PDF_TOTAL_LIMIT_BYTES,
  formatPdfBytes,
  parsePdfSplitRanges,
  pdfFileStem,
  validatePdfFile,
} from "@/lib/tools/pdf";

type PdfOutput = { blob: Blob; filename: string; pages: number; files: number; bytes: number };

function friendlyPdfError(caught: unknown, fallback: string) {
  if (caught && typeof caught === "object" && "name" in caught) {
    if (caught.name === "EncryptedPDFError") return "PDF มีรหัสผ่าน กรุณาปลดล็อกไฟล์ก่อนใช้งาน";
  }
  return caught instanceof Error ? caught.message : fallback;
}

async function createSamplePdf(name: string, pages: number, hue: "green" | "pink" = "green") {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  for (let index = 0; index < pages; index += 1) {
    const page = document.addPage([595, 842]);
    const color = hue === "green" ? rgb(0.9, 0.96, 0.88) : rgb(0.99, 0.9, 0.9);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color });
    page.drawText(`Meaw Tools — ${name} ${index + 1}`, { x: 64, y: 690, size: 28, font, color: rgb(0.18, 0.36, 0.24) });
    page.drawText("Private processing in your browser", { x: 64, y: 645, size: 14, color: rgb(0.32, 0.28, 0.24) });
  }
  const bytes = await document.save();
  return new File([Uint8Array.from(bytes)], `${name.toLowerCase().replace(/\s+/g, "-")}.pdf`, { type: "application/pdf", lastModified: Date.now() });
}

export function MergePdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<PdfOutput | null>(null);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  const clear = () => {
    setFiles([]);
    setOutput(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFiles = (nextFiles: File[]) => {
    try {
      if (!nextFiles.length) return;
      if (nextFiles.length > PDF_FILE_COUNT_LIMIT) throw new Error(`รวมได้สูงสุด ${PDF_FILE_COUNT_LIMIT} ไฟล์ต่อครั้ง`);
      nextFiles.forEach(validatePdfFile);
      if (nextFiles.reduce((sum, file) => sum + file.size, 0) > PDF_TOTAL_LIMIT_BYTES) throw new Error("ขนาดไฟล์รวมต้องไม่เกิน 60 MB");
      setFiles(nextFiles);
      setError("");
      setOutput(null);
    } catch (caught) {
      setFiles([]);
      setOutput(null);
      setError(friendlyPdfError(caught, "เลือกไฟล์ PDF ไม่สำเร็จ"));
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    setFiles((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setOutput(null);
  };

  const merge = async () => {
    if (files.length < 2) { setError("กรุณาเลือก PDF อย่างน้อย 2 ไฟล์"); return; }
    setMerging(true);
    setError("");
    setOutput(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      merged.setTitle("Merged PDF by Meaw Tools");
      merged.setCreator("Meaw Tools");
      let pageCount = 0;

      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
        const copiedPages = await merged.copyPages(source, source.getPageIndices());
        copiedPages.forEach((page) => merged.addPage(page));
        pageCount += copiedPages.length;
      }

      const bytes = await merged.save();
      const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
      const filename = "meaw-merged.pdf";
      const nextOutput = { blob, filename, pages: pageCount, files: files.length, bytes: blob.size };
      setOutput(nextOutput);
      downloadBlob(blob, filename);
      toast.success(`รวม ${files.length} ไฟล์เป็น PDF ${pageCount} หน้าแล้ว`);
    } catch (caught) {
      setError(friendlyPdfError(caught, "รวม PDF ไม่สำเร็จ"));
    } finally {
      setMerging(false);
    }
  };

  const loadExample = async () => {
    try {
      const samples = await Promise.all([createSamplePdf("Cafe Menu", 2), createSamplePdf("Tool List", 3, "pink")]);
      selectFiles(samples);
      toast.success("โหลด PDF ตัวอย่าง 2 ไฟล์แล้ว");
    } catch (caught) {
      setError(friendlyPdfError(caught, "สร้าง PDF ตัวอย่างไม่สำเร็จ"));
    }
  };

  return (
    <WorkspaceFrame>
      <div>
        <Label htmlFor="merge-pdf-files">เลือก PDF อย่างน้อย 2 ไฟล์</Label>
        <Input ref={inputRef} id="merge-pdf-files" type="file" accept="application/pdf,.pdf" multiple className="mt-2" onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} />
        <p className="mt-2 text-xs text-muted-foreground">สูงสุด {PDF_FILE_COUNT_LIMIT} ไฟล์ · ไฟล์ละ 30 MB · รวมไม่เกิน 60 MB</p>
      </div>

      <div className="mt-5">
        {files.length ? (
          <div className="overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3 text-sm"><span className="font-medium">ลำดับไฟล์ใน PDF ใหม่</span><span className="text-muted-foreground">{files.length} ไฟล์ · {formatPdfBytes(totalBytes)}</span></div>
            <ol className="max-h-80 divide-y overflow-y-auto">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                  <Files className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{formatPdfBytes(file.size)}</p></div>
                  <div className="flex gap-1"><Button size="icon-sm" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`เลื่อน ${file.name} ขึ้น`}><ArrowUp /></Button><Button size="icon-sm" variant="ghost" onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label={`เลื่อน ${file.name} ลง`}><ArrowDown /></Button><Button size="icon-sm" variant="ghost" onClick={() => { setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index)); setOutput(null); }} aria-label={`ลบ ${file.name}`}><Trash2 /></Button></div>
                </li>
              ))}
            </ol>
          </div>
        ) : <EmptyOutput size="compact" text="เลือก PDF หลายไฟล์ แล้วจัดลำดับก่อนรวม" />}
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-5"><ActionBar><Button onClick={() => void merge()} disabled={merging}><FileOutput className="size-4" />{merging ? "กำลังรวม PDF..." : "รวมและดาวน์โหลด PDF"}</Button><ExampleButton onExample={() => void loadExample()} /><ClearButton onClear={clear} /></ActionBar></div>

      {output ? <div data-testid="merge-pdf-output" className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5" aria-live="polite"><p className="font-semibold text-emerald-700 dark:text-emerald-300">รวม PDF สำเร็จ</p><p className="mt-1 text-sm text-muted-foreground">{output.files} ไฟล์ · {output.pages} หน้า · {formatPdfBytes(output.bytes)}</p><Button variant="outline" className="mt-4" onClick={() => downloadBlob(output.blob, output.filename)}><Download className="size-4" />ดาวน์โหลดอีกครั้ง</Button></div> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">ลำดับหน้าจะเรียงตามรายการด้านบน ฟอร์ม ลิงก์ และ bookmark บางชนิดอาจทำงานต่างจากไฟล์ต้นฉบับ ควรเปิดตรวจไฟล์ก่อนส่งงาน</p>
    </WorkspaceFrame>
  );
}

export function SplitPdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState("");
  const [reading, setReading] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<PdfOutput | null>(null);

  const clear = () => {
    selectionRef.current += 1;
    setFile(null);
    setPageCount(0);
    setRanges("");
    setOutput(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (nextFile: File) => {
    const selection = ++selectionRef.current;
    setReading(true);
    setError("");
    setOutput(null);
    try {
      validatePdfFile(nextFile);
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await nextFile.arrayBuffer(), { updateMetadata: false });
      const pages = source.getPageCount();
      if (selection !== selectionRef.current) return;
      setFile(nextFile);
      setPageCount(pages);
      setRanges(pages > 3 ? `1-3,4-${pages}` : pages > 1 ? `1-${pages}` : "1");
    } catch (caught) {
      if (selection !== selectionRef.current) return;
      setFile(null);
      setPageCount(0);
      setRanges("");
      setError(friendlyPdfError(caught, "อ่านไฟล์ PDF ไม่สำเร็จ"));
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      if (selection === selectionRef.current) setReading(false);
    }
  };

  const split = async () => {
    if (!file || !pageCount) { setError("กรุณาเลือกไฟล์ PDF"); return; }
    setSplitting(true);
    setError("");
    setOutput(null);
    try {
      const groups = parsePdfSplitRanges(ranges, pageCount);
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      const stem = pdfFileStem(file.name);
      const results: Array<{ filename: string; bytes: Uint8Array }> = [];
      let totalPages = 0;

      for (const group of groups) {
        const document = await PDFDocument.create();
        document.setTitle(`${stem} pages ${group.label}`);
        document.setCreator("Meaw Tools");
        const pages = await document.copyPages(source, group.pages);
        pages.forEach((page) => document.addPage(page));
        totalPages += pages.length;
        results.push({ filename: `${stem}-pages-${group.label}.pdf`, bytes: await document.save() });
      }

      let resultBlob: Blob;
      let resultName: string;
      if (results.length === 1) {
        resultBlob = new Blob([Uint8Array.from(results[0]!.bytes)], { type: "application/pdf" });
        resultName = results[0]!.filename;
      } else {
        const { zipSync } = await import("fflate");
        const entries = Object.fromEntries(results.map((result) => [result.filename, result.bytes]));
        resultBlob = new Blob([Uint8Array.from(zipSync(entries, { level: 0 }))], { type: "application/zip" });
        resultName = `${stem}-split.zip`;
      }

      const nextOutput = { blob: resultBlob, filename: resultName, pages: totalPages, files: results.length, bytes: resultBlob.size };
      setOutput(nextOutput);
      downloadBlob(resultBlob, resultName);
      toast.success(results.length === 1 ? "แยกและดาวน์โหลด PDF แล้ว" : `สร้าง ${results.length} PDF และดาวน์โหลด ZIP แล้ว`);
    } catch (caught) {
      setError(friendlyPdfError(caught, "แยก PDF ไม่สำเร็จ"));
    } finally {
      setSplitting(false);
    }
  };

  const loadExample = async () => {
    try {
      const sample = await createSamplePdf("Six Pages", 6);
      await selectFile(sample);
      toast.success("โหลด PDF ตัวอย่าง 6 หน้าแล้ว");
    } catch (caught) {
      setError(friendlyPdfError(caught, "สร้าง PDF ตัวอย่างไม่สำเร็จ"));
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)] lg:items-end">
        <div><Label htmlFor="split-pdf-file">เลือกไฟล์ PDF</Label><Input ref={inputRef} id="split-pdf-file" type="file" accept="application/pdf,.pdf" className="mt-2" onChange={(event) => { const nextFile = event.target.files?.[0]; if (nextFile) void selectFile(nextFile); }} /><p className="mt-2 text-xs text-muted-foreground">ไฟล์ไม่เกิน 30 MB · ไม่รองรับ PDF ที่ล็อกด้วยรหัสผ่าน</p></div>
        <div><Label htmlFor="split-pdf-ranges">แต่ละช่วงจะเป็น 1 ไฟล์</Label><Input id="split-pdf-ranges" value={ranges} disabled={!file} className="mt-2 font-mono" onChange={(event) => { setRanges(event.target.value); setOutput(null); }} placeholder="เช่น 1-3,4-6,8" /><p className="mt-2 text-xs text-muted-foreground">ใช้ comma คั่นแต่ละไฟล์ เช่น 1-3,4-6,8</p></div>
      </div>

      {reading ? <div className="mt-5 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">กำลังอ่านจำนวนหน้า PDF...</div> : null}
      {file ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.03] p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Scissors className="size-5" /></span><div className="min-w-0"><p className="truncate font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{pageCount} หน้า · {formatPdfBytes(file.size)}</p></div></div> : <div className="mt-5"><EmptyOutput size="compact" text="เลือก PDF แล้วระบุช่วงหน้าที่ต้องการแยก" /></div>}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5"><ActionBar><Button onClick={() => void split()} disabled={splitting || reading}><Scissors className="size-4" />{splitting ? "กำลังแยก PDF..." : "แยกและดาวน์โหลด PDF"}</Button><ExampleButton onExample={() => void loadExample()} /><ClearButton onClear={clear} /></ActionBar></div>
      {output ? <div data-testid="split-pdf-output" className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5" aria-live="polite"><p className="font-semibold text-emerald-700 dark:text-emerald-300">แยก PDF สำเร็จ</p><p className="mt-1 text-sm text-muted-foreground">{output.files} ไฟล์ · รวม {output.pages} หน้า · ดาวน์โหลดเป็น {output.files > 1 ? "ZIP" : "PDF"}</p><Button variant="outline" className="mt-4" onClick={() => downloadBlob(output.blob, output.filename)}><Download className="size-4" />ดาวน์โหลดอีกครั้ง</Button></div> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">แต่ละช่วงที่คั่นด้วย comma จะสร้างเป็น PDF คนละไฟล์ หากมีหลายช่วงระบบจะรวมผลลัพธ์เป็น ZIP โดยอัตโนมัติ</p>
    </WorkspaceFrame>
  );
}
