"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Download, FileOutput, GripVertical, Info, ListRestart, RotateCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PDF_ORGANIZER_PAGE_LIMIT,
  createPdfPagePlan,
  isPdfPagePlanChanged,
  movePdfPage,
  removePdfPage,
  reorderPdfPage,
  rotatePdfPage,
  type PdfPagePlan,
} from "@/lib/tools/pdf-organizer";
import { formatPdfBytes, pdfFileStem, validatePdfFile } from "@/lib/tools/pdf";

type PdfOrganizerOutput = { blob: Blob; filename: string; pages: number; bytes: number };

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

function friendlyPdfError(caught: unknown, fallback: string) {
  if (caught && typeof caught === "object" && "name" in caught) {
    if (caught.name === "PasswordException" || caught.name === "EncryptedPDFError") return "PDF มีรหัสผ่าน กรุณาปลดล็อกไฟล์ก่อนใช้งาน";
    if (caught.name === "InvalidPDFException") return "ไฟล์ PDF เสียหายหรือรูปแบบไม่ถูกต้อง";
  }
  return caught instanceof Error ? caught.message : fallback;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Browser ไม่สามารถสร้างตัวอย่างหน้า PDF ได้")), "image/jpeg", 0.82);
  });
}

async function renderPdfThumbnails(file: File, onProgress: (progress: number) => void) {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const urls: string[] = [];
  try {
    const document = await task.promise;
    const pageCount = document.numPages;
    createPdfPagePlan(pageCount);

    for (let index = 0; index < pageCount; index += 1) {
      const page = await document.getPage(index + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1, 280 / Math.max(baseViewport.width, baseViewport.height));
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Browser ไม่รองรับ Canvas");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      urls.push(URL.createObjectURL(await canvasToJpeg(canvas)));
      page.cleanup();
      onProgress(Math.round(((index + 1) / pageCount) * 100));
    }
    return { pageCount, urls };
  } catch (error) {
    urls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  } finally {
    await task.destroy();
  }
}

async function createOrganizerSamplePdf() {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  const colors = [rgb(0.9, 0.96, 0.88), rgb(0.99, 0.9, 0.9), rgb(0.9, 0.94, 0.99), rgb(0.98, 0.94, 0.8), rgb(0.94, 0.9, 0.98)];
  for (let index = 0; index < 5; index += 1) {
    const page = document.addPage([595 + index * 10, 842]);
    page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: colors[index] });
    page.drawText(`PAGE ${index + 1}`, { x: 60, y: 680, size: 52, font, color: rgb(0.18, 0.32, 0.24) });
    page.drawText("Meaw Tools PDF Organizer sample", { x: 60, y: 630, size: 16, color: rgb(0.32, 0.28, 0.24) });
  }
  const bytes = await document.save();
  return new File([Uint8Array.from(bytes)], "meaw-organizer-sample.pdf", { type: "application/pdf", lastModified: Date.now() });
}

function PageCard({
  page,
  position,
  total,
  previewUrl,
  onMove,
  onRotate,
  onRemove,
  onDragStart,
  onDrop,
}: {
  page: PdfPagePlan;
  position: number;
  total: number;
  previewUrl: string;
  onMove: (direction: -1 | 1) => void;
  onRotate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const sourcePage = page.sourceIndex + 1;
  return (
    <li
      data-testid="pdf-organizer-page"
      data-source-page={sourcePage}
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDrop(); }}
      className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2 border-b bg-muted/25 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5"><GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" /><span className="truncate text-xs font-semibold">ตำแหน่ง {position + 1}</span></div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">ต้นฉบับ {sourcePage}</span>
      </div>
      <div className="grid h-40 place-items-center overflow-hidden bg-muted/15 p-3">
        <Image
          unoptimized
          src={previewUrl}
          alt={`ตัวอย่างหน้าต้นฉบับ ${sourcePage}`}
          width={280}
          height={280}
          className="h-auto max-h-36 w-auto max-w-full rounded-sm border bg-white object-contain shadow-sm transition-transform duration-200"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        />
      </div>
      <div className="border-t p-2.5">
        <p className="mb-2 text-center text-[11px] text-muted-foreground">{page.rotation ? `หมุน ${page.rotation}°` : "ยังไม่หมุน"}</p>
        <div className="grid grid-cols-4 gap-1">
          <Button type="button" size="icon-sm" variant="ghost" className="w-full" disabled={position === 0} onClick={() => onMove(-1)} aria-label={`เลื่อนหน้าต้นฉบับ ${sourcePage} ขึ้น`} title="เลื่อนขึ้น"><ArrowLeft /></Button>
          <Button type="button" size="icon-sm" variant="ghost" className="w-full" disabled={position === total - 1} onClick={() => onMove(1)} aria-label={`เลื่อนหน้าต้นฉบับ ${sourcePage} ลง`} title="เลื่อนลง"><ArrowRight /></Button>
          <Button type="button" size="icon-sm" variant="ghost" className="w-full" onClick={onRotate} aria-label={`หมุนหน้าต้นฉบับ ${sourcePage} ตามเข็ม`} title="หมุนตามเข็ม"><RotateCw /></Button>
          <Button type="button" size="icon-sm" variant="destructive" className="w-full" disabled={total === 1} onClick={onRemove} aria-label={`ลบหน้าต้นฉบับ ${sourcePage}`} title="ลบหน้า"><Trash2 /></Button>
        </div>
      </div>
    </li>
  );
}

