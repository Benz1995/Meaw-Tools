"use client";

import Image from "next/image";
import { FileImage, FileText, Languages, LoaderCircle, ScanText, ShieldCheck, Sparkles, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, DownloadButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type OcrLanguage,
  type OcrLayout,
  calculateOcrDimensions,
  countOcrLines,
  createOcrTextFilename,
  getOcrConfidenceLabel,
  getOcrLanguageCodes,
  getOcrProgressLabel,
  normalizeOcrText,
  validateOcrImageInput,
} from "@/lib/tools/image-to-text";
import { formatImageBytes, validateDecodedImage } from "@/lib/tools/images";

type ImageInfo = {
  file: File;
  width: number;
  height: number;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

const OCR_RUNTIME_ROOT = "/ocr-runtime/v7";

async function decodeImage(file: File): Promise<DecodedImage> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = document.createElement("img");
  image.decoding = "async";
  image.src = objectUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Browser ไม่สามารถอ่านไฟล์รูปนี้ได้")); };
  });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(objectUrl) };
}

function enhanceForOcr(context: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const grey = (pixels[index]! * 0.299) + (pixels[index + 1]! * 0.587) + (pixels[index + 2]! * 0.114);
    const contrasted = Math.max(0, Math.min(255, ((grey - 128) * 1.25) + 128));
    pixels[index] = contrasted;
    pixels[index + 1] = contrasted;
    pixels[index + 2] = contrasted;
    pixels[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
}

async function prepareOcrCanvas(file: File, enhance: boolean) {
  const decoded = await decodeImage(file);
  try {
    validateDecodedImage(decoded.width, decoded.height);
    const target = calculateOcrDimensions(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d", { willReadFrequently: enhance });
    if (!context) throw new Error("Browser ไม่รองรับ Canvas สำหรับเตรียมรูป OCR");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(decoded.source, 0, 0, target.width, target.height);
    if (enhance) enhanceForOcr(context, target.width, target.height);
    return canvas;
  } finally {
    decoded.close();
  }
}

function canvasToPngFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("สร้างรูปตัวอย่าง OCR ไม่สำเร็จ")); return; }
      resolve(new File([blob], name, { type: "image/png", lastModified: 0 }));
    }, "image/png");
  });
}

async function createOcrSampleFile() {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1_200;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ไม่รองรับ Canvas");

  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#72b784";
  context.lineWidth = 8;
  context.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);
  context.fillStyle = "#183329";
  context.font = '700 72px "Noto Sans Thai", sans-serif';
  context.fillText("MEAW TOOLS", 92, 150);
  context.font = '600 52px "Noto Sans Thai", sans-serif';
  context.fillText("แปลงรูปเป็นข้อความ", 92, 265);
  context.font = '500 46px "Noto Sans Thai", sans-serif';
  context.fillText("Image to Text OCR", 92, 375);
  context.fillText("Order No. 2026-0819", 92, 475);
  context.font = '400 34px "Noto Sans Thai", sans-serif';
  context.fillStyle = "#4f625b";
  context.fillText("ตรวจแก้ข้อความก่อนนำไปใช้งานทุกครั้ง", 92, 585);
  return canvasToPngFile(canvas, "meaw-image-to-text-example.png");
}

