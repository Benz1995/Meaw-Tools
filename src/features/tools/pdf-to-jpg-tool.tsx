"use client";

import Image from "next/image";
import { Download, FileImage, FileOutput, Images, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PDF_RENDER_PAGE_LIMIT,
  formatPdfBytes,
  parsePdfPageSelection,
  pdfFileStem,
  validatePdfFile,
} from "@/lib/tools/pdf";

type PdfInfo = { file: File; pages: number };
type PdfImageOutput = {
  blob: Blob;
  filename: string;
  preview: Blob;
  pages: number;
  totalBytes: number;
  width: number;
  height: number;
};

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Browser ไม่สามารถสร้างไฟล์ JPG ได้")),
      "image/jpeg",
      quality,
    );
  });
}

function friendlyPdfError(caught: unknown, fallback: string) {
  if (caught && typeof caught === "object" && "name" in caught) {
    if (caught.name === "PasswordException") return "PDF มีรหัสผ่าน กรุณาปลดล็อกไฟล์ก่อนใช้งาน";
    if (caught.name === "InvalidPDFException") return "ไฟล์ PDF เสียหายหรือรูปแบบไม่ถูกต้อง";
  }
  return caught instanceof Error ? caught.message : fallback;
}

async function createSamplePdf() {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  for (let index = 0; index < 3; index += 1) {
    const page = document.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.98, 0.95 - index * 0.03, 0.88) });
    page.drawText(`Meaw Tools — Sample page ${index + 1}`, { x: 62, y: 700, size: 28, font, color: rgb(0.18, 0.4, 0.25) });
    page.drawText("Local PDF to JPG conversion", { x: 62, y: 650, size: 16, color: rgb(0.3, 0.25, 0.2) });
  }
  const bytes = await document.save();
  return new File([Uint8Array.from(bytes)], "meaw-sample.pdf", { type: "application/pdf", lastModified: Date.now() });
}

