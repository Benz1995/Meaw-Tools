"use client";

import Image from "next/image";
import { Archive, Barcode, CheckCircle2, Download, LoaderCircle, PackageCheck, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type BarcodeFormat,
  createBarcodeFilenames,
  parseBarcodeInput,
} from "@/lib/tools/barcodes";

type BarcodeResult = {
  id: string;
  value: string;
  svg: string;
  png: Blob;
  width: number;
  height: number;
  pngName: string;
  svgName: string;
};

const FORMAT_OPTIONS: Array<{ value: BarcodeFormat; label: string; hint: string; example: string }> = [
  { value: "CODE128", label: "Code 128", hint: "ยืดหยุ่น เหมาะกับ SKU, สต็อก และเลขคำสั่งซื้อ", example: "SKU-TH-0001\nORDER-2026-0002\nBOX-03" },
  { value: "EAN13", label: "EAN-13", hint: "สินค้าปลีก 12 หลัก + Check Digit หรือครบ 13 หลัก", example: "885012345678\n885123456789" },
  { value: "EAN8", label: "EAN-8", hint: "สินค้าขนาดเล็ก 7 หลัก + Check Digit หรือครบ 8 หลัก", example: "1234567\n5512345" },
  { value: "UPC", label: "UPC-A", hint: "สินค้าปลีกแบบ UPC 11 หลัก + Check Digit หรือครบ 12 หลัก", example: "01234567890\n72527273070" },
  { value: "ITF14", label: "ITF-14", hint: "กล่องและหน่วยขนส่ง 13 หลัก + Check Digit หรือครบ 14 หลัก", example: "1885012345678\n2885012345678" },
  { value: "CODE39", label: "Code 39", hint: "รหัสงานและทรัพย์สิน รองรับ A–Z, ตัวเลข และสัญลักษณ์พื้นฐาน", example: "ASSET-0001\nRACK-A03\nBOX 42" },
];

const BAR_WIDTHS = [
  { value: 1, label: "แคบ — ไฟล์กะทัดรัด" },
  { value: 2, label: "มาตรฐาน — แนะนำ" },
  { value: 3, label: "กว้าง — เหมาะกับงานพิมพ์ใหญ่" },
] as const;

const BAR_HEIGHTS = [
  { value: 60, label: "60 px — ป้ายขนาดเล็ก" },
  { value: 100, label: "100 px — มาตรฐาน" },
  { value: 140, label: "140 px — งานพิมพ์ใหญ่" },
] as const;

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/png") reject(new Error("Browser ไม่สามารถสร้างไฟล์ PNG ได้"));
      else resolve(blob);
    }, "image/png");
  });
}

