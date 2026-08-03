"use client";

import Image from "next/image";
import { Download, FileImage, ImageDown, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type BrowserImageMime as OutputMime, canvasToImageBlob, decodeBrowserImage } from "@/lib/tools/image-browser";
import { IMAGE_FILE_LIMIT_BYTES } from "@/lib/tools/limits";
import { IMAGE_MAX_DIMENSION, calculateSavingPercent, createImageOutputName, fitImageWithin, formatImageBytes, validateDecodedImage } from "@/lib/tools/images";

type ImageToolMode = "compress" | "convert-jpg";

type ImageInfo = {
  file: File;
  width: number;
  height: number;
};

type ProcessedImage = {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  mime: OutputMime;
  savingPercent: number;
};

const outputFormats: Array<{ value: OutputMime; label: string; extension: "jpg" | "png" | "webp" }> = [
  { value: "image/webp", label: "WebP — ไฟล์เล็ก เหมาะกับเว็บ", extension: "webp" },
  { value: "image/jpeg", label: "JPG — รองรับทั่วไป", extension: "jpg" },
  { value: "image/png", label: "PNG — รองรับพื้นโปร่งใส", extension: "png" },
];

function getFormat(mime: OutputMime) {
  return outputFormats.find((format) => format.value === mime) ?? outputFormats[0]!;
}

async function createSampleFile() {
  const canvas = document.createElement("canvas");
  canvas.width = 1_280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ไม่รองรับ Canvas");

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0f9f8f");
  gradient.addColorStop(1, "#f4b860");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.9)";
  context.beginPath();
  context.arc(1_030, 170, 110, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#082f2b";
  context.font = "700 64px sans-serif";
  context.fillText("Meaw Tools", 76, 590);
  const blob = await canvasToImageBlob(canvas, "image/png", 1);
  return new File([blob], "meaw-sample.png", { type: "image/png", lastModified: Date.now() });
}

