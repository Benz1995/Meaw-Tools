"use client";

import Image from "next/image";
import { Archive, Download, FileImage, ImageDown, Images, LoaderCircle, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createHeicSampleFile } from "@/lib/tools/heic-sample";
import {
  clampJpegQuality,
  fitHeicOutput,
  hasHeicSignature,
  heicJpegFilename,
  makeUniqueFilenames,
  validateHeicFiles,
} from "@/lib/tools/heic";
import { formatImageBytes } from "@/lib/tools/images";

type HeicFileStatus = "pending" | "processing" | "done" | "error";
type HeicFileItem = { id: string; file: File; status: HeicFileStatus; error?: string };
type HeicOutput = {
  id: string;
  blob: Blob;
  url: string;
  filename: string;
  width: number;
  height: number;
  originalBytes: number;
  savingPercent: number;
};
type DecodeResponse =
  | { id: string; ok: true; width: number; height: number; pixels: ArrayBuffer }
  | { id: string; ok: false; error: string };

const OUTPUT_SIZE_OPTIONS = [
  { value: "4096", label: "สูงสุด 4096 px — แนะนำ" },
  { value: "2560", label: "สูงสุด 2560 px — ส่งงาน/อัปโหลด" },
  { value: "1920", label: "สูงสุด 1920 px — เว็บและโซเชียล" },
  { value: "0", label: "ขนาดต้นฉบับ — ใช้ RAM สูง" },
] as const;

function decodeWithWorker(worker: Worker, id: string, buffer: ArrayBuffer, signal: AbortSignal): Promise<Extract<DecodeResponse, { ok: true }>> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("ถอดรหัส HEIC ใช้เวลานานเกิน 60 วินาที"));
    }, 60_000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      signal.removeEventListener("abort", handleAbort);
    };
    const handleMessage = (event: MessageEvent<DecodeResponse>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error));
    };
    const handleError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || "Web Worker สำหรับ HEIC หยุดทำงาน"));
    };
    const handleAbort = () => {
      cleanup();
      reject(new Error("ยกเลิกการแปลงแล้ว"));
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }
    worker.postMessage({ id, buffer }, [buffer]);
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Browser ไม่สามารถสร้างไฟล์ JPG ได้")),
      "image/jpeg",
      clampJpegQuality(quality),
    );
  });
}

async function encodeDecodedImage(
  pixels: ArrayBuffer,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (pixels.byteLength !== sourceWidth * sourceHeight * 4) throw new Error("ข้อมูลพิกเซลจาก HEIC ไม่สมบูรณ์");
  const outputSize = fitHeicOutput(sourceWidth, sourceHeight, maxEdge);
  const imageData = new ImageData(new Uint8ClampedArray(pixels), sourceWidth, sourceHeight);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputSize.width;
  outputCanvas.height = outputSize.height;
  const outputContext = outputCanvas.getContext("2d", { alpha: false });
  if (!outputContext) throw new Error("Browser ไม่รองรับ Canvas สำหรับแปลงรูป");

  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, outputSize.width, outputSize.height);

  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(imageData);
    try {
      outputContext.drawImage(bitmap, 0, 0, outputSize.width, outputSize.height);
    } finally {
      bitmap.close();
    }
  } else {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) throw new Error("Browser ไม่รองรับการถอดรหัสรูป HEIC");
    sourceContext.putImageData(imageData, 0, 0);
    outputContext.drawImage(sourceCanvas, 0, 0, outputSize.width, outputSize.height);
  }

  return { blob: await canvasToJpeg(outputCanvas, quality), ...outputSize };
}

function friendlyHeicError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : "แปลง HEIC ไม่สำเร็จ";
  if (/memory|allocation|out of bounds/i.test(message)) return "หน่วยความจำไม่พอสำหรับรูปนี้ ลองปิดแท็บอื่นหรือใช้ไฟล์ที่เล็กลง";
  if (/format|decode|decoding|input|brand/i.test(message)) return "อ่าน HEIC นี้ไม่สำเร็จ ไฟล์อาจเสีย ใช้ codec ที่ยังไม่รองรับ หรือเป็นไฟล์ชนิดอื่นที่เปลี่ยนนามสกุลมา";
  return message;
}

