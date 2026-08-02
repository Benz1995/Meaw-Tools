"use client";

import Image from "next/image";
import { Camera, CameraOff, ExternalLink, FileImage, LoaderCircle, QrCode, ScanLine, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QR_SCAN_MAX_CAMERA_DIMENSION,
  QR_SCAN_MAX_IMAGE_DIMENSION,
  calculateQrScanDimensions,
  classifyQrContent,
  getCameraErrorMessage,
  validateQrImageInput,
} from "@/lib/tools/qr-scanner";
import { validateDecodedImage } from "@/lib/tools/images";

type ScannerMode = "upload" | "camera";
type QrScanSource = "รูปภาพ" | "กล้อง";

type QrScanResult = {
  data: string;
  source: QrScanSource;
};

type PreviewInfo = {
  name: string;
  size: number;
  width: number;
  height: number;
};

function formatBytes(value: number) {
  if (value < 1_024) return `${value} B`;
  if (value < 1_024 * 1_024) return `${(value / 1_024).toFixed(1)} KB`;
  return `${(value / 1_024 / 1_024).toFixed(2)} MB`;
}

function pngDataUrlToFile(dataUrl: string, name: string) {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) throw new Error("รูปตัวอย่าง QR Code ไม่ถูกต้อง");
  const binary = window.atob(dataUrl.slice(prefix.length));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], name, { type: "image/png", lastModified: 0 });
}