export function BarcodeGeneratorTool() {
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<BarcodeFormat>("CODE128");
  const [barWidth, setBarWidth] = useState(2);
  const [barHeight, setBarHeight] = useState(100);
  const [displayValue, setDisplayValue] = useState(true);
  const [results, setResults] = useState<BarcodeResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<"png" | "svg" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  const selectedFormat = FORMAT_OPTIONS.find((option) => option.value === format) ?? FORMAT_OPTIONS[0]!;

  const clearOutput = () => {
    generationRef.current += 1;
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setGenerating(false);
    setError("");
  };

  const generate = async () => {
    let items;
    try {
      items = parseBarcodeInput(input, format);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ข้อมูลบาร์โค้ดไม่ถูกต้อง");
      setResults([]);
      return;
    }

    const generation = ++generationRef.current;
    const pngNames = createBarcodeFilenames(items.map((item) => item.value), "png");
    const svgNames = createBarcodeFilenames(items.map((item) => item.value), "svg");
    setGenerating(true);
    setResults([]);
    setProgress({ current: 0, total: items.length });
    setError("");

    try {
      const barcodeLibrary = await import("jsbarcode");
      const renderBarcode = barcodeLibrary.default;
      const nextResults: BarcodeResult[] = [];

      for (let index = 0; index < items.length; index += 1) {
        if (generation !== generationRef.current) return;
        const item = items[index]!;
        setProgress({ current: index + 1, total: items.length });
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

        const options = {
          format,
          width: barWidth,
          height: barHeight,
          displayValue,
          font: "monospace",
          fontSize: 16,
          textMargin: 6,
          margin: 12,
          lineColor: "#111827",
          background: "#ffffff",
        };
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        renderBarcode(svgElement, item.value, options);
        svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const svg = new XMLSerializer().serializeToString(svgElement);

        const canvas = document.createElement("canvas");
        renderBarcode(canvas, item.value, options);
        if (canvas.width > 6_000 || canvas.height > 500) throw new Error(`บรรทัด ${index + 1}: บาร์โค้ดกว้างเกินขีดจำกัด ลองลดความกว้างแท่งหรือลดความยาวรหัส`);
        const png = await canvasToPng(canvas);
        if (generation !== generationRef.current) return;
        nextResults.push({
          id: item.id,
          value: item.value,
          svg,
          png,
          width: canvas.width,
          height: canvas.height,
          pngName: pngNames[index]!,
          svgName: svgNames[index]!,
        });
      }

      if (generation !== generationRef.current) return;
      setResults(nextResults);
      toast.success(`สร้างบาร์โค้ดสำเร็จ ${nextResults.length} รายการ`);
    } catch (caught) {
      if (generation !== generationRef.current) return;
      setResults([]);
      setError(caught instanceof Error ? caught.message : "สร้างบาร์โค้ดไม่สำเร็จ");
    } finally {
      if (mountedRef.current && generation === generationRef.current) setGenerating(false);
    }
  };

  const downloadAll = async (kind: "png" | "svg") => {
    if (!results.length) return;
    setDownloading(kind);
    try {
      if (results.length === 1) {
        const result = results[0]!;
        if (kind === "png") downloadBlob(result.png, result.pngName);
        else downloadBlob(new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }), result.svgName);
      } else {
        const { zipSync } = await import("fflate");
        const entries = kind === "png"
          ? Object.fromEntries(await Promise.all(results.map(async (result) => [result.pngName, new Uint8Array(await result.png.arrayBuffer())] as const)))
          : Object.fromEntries(results.map((result) => [result.svgName, new TextEncoder().encode(result.svg)] as const));
        const zip = zipSync(entries, { level: 0 });
        downloadBlob(new Blob([Uint8Array.from(zip)], { type: "application/zip" }), `meaw-barcodes-${kind}.zip`);
      }
      toast.success(results.length === 1 ? `ดาวน์โหลด ${kind.toUpperCase()} แล้ว` : `ดาวน์โหลด ZIP ${results.length} รายการแล้ว`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สร้างไฟล์ดาวน์โหลดไม่สำเร็จ");
    } finally {
      setDownloading("");
    }
  };

  const cancel = () => {
    generationRef.current += 1;
    setGenerating(false);
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setError("ยกเลิกการสร้างบาร์โค้ดแล้ว");
  };

  const preview = results[0];

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Barcode className="size-4 text-primary" /><h2 className="font-semibold">สร้างบาร์โค้ดทีละรายการหรือหลายรายการ</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">วางหนึ่งรหัสต่อบรรทัดจาก Excel ได้สูงสุด 50 รายการ แล้วดาวน์โหลด PNG, SVG หรือ ZIP</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">ไม่ส่งรหัสขึ้น Server</span>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="min-w-0">
          <div className="space-y-2.5">
            <Label htmlFor="barcode-values">รหัสที่ต้องการสร้าง · หนึ่งรายการต่อบรรทัด</Label>
            <Textarea
              id="barcode-values"
              value={input}
              disabled={generating}
              onChange={(event) => { setInput(event.target.value); clearOutput(); }}
              className="min-h-44 resize-y font-mono"
              maxLength={6_000}
              placeholder="SKU-TH-0001&#10;SKU-TH-0002&#10;ORDER-2026-0003"
            />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>คัดลอกหนึ่งคอลัมน์จาก Excel แล้ววางได้ทันที</span><span>{input.length.toLocaleString("th-TH")} / 6,000 ตัวอักษร</span></div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-2.5 sm:col-span-2">
              <Label htmlFor="barcode-format">รูปแบบบาร์โค้ด</Label>
              <Select value={format} disabled={generating} onValueChange={(value) => { setFormat(value as BarcodeFormat); clearOutput(); }}>
                <SelectTrigger id="barcode-format" className="w-full min-w-0 overflow-hidden"><SelectValue /></SelectTrigger>
                <SelectContent>{FORMAT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label} — {option.hint}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">{selectedFormat.hint}</p>
            </div>
            <div className="min-w-0 space-y-2.5">
              <Label htmlFor="barcode-width">ความกว้างของแท่ง</Label>
              <Select value={String(barWidth)} disabled={generating} onValueChange={(value) => { setBarWidth(Number(value)); clearOutput(); }}>
                <SelectTrigger id="barcode-width" className="w-full min-w-0 overflow-hidden"><SelectValue /></SelectTrigger>
                <SelectContent>{BAR_WIDTHS.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2.5">
              <Label htmlFor="barcode-height">ความสูงของแท่ง</Label>
              <Select value={String(barHeight)} disabled={generating} onValueChange={(value) => { setBarHeight(Number(value)); clearOutput(); }}>
                <SelectTrigger id="barcode-height" className="w-full min-w-0 overflow-hidden"><SelectValue /></SelectTrigger>
                <SelectContent>{BAR_HEIGHTS.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border bg-muted/15 px-4 py-3">
            <div><Label htmlFor="barcode-display-value">แสดงรหัสใต้บาร์โค้ด</Label><p className="mt-1 text-xs text-muted-foreground">ช่วยให้ตรวจค่าด้วยสายตาเมื่อเครื่องสแกนอ่านไม่ได้</p></div>
            <Switch id="barcode-display-value" checked={displayValue} disabled={generating} onCheckedChange={(checked) => { setDisplayValue(checked); clearOutput(); }} />
          </div>

          <div className="mt-5">
            <ActionBar>
              <Button type="button" onClick={() => void generate()} disabled={generating || !input.trim()}><PackageCheck className="size-4" />{generating ? `กำลังสร้าง ${progress.current}/${progress.total}` : "สร้างบาร์โค้ด"}</Button>
              {generating ? <Button type="button" variant="destructive" onClick={cancel}><XCircle className="size-4" />ยกเลิก</Button> : null}
              <ExampleButton onExample={() => { setInput(selectedFormat.example); clearOutput(); }} />
              <ClearButton onClear={() => { setInput(""); clearOutput(); }} />
            </ActionBar>
          </div>

          {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
        </div>

        <section className="min-w-0" aria-labelledby="barcode-preview-title">
          <div className="mb-2 flex items-center justify-between gap-3"><h3 id="barcode-preview-title" className="text-sm font-semibold">ตัวอย่างบาร์โค้ด</h3>{preview ? <span className="text-xs text-muted-foreground">รายการแรกจาก {results.length}</span> : null}</div>
          <div className="grid min-h-80 place-items-center overflow-hidden rounded-xl border bg-white p-5">
            {preview ? (
              <Image src={svgDataUrl(preview.svg)} alt={`บาร์โค้ด ${preview.value}`} width={preview.width} height={preview.height} unoptimized className="h-auto max-h-64 w-full object-contain" />
            ) : (
              <div className="text-center text-sm text-slate-500"><Barcode className="mx-auto mb-3 size-16 opacity-35" /><p>ตัวอย่างจะแสดงหลังจากกดสร้าง</p><p className="mt-2 text-xs">พื้นขาว · แท่งสีเข้ม · เว้นขอบสำหรับการสแกน</p></div>
            )}
          </div>
          {preview ? <div className="mt-3 rounded-lg bg-muted/20 px-3 py-2 text-center font-mono text-xs break-all">{preview.value}</div> : null}
        </section>
      </div>

      {generating ? (
        <div className="mt-5 rounded-xl border bg-primary/[0.03] p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-semibold"><LoaderCircle className="size-4 animate-spin text-primary" />กำลังสร้างไฟล์ภายใน Browser</p><span className="text-sm font-semibold text-primary">{progress.current}/{progress.total}</span></div>
          <div role="progressbar" aria-label="ความคืบหน้าการสร้างบาร์โค้ด" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.current} className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }} /></div>
        </div>
      ) : null}

      {results.length ? (
        <section className="mt-5 overflow-hidden rounded-xl border border-primary/25" aria-labelledby="barcode-results-title" data-testid="barcode-results">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-primary/[0.04] px-4 py-4">
            <div><h3 id="barcode-results-title" className="font-semibold">พร้อมดาวน์โหลด {results.length} รายการ</h3><p className="mt-1 text-xs text-muted-foreground">{selectedFormat.label} · PNG สำหรับใช้งานทั่วไป · SVG สำหรับงานพิมพ์และออกแบบ</p></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void downloadAll("png")} disabled={Boolean(downloading)}><Archive className="size-4" />{downloading === "png" ? "กำลังสร้าง..." : results.length > 1 ? "PNG เป็น ZIP" : "ดาวน์โหลด PNG"}</Button>
              <Button type="button" variant="outline" onClick={() => void downloadAll("svg")} disabled={Boolean(downloading)}><Archive className="size-4" />{downloading === "svg" ? "กำลังสร้าง..." : results.length > 1 ? "SVG เป็น ZIP" : "ดาวน์โหลด SVG"}</Button>
            </div>
          </div>
          <div className="max-h-96 divide-y overflow-auto">
            {results.map((result, index) => (
              <div key={result.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-testid="barcode-result-row">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1"><p className="truncate font-mono text-sm font-medium" title={result.value}>{result.value}</p><p className="mt-1 text-xs text-muted-foreground">รายการ {index + 1} · {result.width.toLocaleString("th-TH")} × {result.height.toLocaleString("th-TH")} px · {(result.png.size / 1024).toFixed(1)} KB</p></div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" aria-label={`ดาวน์โหลด PNG ${result.value}`} onClick={() => downloadBlob(result.png, result.pngName)}><Download className="size-4" />PNG</Button>
                  <Button type="button" size="sm" variant="outline" aria-label={`ดาวน์โหลด SVG ${result.value}`} onClick={() => downloadBlob(new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }), result.svgName)}><Download className="size-4" />SVG</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>รหัส ภาพ และ ZIP ถูกสร้างภายใน Browser ไม่มี API ของ Meaw Tools รับหรือบันทึกข้อมูล และไม่มีการโหลดไลบรารีจาก CDN ภายนอก</span></p>
        <p className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /><span>ภาพบาร์โค้ดไม่ได้ทำให้เลข EAN/UPC กลายเป็น GTIN ที่จดทะเบียน หากใช้กับสินค้าจริงควรขอเลขหมายจาก <a href="https://gs1th.org/get-a-barcode/" target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">GS1 Thailand</a> และสแกนทดสอบก่อนพิมพ์จำนวนมาก</span></p>
      </div>
    </WorkspaceFrame>
  );
}