export function HeicToJpgTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const outputUrlsRef = useRef<string[]>([]);
  const [items, setItems] = useState<HeicFileItem[]>([]);
  const [outputs, setOutputs] = useState<HeicOutput[]>([]);
  const [quality, setQuality] = useState(90);
  const [maxEdge, setMaxEdge] = useState(4096);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");

  const clearOutputs = () => {
    for (const url of outputUrlsRef.current) URL.revokeObjectURL(url);
    outputUrlsRef.current = [];
    setOutputs([]);
  };

  const stopWorker = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  useEffect(() => () => {
    generationRef.current += 1;
    stopWorker();
    for (const url of outputUrlsRef.current) URL.revokeObjectURL(url);
  }, []);

  const resetForSettingsChange = () => {
    clearOutputs();
    setItems((current) => current.map((item) => ({ ...item, status: "pending", error: undefined })));
    setError("");
  };

  const selectFiles = (files: File[]) => {
    generationRef.current += 1;
    stopWorker();
    setProcessing(false);
    setProgress({ current: 0, total: 0 });
    clearOutputs();
    setError("");
    try {
      validateHeicFiles(files);
      setItems(files.map((file) => ({ id: crypto.randomUUID(), file, status: "pending" })));
    } catch (caught) {
      setItems([]);
      setError(caught instanceof Error ? caught.message : "เลือกไฟล์ HEIC ไม่สำเร็จ");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeItem = (id: string) => {
    if (processing) return;
    setItems((current) => current.filter((item) => item.id !== id));
    clearOutputs();
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const cancel = () => {
    generationRef.current += 1;
    stopWorker();
    setProcessing(false);
    setProgress({ current: 0, total: items.length });
    setItems((current) => current.map((item) => item.status === "processing" ? { ...item, status: "pending" } : item));
    setError("ยกเลิกการแปลงแล้ว");
  };

  const clear = () => {
    generationRef.current += 1;
    stopWorker();
    clearOutputs();
    setItems([]);
    setProcessing(false);
    setProgress({ current: 0, total: 0 });
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const convert = async () => {
    if (!items.length) { setError("กรุณาเลือกไฟล์ HEIC หรือ HEIF"); return; }
    const generation = ++generationRef.current;
    clearOutputs();
    setError("");
    setProcessing(true);
    setProgress({ current: 0, total: items.length });
    setItems((current) => current.map((item) => ({ ...item, status: "pending", error: undefined })));

    const filenames = makeUniqueFilenames(items.map((item) => heicJpegFilename(item.file.name)));
    const nextOutputs: HeicOutput[] = [];
    const worker = new Worker(new URL("./heic-decoder.worker.ts", import.meta.url), { type: "module", name: "meaw-heic-decoder" });
    const abortController = new AbortController();
    workerRef.current = worker;
    abortRef.current = abortController;

    for (let index = 0; index < items.length; index += 1) {
      if (generationRef.current !== generation) break;
      const item = items[index]!;
      setProgress({ current: index + 1, total: items.length });
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "processing", error: undefined } : candidate));
      try {
        const buffer = await item.file.arrayBuffer();
        if (!hasHeicSignature(buffer)) throw new Error("รูปแบบไฟล์ไม่ใช่ HEIC หรือ HEIF จริง");
        const decoded = await decodeWithWorker(worker, item.id, buffer, abortController.signal);
        if (generationRef.current !== generation) break;
        const encoded = await encodeDecodedImage(decoded.pixels, decoded.width, decoded.height, maxEdge, quality / 100);
        if (generationRef.current !== generation) break;
        const url = URL.createObjectURL(encoded.blob);
        outputUrlsRef.current.push(url);
        nextOutputs.push({
          id: item.id,
          ...encoded,
          url,
          filename: filenames[index]!,
          originalBytes: item.file.size,
          savingPercent: Math.round((1 - encoded.blob.size / item.file.size) * 100),
        });
        setOutputs([...nextOutputs]);
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "done" } : candidate));
      } catch (caught) {
        if (generationRef.current !== generation) break;
        const itemError = friendlyHeicError(caught);
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "error", error: itemError } : candidate));
        if (/60 วินาที/.test(itemError)) {
          setError(itemError);
          worker.terminate();
          workerRef.current = null;
          abortRef.current = null;
          break;
        }
      }
    }

    if (workerRef.current === worker) {
      worker.terminate();
      workerRef.current = null;
    }
    if (abortRef.current === abortController) abortRef.current = null;
    if (generationRef.current === generation) {
      setProcessing(false);
      const failed = items.length - nextOutputs.length;
      if (nextOutputs.length) toast.success(`แปลง HEIC สำเร็จ ${nextOutputs.length} รูป${failed ? ` · ไม่สำเร็จ ${failed}` : ""}`);
      else setError("ไม่สามารถแปลงไฟล์ที่เลือกได้ กรุณาตรวจชนิดไฟล์และลองใหม่");
    }
  };

  const loadExample = () => {
    selectFiles([createHeicSampleFile()]);
    toast.success("โหลด HEIC ตัวอย่างแล้ว");
  };

  const downloadAll = async () => {
    if (!outputs.length) return;
    if (outputs.length === 1) {
      downloadBlob(outputs[0]!.blob, outputs[0]!.filename);
      toast.success("ดาวน์โหลด JPG แล้ว");
      return;
    }
    const { zipSync } = await import("fflate");
    const entries = Object.fromEntries(await Promise.all(outputs.map(async (output) => [output.filename, new Uint8Array(await output.blob.arrayBuffer())] as const)));
    const zip = zipSync(entries, { level: 0 });
    downloadBlob(new Blob([Uint8Array.from(zip)], { type: "application/zip" }), "meaw-heic-to-jpg.zip");
    toast.success(`ดาวน์โหลด ZIP ${outputs.length} รูปแล้ว`);
  };

  const totalInputBytes = items.reduce((sum, item) => sum + item.file.size, 0);
  const totalOutputBytes = outputs.reduce((sum, output) => sum + output.blob.size, 0);
  const failedCount = items.filter((item) => item.status === "error").length;

  return (
    <WorkspaceFrame>
      <section className="space-y-2.5" aria-labelledby="heic-input-title">
        <Label id="heic-input-title" htmlFor="heic-files">ไฟล์ HEIC หรือ HEIF</Label>
        <Input
          ref={inputRef}
          id="heic-files"
          type="file"
          accept=".heic,.heif,image/heic,image/heif,image/heic-sequence,image/heif-sequence"
          multiple
          disabled={processing}
          onChange={(event) => selectFiles(Array.from(event.target.files ?? []))}
        />
        <p className="text-xs leading-5 text-muted-foreground">สูงสุด 10 ไฟล์ · ไฟล์ละ 20 MB · รวมไม่เกิน 60 MB · ประมวลผลทีละรูปเพื่อลดการใช้ RAM</p>
      </section>

      {items.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border" data-testid="heic-file-list">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <p className="text-sm font-semibold">เลือกแล้ว {items.length} ไฟล์</p>
            <p className="text-xs text-muted-foreground">รวม {formatImageBytes(totalInputBytes)}</p>
          </div>
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} data-testid="heic-file-row" className="flex items-start gap-3 px-4 py-3">
                <FileImage className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatImageBytes(item.file.size)} · {item.status === "processing" ? "กำลังแปลง..." : item.status === "done" ? "สำเร็จ" : item.status === "error" ? "ไม่สำเร็จ" : "พร้อมแปลง"}</p>
                  {item.error ? <p className="mt-1 text-xs leading-5 text-destructive">{item.error}</p> : null}
                </div>
                {item.status === "processing" ? <LoaderCircle className="size-4 animate-spin text-primary" /> : (
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`นำ ${item.file.name} ออก`} onClick={() => removeItem(item.id)} disabled={processing}><Trash2 /></Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : <div className="mt-5"><EmptyOutput size="compact" text="เลือก HEIC/HEIF จาก iPhone หรือกดตัวอย่างเพื่อเริ่มใช้งาน" /></div>}

      <section className="mt-6 border-t pt-6" aria-labelledby="heic-settings-title">
        <div className="mb-4 flex items-center gap-2"><Images className="size-4 text-primary" /><h2 id="heic-settings-title" className="text-base font-semibold">ตั้งค่า JPG</h2></div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2.5">
            <Label htmlFor="heic-max-edge">ขนาดด้านยาวสูงสุด</Label>
            <Select value={String(maxEdge)} disabled={processing} onValueChange={(value) => { setMaxEdge(Number(value)); resetForSettingsChange(); }}>
              <SelectTrigger id="heic-max-edge" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{OUTPUT_SIZE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ลดเฉพาะเมื่อรูปใหญ่กว่าค่านี้ และไม่ขยายรูปเล็ก</p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="heic-quality">คุณภาพ JPG</Label><span className="text-sm font-semibold text-primary">{quality}%</span></div>
            <input id="heic-quality" type="range" min="60" max="100" step="5" value={quality} disabled={processing} onChange={(event) => { setQuality(Number(event.target.value)); resetForSettingsChange(); }} className="h-10 w-full cursor-pointer accent-primary disabled:cursor-not-allowed" />
            <p className="text-xs leading-5 text-muted-foreground">90% เหมาะกับภาพถ่ายทั่วไป ลดค่าลงเพื่อให้ไฟล์เล็กขึ้น</p>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <ActionBar>
          <Button type="button" onClick={() => void convert()} disabled={!items.length || processing}><ImageDown className="size-4" />{processing ? `กำลังแปลง ${progress.current}/${progress.total}` : "แปลงเป็น JPG"}</Button>
          {processing ? <Button type="button" variant="destructive" onClick={cancel}><XCircle className="size-4" />ยกเลิก</Button> : null}
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {error ? <Alert variant="destructive" className="mt-5" aria-live="assertive"><XCircle /><AlertTitle>ดำเนินการไม่สำเร็จ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {outputs.length ? (
        <section className="mt-5" aria-labelledby="heic-output-title" data-testid="heic-output" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div><h2 id="heic-output-title" className="font-semibold text-emerald-700 dark:text-emerald-300">แปลง JPG สำเร็จ {outputs.length} รูป</h2><p className="mt-1 text-xs text-muted-foreground">รวม {formatImageBytes(totalOutputBytes)}{failedCount ? ` · ไม่สำเร็จ ${failedCount}` : ""}</p></div>
            <Button type="button" onClick={() => void downloadAll()}><Archive className="size-4" />{outputs.length > 1 ? "ดาวน์โหลดทั้งหมดเป็น ZIP" : "ดาวน์โหลด JPG"}</Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {outputs.map((output) => (
              <article key={output.id} className="overflow-hidden rounded-xl border bg-card [content-visibility:auto]">
                <div className="relative aspect-[4/3] bg-muted/20"><Image src={output.url} alt={`ตัวอย่าง ${output.filename}`} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className={`object-contain p-3 ${output.width < 256 && output.height < 256 ? "[image-rendering:pixelated]" : ""}`} /></div>
                <div className="border-t p-4">
                  <p className="truncate text-sm font-semibold" title={output.filename}>{output.filename}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{output.width.toLocaleString("th-TH")} × {output.height.toLocaleString("th-TH")} px · {formatImageBytes(output.blob.size)}</p>
                  <p className={`mt-1 text-xs ${output.savingPercent >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{output.savingPercent >= 0 ? `เล็กลง ${output.savingPercent}%` : `ใหญ่ขึ้น ${Math.abs(output.savingPercent)}%`}</p>
                  <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => downloadBlob(output.blob, output.filename)} aria-label={`ดาวน์โหลด ${output.filename}`}><Download className="size-4" />ดาวน์โหลด</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <Alert className="mt-5">
        <ShieldCheck />
        <AlertTitle>ไฟล์ไม่ถูกอัปโหลด</AlertTitle>
        <AlertDescription>ตัวถอดรหัส WebAssembly ทำงานใน Browser และโหลดเมื่อกดแปลงเท่านั้น JPG ใหม่จะไม่เก็บ EXIF, GPS หรือ metadata เดิม ควรเก็บ HEIC ต้นฉบับไว้เสมอ</AlertDescription>
      </Alert>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">HEIC แบบ Live Photo หรือ Burst จะใช้ภาพหลักเพียงภาพเดียว วิดีโอ เสียง depth map และการแก้ไขแบบ non-destructive ของแอป Photos จะไม่ถูกส่งต่อ สีอาจต่างเล็กน้อยเมื่อไฟล์มีโปรไฟล์สีเฉพาะ</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground"><a href="/licenses/heic-decoder.txt" target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-4 hover:text-foreground">ใบอนุญาตและซอร์สของตัวถอดรหัส HEIC</a></p>
    </WorkspaceFrame>
  );
}
