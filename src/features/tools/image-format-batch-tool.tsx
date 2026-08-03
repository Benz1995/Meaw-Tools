"use client";

import { Archive, CheckCircle2, Download, FileImage, ImageDown, Images, LoaderCircle, ShieldCheck, Trash2, TriangleAlert, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canvasToImageBlob, decodeBrowserImage } from "@/lib/tools/image-browser";
import {
  type BatchImageOutputMime,
  createBatchImageOutputNames,
  detectBatchImageMime,
  getBatchImageExtension,
  validateBatchImageFiles,
  validateBatchOutputPixels,
} from "@/lib/tools/image-batch";
import { calculateSavingPercent, fitImageWithin, formatImageBytes, validateDecodedImage } from "@/lib/tools/images";

type BatchStatus = "ready" | "processing" | "done" | "error";
type BatchItem = { id: string; file: File; width: number; height: number; status: BatchStatus; error?: string };
type BatchOutput = {
  id: string;
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  originalBytes: number;
  savingPercent: number;
};

const OUTPUT_FORMATS: Array<{ value: BatchImageOutputMime; label: string; hint: string }> = [
  { value: "image/png", label: "PNG", hint: "คงพื้นโปร่งใส · เหมาะกับกราฟิก" },
  { value: "image/webp", label: "WebP", hint: "ไฟล์เล็ก · เหมาะกับเว็บไซต์" },
  { value: "image/jpeg", label: "JPG", hint: "รองรับทั่วไป · ไม่มีพื้นโปร่งใส" },
];

const OUTPUT_SIZE_OPTIONS = [
  { value: "0", label: "ขนาดต้นฉบับ — ไม่ย่อรูป" },
  { value: "4096", label: "ด้านยาวสูงสุด 4096 px" },
  { value: "2560", label: "ด้านยาวสูงสุด 2560 px" },
  { value: "1920", label: "ด้านยาวสูงสุด 1920 px — เว็บ/โซเชียล" },
] as const;

function getTargetDimensions(item: Pick<BatchItem, "width" | "height">, maxEdge: number) {
  return maxEdge > 0 ? fitImageWithin(item.width, item.height, maxEdge, maxEdge) : { width: item.width, height: item.height };
}

function friendlyBatchError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "แปลงรูปไม่สำเร็จ";
  if (/memory|allocation|out of bounds/i.test(message)) return "หน่วยความจำไม่พอสำหรับรูปนี้ ลองลดขนาดด้านยาว ปิดแท็บอื่น หรือลดจำนวนไฟล์";
  if (/decode|decoding|อ่านไฟล์|image source/i.test(message)) return "อ่านรูปนี้ไม่สำเร็จ ไฟล์อาจเสียหรือใช้รูปแบบที่ Browser ยังไม่รองรับ";
  return message;
}

async function createSampleFiles() {
  const photoCanvas = document.createElement("canvas");
  photoCanvas.width = 1_200;
  photoCanvas.height = 800;
  const photoContext = photoCanvas.getContext("2d", { alpha: false });
  if (!photoContext) throw new Error("Browser ไม่รองรับ Canvas");
  const gradient = photoContext.createLinearGradient(0, 0, 1_200, 800);
  gradient.addColorStop(0, "#f4b860");
  gradient.addColorStop(1, "#0f9f8f");
  photoContext.fillStyle = gradient;
  photoContext.fillRect(0, 0, 1_200, 800);
  photoContext.fillStyle = "rgba(255,255,255,.92)";
  photoContext.font = "700 72px sans-serif";
  photoContext.fillText("Meaw Cafe", 80, 680);

  const stickerCanvas = document.createElement("canvas");
  stickerCanvas.width = 640;
  stickerCanvas.height = 640;
  const stickerContext = stickerCanvas.getContext("2d");
  if (!stickerContext) throw new Error("Browser ไม่รองรับ Canvas");
  stickerContext.fillStyle = "#fff4db";
  stickerContext.beginPath();
  stickerContext.arc(320, 340, 210, 0, Math.PI * 2);
  stickerContext.fill();
  stickerContext.fillStyle = "#8b5e3c";
  stickerContext.beginPath();
  stickerContext.moveTo(180, 200);
  stickerContext.lineTo(240, 70);
  stickerContext.lineTo(300, 210);
  stickerContext.moveTo(340, 210);
  stickerContext.lineTo(400, 70);
  stickerContext.lineTo(460, 200);
  stickerContext.fill();
  stickerContext.font = "700 46px sans-serif";
  stickerContext.fillText("MEAW", 245, 380);

  const [photoBlob, stickerBlob] = await Promise.all([
    canvasToImageBlob(photoCanvas, "image/jpeg", 0.9),
    canvasToImageBlob(stickerCanvas, "image/png", 1),
  ]);
  return [
    new File([photoBlob], "meaw-cafe.jpg", { type: "image/jpeg", lastModified: Date.now() }),
    new File([stickerBlob], "meaw-sticker.png", { type: "image/png", lastModified: Date.now() }),
  ];
}

