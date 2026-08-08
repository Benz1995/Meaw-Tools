"use client";

import Image from "next/image";
import { AppWindow, Download, ImageUp, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canvasToImageBlob, decodeBrowserImage } from "@/lib/tools/image-browser";
import {
  type IconFitMode,
  buildFaviconHeadSnippet,
  buildFaviconReadme,
  buildWebManifest,
  calculateIconDrawPlan,
  createMultiSizeIco,
  validateHexColor,
} from "@/lib/tools/favicon";
import { IMAGE_FILE_LIMIT_BYTES } from "@/lib/tools/limits";
import { formatImageBytes, validateDecodedImage } from "@/lib/tools/images";

type ImageInfo = { file: File; width: number; height: number };
type GeneratedAsset = { filename: string; blob: Blob; width?: number; height?: number; previewUrl?: string };
type GeneratedPackage = { assets: GeneratedAsset[]; zip: Blob; manifest: string; snippet: string };

const pngAssets = [
  { filename: "favicon-16x16.png", size: 16, kind: "favicon" },
  { filename: "favicon-32x32.png", size: 32, kind: "favicon" },
  { filename: "favicon-48x48.png", size: 48, kind: "favicon" },
  { filename: "apple-touch-icon.png", size: 180, kind: "apple" },
  { filename: "pwa-192x192.png", size: 192, kind: "pwa" },
  { filename: "pwa-512x512.png", size: 512, kind: "pwa" },
  { filename: "pwa-maskable-512x512.png", size: 512, kind: "maskable" },
] as const;