export function ImageToTextTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<import("tesseract.js").Worker | null>(null);
  const sessionRef = useRef(0);
  const selectionRef = useRef(0);

  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [language, setLanguage] = useState<OcrLanguage>("tha+eng");
  const [layout, setLayout] = useState<OcrLayout>("auto");
  const [enhance, setEnhance] = useState(false);
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("พร้อมอ่านข้อความ");
  const [error, setError] = useState("");

  const terminateWorker = useCallback(async () => {
    const worker = workerRef.current;
    workerRef.current = null;
    if (worker) await worker.terminate().catch(() => undefined);
  }, []);

  useEffect(() => () => {
    sessionRef.current += 1;
    void terminateWorker();
  }, [terminateWorker]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const resetResult = () => {
    setText("");
    setConfidence(null);
    setProgress(0);
    setProgressLabel("พร้อมอ่านข้อความ");
  };

  const selectFile = async (file: File) => {
    const selection = ++selectionRef.current;
    sessionRef.current += 1;
    await terminateWorker();
    setProcessing(false);
    setError("");
    resetResult();

    try {
      validateOcrImageInput(file.type, file.size);
    } catch (caught) {
      setImageInfo(null);
      setPreviewUrl("");
      setError(caught instanceof Error ? caught.message : "ไฟล์รูปไม่ถูกต้อง");
      return;
    }

    let decoded: DecodedImage | null = null;
    try {
      decoded = await decodeImage(file);
      validateDecodedImage(decoded.width, decoded.height);
      if (selection !== selectionRef.current) return;
      setImageInfo({ file, width: decoded.width, height: decoded.height });
      setPreviewUrl(URL.createObjectURL(file));
    } catch (caught) {
      if (selection !== selectionRef.current) return;
      setImageInfo(null);
      setPreviewUrl("");
      setError(caught instanceof Error ? caught.message : "อ่านไฟล์รูปไม่สำเร็จ");
    } finally {
      decoded?.close();
    }
  };

  const runOcr = async () => {
    if (!imageInfo) { setError("กรุณาเลือกรูปก่อนอ่านข้อความ"); return; }
    const session = ++sessionRef.current;
    await terminateWorker();
    setProcessing(true);
    setError("");
    resetResult();
    setProgressLabel("กำลังเตรียมรูป");

    let worker: import("tesseract.js").Worker | null = null;
    try {
      const canvas = await prepareOcrCanvas(imageInfo.file, enhance);
      const { createWorker, OEM, PSM } = await import("tesseract.js");
      if (session !== sessionRef.current) return;
      worker = await createWorker(getOcrLanguageCodes(language), OEM.LSTM_ONLY, {
        workerPath: `${OCR_RUNTIME_ROOT}/worker.min.js`,
        corePath: `${OCR_RUNTIME_ROOT}/core`,
        langPath: `${OCR_RUNTIME_ROOT}/languages`,
        workerBlobURL: false,
        logger: (message) => {
          if (session !== sessionRef.current) return;
          setProgress(Math.round(Math.max(0, Math.min(1, message.progress)) * 100));
          setProgressLabel(getOcrProgressLabel(message.status));
        },
      });
      if (session !== sessionRef.current) { await worker.terminate(); return; }
      workerRef.current = worker;
      await worker.setParameters({
        tessedit_pageseg_mode: layout === "sparse" ? PSM.SPARSE_TEXT : PSM.AUTO,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      const result = await worker.recognize(canvas, {}, {
        text: true,
        blocks: false,
        layoutBlocks: false,
        hocr: false,
        tsv: false,
        box: false,
        unlv: false,
        osd: false,
        pdf: false,
        imageColor: false,
        imageGrey: false,
        imageBinary: false,
        debug: false,
      });
      if (session !== sessionRef.current) return;
      const normalized = normalizeOcrText(result.data.text);
      if (!normalized) {
        setError("ไม่พบข้อความที่อ่านได้ ลองใช้รูปที่คมชัด ตัวอักษรใหญ่ขึ้น หรือสลับโหมดปรับภาพ");
        return;
      }
      setText(normalized);
      setConfidence(Math.round(result.data.confidence * 10) / 10);
      setProgress(100);
      setProgressLabel("อ่านข้อความสำเร็จ");
      toast.success("อ่านข้อความจากรูปสำเร็จ");
    } catch (caught) {
      if (session !== sessionRef.current) return;
      setError(caught instanceof Error ? caught.message : "OCR อ่านข้อความไม่สำเร็จ");
    } finally {
      if (workerRef.current === worker) workerRef.current = null;
      if (worker) await worker.terminate().catch(() => undefined);
      if (session === sessionRef.current) setProcessing(false);
    }
  };

  const cancelOcr = () => {
    sessionRef.current += 1;
    void terminateWorker();
    setProcessing(false);
    setProgress(0);
    setProgressLabel("ยกเลิกการอ่านข้อความแล้ว");
    toast.info("ยกเลิก OCR แล้ว");
  };

  const clear = () => {
    selectionRef.current += 1;
    sessionRef.current += 1;
    void terminateWorker();
    setImageInfo(null);
    setPreviewUrl("");
    setProcessing(false);
    setError("");
    resetResult();
    if (inputRef.current) inputRef.current.value = "";
  };

  const loadExample = async () => {
    try {
      await selectFile(await createOcrSampleFile());
      toast.success("โหลดรูปตัวอย่างแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สร้างรูปตัวอย่างไม่สำเร็จ");
    }
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><ScanText className="size-4 text-primary" /><h2 className="font-semibold">OCR รูปเป็นข้อความ</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">ภาษาไทยและอังกฤษ · โหลด OCR Runtime เมื่อเริ่มใช้</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">ประมวลผลใน Browser</span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)]">
        <section className="min-w-0 rounded-xl border bg-muted/10 p-4" aria-labelledby="ocr-input-title">
          <h3 id="ocr-input-title" className="text-sm font-semibold">รูปต้นฉบับ</h3>
          <div className="mt-4 space-y-2.5">
            <Label htmlFor="ocr-image-file">เลือกรูปที่มีข้อความ</Label>
            <Input ref={inputRef} id="ocr-image-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); }} />
            <p className="text-xs leading-5 text-muted-foreground">PNG, JPG หรือ WebP ไม่เกิน 10 MB และ 40 ล้านพิกเซล · รูปจะไม่ถูกอัปโหลด</p>
          </div>

          {previewUrl && imageInfo ? (
            <div className="mt-4 overflow-hidden rounded-xl border bg-white">
              <div className="relative h-64 sm:h-80"><Image src={previewUrl} alt="รูปต้นฉบับสำหรับ OCR" fill unoptimized sizes="(max-width: 1024px) 100vw, 45vw" className="object-contain p-3" /></div>
              <p className="border-t px-3 py-2 text-xs text-slate-600">{imageInfo.file.name} · {formatImageBytes(imageInfo.file.size)} · {imageInfo.width.toLocaleString("th-TH")} × {imageInfo.height.toLocaleString("th-TH")} px</p>
            </div>
          ) : <div className="mt-4"><EmptyOutput size="compact" text="เลือกรูปเอกสาร ป้าย เมนู หรือภาพหน้าจอที่เห็นตัวอักษรชัดเจน" /></div>}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="ocr-language">ภาษาในรูป</Label>
              <Select value={language} onValueChange={(value) => setLanguage(value as OcrLanguage)} disabled={processing}>
                <SelectTrigger id="ocr-language"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="tha+eng">ไทย + English</SelectItem><SelectItem value="tha">ภาษาไทย</SelectItem><SelectItem value="eng">English</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="ocr-layout">รูปแบบข้อความ</Label>
              <Select value={layout} onValueChange={(value) => setLayout(value as OcrLayout)} disabled={processing}>
                <SelectTrigger id="ocr-layout"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="auto">เอกสารทั่วไป</SelectItem><SelectItem value="sparse">ข้อความหลายตำแหน่ง</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <Button type="button" variant={enhance ? "secondary" : "outline"} aria-pressed={enhance} className="mt-4" onClick={() => setEnhance((value) => !value)} disabled={processing}><Sparkles className="size-4" />{enhance ? "ปรับภาพขาวดำแล้ว" : "ปรับภาพขาวดำ/เพิ่ม Contrast"}</Button>

          <div className="mt-4">
            {processing ? <Button type="button" variant="destructive" onClick={cancelOcr}><X className="size-4" />ยกเลิก OCR</Button> : <Button type="button" onClick={() => void runOcr()} disabled={!imageInfo}><ScanText className="size-4" />อ่านข้อความจากรูป</Button>}
          </div>

          {processing || progress > 0 ? (
            <div className="mt-4 rounded-xl border bg-background p-3" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 font-medium">{processing ? <LoaderCircle className="size-4 animate-spin text-primary" /> : <ShieldCheck className="size-4 text-primary" />}{progressLabel}</span><span>{progress}%</span></div>
              <div role="progressbar" aria-label="ความคืบหน้า OCR" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-xl border bg-background/70 p-4" aria-labelledby="ocr-result-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><h3 id="ocr-result-title" className="font-semibold">ข้อความที่อ่านได้</h3></div>
            {confidence !== null ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{getOcrConfidenceLabel(confidence)} · {confidence}%</span> : null}
          </div>

          {text ? (
            <div className="mt-4" data-testid="ocr-result">
              <div className="space-y-2.5">
                <Label htmlFor="ocr-result-text">ตรวจและแก้ข้อความก่อนนำไปใช้</Label>
                <Textarea id="ocr-result-text" value={text} onChange={(event) => setText(event.target.value)} className="min-h-80 resize-y font-mono text-sm leading-6" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{text.length.toLocaleString("th-TH")} ตัวอักษร</span><span>·</span><span>{countOcrLines(text).toLocaleString("th-TH")} บรรทัด</span></div>
              <div className="mt-4"><ActionBar><CopyButton value={text} label="คัดลอกข้อความ" /><DownloadButton value={text} filename={createOcrTextFilename(imageInfo?.file.name ?? "meaw-image.png")} /></ActionBar></div>
              <p className="mt-4 flex gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200"><TriangleAlert className="mt-0.5 size-4 shrink-0" />ค่า Confidence เป็นเพียงสัญญาณจาก OCR ไม่ใช่การรับรองความถูกต้อง ควรเทียบกับรูปต้นฉบับ โดยเฉพาะตัวเลข ยอดเงิน ชื่อ และข้อมูลสำคัญ</p>
            </div>
          ) : <div className="mt-4"><EmptyOutput text={processing ? "OCR กำลังอ่านข้อความจากรูป กรุณารอสักครู่" : "ผลลัพธ์จะแสดงที่นี่และแก้ไขได้ก่อนคัดลอกหรือดาวน์โหลด"} /></div>}
        </section>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

      <div className="mt-5"><ActionBar><ExampleButton onExample={() => void loadExample()} /><ClearButton onClear={clear} /></ActionBar></div>

      <div className="mt-5 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />รูปและข้อความประมวลผลใน Browser ของคุณ Meaw Tools ไม่อัปโหลดหรือบันทึกเนื้อหา และ Worker จะถูกปิดหลังจบงานหรือเมื่อกดยกเลิก</p>
        <p className="flex gap-2"><Languages className="mt-0.5 size-4 shrink-0 text-emerald-600" />ครั้งแรก Browser ดาวน์โหลด OCR Runtime และโมเดลไทย+อังกฤษจากเว็บไซต์นี้ประมาณ 8 MB จากนั้น Browser สามารถใช้ Cache เพื่อลดการดาวน์โหลดซ้ำ</p>
        <p className="flex gap-2 sm:col-span-2"><FileImage className="mt-0.5 size-4 shrink-0 text-amber-600" />รองรับเฉพาะรูปภาพ ยังไม่อ่าน PDF หรือลายมือ และผลลัพธ์อาจคลาดเคลื่อนเมื่อรูปเบลอ เอียง แสงไม่สม่ำเสมอ ตัวอักษรตกแต่ง หรือตารางซับซ้อน</p>
      </div>
    </WorkspaceFrame>
  );
}
