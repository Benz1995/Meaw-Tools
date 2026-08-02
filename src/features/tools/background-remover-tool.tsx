"use client";

import Image from "next/image";
import { CheckCircle2, Download, ImageOff, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BACKGROUND_REMOVAL_MAX_DIMENSION, BACKGROUND_REMOVAL_MAX_PIXELS, getModelDownloadPercent, removeImageBackground } from "@/lib/tools/background-removal";
import { createImageOutputName, formatImageBytes } from "@/lib/tools/images";
import { IMAGE_FILE_LIMIT_BYTES } from "@/lib/tools/limits";

type SelectedImage = {
  file: File;
  width: number;
  height: number;
};

type ProcessingStage = "idle" | "model" | "removing" | "done";

async function readImageDimensions(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width > BACKGROUND_REMOVAL_MAX_DIMENSION || bitmap.height > BACKGROUND_REMOVAL_MAX_DIMENSION || bitmap.width * bitmap.height > BACKGROUND_REMOVAL_MAX_PIXELS) {
      throw new Error("รูปสำหรับลบพื้นหลังต้องมีด้านยาวไม่เกิน 4,096 px และรวมไม่เกิน 16 ล้านพิกเซล");
    }
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("สร้างรูปตัวอย่างไม่สำเร็จ")), "image/png");
  });
}