export function PdfOrganizerTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef(0);
  const previewUrlsRef = useRef<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPagePlan[]>([]);
  const [originalPageCount, setOriginalPageCount] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState("");
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<PdfOrganizerOutput | null>(null);

  const replacePreviewUrls = (nextUrls: string[]) => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = nextUrls;
    setPreviewUrls(nextUrls);
  };

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const clear = () => {
    selectionRef.current += 1;
    replacePreviewUrls([]);
    setFile(null);
    setPages([]);
    setOriginalPageCount(0);
    setDraggedId("");
    setReading(false);
    setProcessing(false);
    setProgress(0);
    setError("");
    setOutput(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (nextFile: File) => {
    const selection = ++selectionRef.current;
    replacePreviewUrls([]);
    setFile(null);
    setPages([]);
    setOriginalPageCount(0);
    setReading(true);
    setProcessing(false);
    setProgress(0);
    setError("");
    setOutput(null);
    try {
      validatePdfFile(nextFile);
      const rendered = await renderPdfThumbnails(nextFile, (nextProgress) => {
        if (selection === selectionRef.current) setProgress(nextProgress);
      });
      if (selection !== selectionRef.current) {
        rendered.urls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      const plan = createPdfPagePlan(rendered.pageCount);
      previewUrlsRef.current = rendered.urls;
      setPreviewUrls(rendered.urls);
      setFile(nextFile);
      setPages(plan);
      setOriginalPageCount(rendered.pageCount);
      return true;
    } catch (caught) {
      if (selection !== selectionRef.current) return false;
      setError(friendlyPdfError(caught, "อ่านไฟล์ PDF ไม่สำเร็จ"));
      if (inputRef.current) inputRef.current.value = "";
      return false;
    } finally {
      if (selection === selectionRef.current) setReading(false);
    }
  };

  const loadExample = async () => {
    try {
      const loaded = await selectFile(await createOrganizerSamplePdf());
      if (loaded) toast.success("โหลด PDF ตัวอย่าง 5 หน้าแล้ว");
    } catch (caught) {
      setError(friendlyPdfError(caught, "สร้าง PDF ตัวอย่างไม่สำเร็จ"));
    }
  };

  const resetPlan = () => {
    if (!originalPageCount) return;
    setPages(createPdfPagePlan(originalPageCount));
    setOutput(null);
    setError("");
    toast.info("คืนลำดับและการหมุนกลับเป็นต้นฉบับแล้ว");
  };

  const organize = async () => {
    if (!file || !pages.length) { setError("กรุณาเลือกไฟล์ PDF"); return; }
    const selection = selectionRef.current;
    setProcessing(true);
    setError("");
    setOutput(null);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const source = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      const organized = await PDFDocument.create();
      const stem = pdfFileStem(file.name);
      organized.setTitle(`${stem} organized`);
      organized.setCreator("Meaw Tools");

      for (const plannedPage of pages) {
        const [copiedPage] = await organized.copyPages(source, [plannedPage.sourceIndex]);
        if (!copiedPage) throw new Error("คัดลอกหน้า PDF ไม่สำเร็จ");
        const finalRotation = (copiedPage.getRotation().angle + plannedPage.rotation) % 360;
        copiedPage.setRotation(degrees(finalRotation));
        organized.addPage(copiedPage);
      }

      const bytes = await organized.save();
      const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
      const filename = `${stem}-organized.pdf`;
      const nextOutput = { blob, filename, pages: pages.length, bytes: blob.size };
      if (selection !== selectionRef.current) return;
      setOutput(nextOutput);
      downloadBlob(blob, filename);
      toast.success(`จัดหน้า PDF สำเร็จ ${pages.length} หน้า`);
    } catch (caught) {
      if (selection === selectionRef.current) setError(friendlyPdfError(caught, "จัดหน้า PDF ไม่สำเร็จ"));
    } finally {
      if (selection === selectionRef.current) setProcessing(false);
    }
  };

  const removedCount = Math.max(0, originalPageCount - pages.length);
  const rotatedCount = pages.filter((page) => page.rotation !== 0).length;
  const changed = isPdfPagePlanChanged(pages, originalPageCount);

  return (
    <WorkspaceFrame>
      <Alert className="mb-5 border-sky-500/30 bg-sky-500/5">
        <ShieldCheck className="text-sky-600" />
        <AlertTitle>PDF อยู่ใน Browser ของคุณตลอดการทำงาน</AlertTitle>
        <AlertDescription>เลือกไฟล์แล้วลากหรือใช้ปุ่มเพื่อเรียง หมุน และลบหน้า ระบบจะสร้างไฟล์ใหม่โดยไม่อัปโหลดเอกสารไป Server</AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Label htmlFor="pdf-organizer-file">เลือกไฟล์ PDF ที่ต้องการจัดหน้า</Label>
        <Input ref={inputRef} id="pdf-organizer-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { const nextFile = event.target.files?.[0]; if (nextFile) void selectFile(nextFile); }} />
        <p className="text-xs leading-5 text-muted-foreground">ไฟล์ไม่เกิน 30 MB · สูงสุด {PDF_ORGANIZER_PAGE_LIMIT} หน้า · ไม่รองรับ PDF ที่ล็อกด้วยรหัสผ่าน</p>
      </div>

      {reading ? (
        <div className="mt-5 rounded-xl border bg-muted/20 p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm"><span>กำลังสร้างตัวอย่างหน้า PDF...</span><span className="font-mono tabular-nums">{progress}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
        </div>
      ) : null}

      {file && pages.length ? (
        <div className="mt-5" data-testid="pdf-organizer-workspace">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{pages.length} หน้า · ลบ {removedCount} · หมุน {rotatedCount} · {formatPdfBytes(file.size)}</p></div>
            <Button type="button" variant="outline" size="sm" onClick={resetPlan} disabled={!changed}><ListRestart />คืนค่าเดิม</Button>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0 text-primary" />ลากการ์ดเพื่อเรียงอย่างรวดเร็ว หรือใช้ปุ่มลูกศรใต้แต่ละหน้าเพื่อรองรับมือถือและคีย์บอร์ด</p>
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {pages.map((page, position) => (
              <PageCard
                key={page.id}
                page={page}
                position={position}
                total={pages.length}
                previewUrl={previewUrls[page.sourceIndex]!}
                onMove={(direction) => { setPages((current) => movePdfPage(current, page.id, direction)); setOutput(null); }}
                onRotate={() => { setPages((current) => rotatePdfPage(current, page.id)); setOutput(null); }}
                onRemove={() => { setPages((current) => current.length > 1 ? removePdfPage(current, page.id) : current); setOutput(null); }}
                onDragStart={() => setDraggedId(page.id)}
                onDrop={() => { if (draggedId) setPages((current) => reorderPdfPage(current, draggedId, page.id)); setDraggedId(""); setOutput(null); }}
              />
            ))}
          </ol>
        </div>
      ) : !reading ? <div className="mt-5"><EmptyOutput size="compact" text="เลือก PDF เพื่อดูตัวอย่างและเริ่มจัดหน้า" /></div> : null}

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5 border-t pt-5">
        <ActionBar>
          <Button type="button" onClick={() => void organize()} disabled={processing || reading}><FileOutput className="size-4" />{processing ? "กำลังสร้าง PDF..." : "จัดหน้าและดาวน์โหลด PDF"}</Button>
          <ExampleButton onExample={() => void loadExample()} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {output ? (
        <div data-testid="pdf-organizer-output" className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5" aria-live="polite">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">จัดหน้า PDF สำเร็จ</p>
          <p className="mt-1 text-sm text-muted-foreground">{output.pages} หน้า · {formatPdfBytes(output.bytes)} · สร้างเป็นไฟล์ใหม่แล้ว</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => downloadBlob(output.blob, output.filename)}><Download className="size-4" />ดาวน์โหลดอีกครั้ง</Button>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">การแก้ไข PDF ที่มีลายเซ็นดิจิทัลอาจทำให้ลายเซ็นไม่ผ่านการตรวจสอบ และฟอร์ม bookmark หรือลิงก์บางชนิดอาจเปลี่ยนแปลง ควรเปิดตรวจไฟล์ใหม่ก่อนส่งงาน</p>
    </WorkspaceFrame>
  );
}
