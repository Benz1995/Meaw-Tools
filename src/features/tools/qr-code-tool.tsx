"use client";

import Image from "next/image";
import { Download, QrCode, Sparkles } from "lucide-react";
import { useState } from "react";
import type { QRCodeErrorCorrectionLevel } from "qrcode";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QrSize = 256 | 512 | 1024;

export function QrCodeTool() {
  const [content, setContent] = useState("");
  const [size, setSize] = useState<QrSize>(512);
  const [errorCorrection, setErrorCorrection] = useState<QRCodeErrorCorrectionLevel>("M");
  const [darkColor, setDarkColor] = useState("#0f172a");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [pngUrl, setPngUrl] = useState("");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const clearOutput = () => { setPngUrl(""); setSvg(""); setError(""); };
  const generate = async () => {
    if (!content.trim()) { setError("กรุณากรอกข้อความหรือลิงก์"); return; }
    if (content.length > 2_000) { setError("ข้อความยาวเกิน 2,000 ตัวอักษร"); return; }
    setGenerating(true);
    try {
      const QRCodeModule = await import("qrcode");
      const options = { errorCorrectionLevel: errorCorrection, width: size, margin: 2, color: { dark: darkColor, light: lightColor } };
      const [nextPngUrl, nextSvg] = await Promise.all([
        QRCodeModule.toDataURL(content, options),
        QRCodeModule.toString(content, { ...options, type: "svg" }),
      ]);
      setPngUrl(nextPngUrl);
      setSvg(nextSvg);
      setError("");
      toast.success("สร้าง QR Code แล้ว");
    } catch (caught) {
      setPngUrl("");
      setSvg("");
      setError(caught instanceof Error ? caught.message : "สร้าง QR Code ไม่สำเร็จ");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <Label htmlFor="qr-content">ข้อความหรือลิงก์</Label>
          <Textarea id="qr-content" value={content} onChange={(event) => { setContent(event.target.value); clearOutput(); }} className="min-h-36 resize-y" maxLength={2_000} placeholder="https://meaw-tools.vercel.app" />
          <p className="mt-2 text-right text-xs text-muted-foreground">{content.length.toLocaleString("th-TH")} / 2,000 ตัวอักษร</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="qr-size">ขนาดไฟล์ PNG</Label>
              <Select value={String(size)} onValueChange={(value) => { setSize(Number(value) as QrSize); clearOutput(); }}>
                <SelectTrigger id="qr-size" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{[256, 512, 1024].map((value) => <SelectItem key={value} value={String(value)}>{value} × {value} px</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="qr-error-correction">ความทนทานเมื่อ QR เสียหาย</Label>
              <Select value={String(errorCorrection)} onValueChange={(value) => { setErrorCorrection(value as QRCodeErrorCorrectionLevel); clearOutput(); }}>
                <SelectTrigger id="qr-error-correction" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="L">ต่ำ (L)</SelectItem><SelectItem value="M">ปานกลาง (M)</SelectItem><SelectItem value="Q">สูง (Q)</SelectItem><SelectItem value="H">สูงมาก (H)</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="qr-dark-color">สี QR</Label>
              <div className="flex gap-2"><Input id="qr-dark-color" type="color" value={darkColor} onChange={(event) => { setDarkColor(event.target.value); clearOutput(); }} className="w-14 p-1" /><Input value={darkColor} onChange={(event) => { setDarkColor(event.target.value); clearOutput(); }} aria-label="รหัสสี QR" className="font-mono" /></div>
            </div>
            <div>
              <Label htmlFor="qr-light-color">สีพื้นหลัง</Label>
              <div className="flex gap-2"><Input id="qr-light-color" type="color" value={lightColor} onChange={(event) => { setLightColor(event.target.value); clearOutput(); }} className="w-14 p-1" /><Input value={lightColor} onChange={(event) => { setLightColor(event.target.value); clearOutput(); }} aria-label="รหัสสีพื้นหลัง QR" className="font-mono" /></div>
            </div>
          </div>
          <div className="mt-4">
            <ActionBar>
              <Button onClick={() => void generate()} disabled={generating}><Sparkles className="size-4" />{generating ? "กำลังสร้าง..." : "สร้าง QR Code"}</Button>
              <ExampleButton onExample={() => { setContent("https://meaw-tools.vercel.app"); clearOutput(); }} />
              <CopyButton value={content} label="คัดลอกข้อความ" />
              <ClearButton onClear={() => { setContent(""); clearOutput(); }} />
            </ActionBar>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">ตัวอย่าง QR Code</p>
          <div className="grid min-h-80 place-items-center rounded-xl border bg-white p-5">
            {pngUrl ? <Image src={pngUrl} alt="QR Code ที่สร้างแล้ว" width={320} height={320} unoptimized className="h-auto w-full max-w-80" /> : <div className="text-center text-sm text-slate-500"><QrCode className="mx-auto mb-3 size-14 opacity-40" />QR Code จะแสดงที่นี่</div>}
          </div>
          {pngUrl ? <div className="mt-3 grid grid-cols-2 gap-2"><Button asChild><a href={pngUrl} download="meaw-qr-code.png"><Download className="size-4" />PNG</a></Button><Button variant="outline" onClick={() => downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "meaw-qr-code.svg")}><Download className="size-4" />SVG</Button></div> : null}
        </div>
      </div>
    </WorkspaceFrame>
  );
}