export function ImageFormatBatchTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [outputs, setOutputs] = useState<BatchOutput[]>([]);
  const [outputMime, setOutputMime] = useState<BatchImageOutputMime>("image/png");
  const [maxEdge, setMaxEdge] = useState(0);
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState("#ffffff");
  const [adding, setAdding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  const resetOutputs = () => {
    setOutputs([]);
    setItems((current) => current.map((item) => ({ ...item, status: "ready", error: undefined })));
    setProgress({ current: 0, total: 0 });
    setError("");
  };

  const selectFiles = async (files: File[]) => {
    const generation = ++generationRef.current;
    setAdding(true);
    setProcessing(false);
    setItems([]);
    setOutputs([]);
    setProgress({ current: 0, total: 0 });
    setError("");
    try {
      validateBatchImageFiles(files);
      const nextItems: BatchItem[] = [];
      for (const file of files) {
        const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
        if (!detectBatchImageMime(header)) throw new Error(`${file.name} ไม่ใช่ไฟล์ JPG, PNG หรือ WebP จริง`);
        const decoded = await decodeBrowserImage(file);
        try {
          validateDecodedImage(decoded.width, decoded.height);
          nextItems.push({ id: crypto.randomUUID(), file, width: decoded.width, height: decoded.height, status: "ready" });
        } finally {
          decoded.close();
        }
        if (generation !== generationRef.current) return false;
      }
      if (generation !== generationRef.current) return false;
      setItems(nextItems);
      return true;
    } catch (caught) {
      if (generation !== generationRef.current) return false;
      setError(friendlyBatchError(caught));
      if (inputRef.current) inputRef.current.value = "";
      return false;
    } finally {
      if (mountedRef.current && generation === generationRef.current) setAdding(false);
    }
  };

  const loadExample = async () => {
    try {
      if (await selectFiles(await createSampleFiles())) toast.success("โหลดรูปตัวอย่าง 2 ไฟล์แล้ว");
    } catch (caught) {
      setError(friendlyBatchError(caught));
    }
  };

  const removeItem = (id: string) => {
    if (processing || adding) return;
    setItems((current) => current.filter((item) => item.id !== id));
    setOutputs([]);
    setProgress({ current: 0, total: 0 });
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const clear = () => {
    generationRef.current += 1;
    setItems([]);
    setOutputs([]);
    setAdding(false);
    setProcessing(false);
    setDragActive(false);
    setProgress({ current: 0, total: 0 });
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const cancel = () => {
    generationRef.current += 1;
    setProcessing(false);
    setItems((current) => current.map((item) => item.status === "processing" ? { ...item, status: "ready" } : item));
    setError("ยกเลิกการแปลงแล้ว ผลลัพธ์ที่ทำเสร็จก่อนหน้ายังดาวน์โหลดได้");
  };

  const convert = async () => {
    if (!items.length) {
      setError("กรุณาเลือกไฟล์ JPG, PNG หรือ WebP");
      return;
    }
    if (!/^#[0-9a-f]{6}$/i.test(background)) {
      setError("สีพื้นหลังต้องเป็นรหัสสี Hex 6 หลัก");
      return;
    }

    const targets = items.map((item) => getTargetDimensions(item, maxEdge));
    try {
      validateBatchOutputPixels(targets);
    } catch (caught) {
      setError(friendlyBatchError(caught));
      return;
    }

    const generation = ++generationRef.current;
    const filenames = createBatchImageOutputNames(items.map((item) => item.file.name), outputMime);
    const nextOutputs: BatchOutput[] = [];
    setOutputs([]);
    setError("");
    setProcessing(true);
    setProgress({ current: 0, total: items.length });
    setItems((current) => current.map((item) => ({ ...item, status: "ready", error: undefined })));

    for (let index = 0; index < items.length; index += 1) {
      if (generation !== generationRef.current) break;
      const item = items[index]!;
      const target = targets[index]!;
      setProgress({ current: index + 1, total: items.length });
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "processing", error: undefined } : candidate));
      let decoded: Awaited<ReturnType<typeof decodeBrowserImage>> | null = null;
      try {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        decoded = await decodeBrowserImage(item.file);
        validateDecodedImage(decoded.width, decoded.height);
        if (generation !== generationRef.current) break;

        const canvas = document.createElement("canvas");
        canvas.width = target.width;
        canvas.height = target.height;
        const context = canvas.getContext("2d", { alpha: outputMime !== "image/jpeg" });
        if (!context) throw new Error("Browser ไม่รองรับ Canvas สำหรับแปลงรูป");
        if (outputMime === "image/jpeg") {
          context.fillStyle = background;
          context.fillRect(0, 0, target.width, target.height);
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(decoded.source, 0, 0, target.width, target.height);
        const blob = await canvasToImageBlob(canvas, outputMime, quality / 100);
        if (generation !== generationRef.current) break;

        nextOutputs.push({
          id: item.id,
          blob,
          filename: filenames[index]!,
          width: target.width,
          height: target.height,
          originalBytes: item.file.size,
          savingPercent: calculateSavingPercent(item.file.size, blob.size),
        });
        setOutputs([...nextOutputs]);
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "done" } : candidate));
      } catch (caught) {
        if (generation !== generationRef.current) break;
        const itemError = friendlyBatchError(caught);
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "error", error: itemError } : candidate));
      } finally {
        decoded?.close();
      }
    }

    if (generation === generationRef.current) {
      setProcessing(false);
      const failed = items.length - nextOutputs.length;
      if (nextOutputs.length) toast.success(`แปลงสำเร็จ ${nextOutputs.length} รูป${failed ? ` · ไม่สำเร็จ ${failed}` : ""}`);
      else setError("ไม่สามารถแปลงไฟล์ที่เลือกได้ กรุณาตรวจไฟล์และลองใหม่");
    }
  };

  const downloadAll = async () => {
    if (!outputs.length) return;
    if (outputs.length === 1) {
      downloadBlob(outputs[0]!.blob, outputs[0]!.filename);
      toast.success("ดาวน์โหลดรูปแล้ว");
      return;
    }
    const { zipSync } = await import("fflate");
    const entries = Object.fromEntries(await Promise.all(outputs.map(async (output) => [output.filename, new Uint8Array(await output.blob.arrayBuffer())] as const)));
    const zip = zipSync(entries, { level: 0 });
    downloadBlob(new Blob([Uint8Array.from(zip)], { type: "application/zip" }), `meaw-images-${getBatchImageExtension(outputMime)}.zip`);
    toast.success(`ดาวน์โหลด ZIP ${outputs.length} รูปแล้ว`);
  };

  const totalInputBytes = items.reduce((sum, item) => sum + item.file.size, 0);
  const totalOutputBytes = outputs.reduce((sum, output) => sum + output.blob.size, 0);
  const processedInputBytes = outputs.reduce((sum, output) => sum + output.originalBytes, 0);
  const totalSavingPercent = calculateSavingPercent(processedInputBytes, totalOutputBytes);
  const failedCount = items.filter((item) => item.status === "error").length;
  const settledCount = items.filter((item) => item.status === "done" || item.status === "error").length;
  const progressPercent = items.length ? Math.round((settledCount / items.length) * 100) : 0;
  const selectedFormat = OUTPUT_FORMATS.find((format) => format.value === outputMime) ?? OUTPUT_FORMATS[0]!;
  const busy = adding || processing;

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Images className="size-4 text-primary" /><h2 className="font-semibold">แปลงไฟล์รูปหลายรูปพร้อมกัน</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">เลือก JPG, PNG หรือ WebP แล้วแปลงเป็นรูปแบบเดียวกันทั้งชุด</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">ไม่อัปโหลดรูป</span>
      </div>

      <section className="mt-5 space-y-2.5" aria-labelledby="batch-image-input-title">
        <Label id="batch-image-input-title" htmlFor="batch-image-files">ไฟล์รูปที่ต้องการแปลง</Label>
        <input
          ref={inputRef}
          id="batch-image-files"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(event) => void selectFiles(Array.from(event.target.files ?? []))}
        />
        <label
          htmlFor="batch-image-files"
          onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragActive(true); }}
          onDragOver={(event) => { event.preventDefault(); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            if (!busy) void selectFiles(Array.from(event.dataTransfer.files));
          }}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-7 text-center transition-colors ${dragActive ? "border-primary bg-primary/10" : "bg-muted/15 hover:border-primary/60 hover:bg-primary/[0.04]"} ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {adding ? <LoaderCircle className="size-7 animate-spin text-primary" /> : <UploadCloud className="size-7 text-primary" />}
          <span className="mt-3 text-sm font-semibold">{adding ? "กำลังตรวจไฟล์..." : "กดเลือกหรือลากรูปมาวางที่นี่"}</span>
          <span className="mt-1 text-xs leading-5 text-muted-foreground">สูงสุด 20 ไฟล์ · ไฟล์ละ 10 MB · รวมไม่เกิน 50 MB</span>
        </label>
      </section>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

      {items.length ? (
        <section className="mt-5 overflow-hidden rounded-xl border" aria-labelledby="batch-file-list-title" data-testid="batch-file-list">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <h3 id="batch-file-list-title" className="text-sm font-semibold">เลือกแล้ว {items.length} ไฟล์</h3>
            <p className="text-xs text-muted-foreground">รวม {formatImageBytes(totalInputBytes)}</p>
          </div>
          <div className="max-h-80 divide-y overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} data-testid="batch-file-row" className="flex items-start gap-3 px-4 py-3">
                <FileImage className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.width.toLocaleString("th-TH")} × {item.height.toLocaleString("th-TH")} px · {formatImageBytes(item.file.size)} · {item.status === "processing" ? "กำลังแปลง..." : item.status === "done" ? "สำเร็จ" : item.status === "error" ? "ไม่สำเร็จ" : "พร้อมแปลง"}</p>
                  {item.error ? <p className="mt-1 text-xs leading-5 text-destructive">{item.error}</p> : null}
                </div>
                {item.status === "processing" ? <LoaderCircle className="size-4 animate-spin text-primary" /> : item.status === "done" ? <CheckCircle2 className="size-4 text-emerald-600" /> : (
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`นำ ${item.file.name} ออก`} disabled={busy} onClick={() => removeItem(item.id)}><Trash2 /></Button>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 border-t pt-6" aria-labelledby="batch-settings-title">
        <div className="mb-4 flex items-center gap-2"><ImageDown className="size-4 text-primary" /><h3 id="batch-settings-title" className="font-semibold">ตั้งค่าผลลัพธ์ทั้งชุด</h3></div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2.5">
            <Label htmlFor="batch-output-format">รูปแบบไฟล์ผลลัพธ์</Label>
            <Select value={outputMime} disabled={busy} onValueChange={(value) => { setOutputMime(value as BatchImageOutputMime); resetOutputs(); }}>
              <SelectTrigger id="batch-output-format" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{OUTPUT_FORMATS.map((format) => <SelectItem key={format.value} value={format.value}>{format.label} — {format.hint}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">{selectedFormat.hint}</p>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="batch-max-edge">ขนาดด้านยาวสูงสุด</Label>
            <Select value={String(maxEdge)} disabled={busy} onValueChange={(value) => { setMaxEdge(Number(value)); resetOutputs(); }}>
              <SelectTrigger id="batch-max-edge" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{OUTPUT_SIZE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">รักษาสัดส่วนและไม่ขยายรูปที่เล็กกว่าค่าที่เลือก</p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="batch-quality">คุณภาพไฟล์</Label><span className="text-sm font-semibold text-primary">{outputMime === "image/png" ? "คงที่" : `${quality}%`}</span></div>
            <input id="batch-quality" type="range" min="50" max="100" step="5" value={quality} disabled={busy || outputMime === "image/png"} onChange={(event) => { setQuality(Number(event.target.value)); resetOutputs(); }} className="h-10 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
            <p className="text-xs leading-5 text-muted-foreground">PNG ไม่ใช้ค่า Quality ส่วน JPG/WebP ลดค่าได้เพื่อให้ไฟล์เล็กลง</p>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="batch-background">สีพื้นหลังเมื่อแปลงเป็น JPG</Label>
            <div className="flex gap-2">
              <Input id="batch-background" value={background} disabled={busy || outputMime !== "image/jpeg"} onChange={(event) => { setBackground(event.target.value); resetOutputs(); }} maxLength={7} />
              <Input type="color" value={background} disabled={busy || outputMime !== "image/jpeg"} onChange={(event) => { setBackground(event.target.value); resetOutputs(); }} className="w-12 shrink-0 p-1" aria-label="เลือกสีพื้นหลัง JPG ทั้งชุด" />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">ใช้แทนพื้นที่โปร่งใสเฉพาะเมื่อเลือก JPG</p>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <ActionBar>
          <Button type="button" onClick={() => void convert()} disabled={!items.length || busy}><ImageDown className="size-4" />{processing ? `กำลังแปลง ${progress.current}/${progress.total}` : `แปลงทั้งหมดเป็น ${getBatchImageExtension(outputMime).toUpperCase()}`}</Button>
          {processing ? <Button type="button" variant="destructive" onClick={cancel}><XCircle className="size-4" />ยกเลิก</Button> : null}
          <ExampleButton onExample={() => void loadExample()} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {(processing || outputs.length || failedCount > 0) ? (
        <section className="mt-5 rounded-xl border bg-primary/[0.03] p-4" aria-live="polite" data-testid="batch-progress">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{processing ? "กำลังแปลงทีละรูป" : `เสร็จแล้ว ${outputs.length} รูป${failedCount ? ` · ไม่สำเร็จ ${failedCount}` : ""}`}</p>
              <p className="mt-1 text-xs text-muted-foreground">ประมวลผลทีละไฟล์เพื่อลดการใช้หน่วยความจำของ Browser</p>
            </div>
            <span className="text-sm font-semibold text-primary">{progressPercent}%</span>
          </div>
          <div role="progressbar" aria-label="ความคืบหน้าการแปลงรูป" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} /></div>
        </section>
      ) : null}

      {outputs.length ? (
        <section className="mt-5 overflow-hidden rounded-xl border border-primary/25" aria-labelledby="batch-output-title" data-testid="batch-output">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-primary/[0.04] px-4 py-4">
            <div>
              <h3 id="batch-output-title" className="font-semibold">ไฟล์พร้อมดาวน์โหลด</h3>
              <p className="mt-1 text-xs text-muted-foreground">{formatImageBytes(processedInputBytes)} → {formatImageBytes(totalOutputBytes)} · {totalSavingPercent >= 0 ? `ลด ${totalSavingPercent}%` : `เพิ่ม ${Math.abs(totalSavingPercent)}%`}</p>
            </div>
            <Button type="button" onClick={() => void downloadAll()}><Archive className="size-4" />{outputs.length > 1 ? `ดาวน์โหลด ZIP ${outputs.length} รูป` : "ดาวน์โหลดรูป"}</Button>
          </div>
          <div className="divide-y">
            {outputs.map((output) => (
              <div key={output.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={output.filename}>{output.filename}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{output.width.toLocaleString("th-TH")} × {output.height.toLocaleString("th-TH")} px · {formatImageBytes(output.blob.size)} · {output.savingPercent >= 0 ? `ลด ${output.savingPercent}%` : `เพิ่ม ${Math.abs(output.savingPercent)}%`}</p>
                </div>
                <Button type="button" size="sm" variant="outline" aria-label={`ดาวน์โหลด ${output.filename}`} onClick={() => { downloadBlob(output.blob, output.filename); toast.success(`ดาวน์โหลด ${output.filename} แล้ว`); }}><Download className="size-4" />ดาวน์โหลด</Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />ไฟล์ถูกอ่าน แปลง และสร้าง ZIP ภายใน Browser ของคุณ ไม่มี API ของ Meaw Tools รับหรือบันทึกรูป</p>
        <p className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />ไฟล์ใหม่จาก Canvas มักไม่เก็บ EXIF, GPS หรือ metadata เดิม และ PNG อาจใหญ่กว่า JPG ต้นฉบับ ควรเก็บต้นฉบับและตรวจผลก่อนใช้งานจริง</p>
      </div>
    </WorkspaceFrame>
  );
}