function ImageProcessingTool({ mode }: { mode: ImageToolMode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef(0);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [output, setOutput] = useState<ProcessedImage | null>(null);
  const [maxWidth, setMaxWidth] = useState(1_920);
  const [maxHeight, setMaxHeight] = useState(1_920);
  const [outputMime, setOutputMime] = useState<OutputMime>(mode === "convert-jpg" ? "image/jpeg" : "image/webp");
  const [quality, setQuality] = useState(mode === "convert-jpg" ? 90 : 80);
  const [background, setBackground] = useState("#ffffff");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (inputUrl) URL.revokeObjectURL(inputUrl); }, [inputUrl]);
  useEffect(() => () => { if (outputUrl) URL.revokeObjectURL(outputUrl); }, [outputUrl]);

  const clearOutput = () => {
    setOutput(null);
    setOutputUrl("");
  };

  const clear = () => {
    selectionRef.current += 1;
    setImageInfo(null);
    setInputUrl("");
    clearOutput();
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (file: File) => {
    const selection = ++selectionRef.current;
    setError("");
    clearOutput();

    const allowedTypes = mode === "convert-jpg"
      ? ["image/png", "image/webp"]
      : ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageInfo(null);
      setInputUrl("");
      setError(mode === "convert-jpg" ? "รองรับเฉพาะไฟล์ PNG และ WebP" : "รองรับเฉพาะไฟล์ JPG, PNG และ WebP");
      return;
    }
    if (file.size > IMAGE_FILE_LIMIT_BYTES) {
      setImageInfo(null);
      setInputUrl("");
      setError("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    let decoded: Awaited<ReturnType<typeof decodeBrowserImage>> | null = null;
    try {
      decoded = await decodeBrowserImage(file);
      validateDecodedImage(decoded.width, decoded.height);
      if (selection !== selectionRef.current) return;
      setImageInfo({ file, width: decoded.width, height: decoded.height });
      setInputUrl(URL.createObjectURL(file));
      if (mode === "compress") {
        setMaxWidth(Math.min(decoded.width, 1_920));
        setMaxHeight(Math.min(decoded.height, 1_920));
      }
    } catch (caught) {
      if (selection !== selectionRef.current) return;
      setImageInfo(null);
      setInputUrl("");
      setError(caught instanceof Error ? caught.message : "อ่านไฟล์รูปไม่สำเร็จ");
    } finally {
      decoded?.close();
    }
  };

  const loadExample = async () => {
    try {
      await selectFile(await createSampleFile());
      toast.success("โหลดรูปตัวอย่างแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สร้างรูปตัวอย่างไม่สำเร็จ");
    }
  };

  const processImage = async () => {
    if (!imageInfo) {
      setError("กรุณาเลือกรูปก่อนประมวลผล");
      return;
    }
    if (mode === "compress" && (maxWidth < 1 || maxHeight < 1 || maxWidth > IMAGE_MAX_DIMENSION || maxHeight > IMAGE_MAX_DIMENSION)) {
      setError(`กำหนดความกว้างและความสูงระหว่าง 1–${IMAGE_MAX_DIMENSION.toLocaleString("th-TH")} พิกเซล`);
      return;
    }
    if (!/^#[0-9a-f]{6}$/i.test(background)) {
      setError("สีพื้นหลังต้องเป็นรหัสสี Hex 6 หลัก");
      return;
    }

    setProcessing(true);
    setError("");
    clearOutput();
    let decoded: Awaited<ReturnType<typeof decodeBrowserImage>> | null = null;
    try {
      decoded = await decodeBrowserImage(imageInfo.file);
      const target = mode === "compress"
        ? fitImageWithin(decoded.width, decoded.height, maxWidth, maxHeight)
        : { width: decoded.width, height: decoded.height };
      validateDecodedImage(target.width, target.height);

      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext("2d", { alpha: outputMime !== "image/jpeg" });
      if (!context) throw new Error("Browser ไม่รองรับ Canvas");
      if (outputMime === "image/jpeg") {
        context.fillStyle = background;
        context.fillRect(0, 0, target.width, target.height);
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, target.width, target.height);

      const blob = await canvasToImageBlob(canvas, outputMime, quality / 100);
      const format = getFormat(outputMime);
      const processed: ProcessedImage = {
        blob,
        filename: createImageOutputName(imageInfo.file.name, format.extension, mode === "convert-jpg" ? "converted" : "optimized"),
        width: target.width,
        height: target.height,
        mime: outputMime,
        savingPercent: calculateSavingPercent(imageInfo.file.size, blob.size),
      };
      setOutput(processed);
      setOutputUrl(URL.createObjectURL(blob));
      toast.success(mode === "convert-jpg" ? "แปลงเป็น JPG แล้ว" : "ปรับรูปเรียบร้อยแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ประมวลผลรูปไม่สำเร็จ");
    } finally {
      decoded?.close();
      setProcessing(false);
    }
  };

  const acceptedText = mode === "convert-jpg" ? "PNG หรือ WebP" : "JPG, PNG หรือ WebP";
  const actionText = mode === "convert-jpg" ? "แปลงเป็น JPG" : "บีบอัดและย่อรูป";

  return (
    <WorkspaceFrame>
      <div>
        <Label htmlFor={`${mode}-image-file`}>เลือกรูป {acceptedText}</Label>
        <Input
          ref={inputRef}
          id={`${mode}-image-file`}
          type="file"
          accept={mode === "convert-jpg" ? "image/png,image/webp" : "image/jpeg,image/png,image/webp"}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); }}
        />
        <p className="mt-2 text-xs text-muted-foreground">ไฟล์ละไม่เกิน 10 MB · ด้านยาวไม่เกิน 8,000 px · ประมวลผลใน Browser</p>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {imageInfo && inputUrl ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div className="overflow-hidden rounded-xl border bg-muted/15">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm">
              <span className="min-w-0 truncate font-medium">{imageInfo.file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatImageBytes(imageInfo.file.size)}</span>
            </div>
            <div className="relative h-56 bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] sm:h-72">
              <Image src={inputUrl} alt="ตัวอย่างรูปต้นฉบับ" fill unoptimized sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-3" />
            </div>
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">ต้นฉบับ {imageInfo.width.toLocaleString("th-TH")} × {imageInfo.height.toLocaleString("th-TH")} px</p>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
            {mode === "compress" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="image-max-width">ความกว้างสูงสุด (px)</Label><Input id="image-max-width" type="number" min={1} max={IMAGE_MAX_DIMENSION} value={maxWidth} onChange={(event) => { setMaxWidth(Number(event.target.value)); clearOutput(); }} /></div>
                  <div><Label htmlFor="image-max-height">ความสูงสูงสุด (px)</Label><Input id="image-max-height" type="number" min={1} max={IMAGE_MAX_DIMENSION} value={maxHeight} onChange={(event) => { setMaxHeight(Number(event.target.value)); clearOutput(); }} /></div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">รักษาสัดส่วนเดิมเสมอและไม่ขยายรูปให้ใหญ่กว่าต้นฉบับ</p>
                <div><Label htmlFor="image-output-format">รูปแบบผลลัพธ์</Label><Select value={outputMime} onValueChange={(value) => { setOutputMime(value as OutputMime); clearOutput(); }}><SelectTrigger id="image-output-format" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{outputFormats.map((format) => <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>)}</SelectContent></Select></div>
              </>
            ) : null}

            {outputMime === "image/jpeg" ? (
              <div><Label htmlFor="jpg-background">สีพื้นหลัง JPG</Label><div className="flex gap-2"><Input id="jpg-background" value={background} onChange={(event) => { setBackground(event.target.value); clearOutput(); }} maxLength={7} /><Input type="color" value={background} onChange={(event) => { setBackground(event.target.value); clearOutput(); }} className="w-12 shrink-0 p-1" aria-label="เลือกสีพื้นหลัง JPG" /></div><p className="mt-2 text-xs text-muted-foreground">พื้นที่โปร่งใสจะถูกแทนด้วยสีนี้</p></div>
            ) : null}

            <div>
              <div className="flex items-center justify-between gap-3"><Label htmlFor={`${mode}-quality`}>คุณภาพไฟล์</Label><span className="text-sm font-semibold text-primary">{outputMime === "image/png" ? "คงที่" : `${quality}%`}</span></div>
              <input id={`${mode}-quality`} type="range" min={20} max={100} step={5} value={quality} disabled={outputMime === "image/png"} onChange={(event) => { setQuality(Number(event.target.value)); clearOutput(); }} className="mt-3 h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">ค่าต่ำช่วยลดขนาดมากขึ้น แต่อาจทำให้รายละเอียดภาพลดลง</p>
            </div>
          </div>
        </div>
      ) : <div className="mt-5"><EmptyOutput size="compact" text={`เลือกรูป ${acceptedText} หรือกดตัวอย่างเพื่อเริ่มใช้งาน`} /></div>}

      <div className="mt-5">
        <ActionBar>
          <Button onClick={() => void processImage()} disabled={processing}><ImageDown className="size-4" />{processing ? "กำลังประมวลผล..." : actionText}</Button>
          <ExampleButton onExample={() => void loadExample()} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {output && outputUrl && imageInfo ? (
        <div data-testid="image-output" className="mt-5 overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.03]" aria-live="polite">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
            <div className="relative min-h-56 border-b bg-muted/20 lg:border-r lg:border-b-0">
              <Image src={outputUrl} alt="ตัวอย่างรูปที่ประมวลผลแล้ว" fill unoptimized sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-4" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><p className="font-semibold">พร้อมดาวน์โหลด</p></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">ขนาดใหม่</dt><dd className="mt-1 font-semibold">{formatImageBytes(output.blob.size)}</dd></div>
                <div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">เปลี่ยนแปลง</dt><dd className={`mt-1 font-semibold ${output.savingPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{output.savingPercent >= 0 ? `ลด ${output.savingPercent}%` : `เพิ่ม ${Math.abs(output.savingPercent)}%`}</dd></div>
                <div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">ความละเอียด</dt><dd className="mt-1 font-semibold">{output.width.toLocaleString("th-TH")} × {output.height.toLocaleString("th-TH")}</dd></div>
                <div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">รูปแบบ</dt><dd className="mt-1 font-semibold">{getFormat(output.mime).extension.toUpperCase()}</dd></div>
              </dl>
              {output.savingPercent < 0 ? <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">ไฟล์ใหม่ใหญ่กว่าต้นฉบับ ลองลดคุณภาพหรือขนาดภาพก่อนดาวน์โหลด</p> : null}
              <p className="mt-4 truncate text-xs text-muted-foreground" title={output.filename}>{output.filename}</p>
              <Button className="mt-2 w-full" onClick={() => { downloadBlob(output.blob, output.filename); toast.success("ดาวน์โหลดรูปแล้ว"); }} aria-label={`ดาวน์โหลด ${output.filename}`}><Download className="size-4" />ดาวน์โหลดรูป {getFormat(output.mime).extension.toUpperCase()}</Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><FileImage className="mt-0.5 size-4 shrink-0" /><p>การวาดรูปใหม่ผ่าน Canvas มักไม่เก็บ EXIF และ metadata เดิม ควรเก็บไฟล์ต้นฉบับไว้เสมอ และตรวจคุณภาพก่อนนำไปพิมพ์หรือส่งงาน</p></div>
    </WorkspaceFrame>
  );
}

export function ImageCompressorTool() {
  return <ImageProcessingTool mode="compress" />;
}

export function PngToJpgTool() {
  return <ImageProcessingTool mode="convert-jpg" />;
}