const previewFilenames = new Set(["favicon-32x32.png", "apple-touch-icon.png", "pwa-192x192.png", "pwa-maskable-512x512.png"]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

async function blobBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

export function FaviconGeneratorTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const decodedRef = useRef<Awaited<ReturnType<typeof decodeBrowserImage>> | null>(null);
  const selectionRef = useRef(0);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [fitMode, setFitMode] = useState<IconFitMode>("contain");
  const [padding, setPadding] = useState(12);
  const [transparent, setTransparent] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#fff7e8");
  const [themeColor, setThemeColor] = useState("#0f9f8f");
  const [appName, setAppName] = useState("Meaw Tools");
  const [shortName, setShortName] = useState("Meaw");
  const [startUrl, setStartUrl] = useState("/");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<GeneratedPackage | null>(null);

  useEffect(() => () => decodedRef.current?.close(), []);
  useEffect(() => () => output?.assets.forEach((asset) => { if (asset.previewUrl) URL.revokeObjectURL(asset.previewUrl); }), [output]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const decoded = decodedRef.current;
    if (!canvas || !decoded || !imageInfo) return;
    const size = 320;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, size, size);
    if (!transparent || fitMode === "cover") {
      context.fillStyle = HEX_COLOR.test(backgroundColor) ? backgroundColor : "#fff7e8";
      context.fillRect(0, 0, size, size);
    }
    const plan = calculateIconDrawPlan(decoded.width, decoded.height, size, padding, fitMode);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, plan.sx, plan.sy, plan.sourceWidth, plan.sourceHeight, plan.dx, plan.dy, plan.width, plan.height);
  }, [backgroundColor, fitMode, imageInfo, padding, transparent]);

  const clearOutput = () => {
    setOutput(null);
    setProgress(0);
  };

  const clear = () => {
    selectionRef.current += 1;
    decodedRef.current?.close();
    decodedRef.current = null;
    setImageInfo(null);
    setError("");
    clearOutput();
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (file: File) => {
    const selection = ++selectionRef.current;
    setError("");
    clearOutput();
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("รองรับเฉพาะ PNG, JPG และ WebP ไม่รองรับ SVG, GIF หรือ HEIC เพื่อหลีกเลี่ยงเนื้อหาภายนอกและภาพเคลื่อนไหว");
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
      if (selection !== selectionRef.current) return;
      decodedRef.current?.close();
      decodedRef.current = decoded;
      decoded = null;
      setImageInfo({ file, width: decodedRef.current.width, height: decodedRef.current.height });
    } catch (caught) {
      if (selection === selectionRef.current) setError(caught instanceof Error ? caught.message : "อ่านไฟล์รูปไม่สำเร็จ");
    } finally {
      decoded?.close();
    }
  };

  const loadExample = async () => {
    try {
      const response = await fetch("/brand/devthai-cat.png");
      if (!response.ok) throw new Error("โหลดรูปตัวอย่างไม่สำเร็จ");
      await selectFile(new File([await response.blob()], "meaw-cat.png", { type: "image/png", lastModified: Date.now() }));
      toast.success("โหลดโลโก้แมวตัวอย่างแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "โหลดรูปตัวอย่างไม่สำเร็จ");
    }
  };

  const renderPng = async (size: number, maskable: boolean) => {
    const decoded = decodedRef.current;
    if (!decoded) throw new Error("กรุณาเลือกรูปก่อนสร้างไอคอน");
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const useTransparentBackground = transparent && !maskable && fitMode === "contain";
    const context = canvas.getContext("2d", { alpha: useTransparentBackground });
    if (!context) throw new Error("Browser ไม่รองรับ Canvas");
    if (!useTransparentBackground) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, size, size);
    }
    const effectivePadding = maskable ? Math.max(10, padding) : padding;
    const plan = calculateIconDrawPlan(decoded.width, decoded.height, size, effectivePadding, maskable ? "contain" : fitMode);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, plan.sx, plan.sy, plan.sourceWidth, plan.sourceHeight, plan.dx, plan.dy, plan.width, plan.height);
    return canvasToImageBlob(canvas, "image/png", 1);
  };

  const generatePackage = async () => {
    if (!decodedRef.current || !imageInfo) {
      setError("กรุณาเลือกรูปก่อนสร้างแพ็กไอคอน");
      return;
    }
    const temporaryPreviewUrls: string[] = [];
    try {
      validateHexColor(backgroundColor, "สีพื้นหลัง");
      validateHexColor(themeColor, "สี Theme");
      const manifest = buildWebManifest({ name: appName, shortName, startUrl, themeColor, backgroundColor });
      const snippet = buildFaviconHeadSnippet(themeColor);
      setProcessing(true);
      setProgress(5);
      setError("");
      clearOutput();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

      const generatedPngs: GeneratedAsset[] = [];
      for (let index = 0; index < pngAssets.length; index += 1) {
        const definition = pngAssets[index]!;
        const blob = await renderPng(definition.size, definition.kind === "maskable");
        const previewUrl = previewFilenames.has(definition.filename) ? URL.createObjectURL(blob) : undefined;
        if (previewUrl) temporaryPreviewUrls.push(previewUrl);
        generatedPngs.push({
          filename: definition.filename,
          blob,
          width: definition.size,
          height: definition.size,
          previewUrl,
        });
        setProgress(10 + Math.round((index + 1) / pngAssets.length * 55));
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }

      const icoLayers = await Promise.all([16, 32, 48].map(async (size) => {
        const asset = generatedPngs.find((item) => item.width === size)!;
        return { size, bytes: await blobBytes(asset.blob) };
      }));
      const icoBlob = new Blob([Uint8Array.from(createMultiSizeIco(icoLayers))], { type: "image/x-icon" });
      const manifestBlob = new Blob([manifest], { type: "application/manifest+json;charset=utf-8" });
      const snippetBlob = new Blob([snippet], { type: "text/html;charset=utf-8" });
      const readmeBlob = new Blob([buildFaviconReadme()], { type: "text/plain;charset=utf-8" });
      const assets: GeneratedAsset[] = [
        { filename: "favicon.ico", blob: icoBlob },
        ...generatedPngs,
        { filename: "site.webmanifest", blob: manifestBlob },
        { filename: "favicon-head.html", blob: snippetBlob },
        { filename: "README.txt", blob: readmeBlob },
      ];
      setProgress(75);
      const { zipSync } = await import("fflate");
      const zipEntries: Record<string, Uint8Array> = {};
      for (const asset of assets) zipEntries[asset.filename] = await blobBytes(asset.blob);
      const zip = new Blob([Uint8Array.from(zipSync(zipEntries, { level: 6 }))], { type: "application/zip" });
      setOutput({ assets, zip, manifest, snippet });
      temporaryPreviewUrls.length = 0;
      setProgress(100);
      toast.success("สร้างแพ็ก Favicon และ PWA แล้ว");
    } catch (caught) {
      temporaryPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setError(caught instanceof Error ? caught.message : "สร้างแพ็กไอคอนไม่สำเร็จ");
    } finally {
      setProcessing(false);
    }
  };

  const updateSetting = <T,>(setter: Dispatch<SetStateAction<T>>, value: T) => {
    setter(value);
    clearOutput();
  };

  return (
    <WorkspaceFrame>
      <div
        className="rounded-xl border border-dashed bg-muted/15 p-4 transition-colors focus-within:border-primary/60"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (!processing && file) void selectFile(file); }}
        onPaste={(event) => { const file = Array.from(event.clipboardData.files)[0]; if (!processing && file) void selectFile(file); }}
      >
        <div className="flex items-start gap-3"><ImageUp className="mt-0.5 size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><Label htmlFor="favicon-source" className="mb-2.5">เลือกรูปโลโก้ PNG, JPG หรือ WebP</Label><Input ref={inputRef} id="favicon-source" type="file" accept="image/png,image/jpeg,image/webp" disabled={processing} onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); }} /><p className="mt-2 text-xs leading-5 text-muted-foreground">แนะนำรูปสี่เหลี่ยมอย่างน้อย 512×512 px · สูงสุด 10 MB / 40 ล้านพิกเซล · ไม่อัปโหลดรูป</p></div></div>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {imageInfo ? (
        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(19rem,0.85fr)_minmax(0,1.15fr)]">
          <div className="min-w-0 rounded-xl border bg-muted/10 p-4">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><p className="min-w-0 truncate text-sm font-semibold">{imageInfo.file.name}</p><p className="min-w-0 break-words text-right text-xs text-muted-foreground">{imageInfo.width.toLocaleString("th-TH")} × {imageInfo.height.toLocaleString("th-TH")} · {formatImageBytes(imageInfo.file.size)}</p></div>
            {Math.min(imageInfo.width, imageInfo.height) < 512 ? <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">ต้นฉบับมีด้านสั้นต่ำกว่า 512 px ไอคอน PWA 512 อาจไม่คม ควรใช้โลโก้ความละเอียดสูงกว่า</p> : null}
            <div className="mt-4 grid place-items-center overflow-hidden rounded-xl border bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] p-3">
              <div className="relative size-[min(320px,78vw)] max-w-full overflow-hidden rounded-[22%] shadow-sm"><canvas ref={previewCanvasRef} role="img" className="size-full max-w-full" aria-label="ตัวอย่างไอคอนและพื้นที่ปลอดภัย Maskable" /><div className="pointer-events-none absolute top-1/2 left-1/2 size-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/90 shadow-[0_0_0_999px_rgb(0_0_0/0.2)]" /></div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>วงกลมเส้นประคือ minimum safe zone รัศมี 40% ของ Maskable icon ส่วนสำคัญควรอยู่ภายในวงกลม</p></div>
          </div>

          <div className="min-w-0 space-y-5 rounded-xl border bg-muted/10 p-4">
            <section aria-labelledby="favicon-layout-title"><h2 id="favicon-layout-title" className="text-sm font-semibold">จัดวางโลโก้</h2><div className="mt-3"><Label htmlFor="favicon-fit">วิธีจัดรูป</Label><Select value={fitMode} onValueChange={(value) => updateSetting(setFitMode, value as IconFitMode)}><SelectTrigger id="favicon-fit" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contain">เห็นโลโก้ครบ พร้อมระยะขอบ</SelectItem><SelectItem value="cover">ตัดกลางรูปให้เต็มพื้นที่</SelectItem></SelectContent></Select></div><div className="mt-3"><div className="flex items-center justify-between gap-3"><Label htmlFor="favicon-padding">ระยะขอบ</Label><span className="text-sm font-semibold text-primary">{fitMode === "cover" ? "ใช้กับ Maskable เท่านั้น" : `${padding}%`}</span></div><input id="favicon-padding" type="range" min={0} max={30} step={1} value={padding} onChange={(event) => updateSetting(setPadding, Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer accent-primary" /><p className="mt-2 text-xs leading-5 text-muted-foreground">Maskable icon จะเห็นโลโก้ครบและใช้ระยะขอบอย่างน้อย 10% เสมอ แม้ไอคอนทั่วไปเลือกตัดเต็มพื้นที่</p></div><label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-background/70 px-3 py-2 text-sm"><input type="checkbox" checked={transparent} disabled={fitMode === "cover"} onChange={(event) => updateSetting(setTransparent, event.target.checked)} className="size-4 accent-primary" /><span><span className="font-medium">พื้นโปร่งใสสำหรับไอคอนทั่วไป</span><span className="block text-xs text-muted-foreground">Maskable ยังใช้สีพื้นเสมอเพื่อป้องกันระบบเติมสีเอง</span></span></label></section>

            <section className="border-t pt-5" aria-labelledby="favicon-color-title"><h2 id="favicon-color-title" className="text-sm font-semibold">สีและข้อมูล Web App</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="favicon-background">สีพื้นหลัง</Label><div className="flex gap-2"><Input id="favicon-background" value={backgroundColor} maxLength={7} onChange={(event) => updateSetting(setBackgroundColor, event.target.value)} /><Input type="color" value={HEX_COLOR.test(backgroundColor) ? backgroundColor : "#fff7e8"} onChange={(event) => updateSetting(setBackgroundColor, event.target.value)} className="w-12 shrink-0 p-1" aria-label="เลือกสีพื้นหลังไอคอน" /></div></div><div><Label htmlFor="favicon-theme">สี Theme</Label><div className="flex gap-2"><Input id="favicon-theme" value={themeColor} maxLength={7} onChange={(event) => updateSetting(setThemeColor, event.target.value)} /><Input type="color" value={HEX_COLOR.test(themeColor) ? themeColor : "#0f9f8f"} onChange={(event) => updateSetting(setThemeColor, event.target.value)} className="w-12 shrink-0 p-1" aria-label="เลือกสี Theme" /></div></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="favicon-app-name">ชื่อ Web App</Label><Input id="favicon-app-name" value={appName} maxLength={100} onChange={(event) => updateSetting(setAppName, event.target.value)} /></div><div><Label htmlFor="favicon-short-name">ชื่อย่อ</Label><Input id="favicon-short-name" value={shortName} maxLength={30} onChange={(event) => updateSetting(setShortName, event.target.value)} /></div></div><div className="mt-3"><Label htmlFor="favicon-start-url">Start URL</Label><Input id="favicon-start-url" value={startUrl} maxLength={200} onChange={(event) => updateSetting(setStartUrl, event.target.value)} placeholder="/" /><p className="mt-2 text-xs text-muted-foreground">ใช้ path ภายในเว็บ เช่น / หรือ /app/ ไม่รับ URL ภายนอก</p></div></section>
          </div>
        </div>
      ) : <div className="mt-5 grid min-h-44 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground"><div><AppWindow className="mx-auto mb-3 size-7" /><p>เลือกโลโก้หรือใช้ตัวอย่างเพื่อสร้างไอคอนครบชุด</p></div></div>}

      <div className="mt-5"><ActionBar><Button type="button" onClick={() => void generatePackage()} disabled={!imageInfo || processing}><PackageCheck />{processing ? `กำลังสร้าง... ${progress}%` : "สร้างแพ็ก Favicon + PWA"}</Button><ExampleButton onExample={() => void loadExample()} disabled={processing} /><ClearButton onClear={clear} disabled={processing} /></ActionBar>{processing || progress > 0 ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="ความคืบหน้าการสร้างไอคอน" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div> : null}</div>

      {output ? (
        <div data-testid="favicon-output" className="mt-5 overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.03]" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><h2 className="font-semibold">แพ็กพร้อมใช้งาน 11 ไฟล์</h2></div><p className="mt-1 text-xs text-muted-foreground">ICO หลายขนาด · PNG · Apple touch · PWA any/maskable · Manifest · HTML · README</p></div><Button type="button" onClick={() => downloadBlob(output.zip, "meaw-favicon-pwa-package.zip")}><Download />ดาวน์โหลด ZIP · {formatImageBytes(output.zip.size)}</Button></div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">{output.assets.filter((asset) => asset.previewUrl).map((asset) => <div key={asset.filename} className="rounded-xl border bg-background/70 p-3"><div className="grid aspect-square place-items-center rounded-lg bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-3"><Image src={asset.previewUrl!} alt={`ตัวอย่าง ${asset.filename}`} width={160} height={160} unoptimized className="size-full object-contain" /></div><p className="mt-3 truncate text-xs font-medium" title={asset.filename}>{asset.filename}</p><p className="mt-1 text-xs text-muted-foreground">{asset.width}×{asset.height} · {formatImageBytes(asset.blob.size)}</p><Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={() => downloadBlob(asset.blob, asset.filename)} aria-label={`ดาวน์โหลด ${asset.filename}`}><Download />ดาวน์โหลด</Button></div>)}</div>
          <div className="grid gap-4 border-t p-4 lg:grid-cols-2"><div><Label htmlFor="favicon-manifest-output">site.webmanifest</Label><Textarea id="favicon-manifest-output" value={output.manifest} readOnly className="min-h-64 font-mono text-xs" /><div className="mt-3"><CopyButton value={output.manifest} label="คัดลอก Manifest" /></div></div><div><Label htmlFor="favicon-html-output">HTML สำหรับ &lt;head&gt;</Label><Textarea id="favicon-html-output" value={output.snippet} readOnly className="min-h-64 font-mono text-xs" /><div className="mt-3"><CopyButton value={output.snippet} label="คัดลอก HTML" /></div></div></div>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">ไฟล์ใหม่ไม่เก็บ EXIF, GPS หรือ metadata เดิม ไอคอนและ Manifest เป็นเพียงส่วนหนึ่งของ PWA—การติดตั้งยังขึ้นกับ HTTPS, Service Worker และเกณฑ์ของ Browser ควรตรวจใน DevTools หลัง Deploy</p>
    </WorkspaceFrame>
  );
}