async function decodeImage(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap as CanvasImageSource, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }

  const url = URL.createObjectURL(file);
  const image = document.createElement("img");
  image.decoding = "async";
  image.src = url;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Browser ไม่สามารถอ่านรูปนี้ได้")); };
  });
  return { source: image as CanvasImageSource, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

export function QrScannerTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef(0);
  const lastCameraScanRef = useRef(0);
  const sessionRef = useRef(0);
  const selectionRef = useRef(0);
  const decoderRef = useRef<typeof import("jsqr").default | null>(null);

  const [mode, setMode] = useState<ScannerMode>("upload");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null);
  const [result, setResult] = useState<QrScanResult | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const releaseCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => releaseCamera(), [releaseCamera]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const stopCamera = () => {
    sessionRef.current += 1;
    releaseCamera();
    setCameraActive(false);
    setCameraStarting(false);
  };

  const loadDecoder = async () => {
    if (!decoderRef.current) decoderRef.current = (await import("jsqr")).default;
    return decoderRef.current;
  };

  const acceptResult = (data: string, source: QrScanSource) => {
    setResult({ data, source });
    setError("");
    toast.success("อ่าน QR Code สำเร็จ");
  };

  const scanFile = async (file: File) => {
    const selection = ++selectionRef.current;
    stopCamera();
    setMode("upload");
    setResult(null);
    setError("");
    setPreviewInfo(null);

    try {
      validateQrImageInput(file.type, file.size);
    } catch (caught) {
      setPreviewUrl("");
      setError(caught instanceof Error ? caught.message : "ไฟล์รูปไม่ถูกต้อง");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setProcessing(true);
    let decoded: Awaited<ReturnType<typeof decodeImage>> | null = null;
    try {
      decoded = await decodeImage(file);
      validateDecodedImage(decoded.width, decoded.height);
      const decoder = await loadDecoder();
      if (selection !== selectionRef.current) return;
      const size = calculateQrScanDimensions(decoded.width, decoded.height, QR_SCAN_MAX_IMAGE_DIMENSION);
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Browser ไม่รองรับ Canvas สำหรับอ่าน QR Code");
      context.drawImage(decoded.source, 0, 0, size.width, size.height);
      const imageData = context.getImageData(0, 0, size.width, size.height);
      const code = decoder(imageData.data, size.width, size.height, { inversionAttempts: "attemptBoth" });
      if (selection !== selectionRef.current) return;
      setPreviewInfo({ name: file.name, size: file.size, width: decoded.width, height: decoded.height });
      if (!code?.data) {
        setError("ไม่พบ QR Code ในรูป ลองใช้รูปที่คมชัด เห็นโค้ดครบทั้งสี่มุม และมีแสงสม่ำเสมอ");
        return;
      }
      acceptResult(code.data, "รูปภาพ");
    } catch (caught) {
      if (selection !== selectionRef.current) return;
      setError(caught instanceof Error ? caught.message : "อ่าน QR Code จากรูปไม่สำเร็จ");
    } finally {
      decoded?.close();
      if (selection === selectionRef.current) setProcessing(false);
    }
  };

  const scanCameraFrame = (session: number) => {
    const tick = (time: number) => {
      if (session !== sessionRef.current || !streamRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const decoder = decoderRef.current;
      if (video && canvas && decoder && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && time - lastCameraScanRef.current >= 180) {
        lastCameraScanRef.current = time;
        const size = calculateQrScanDimensions(video.videoWidth, video.videoHeight, QR_SCAN_MAX_CAMERA_DIMENSION);
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, size.width, size.height);
          const imageData = context.getImageData(0, 0, size.width, size.height);
          const code = decoder(imageData.data, size.width, size.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            acceptResult(code.data, "กล้อง");
            stopCamera();
            return;
          }
        }
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser นี้ไม่รองรับการเปิดกล้อง กรุณาอัปโหลดรูป QR Code แทน");
      return;
    }

    stopCamera();
    const session = ++sessionRef.current;
    setMode("camera");
    setResult(null);
    setError("");
    setCameraStarting(true);
    try {
      await loadDecoder();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1_280 }, height: { ideal: 720 } },
      });
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) throw new Error("ไม่พบพื้นที่แสดงภาพจากกล้อง");
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      setCameraStarting(false);
      scanCameraFrame(session);
    } catch (caught) {
      if (session !== sessionRef.current) return;
      releaseCamera();
      setCameraActive(false);
      setCameraStarting(false);
      setError(caught instanceof DOMException ? getCameraErrorMessage(caught.name) : caught instanceof Error ? caught.message : getCameraErrorMessage("UnknownError"));
    }
  };

  const loadExample = async () => {
    try {
      const QRCodeModule = await import("qrcode");
      const dataUrl = await QRCodeModule.toDataURL("https://meaw-tools.vercel.app", { width: 512, margin: 3, errorCorrectionLevel: "M" });
      await scanFile(pngDataUrlToFile(dataUrl, "meaw-tools-qr-example.png"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สร้าง QR Code ตัวอย่างไม่สำเร็จ");
    }
  };

  const clear = () => {
    selectionRef.current += 1;
    stopCamera();
    setMode("upload");
    setPreviewUrl("");
    setPreviewInfo(null);
    setResult(null);
    setError("");
    setProcessing(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectMode = (nextMode: ScannerMode) => {
    if (nextMode === mode) return;
    stopCamera();
    setMode(nextMode);
    setError("");
  };

  const contentInfo = result ? classifyQrContent(result.data) : null;

  return (
    <WorkspaceFrame>
      <section aria-labelledby="qr-source-title">
        <div className="flex items-center gap-2">
          <ScanLine className="size-4 text-primary" />
          <h2 id="qr-source-title" className="text-base font-semibold">เลือกวิธีอ่าน QR Code</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="วิธีอ่าน QR Code">
          <Button type="button" variant={mode === "upload" ? "default" : "outline"} aria-pressed={mode === "upload"} onClick={() => selectMode("upload")}><Upload className="size-4" />อัปโหลดรูป</Button>
          <Button type="button" variant={mode === "camera" ? "default" : "outline"} aria-pressed={mode === "camera"} onClick={() => selectMode("camera")}><Camera className="size-4" />ใช้กล้อง</Button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.82fr)]">
        <section className="min-w-0 rounded-xl border bg-muted/10 p-4" aria-labelledby="qr-input-title">
          {mode === "upload" ? (
            <>
              <div className="space-y-2.5">
                <Label id="qr-input-title" htmlFor="qr-image-file">เลือกรูป QR Code</Label>
                <Input ref={inputRef} id="qr-image-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void scanFile(file); }} />
                <p className="text-xs leading-5 text-muted-foreground">รองรับ PNG, JPG และ WebP ไม่เกิน 10 MB · ประมวลผลใน Browser</p>
              </div>
              {previewUrl ? (
                <div className="mt-4 overflow-hidden rounded-xl border bg-white">
                  <div className="relative h-64 sm:h-80">
                    <Image src={previewUrl} alt="รูป QR Code ที่เลือก" fill unoptimized sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-4" />
                  </div>
                  {previewInfo ? <p className="border-t px-3 py-2 text-xs text-slate-600">{previewInfo.name} · {formatBytes(previewInfo.size)} · {previewInfo.width.toLocaleString("th-TH")} × {previewInfo.height.toLocaleString("th-TH")} px</p> : null}
                </div>
              ) : <div className="mt-4"><EmptyOutput size="compact" text="เลือกรูปที่เห็น QR Code ครบทั้งสี่มุม หรือกดตัวอย่างเพื่อทดลอง" /></div>}
            </>
          ) : (
            <>
              <h3 id="qr-input-title" className="text-sm font-semibold">สแกนด้วยกล้อง</h3>
              <div className="relative mt-3 grid min-h-72 place-items-center overflow-hidden rounded-xl border bg-slate-950">
                <video ref={videoRef} autoPlay muted playsInline className={`h-full max-h-[28rem] w-full object-contain ${cameraActive ? "block" : "hidden"}`} aria-label="ภาพจากกล้องสำหรับสแกน QR Code" />
                {cameraActive ? <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-primary shadow-[0_0_0_999px_rgba(0,0,0,.28)]" aria-hidden="true" /> : null}
                {!cameraActive ? <div className="p-6 text-center text-sm text-slate-300"><Camera className="mx-auto mb-3 size-12 opacity-40" />กล้องจะเริ่มหลังจากคุณกดเปิดและอนุญาตสิทธิ์</div> : null}
              </div>
              <div className="mt-3">
                {cameraActive ? <Button type="button" variant="destructive" onClick={stopCamera}><CameraOff className="size-4" />หยุดกล้อง</Button> : <Button type="button" onClick={() => void startCamera()} disabled={cameraStarting}>{cameraStarting ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}{cameraStarting ? "กำลังเปิดกล้อง..." : "เปิดกล้องเพื่อสแกน"}</Button>}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">หันกล้องให้ QR Code อยู่ในกรอบและมีแสงพอ ระบบตรวจประมาณ 5 ครั้งต่อวินาทีและหยุดกล้องเมื่ออ่านสำเร็จ</p>
            </>
          )}
        </section>

        <section className="min-w-0 rounded-xl border bg-background/70 p-4" aria-labelledby="qr-result-title">
          <div className="flex items-center gap-2">
            <QrCode className="size-4 text-primary" />
            <h2 id="qr-result-title" className="font-semibold">ผลการอ่าน</h2>
          </div>
          {processing ? <div className="mt-4 grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/20 text-center text-sm text-muted-foreground"><span><LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-primary" />กำลังอ่าน QR Code จากรูป...</span></div> : null}
          {!processing && result && contentInfo ? (
            <div className="mt-4" data-testid="qr-scan-result" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{contentInfo.label}</span>
                <span className="text-xs text-muted-foreground">อ่านจาก{result.source}</span>
              </div>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-4 text-sm leading-6"><code>{result.data}</code></pre>
              <div className="mt-3">
                <ActionBar>
                  <CopyButton value={result.data} label="คัดลอกผลลัพธ์" />
                  {contentInfo.safeUrl ? <Button type="button" variant="outline" asChild><a href={contentInfo.safeUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />เปิด {contentInfo.hostname}</a></Button> : null}
                </ActionBar>
              </div>
              {contentInfo.safeUrl ? <p className="mt-3 flex gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200"><ShieldAlert className="mt-0.5 size-4 shrink-0" />ตรวจชื่อโดเมนและปลายทางให้แน่ใจก่อนเปิด Meaw Tools ไม่ตรวจว่าเว็บไซต์ปลอดภัยและจะไม่เปิดลิงก์อัตโนมัติ</p> : null}
              {contentInfo.kind === "wifi" ? <p className="mt-3 text-xs leading-5 text-muted-foreground">ผลลัพธ์ Wi-Fi อาจมีรหัสผ่าน หลีกเลี่ยงการแชร์ภาพหน้าจอหรือส่งต่อให้บุคคลอื่น</p> : null}
            </div>
          ) : null}
          {!processing && !result ? <div className="mt-4"><EmptyOutput size="compact" text="ผลลัพธ์จะแสดงที่นี่ และลิงก์จะไม่ถูกเปิดโดยอัตโนมัติ" /></div> : null}
        </section>
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

      <div className="mt-5">
        <ActionBar>
          <ExampleButton onExample={() => void loadExample()} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      <div className="mt-5 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />รูปและภาพจากกล้องประมวลผลใน Browser ไม่ถูกอัปโหลดหรือบันทึก และกล้องหยุดทันทีเมื่ออ่านสำเร็จหรือออกจากหน้า</p>
        <p className="flex gap-2"><FileImage className="mt-0.5 size-4 shrink-0 text-emerald-600" />รูปที่คมชัด เห็นพื้นที่ว่างรอบ QR Code และไม่เอียงมากจะอ่านได้ง่ายกว่า รูปที่เสียหายหรือเล็กเกินไปอาจอ่านไม่สำเร็จ</p>
      </div>
    </WorkspaceFrame>
  );
}
