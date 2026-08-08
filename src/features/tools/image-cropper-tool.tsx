"use client";

import Image from "next/image";
import { Crop, Download, FlipHorizontal2, FlipVertical2, ImageUp, RotateCw, Sparkles } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type BrowserImageMime, canvasToImageBlob, decodeBrowserImage } from "@/lib/tools/image-browser";
import {
  CROP_OUTPUT_MAX_DIMENSION,
  type CropHandle,
  type CropRect,
  type CropRotation,
  createCenteredCrop,
  cropFromPixels,
  cropToPixels,
  getTransformedDimensions,
  moveCrop,
  resizeCrop,
  validateCropOutput,
} from "@/lib/tools/image-crop";
import { IMAGE_FILE_LIMIT_BYTES } from "@/lib/tools/limits";
import { createImageOutputName, formatImageBytes, validateDecodedImage } from "@/lib/tools/images";

type ImageInfo = { file: File; width: number; height: number };
type OutputInfo = { blob: Blob; filename: string; width: number; height: number; format: string };
type DragState = { pointerId: number; mode: "move" | CropHandle; x: number; y: number; crop: CropRect };

const formats: Array<{ value: BrowserImageMime; label: string; extension: "jpg" | "png" | "webp" }> = [
  { value: "image/png", label: "PNG — โปร่งใสและคมชัด", extension: "png" },
  { value: "image/jpeg", label: "JPG — เหมาะกับภาพถ่าย", extension: "jpg" },
  { value: "image/webp", label: "WebP — ไฟล์เล็กสำหรับเว็บ", extension: "webp" },
];

const aspectPresets = [
  { value: "free", label: "อิสระ", ratio: null },
  { value: "1:1", label: "1:1 จัตุรัส", ratio: 1 },
  { value: "4:3", label: "4:3", ratio: 4 / 3 },
  { value: "3:2", label: "3:2", ratio: 3 / 2 },
  { value: "16:9", label: "16:9", ratio: 16 / 9 },
  { value: "9:16", label: "9:16 Story", ratio: 9 / 16 },
  { value: "custom", label: "กำหนดเอง", ratio: null },
] as const;

function applySourceTransform(
  context: CanvasRenderingContext2D,
  sourceWidth: number,
  sourceHeight: number,
  rotation: CropRotation,
  flipHorizontal: boolean,
  flipVertical: boolean,
) {
  const transformed = getTransformedDimensions(sourceWidth, sourceHeight, rotation);
  if (flipHorizontal) {
    context.translate(transformed.width, 0);
    context.scale(-1, 1);
  }
  if (flipVertical) {
    context.translate(0, transformed.height);
    context.scale(1, -1);
  }
  if (rotation === 90) {
    context.translate(sourceHeight, 0);
    context.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    context.translate(sourceWidth, sourceHeight);
    context.rotate(Math.PI);
  } else if (rotation === 270) {
    context.translate(0, sourceWidth);
    context.rotate(-Math.PI / 2);
  }
}

function currentAspect(preset: string, customWidth: number, customHeight: number, circle: boolean) {
  if (circle) return 1;
  if (preset === "custom") return customWidth > 0 && customHeight > 0 ? customWidth / customHeight : 1;
  return aspectPresets.find((item) => item.value === preset)?.ratio ?? null;
}

function formatLabel(mime: BrowserImageMime) {
  return formats.find((format) => format.value === mime) ?? formats[0]!;
}