async function createSampleFile() {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ไม่รองรับ Canvas");

  const gradient = context.createLinearGradient(0, 0, 720, 720);
  gradient.addColorStop(0, "#f7d8c5");
  gradient.addColorStop(1, "#b9d8cd");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 720, 720);
  context.fillStyle = "#fffaf0";
  context.beginPath();
  context.arc(360, 380, 205, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#71594b";
  context.beginPath();
  context.moveTo(235, 270);
  context.lineTo(270, 145);
  context.lineTo(340, 255);
  context.lineTo(450, 150);
  context.lineTo(485, 285);
  context.arc(360, 370, 150, -0.55, Math.PI + 0.55);
  context.fill();
  context.fillStyle = "#fffaf0";
  context.beginPath();
  context.arc(310, 360, 13, 0, Math.PI * 2);
  context.arc(410, 360, 13, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#fffaf0";
  context.lineWidth = 8;
  context.beginPath();
  context.arc(360, 410, 35, 0.15, Math.PI - 0.15);
  context.stroke();

  return new File([await canvasToBlob(canvas)], "meaw-cafe.png", { type: "image/png", lastModified: Date.now() });
}

export function BackgroundRemoverTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [output, setOutput] = useState<{ blob: Blob; filename: string } | null>(null);
  const [outputUrl, setOutputUrl] = useState("");
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewBackground, setPreviewBackground] = useState<"checker" | "white" | "pink">("checker");

  useEffect(() => () => { if (inputUrl) URL.revokeObjectURL(inputUrl); }, [inputUrl]);
  useEffect(() => () => { if (outputUrl) URL.revokeObjectURL(outputUrl); }, [outputUrl]);

  const clearOutput = () => {
    setOutput(null);
    setOutputUrl("");
    setProgress(0);
    setStage("idle");
  };

  const clear = () => {
    requestRef.current += 1;
    setSelected(null);
    setInputUrl("");
    clearOutput();
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (file: File) => {
    const request = ++requestRef.current;
    setError("");
    clearOutput();

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSelected(null);
      setInputUrl("");
      setError("รองรับเฉพาะไฟล์ JPG, PNG และ WebP");
      return;
    }
    if (file.size > IMAGE_FILE_LIMIT_BYTES) {
      setSelected(null);
      setInputUrl("");
      setError("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);
      if (request !== requestRef.current) return;
      setSelected({ file, ...dimensions });
      setInputUrl(URL.createObjectURL(file));
    } catch (caught) {
      if (request !== requestRef.current) return;
      setSelected(null);
      setInputUrl("");
      setError(caught instanceof Error ? caught.message : "อ่านไฟล์รูปไม่สำเร็จ");
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

  const removeBackground = async () => {
    if (!selected) {
      setError("กรุณาเลือกรูปก่อนลบพื้นหลัง");
      return;
    }

    const request = ++requestRef.current;
    setError("");
    clearOutput();
    setStage("model");
    setProgress(4);

    try {
      const blob = await removeImageBackground(
        selected.file,
        (event) => {
          const modelPercent = getModelDownloadPercent(event);
          if (modelPercent !== null && request === requestRef.current) {
            setProgress(Math.max(4, Math.min(82, Math.round(4 + modelPercent * 0.78))));
          }
        },
        () => {
          if (request === requestRef.current) {
            setStage("removing");
            setProgress(86);
          }
        },
      );
      if (request !== requestRef.current) return;
      setProgress(94);
      const filename = createImageOutputName(selected.file.name, "png", "no-background");
      setOutput({ blob, filename });
      setOutputUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStage("done");
      toast.success("ลบพื้นหลังเรียบร้อยแล้ว");
    } catch (caught) {
      if (request !== requestRef.current) return;
      setStage("idle");
      setProgress(0);
      setError(caught instanceof Error ? caught.message : "ลบพื้นหลังไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  const processing = stage === "model" || stage === "removing";
  const backgroundClass = previewBackground === "checker"
    ? "bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]"
    : previewBackground === "white" ? "bg-white" : "bg-[#f9d9df]";

  return (
    <WorkspaceFrame>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Label htmlFor="background-remover-file">เลือกรูป JPG, PNG หรือ WebP</Label>
          <Input
            ref={inputRef}
            id="background-remover-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); }}
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ไฟล์ละไม่เกิน 10 MB · ด้านยาวไม่เกิน 4,096 px · รวมไม่เกิน 16 ล้านพิกเซล · รูปไม่ถูกอัปโหลดขึ้น Server</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-primary"><LockKeyhole className="size-4" />ประมวลผลในอุปกรณ์</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ครั้งแรก Browser จะดาวน์โหลด AI Runtime และโมเดลประมาณ 15–20 MB แล้วเก็บใน cache สำหรับครั้งถัดไป</p>
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {selected && inputUrl ? (
        <div className="mt-5 grid overflow-hidden rounded-xl border lg:grid-cols-2">
          <section className="min-w-0 border-b lg:border-r lg:border-b-0" aria-label="รูปต้นฉบับ">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm">
              <span className="min-w-0 truncate font-medium">ต้นฉบับ · {selected.file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatImageBytes(selected.file.size)}</span>
            </div>
            <div className="relative h-64 bg-muted/20 sm:h-80"><Image src={inputUrl} alt="ตัวอย่างรูปต้นฉบับสำหรับลบพื้นหลัง" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-4" /></div>
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">{selected.width.toLocaleString("th-TH")} × {selected.height.toLocaleString("th-TH")} px</p>
          </section>

          <section className="min-w-0" aria-label="ผลลัพธ์พื้นหลังโปร่งใส">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
              <span className="text-sm font-medium">ผลลัพธ์ PNG</span>
              <div className="flex gap-1" role="group" aria-label="สีพื้นหลังตัวอย่าง">
                {(["checker", "white", "pink"] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setPreviewBackground(value)} aria-pressed={previewBackground === value} className={`size-7 rounded-md border transition ${value === "checker" ? "bg-[linear-gradient(45deg,#ddd_25%,#fff_25%,#fff_75%,#ddd_75%)] bg-[length:8px_8px]" : value === "white" ? "bg-white" : "bg-[#f9d9df]"} ${previewBackground === value ? "ring-2 ring-primary ring-offset-1" : ""}`} aria-label={value === "checker" ? "พื้นโปร่งใส" : value === "white" ? "พื้นขาว" : "พื้นชมพู"} />
                ))}
              </div>
            </div>
            <div className={`relative grid h-64 place-items-center sm:h-80 ${backgroundClass}`}>
              {output && outputUrl ? <Image src={outputUrl} alt="รูปที่ลบพื้นหลังแล้ว" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-4" /> : <div className="px-6 text-center text-sm text-muted-foreground"><ImageOff className="mx-auto mb-3 size-7" /><p>กดลบพื้นหลังเพื่อดูผลลัพธ์</p></div>}
            </div>
            <div className="min-h-9 border-t px-4 py-2 text-xs text-muted-foreground">{output ? `${output.filename} · ${formatImageBytes(output.blob.size)}` : "พื้นหลังของไฟล์ผลลัพธ์จะโปร่งใสจริง"}</div>
          </section>
        </div>
      ) : <div className="mt-5"><EmptyOutput size="compact" text="เลือกรูปสินค้า บุคคล สัตว์ หรือวัตถุที่มีตัวแบบเด่นชัดเพื่อเริ่มใช้งาน" /></div>}

      {processing ? (
        <div className="mt-5 rounded-xl border bg-muted/15 p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{stage === "model" ? "กำลังเตรียมโมเดล AI..." : "กำลังสร้าง PNG โปร่งใส..."}</span><span className="font-semibold text-primary">{progress}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">อย่าปิดหน้านี้ระหว่างประมวลผล ครั้งแรกอาจใช้เวลานานตามความเร็วอินเทอร์เน็ตและอุปกรณ์</p>
        </div>
      ) : null}

      <div className="mt-5">
        <ActionBar>
          <Button onClick={() => void removeBackground()} disabled={processing}><Sparkles className="size-4" />{processing ? "กำลังลบพื้นหลัง..." : "ลบพื้นหลังด้วย AI"}</Button>
          <ExampleButton onExample={() => void loadExample()} />
          <ClearButton onClear={clear} />
          {output ? <Button variant="outline" onClick={() => { downloadBlob(output.blob, output.filename); toast.success("ดาวน์โหลด PNG แล้ว"); }} aria-label={`ดาวน์โหลด ${output.filename}`}><Download className="size-4" />ดาวน์โหลด PNG</Button> : null}
        </ActionBar>
      </div>

      {stage === "done" ? <p data-testid="background-remover-output" className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />พร้อมใช้งานแล้ว ควรซูมตรวจขอบผม ขน และวัตถุโปร่งใสก่อนนำไปใช้จริง</p> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">โมเดลขนาดเล็กเหมาะกับตัวแบบที่แยกจากพื้นหลังชัดเจน ผลลัพธ์อาจคลาดเคลื่อนกับพื้นหลังซับซ้อน เงา กระจก เส้นผมละเอียด หรือหลายวัตถุ และไฟล์ PNG ใหม่จะไม่เก็บ EXIF เดิม</p>
    </WorkspaceFrame>
  );
}
