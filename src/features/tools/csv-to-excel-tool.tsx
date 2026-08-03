"use client";

import { ClipboardPaste, Download, FileCheck2, FileSpreadsheet, Info, LoaderCircle, ShieldCheck, Table2, TriangleAlert, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CSV_FILE_LIMIT_BYTES,
  CSV_PREVIEW_COLUMN_LIMIT,
  CSV_PREVIEW_ROW_LIMIT,
  sanitizeXlsxFilename,
  type CsvDelimiterOption,
  type CsvEncoding,
  type CsvWorkbookOptions,
} from "@/lib/tools/csv";

type SourceMode = "file" | "paste";
type BusyAction = "inspect" | "convert" | null;
type CsvWorkerSummary = {
  delimiter: string;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  raggedRowCount: number;
  blankRowCount: number;
};
type CsvWorkerResponse =
  | { id: string; ok: true; action: "inspect" | "convert"; summary: CsvWorkerSummary; preview: string[][]; workbook?: ArrayBuffer }
  | { id: string; ok: false; error: string };
type InspectionResult = { summary: CsvWorkerSummary; preview: string[][]; sourceName: string };

const MICROSOFT_CSV_URL = "https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files";
const RFC_4180_URL = "https://www.rfc-editor.org/info/rfc4180/";
const SAMPLE_CSV = `รหัส,สินค้า,หมวดหมู่,ราคา,คงเหลือ,หมายเหตุ
00123,"ชาเขียว, สูตรพิเศษ",เครื่องดื่ม,55,18,"เก็บรหัสนำหน้าด้วย 0"
00124,ชาไทย,เครื่องดื่ม,45,24,"พร้อมส่ง"
SKU-009,แก้วแมว,ของใช้,129,7,"บรรทัดแรก
บรรทัดที่สอง"
SAFE-01,ข้อมูลตัวอย่าง,ทดสอบ,0,1,"=SUM(1,1)"`;

const delimiterLabels: Record<string, string> = {
  ",": "Comma ( , )",
  "\t": "Tab",
  ";": "Semicolon ( ; )",
  "|": "Pipe ( | )",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function runCsvWorker(request: {
  action: "inspect" | "convert";
  buffer: ArrayBuffer;
  encoding: CsvEncoding;
  delimiter: CsvDelimiterOption;
  workbook: CsvWorkbookOptions;
}, signal: AbortSignal): Promise<Extract<CsvWorkerResponse, { ok: true }>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./csv-to-excel.worker.ts", import.meta.url), { type: "module", name: "meaw-csv-to-excel" });
    const id = crypto.randomUUID();
    let settled = false;
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", handleAbort);
      worker.terminate();
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleAbort = () => rejectOnce(new DOMException("ยกเลิกการประมวลผล CSV แล้ว", "AbortError"));

    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }
    timeout = window.setTimeout(() => rejectOnce(new Error("ประมวลผลนานเกิน 45 วินาที กรุณาลดขนาดไฟล์แล้วลองใหม่")), 45_000);
    worker.addEventListener("message", (event: MessageEvent<CsvWorkerResponse>) => {
      if (event.data.id !== id || settled) return;
      settled = true;
      cleanup();
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error));
    });
    worker.addEventListener("error", (event) => {
      rejectOnce(new Error(event.message || "Web Worker สำหรับ CSV หยุดทำงาน"));
    });
    worker.postMessage({ id, ...request }, [request.buffer]);
  });
}