export function ImageCropperTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decodedRef = useRef<Awaited<ReturnType<typeof decodeBrowserImage>> | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const selectionRef = useRef(0);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0.09, y: 0.09, width: 0.82, height: 0.82 });
  const [aspectPreset, setAspectPreset] = useState("free");
  const [customAspectWidth, setCustomAspectWidth] = useState(4);
  const [customAspectHeight, setCustomAspectHeight] = useState(5);
  const [rotation, setRotation] = useState<CropRotation>(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [circle, setCircle] = useState(false);
  const [sizeMode, setSizeMode] = useState("original");
  const [outputWidth, setOutputWidth] = useState(1_000);
  const [outputHeight, setOutputHeight] = useState(1_000);
  const [outputMime, setOutputMime] = useState<BrowserImageMime>("image/png");
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState("#ffffff");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<OutputInfo | null>(null);
  const [outputUrl, setOutputUrl] = useState("");

  const transformed = useMemo(
    () => imageInfo ? getTransformedDimensions(imageInfo.width, imageInfo.height, rotation) : null,
    [imageInfo, rotation],
  );
  const cropPixels = transformed ? cropToPixels(crop, transformed.width, transformed.height) : null;
  const aspect = currentAspect(aspectPreset, customAspectWidth, customAspectHeight, circle);
  const imageRect = useMemo(() => {
    if (!transformed || stageSize.width <= 0 || stageSize.height <= 0) return null;
    const padding = stageSize.width < 520 ? 12 : 20;
    const scale = Math.min(
      Math.max(1, stageSize.width - padding * 2) / transformed.width,
      Math.max(1, stageSize.height - padding * 2) / transformed.height,
    );
    const width = transformed.width * scale;
    const height = transformed.height * scale;
    return { x: (stageSize.width - width) / 2, y: (stageSize.height - height) / 2, width, height };
  }, [stageSize, transformed]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [imageInfo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const decoded = decodedRef.current;
    if (!canvas || !decoded || !imageRect || stageSize.width <= 0 || stageSize.height <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(stageSize.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(stageSize.height * pixelRatio));
    canvas.style.width = `${stageSize.width}px`;
    canvas.style.height = `${stageSize.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, stageSize.width, stageSize.height);
    context.save();
    context.translate(imageRect.x, imageRect.y);
    context.scale(imageRect.width / (transformed?.width ?? 1), imageRect.height / (transformed?.height ?? 1));
    applySourceTransform(context, decoded.width, decoded.height, rotation, flipHorizontal, flipVertical);
    context.drawImage(decoded.source, 0, 0, decoded.width, decoded.height);
    context.restore();
  }, [flipHorizontal, flipVertical, imageRect, rotation, stageSize, transformed]);

  useEffect(() => () => decodedRef.current?.close(), []);
  useEffect(() => () => { if (outputUrl) URL.revokeObjectURL(outputUrl); }, [outputUrl]);

  const clearOutput = () => {
    setOutput(null);
    setOutputUrl("");
  };

  const resetCropFor = (nextRotation: CropRotation, nextAspect = aspect) => {
    if (!imageInfo) return;
    const dimensions = getTransformedDimensions(imageInfo.width, imageInfo.height, nextRotation);
    const nextCrop = createCenteredCrop(dimensions.width, dimensions.height, nextAspect);
    setCrop(nextCrop);
    const pixels = cropToPixels(nextCrop, dimensions.width, dimensions.height);
    setOutputWidth(pixels.width);
    setOutputHeight(pixels.height);
    clearOutput();
  };

  const clear = () => {
    selectionRef.current += 1;
    decodedRef.current?.close();
    decodedRef.current = null;
    setImageInfo(null);
    setAspectPreset("free");
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setCircle(false);
    setError("");
    clearOutput();
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (file: File) => {
    const selection = ++selectionRef.current;
    setError("");
    clearOutput();
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG และ WebP ไม่รองรับ GIF, HEIC หรือ SVG");
      return;
    }
    if (file.size > IMAGE_FILE_LIMIT_BYTES) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    let decoded: Awaited<ReturnType<typeof decodeBrowserImage>> | null = null;
    try {
      decoded = await decodeBrowserImage(file);
      validateDecodedImage(decoded.width, decoded.height);
      if (selection !== selectionRef.current) {
        decoded.close();
        return;
      }
      decodedRef.current?.close();
      decodedRef.current = decoded;
      decoded = null;
      const nextCrop = createCenteredCrop(decodedRef.current.width, decodedRef.current.height, null);
      const pixels = cropToPixels(nextCrop, decodedRef.current.width, decodedRef.current.height);
      setImageInfo({ file, width: decodedRef.current.width, height: decodedRef.current.height });
      setCrop(nextCrop);
      setAspectPreset("free");
      setRotation(0);
      setFlipHorizontal(false);
      setFlipVertical(false);
      setCircle(false);
      setSizeMode("original");
      setOutputWidth(pixels.width);
      setOutputHeight(pixels.height);
    } catch (caught) {
      if (selection === selectionRef.current) setError(caught instanceof Error ? caught.message : "อ่านไฟล์รูปไม่สำเร็จ");
    } finally {
      decoded?.close();
    }
  };

  const loadExample = async () => {
    try {
      const response = await fetch("/brand/meaw-cafe-hero.webp");
      if (!response.ok) throw new Error("โหลดรูปตัวอย่างไม่สำเร็จ");
      await selectFile(new File([await response.blob()], "meaw-cafe.webp", { type: "image/webp", lastModified: Date.now() }));
      toast.success("โหลดรูปแมวตัวอย่างแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "โหลดรูปตัวอย่างไม่สำเร็จ");
    }
  };

  const changeAspect = (value: string) => {
    setAspectPreset(value);
    if (value !== "1:1") setCircle(false);
    const nextAspect = currentAspect(value, customAspectWidth, customAspectHeight, false);
    resetCropFor(rotation, nextAspect);
  };

  const rotate = () => {
    const next = ((rotation + 90) % 360) as CropRotation;
    setRotation(next);
    resetCropFor(next);
  };

  const updateCrop = (next: CropRect) => {
    setCrop(next);
    clearOutput();
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>, mode: "move" | CropHandle) => {
    if (!imageRect) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, mode, x: event.clientX, y: event.clientY, crop };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !imageRect || !transformed) return;
    const deltaX = (event.clientX - drag.x) / imageRect.width;
    const deltaY = (event.clientY - drag.y) / imageRect.height;
    updateCrop(drag.mode === "move"
      ? moveCrop(drag.crop, deltaX, deltaY)
      : resizeCrop(drag.crop, drag.mode, deltaX, deltaY, transformed.width, transformed.height, aspect));
  };

  const finishDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleCropKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!transformed || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.01;
    const deltaX = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const deltaY = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    updateCrop(moveCrop(crop, deltaX, deltaY));
  };

  const updatePixelField = (field: "x" | "y" | "width" | "height", value: number) => {
    if (!transformed || !cropPixels || !Number.isFinite(value)) return;
    const next = { ...cropPixels, [field]: Math.round(value) };
    if (aspect && field === "width") next.height = Math.max(1, Math.round(next.width / aspect));
    if (aspect && field === "height") next.width = Math.max(1, Math.round(next.height * aspect));
    updateCrop(cropFromPixels(next, transformed.width, transformed.height));
  };

  const setCircleMode = (enabled: boolean) => {
    setCircle(enabled);
    if (enabled) {
      setAspectPreset("1:1");
      resetCropFor(rotation, 1);
    } else {
      resetCropFor(rotation, 1);
    }
  };

  const updateOutputWidth = (width: number) => {
    setOutputWidth(width);
    if (cropPixels && width > 0) setOutputHeight(Math.max(1, Math.round(width * cropPixels.height / cropPixels.width)));
    clearOutput();
  };

  const updateOutputHeight = (height: number) => {
    setOutputHeight(height);
    if (cropPixels && height > 0) setOutputWidth(Math.max(1, Math.round(height * cropPixels.width / cropPixels.height)));
    clearOutput();
  };

  const processCrop = async () => {
    const decoded = decodedRef.current;
    if (!decoded || !imageInfo || !transformed || !cropPixels) {
      setError("กรุณาเลือกรูปก่อนครอป");
      return;
    }
    const width = sizeMode === "original" ? cropPixels.width : outputWidth;
    const height = sizeMode === "original" ? cropPixels.height : outputHeight;
    try {
      validateCropOutput(width, height);
      if (outputMime === "image/jpeg" && !/^#[0-9a-f]{6}$/i.test(background)) throw new Error("สีพื้นหลังต้องเป็นรหัส Hex 6 หลัก");
      setProcessing(true);
      setError("");
      clearOutput();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: outputMime !== "image/jpeg" });
      if (!context) throw new Error("Browser ไม่รองรับ Canvas");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (outputMime === "image/jpeg") {
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);
      }
      context.save();
      if (circle) {
        context.beginPath();
        context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        context.clip();
      }
      context.scale(width / cropPixels.width, height / cropPixels.height);
      context.translate(-cropPixels.x, -cropPixels.y);
      applySourceTransform(context, decoded.width, decoded.height, rotation, flipHorizontal, flipVertical);
      context.drawImage(decoded.source, 0, 0, decoded.width, decoded.height);
      context.restore();

      const blob = await canvasToImageBlob(canvas, outputMime, quality / 100);
      const format = formatLabel(outputMime);
      const result = {
        blob,
        filename: createImageOutputName(imageInfo.file.name, format.extension, circle ? "circle" : "cropped"),
        width,
        height,
        format: format.extension.toUpperCase(),
      };
      setOutput(result);
      setOutputUrl(URL.createObjectURL(blob));
      toast.success("ครอปรูปเรียบร้อยแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ครอปรูปไม่สำเร็จ");
    } finally {
      setProcessing(false);
    }
  };

  const cropStyle = imageRect ? {
    left: imageRect.x + crop.x * imageRect.width,
    top: imageRect.y + crop.y * imageRect.height,
    width: crop.width * imageRect.width,
    height: crop.height * imageRect.height,
  } : undefined;

  return (
    <WorkspaceFrame>
      <div
        className="rounded-xl border border-dashed bg-muted/15 p-4 transition-colors focus-within:border-primary/60"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void selectFile(file); }}
        onPaste={(event) => { const file = Array.from(event.clipboardData.files)[0]; if (file) void selectFile(file); }}
      >
        <div className="flex items-start gap-3">
          <ImageUp className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <Label htmlFor="crop-image-file">เลือกรูป JPG, PNG หรือ WebP</Label>
            <Input ref={inputRef} id="crop-image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); }} />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">ลากหรือวางรูปได้ · สูงสุด 10 MB / 40 ล้านพิกเซล · รูปไม่ถูกอัปโหลด</p>
          </div>
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {imageInfo ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
          <div className="min-w-0 overflow-hidden rounded-xl border bg-muted/15">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm">
              <span className="min-w-0 truncate font-medium">{imageInfo.file.name}</span>
              <span className="text-xs text-muted-foreground">{imageInfo.width.toLocaleString("th-TH")} × {imageInfo.height.toLocaleString("th-TH")} px · {formatImageBytes(imageInfo.file.size)}</span>
            </div>
            <div
              ref={stageRef}
              className="relative h-[22rem] touch-none overflow-hidden bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] sm:h-[30rem]"
              data-testid="crop-stage"
            >
              <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
              {cropStyle ? (
                <div
                  role="group"
                  tabIndex={0}
                  aria-label="พื้นที่ครอป ใช้ปุ่มลูกศรเพื่อเลื่อน หรือ Shift พร้อมลูกศรเพื่อเลื่อนเร็ว"
                  className={`absolute cursor-move border-2 border-white outline-none ring-primary shadow-[0_0_0_9999px_rgb(0_0_0/0.58)] focus-visible:ring-4 ${circle ? "rounded-full" : "rounded-sm"}`}
                  style={cropStyle}
                  onPointerDown={(event) => startDrag(event, "move")}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  onKeyDown={handleCropKeyboard}
                  data-testid="crop-selection"
                >
                  <div className={`pointer-events-none absolute inset-0 opacity-45 ${circle ? "rounded-full" : ""} bg-[linear-gradient(to_right,transparent_33%,white_33%,white_calc(33%+1px),transparent_calc(33%+1px),transparent_66%,white_66%,white_calc(66%+1px),transparent_calc(66%+1px)),linear-gradient(to_bottom,transparent_33%,white_33%,white_calc(33%+1px),transparent_calc(33%+1px),transparent_66%,white_66%,white_calc(66%+1px),transparent_calc(66%+1px))]`} />
                  {(["nw", "ne", "sw", "se"] as CropHandle[]).map((handle) => (
                    <span
                      key={handle}
                      aria-hidden="true"
                      className={`absolute z-10 size-11 rounded-full ${handle === "nw" ? "-top-5 -left-5 cursor-nwse-resize" : handle === "ne" ? "-top-5 -right-5 cursor-nesw-resize" : handle === "sw" ? "-bottom-5 -left-5 cursor-nesw-resize" : "-right-5 -bottom-5 cursor-nwse-resize"}`}
                      onPointerDown={(event) => startDrag(event, handle)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={finishDrag}
                    ><span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow" /></span>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="border-t px-4 py-2 text-xs leading-5 text-muted-foreground">ลากกรอบหรือจุดมุมเพื่อครอป · โฟกัสกรอบแล้วใช้ลูกศร (Shift = 5%) · ใช้ช่อง X/Y/W/H เพื่อควบคุมละเอียด</p>
          </div>

          <div className="space-y-5 rounded-xl border bg-muted/10 p-4">
            <section aria-labelledby="crop-ratio-title">
              <h2 id="crop-ratio-title" className="text-sm font-semibold">กรอบและสัดส่วน</h2>
              <div className="mt-3">
                <Label htmlFor="crop-aspect">อัตราส่วน</Label>
                <Select value={aspectPreset} onValueChange={changeAspect}><SelectTrigger id="crop-aspect" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{aspectPresets.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
              </div>
              {aspectPreset === "custom" ? <div className="mt-3 grid grid-cols-2 gap-3"><div><Label htmlFor="custom-aspect-width">กว้าง</Label><Input id="custom-aspect-width" type="number" min={1} max={100} value={customAspectWidth} onChange={(event) => { const value = Number(event.target.value); setCustomAspectWidth(value); resetCropFor(rotation, value / customAspectHeight); }} /></div><div><Label htmlFor="custom-aspect-height">สูง</Label><Input id="custom-aspect-height" type="number" min={1} max={100} value={customAspectHeight} onChange={(event) => { const value = Number(event.target.value); setCustomAspectHeight(value); resetCropFor(rotation, customAspectWidth / value); }} /></div></div> : null}
              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-background/70 px-3 py-2 text-sm"><input type="checkbox" checked={circle} onChange={(event) => setCircleMode(event.target.checked)} className="size-4 accent-primary" /><span><span className="font-medium">ครอปเป็นวงกลม</span><span className="block text-xs text-muted-foreground">PNG/WebP โปร่งใส หรือ JPG พร้อมสีพื้น</span></span></label>
              {cropPixels && transformed ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2"><div><Label htmlFor="crop-x">X (px)</Label><Input id="crop-x" type="number" min={0} max={transformed.width - 1} value={cropPixels.x} onChange={(event) => updatePixelField("x", Number(event.target.value))} /></div><div><Label htmlFor="crop-y">Y (px)</Label><Input id="crop-y" type="number" min={0} max={transformed.height - 1} value={cropPixels.y} onChange={(event) => updatePixelField("y", Number(event.target.value))} /></div><div><Label htmlFor="crop-width">W (px)</Label><Input id="crop-width" type="number" min={1} max={transformed.width} value={cropPixels.width} onChange={(event) => updatePixelField("width", Number(event.target.value))} /></div><div><Label htmlFor="crop-height">H (px)</Label><Input id="crop-height" type="number" min={1} max={transformed.height} value={cropPixels.height} onChange={(event) => updatePixelField("height", Number(event.target.value))} /></div></div> : null}
            </section>

            <section className="border-t pt-5" aria-labelledby="crop-transform-title">
              <h2 id="crop-transform-title" className="text-sm font-semibold">หมุนและพลิก</h2>
              <div className="mt-3 grid grid-cols-3 gap-2"><Button type="button" variant="outline" size="sm" onClick={rotate}><RotateCw />หมุน</Button><Button type="button" variant={flipHorizontal ? "default" : "outline"} size="sm" onClick={() => { setFlipHorizontal((value) => !value); clearOutput(); }} aria-pressed={flipHorizontal}><FlipHorizontal2 />แนวนอน</Button><Button type="button" variant={flipVertical ? "default" : "outline"} size="sm" onClick={() => { setFlipVertical((value) => !value); clearOutput(); }} aria-pressed={flipVertical}><FlipVertical2 />แนวตั้ง</Button></div>
            </section>

            <section className="border-t pt-5" aria-labelledby="crop-export-title">
              <h2 id="crop-export-title" className="text-sm font-semibold">ไฟล์ผลลัพธ์</h2>
              <div className="mt-3"><Label htmlFor="crop-size-mode">ความละเอียด</Label><Select value={sizeMode} onValueChange={(value) => { setSizeMode(value); if (value === "custom" && cropPixels) { setOutputWidth(cropPixels.width); setOutputHeight(cropPixels.height); } clearOutput(); }}><SelectTrigger id="crop-size-mode" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="original">เท่าพื้นที่ที่เลือก</SelectItem><SelectItem value="custom">กำหนดพิกเซลเอง</SelectItem></SelectContent></Select></div>
              {sizeMode === "custom" ? <div className="mt-3 grid grid-cols-2 gap-3"><div><Label htmlFor="crop-output-width">กว้าง (px)</Label><Input id="crop-output-width" type="number" min={1} max={CROP_OUTPUT_MAX_DIMENSION} value={outputWidth} onChange={(event) => updateOutputWidth(Number(event.target.value))} /></div><div><Label htmlFor="crop-output-height">สูง (px)</Label><Input id="crop-output-height" type="number" min={1} max={CROP_OUTPUT_MAX_DIMENSION} value={outputHeight} onChange={(event) => updateOutputHeight(Number(event.target.value))} /></div><p className="col-span-2 text-xs text-muted-foreground">ล็อกสัดส่วนอัตโนมัติ · สูงสุด 8,000 px / 24 ล้านพิกเซล</p></div> : cropPixels ? <p className="mt-2 text-xs text-muted-foreground">ผลลัพธ์ {cropPixels.width.toLocaleString("th-TH")} × {cropPixels.height.toLocaleString("th-TH")} px</p> : null}
              <div className="mt-3"><Label htmlFor="crop-output-format">รูปแบบ</Label><Select value={outputMime} onValueChange={(value) => { setOutputMime(value as BrowserImageMime); clearOutput(); }}><SelectTrigger id="crop-output-format" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{formats.map((format) => <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>)}</SelectContent></Select></div>
              {outputMime === "image/jpeg" ? <div className="mt-3"><Label htmlFor="crop-background">สีพื้นหลัง JPG</Label><div className="flex gap-2"><Input id="crop-background" value={background} maxLength={7} onChange={(event) => { setBackground(event.target.value); clearOutput(); }} /><Input type="color" value={background} onChange={(event) => { setBackground(event.target.value); clearOutput(); }} className="w-12 shrink-0 p-1" aria-label="เลือกสีพื้นหลัง JPG" /></div></div> : null}
              <div className="mt-3"><div className="flex items-center justify-between gap-3"><Label htmlFor="crop-quality">คุณภาพ</Label><span className="text-sm font-semibold text-primary">{outputMime === "image/png" ? "คงที่" : `${quality}%`}</span></div><input id="crop-quality" type="range" min={40} max={100} step={5} value={quality} disabled={outputMime === "image/png"} onChange={(event) => { setQuality(Number(event.target.value)); clearOutput(); }} className="mt-3 h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" /></div>
            </section>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid min-h-44 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground"><div><Crop className="mx-auto mb-3 size-7" /><p>เลือกรูปหรือลองรูปแมวตัวอย่างเพื่อเริ่มครอป</p></div></div>
      )}

      <div className="mt-5"><ActionBar><Button type="button" onClick={() => void processCrop()} disabled={!imageInfo || processing}><Crop />{processing ? "กำลังสร้างไฟล์..." : "ครอปและสร้างไฟล์"}</Button><ExampleButton onExample={() => void loadExample()} disabled={processing} /><ClearButton onClear={clear} disabled={processing} /></ActionBar></div>

      {output && outputUrl ? (
        <div data-testid="crop-output" className="mt-5 overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.03]" aria-live="polite">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
            <div className="relative min-h-64 border-b bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] lg:border-r lg:border-b-0"><Image src={outputUrl} alt="ตัวอย่างรูปที่ครอปแล้ว" fill unoptimized sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-4" /></div>
            <div className="p-5"><div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><p className="font-semibold">พร้อมดาวน์โหลด</p></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">ความละเอียด</dt><dd className="mt-1 font-semibold">{output.width.toLocaleString("th-TH")} × {output.height.toLocaleString("th-TH")}</dd></div><div className="rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">ขนาดไฟล์</dt><dd className="mt-1 font-semibold">{formatImageBytes(output.blob.size)}</dd></div><div className="col-span-2 rounded-lg border bg-background/70 p-3"><dt className="text-xs text-muted-foreground">รูปแบบ</dt><dd className="mt-1 font-semibold">{output.format}{circle ? " · วงกลม" : ""}</dd></div></dl><p className="mt-4 truncate text-xs text-muted-foreground" title={output.filename}>{output.filename}</p><Button className="mt-2 w-full" onClick={() => { downloadBlob(output.blob, output.filename); toast.success("ดาวน์โหลดรูปแล้ว"); }} aria-label={`ดาวน์โหลด ${output.filename}`}><Download />ดาวน์โหลด {output.format}</Button></div>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">ไฟล์ถูกวาดใหม่ผ่าน Canvas จึงไม่คัดลอก EXIF, GPS, ICC profile หรือ metadata เดิม ควรเก็บต้นฉบับและตรวจผลลัพธ์ก่อนพิมพ์หรือส่งงาน</p>
    </WorkspaceFrame>
  );
}