export function PdfToJpgTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef(0);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [pageSelection, setPageSelection] = useState("1");
  const [scale, setScale] = useState(1.5);
  const [quality, setQuality] = useState(90);
  const [loadingFile, setLoadingFile] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<PdfImageOutput | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const clearOutput = () => {
    setOutput(null);
    setPreviewUrl("");
    setProgress(0);
  };

  const clear = () => {
    selectionRef.current += 1;
    setPdfInfo(null);
    setPageSelection("1");
    setError("");
    clearOutput();
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (file: File) => {
    const selection = ++selectionRef.current;
    setLoadingFile(true);
    setError("");
    clearOutput();
    try {
      validatePdfFile(file);
      const pdfjs = await loadPdfJs();
      const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const document = await task.promise;
      const pages = document.numPages;
      await task.destroy();
      if (selection !== selectionRef.current) return;
      setPdfInfo({ file, pages });
      setPageSelection(pages <= PDF_RENDER_PAGE_LIMIT ? `1-${pages}` : `1-${PDF_RENDER_PAGE_LIMIT}`);
    } catch (caught) {
      if (selection !== selectionRef.current) return;
      setPdfInfo(null);
      setError(friendlyPdfError(caught, "อ่านไฟล์ PDF ไม่สำเร็จ"));
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      if (selection === selectionRef.current) setLoadingFile(false);
    }
  };

  const loadExample = async () => {
    try {
      const file = await createSamplePdf();
      await selectFile(file);
      toast.success("โหลด PDF ตัวอย่างแล้ว");
    } catch (caught) {
      setError(friendlyPdfError(caught, "สร้าง PDF ตัวอย่างไม่สำเร็จ"));
    }
  };

  const convert = async () => {
    if (!pdfInfo) { setError("กรุณาเลือกไฟล์ PDF"); return; }
    setConverting(true);
    setError("");
    clearOutput();
    let destroyTask: (() => Promise<void>) | null = null;
    try {
      const selectedPages = parsePdfPageSelection(pageSelection, pdfInfo.pages);
      const pdfjs = await loadPdfJs();
      const task = pdfjs.getDocument({ data: new Uint8Array(await pdfInfo.file.arrayBuffer()) });
      destroyTask = () => task.destroy();
      const document = await task.promise;
      const images: Array<{ filename: string; blob: Blob; width: number; height: number }> = [];
      const stem = pdfFileStem(pdfInfo.file.name);

      for (let index = 0; index < selectedPages.length; index += 1) {
        const pageNumber = selectedPages[index]! + 1;
        const page = await document.getPage(pageNumber);
        const initialViewport = page.getViewport({ scale });
        const dimensionScale = Math.min(1, 4_096 / Math.max(initialViewport.width, initialViewport.height));
        const viewport = page.getViewport({ scale: scale * dimensionScale });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Browser ไม่รองรับ Canvas");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await canvasToJpeg(canvas, quality / 100);
        images.push({ filename: `${stem}-page-${pageNumber}.jpg`, blob, width: canvas.width, height: canvas.height });
        page.cleanup();
        setProgress(Math.round(((index + 1) / selectedPages.length) * 100));
      }

      const totalBytes = images.reduce((sum, image) => sum + image.blob.size, 0);
      let resultBlob: Blob;
      let resultName: string;
      if (images.length === 1) {
        resultBlob = images[0]!.blob;
        resultName = images[0]!.filename;
      } else {
        const { zipSync } = await import("fflate");
        const entries: Record<string, Uint8Array> = {};
        for (const image of images) entries[image.filename] = new Uint8Array(await image.blob.arrayBuffer());
        resultBlob = new Blob([Uint8Array.from(zipSync(entries, { level: 0 }))], { type: "application/zip" });
        resultName = `${stem}-jpg-pages.zip`;
      }

      const nextOutput = {
        blob: resultBlob,
        filename: resultName,
        preview: images[0]!.blob,
        pages: images.length,
        totalBytes,
        width: images[0]!.width,
        height: images[0]!.height,
      };
      setOutput(nextOutput);
      setPreviewUrl(URL.createObjectURL(nextOutput.preview));
      downloadBlob(resultBlob, resultName);
      toast.success(images.length === 1 ? "แปลงและดาวน์โหลด JPG แล้ว" : `แปลง ${images.length} หน้าและดาวน์โหลด ZIP แล้ว`);
    } catch (caught) {
      setError(friendlyPdfError(caught, "แปลง PDF เป็น JPG ไม่สำเร็จ"));
      clearOutput();
    } finally {
      if (destroyTask) await destroyTask();
      setConverting(false);
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem_11rem]">
        <div>
          <Label htmlFor="pdf-jpg-file">เลือกไฟล์ PDF</Label>
          <Input ref={inputRef} id="pdf-jpg-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); }} />
          <p className="mt-2 text-xs text-muted-foreground">สูงสุด 30 MB · ประมวลผลไม่เกิน {PDF_RENDER_PAGE_LIMIT} หน้าต่อครั้ง</p>
        </div>
        <div>
          <Label htmlFor="pdf-jpg-scale">ความละเอียด</Label>
          <Select value={String(scale)} onValueChange={(value) => { setScale(Number(value)); clearOutput(); }}><SelectTrigger id="pdf-jpg-scale" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">มาตรฐาน · 1×</SelectItem><SelectItem value="1.5">คมชัด · 1.5×</SelectItem><SelectItem value="2">สูง · 2×</SelectItem></SelectContent></Select>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2"><Label htmlFor="pdf-jpg-quality">คุณภาพ JPG</Label><span className="text-sm font-semibold text-primary">{quality}%</span></div>
          <input id="pdf-jpg-quality" type="range" min={50} max={100} step={5} value={quality} onChange={(event) => { setQuality(Number(event.target.value)); clearOutput(); }} className="mt-3 h-2 w-full cursor-pointer accent-primary" />
        </div>
      </div>

      {loadingFile ? <div className="mt-5 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">กำลังอ่านจำนวนหน้า PDF...</div> : null}
      {pdfInfo ? (
        <div className="mt-5 grid gap-4 rounded-xl border border-primary/15 bg-primary/[0.03] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)] sm:items-end">
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileImage className="size-5" /></span><div className="min-w-0"><p className="truncate font-medium">{pdfInfo.file.name}</p><p className="mt-1 text-xs text-muted-foreground">{pdfInfo.pages} หน้า · {formatPdfBytes(pdfInfo.file.size)}</p></div></div>
          <div><Label htmlFor="pdf-jpg-pages">หน้าที่ต้องการ</Label><Input id="pdf-jpg-pages" value={pageSelection} onChange={(event) => { setPageSelection(event.target.value); clearOutput(); }} placeholder="เช่น 1,3-5 หรือ all" /><p className="mt-2 text-xs text-muted-foreground">ใช้ comma คั่น เช่น 1,3-5</p></div>
        </div>
      ) : <div className="mt-5"><EmptyOutput size="compact" text="เลือก PDF หรือกดตัวอย่าง เพื่อแปลงแต่ละหน้าเป็น JPG" /></div>}

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {converting ? <div className="mt-4" role="progressbar" aria-label="ความคืบหน้าการแปลง PDF" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>กำลัง render ทีละหน้า</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div></div> : null}

      <div className="mt-5"><ActionBar><Button onClick={() => void convert()} disabled={converting || loadingFile}><FileOutput className="size-4" />{converting ? "กำลังแปลง..." : "แปลงและดาวน์โหลด JPG"}</Button><ExampleButton onExample={() => void loadExample()} /><ClearButton onClear={clear} /></ActionBar></div>

      {output && previewUrl ? (
        <div data-testid="pdf-jpg-output" className="mt-5 overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.03]" aria-live="polite">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="relative min-h-60 border-b bg-muted/20 lg:border-r lg:border-b-0"><Image src={previewUrl} alt="ตัวอย่างหน้าแรกที่แปลงเป็น JPG" fill unoptimized sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-4" /></div>
            <div className="p-5"><div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><p className="font-semibold">พร้อมดาวน์โหลด</p></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">จำนวน</dt><dd className="mt-1 font-semibold">{output.pages} หน้า</dd></div><div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">รวม JPG</dt><dd className="mt-1 font-semibold">{formatPdfBytes(output.totalBytes)}</dd></div><div className="col-span-2 rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">ขนาดหน้าแรก</dt><dd className="mt-1 font-semibold">{output.width.toLocaleString("th-TH")} × {output.height.toLocaleString("th-TH")} px</dd></div></dl><Button className="mt-4 w-full" onClick={() => downloadBlob(output.blob, output.filename)} aria-label={`ดาวน์โหลด ${output.filename}`}><Download className="size-4" />ดาวน์โหลดอีกครั้ง</Button></div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Images className="mt-0.5 size-4 shrink-0" /><p>PDF หลายหน้าจะดาวน์โหลดเป็น ZIP ภาพถูก render ใหม่และไม่เก็บข้อความที่เลือกได้ ลิงก์ หรือ metadata ของ PDF เดิม</p></div>
    </WorkspaceFrame>
  );
}