export function CsvToExcelTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerAbortRef = useRef<AbortController | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [encoding, setEncoding] = useState<CsvEncoding>("utf-8");
  const [delimiter, setDelimiter] = useState<CsvDelimiterOption>("auto");
  const [sheetName, setSheetName] = useState("ข้อมูล CSV");
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [detectNumbers, setDetectNumbers] = useState(true);
  const [inspection, setInspection] = useState<InspectionResult | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const busy = busyAction !== null;
  const invalidate = () => { setInspection(null); setError(""); };

  useEffect(() => () => workerAbortRef.current?.abort(), []);

  const chooseFile = (nextFile: File | null) => {
    setInspection(null);
    setError("");
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (nextFile.size <= 0) {
      setFile(null);
      setError("ไฟล์ที่เลือกว่างเปล่า");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (nextFile.size > CSV_FILE_LIMIT_BYTES) {
      setFile(null);
      setError(`ไฟล์ใหญ่เกิน ${formatBytes(CSV_FILE_LIMIT_BYTES)} สำหรับการแปลงใน Browser`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (!/\.(csv|tsv|txt)$/i.test(nextFile.name)) {
      setFile(null);
      setError("รองรับไฟล์ .csv, .tsv และ .txt เท่านั้น");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(nextFile);
    setSourceMode("file");
  };

  const sourceBuffer = async (): Promise<{ buffer: ArrayBuffer; sourceName: string }> => {
    if (sourceMode === "file") {
      if (!file) throw new Error("กรุณาเลือกไฟล์ CSV, TSV หรือ TXT");
      return { buffer: await file.arrayBuffer(), sourceName: file.name };
    }
    if (!pastedText.trim()) throw new Error("กรุณาวางข้อความ CSV หรือ TSV");
    const bytes = new TextEncoder().encode(pastedText);
    if (bytes.byteLength > CSV_FILE_LIMIT_BYTES) throw new Error(`ข้อความใหญ่เกิน ${formatBytes(CSV_FILE_LIMIT_BYTES)}`);
    return {
      buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      sourceName: "meaw-sample.csv",
    };
  };

  const workbookOptions = (): CsvWorkbookOptions => ({ sheetName, firstRowIsHeader, detectNumbers });

  const inspect = async () => {
    const controller = new AbortController();
    workerAbortRef.current = controller;
    setBusyAction("inspect");
    setError("");
    try {
      const source = await sourceBuffer();
      const response = await runCsvWorker({ action: "inspect", buffer: source.buffer, encoding: sourceMode === "paste" ? "utf-8" : encoding, delimiter, workbook: workbookOptions() }, controller.signal);
      setInspection({ summary: response.summary, preview: response.preview, sourceName: source.sourceName });
      toast.success(`อ่านข้อมูล ${response.summary.rowCount.toLocaleString("th-TH")} แถวแล้ว`);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setInspection(null);
      setError(caught instanceof Error ? caught.message : "อ่าน CSV ไม่สำเร็จ");
    } finally {
      if (workerAbortRef.current === controller) workerAbortRef.current = null;
      if (!controller.signal.aborted) setBusyAction(null);
    }
  };

  const convertAndDownload = async () => {
    if (!inspection) return;
    const controller = new AbortController();
    workerAbortRef.current = controller;
    setBusyAction("convert");
    setError("");
    try {
      const source = await sourceBuffer();
      const response = await runCsvWorker({ action: "convert", buffer: source.buffer, encoding: sourceMode === "paste" ? "utf-8" : encoding, delimiter, workbook: workbookOptions() }, controller.signal);
      if (!response.workbook) throw new Error("ไม่ได้รับไฟล์ Excel จาก Worker");
      const filename = sanitizeXlsxFilename(source.sourceName);
      downloadBlob(new Blob([response.workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
      toast.success(`สร้าง ${filename} แล้ว`);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "สร้าง Excel ไม่สำเร็จ");
    } finally {
      if (workerAbortRef.current === controller) workerAbortRef.current = null;
      if (!controller.signal.aborted) setBusyAction(null);
    }
  };

  const loadExample = () => {
    setSourceMode("paste");
    setPastedText(SAMPLE_CSV);
    setDelimiter("auto");
    setEncoding("utf-8");
    setSheetName("สินค้า Meaw Cafe");
    setFirstRowIsHeader(true);
    setDetectNumbers(true);
    setInspection(null);
    setError("");
  };

  const clear = () => {
    setFile(null);
    setPastedText("");
    setInspection(null);
    setError("");
    setDragActive(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const settingsChanged = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    invalidate();
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /><h2 className="font-semibold">แปลง CSV เป็น Excel พร้อมจัดคอลัมน์</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">ตรวจตัวคั่นและ Encoding ดูตัวอย่างก่อนสร้างไฟล์ .xlsx ที่เปิดใน Excel ได้ทันที</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Web Worker · ไม่อัปโหลดไฟล์</span>
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-600" />
        <AlertTitle>รองรับ CSV ที่มี comma, tab, semicolon หรือ pipe</AlertTitle>
        <AlertDescription className="leading-6">รองรับช่องที่ครอบด้วย quote, comma ภายในข้อความ, quote ซ้อน และข้อความหลายบรรทัดตามแนวทาง <a href={RFC_4180_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">RFC 4180</a> พร้อม UTF-8 และ Windows-874 สำหรับไฟล์ภาษาไทย</AlertDescription>
      </Alert>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(24rem,1.05fr)]">
        <section className="min-w-0" aria-labelledby="csv-source-title">
          <h3 id="csv-source-title" className="font-semibold">1. เลือกข้อมูลต้นทาง</h3>
          <Tabs value={sourceMode} onValueChange={(value) => { setSourceMode(value as SourceMode); invalidate(); }} className="mt-3">
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="file" disabled={busy} className="min-h-10"><UploadCloud className="size-4" />อัปโหลดไฟล์</TabsTrigger>
              <TabsTrigger value="paste" disabled={busy} className="min-h-10"><ClipboardPaste className="size-4" />วาง CSV / TSV</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-3 space-y-2.5">
              <Label htmlFor="csv-source-file">ไฟล์ CSV, TSV หรือ TXT</Label>
              <input ref={inputRef} id="csv-source-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" disabled={busy} className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              <label
                htmlFor="csv-source-file"
                className={`grid min-h-36 cursor-pointer place-items-center rounded-xl border border-dashed p-5 text-center transition-colors ${dragActive ? "border-primary bg-primary/10" : "bg-muted/15 hover:border-primary/60 hover:bg-primary/5"}`}
                onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragActive(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }}
                onDrop={(event) => { event.preventDefault(); setDragActive(false); if (!busy) chooseFile(event.dataTransfer.files[0] ?? null); }}
              >
                <span><UploadCloud className="mx-auto size-8 text-primary" /><span className="mt-2 block text-sm font-semibold">{file ? file.name : "คลิกหรือลากไฟล์มาวาง"}</span><span className="mt-1 block text-xs text-muted-foreground">{file ? `${formatBytes(file.size)} · พร้อมตรวจข้อมูล` : `สูงสุด ${formatBytes(CSV_FILE_LIMIT_BYTES)} · ประมวลผลใน Browser`}</span></span>
              </label>
            </TabsContent>
            <TabsContent value="paste" className="mt-3 space-y-2.5">
              <Label htmlFor="csv-pasted-text">ข้อความ CSV หรือ TSV</Label>
              <Textarea id="csv-pasted-text" aria-label="ข้อความ CSV หรือ TSV" value={pastedText} disabled={busy} onChange={(event) => { setPastedText(event.target.value); invalidate(); }} className="min-h-44 resize-y font-mono text-xs leading-5" placeholder={'รหัส,สินค้า,ราคา\n001,ชาไทย,45'} />
              <div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>ข้อความที่วางจะอ่านเป็น UTF-8</span><span>{pastedText.length.toLocaleString("th-TH")} ตัวอักษร</span></div>
            </TabsContent>
          </Tabs>

          <div className="mt-5 border-t pt-5">
            <h3 className="font-semibold">2. ตั้งค่าคอลัมน์และ Excel</h3>
            <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2.5">
                <Label htmlFor="csv-encoding">Encoding ของไฟล์</Label>
                <Select value={sourceMode === "paste" ? "utf-8" : encoding} disabled={sourceMode === "paste" || busy} onValueChange={(value) => settingsChanged(setEncoding, value as CsvEncoding)}><SelectTrigger id="csv-encoding" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="utf-8">UTF-8 (แนะนำ)</SelectItem><SelectItem value="windows-874">Windows-874 / ภาษาไทยเดิม</SelectItem></SelectContent></Select>
              </div>
              <div className="min-w-0 space-y-2.5">
                <Label htmlFor="csv-delimiter">ตัวคั่นคอลัมน์</Label>
                <Select value={delimiter} disabled={busy} onValueChange={(value) => settingsChanged(setDelimiter, value as CsvDelimiterOption)}><SelectTrigger id="csv-delimiter" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">ตรวจอัตโนมัติ</SelectItem><SelectItem value="comma">Comma ( , )</SelectItem><SelectItem value="tab">Tab</SelectItem><SelectItem value="semicolon">Semicolon ( ; )</SelectItem><SelectItem value="pipe">Pipe ( | )</SelectItem></SelectContent></Select>
              </div>
              <div className="min-w-0 space-y-2.5 sm:col-span-2">
                <Label htmlFor="csv-sheet-name">ชื่อ Worksheet</Label>
                <Input id="csv-sheet-name" value={sheetName} maxLength={31} disabled={busy} onChange={(event) => settingsChanged(setSheetName, event.target.value)} placeholder="ข้อมูล CSV" />
              </div>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">แถวแรกเป็นหัวตาราง</span><span className="mt-0.5 block text-xs text-muted-foreground">ทำตัวหนา แช่แข็ง และเปิด Filter</span></span><Switch checked={firstRowIsHeader} disabled={busy} onCheckedChange={(checked) => settingsChanged(setFirstRowIsHeader, checked)} aria-label="ใช้แถวแรกเป็นหัวตาราง" /></label>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">แปลงตัวเลขที่ปลอดภัย</span><span className="mt-0.5 block text-xs text-muted-foreground">รหัส 001 และสูตรยังคงเป็นข้อความ</span></span><Switch checked={detectNumbers} disabled={busy} onCheckedChange={(checked) => settingsChanged(setDetectNumbers, checked)} aria-label="ตรวจและแปลงค่าตัวเลข" /></label>
            </div>
          </div>

          <div className="mt-5 border-t pt-5">
            <ActionBar>
              <Button type="button" disabled={busy} onClick={() => void inspect()}>{busyAction === "inspect" ? <LoaderCircle className="size-4 animate-spin" /> : <Table2 className="size-4" />}ตรวจและดูตัวอย่าง</Button>
              <ExampleButton onExample={loadExample} disabled={busy} />
              <ClearButton onClear={clear} disabled={busy} />
            </ActionBar>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
        </section>

        <section className="min-w-0" aria-labelledby="csv-preview-title">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="csv-preview-title" className="font-semibold">3. ตรวจ Preview แล้วดาวน์โหลด</h3><p className="mt-1 text-xs text-muted-foreground">แสดงสูงสุด {CSV_PREVIEW_ROW_LIMIT} แถว × {CSV_PREVIEW_COLUMN_LIMIT} คอลัมน์ แต่ไฟล์ Excel จะมีข้อมูลครบ</p></div>{inspection ? <Button type="button" disabled={busy} onClick={() => void convertAndDownload()}>{busyAction === "convert" ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}ดาวน์โหลด Excel</Button> : null}</div>
          {!inspection ? <div className="mt-3"><EmptyOutput size="compact" text="เลือกไฟล์หรือวาง CSV แล้วกด “ตรวจและดูตัวอย่าง”" /></div> : (
            <div className="mt-3 space-y-4" aria-live="polite" data-testid="csv-inspection-result">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">แถว</p><p data-testid="csv-row-count" className="mt-1 text-xl font-bold text-primary tabular-nums">{inspection.summary.rowCount.toLocaleString("th-TH")}</p></div>
                <div className="rounded-xl border bg-muted/15 p-3"><p className="text-xs text-muted-foreground">คอลัมน์</p><p data-testid="csv-column-count" className="mt-1 text-xl font-semibold tabular-nums">{inspection.summary.columnCount.toLocaleString("th-TH")}</p></div>
                <div className="rounded-xl border bg-muted/15 p-3"><p className="text-xs text-muted-foreground">ตัวคั่น</p><p data-testid="csv-detected-delimiter" className="mt-1 text-sm font-semibold">{delimiterLabels[inspection.summary.delimiter] ?? inspection.summary.delimiter}</p></div>
                <div className="rounded-xl border bg-muted/15 p-3"><p className="text-xs text-muted-foreground">จำนวนเซลล์</p><p className="mt-1 text-xl font-semibold tabular-nums">{inspection.summary.cellCount.toLocaleString("th-TH")}</p></div>
              </div>

              {inspection.summary.raggedRowCount || inspection.summary.blankRowCount ? <Alert className="border-amber-500/30 bg-amber-500/5"><TriangleAlert className="text-amber-600" /><AlertTitle>พบโครงสร้างที่ควรตรวจ</AlertTitle><AlertDescription>แถวที่จำนวนคอลัมน์ไม่เท่ากัน {inspection.summary.raggedRowCount.toLocaleString("th-TH")} แถว · แถวว่าง {inspection.summary.blankRowCount.toLocaleString("th-TH")} แถว เครื่องมือจะเก็บข้อมูลตามต้นฉบับโดยไม่เดาเติมหรือลบแถว</AlertDescription></Alert> : null}

              <div className="min-w-0 overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2 text-xs text-muted-foreground"><span className="truncate"><FileCheck2 className="mr-1 inline size-3.5 text-primary" />{inspection.sourceName}</span><span className="shrink-0">{sourceMode === "paste" ? "UTF-8" : encoding.toUpperCase()}</span></div>
                <div className="max-h-[28rem] overflow-auto" data-testid="csv-preview-table">
                  <table className="min-w-[40rem] border-collapse text-left text-xs">
                    <tbody>{inspection.preview.map((row, rowIndex) => <tr key={rowIndex} className={firstRowIsHeader && rowIndex === 0 ? "sticky top-0 bg-primary/10 font-semibold" : "even:bg-muted/10"}>{row.map((cell, columnIndex) => <td key={columnIndex} className="max-w-56 border-b border-r px-3 py-2 align-top"><span className="block max-h-14 overflow-hidden whitespace-pre-wrap break-words">{cell || <span className="text-muted-foreground">ว่าง</span>}</span></td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>

              <Alert className="border-emerald-500/30 bg-emerald-500/5"><ShieldCheck className="text-emerald-600" /><AlertTitle>ป้องกัน Formula Injection โดยค่าเริ่มต้น</AlertTitle><AlertDescription>ค่าที่มีลักษณะเป็นคำสั่ง เช่น ขึ้นต้นด้วย =, +, - หรือ @ และรหัสที่มีเลข 0 นำหน้าจะถูกเก็บเป็นข้อความ ไม่ถูกสร้างเป็นสูตร Excel ส่วนจำนวนลบที่เป็นตัวเลขล้วนยังใช้คำนวณต่อได้เมื่อเปิดตัวเลือกตรวจตัวเลข</AlertDescription></Alert>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>ไฟล์ถูกอ่านและสร้าง .xlsx ภายใน Web Worker ของ Browser ไม่มี API ของ Meaw Tools รับหรือบันทึกข้อมูล</span></p>
        <p className="flex gap-2"><FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-primary" /><span>Excel รองรับการนำเข้าไฟล์ delimited และตัวคั่นหลายรูปแบบตาม <a href={MICROSOFT_CSV_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">คู่มือ Microsoft</a>; เครื่องมือนี้จำกัด 10 MB, 50,000 แถว, 200 คอลัมน์ และ 500,000 เซลล์เพื่อรักษาความลื่นบน Browser</span></p>
      </div>
    </WorkspaceFrame>
  );
}
