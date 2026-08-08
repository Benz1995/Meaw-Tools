"use client";

import {
  ClipboardPaste,
  Download,
  FileCheck2,
  FileSearch2,
  Info,
  ListFilter,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Table2,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ActionBar,
  ClearButton,
  EmptyOutput,
  ExampleButton,
  WorkspaceFrame,
  downloadBlob,
} from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CSV_FILE_LIMIT_BYTES,
  CSV_PREVIEW_COLUMN_LIMIT,
  CSV_PREVIEW_ROW_LIMIT,
  type CsvDelimiterOption,
  type CsvEncoding,
} from "@/lib/tools/csv";
import {
  sanitizeCleanCsvFilename,
  type CsvCleanerOptions,
  type CsvCleanerSummary,
  type CsvDuplicateRetention,
} from "@/lib/tools/csv-cleaner";

type SourceMode = "file" | "paste";
type BusyAction = "inspect" | "clean" | null;
type CsvSourceSummary = {
  delimiter: string;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  raggedRowCount: number;
  blankRowCount: number;
};
type CsvCleanerWorkerSuccess = {
  id: string;
  ok: true;
  action: "inspect" | "clean";
  sourceSummary: CsvSourceSummary;
  columns: Array<{ index: number; label: string }>;
  preview: string[][];
  cleanSummary?: CsvCleanerSummary;
  cleanedCsv?: ArrayBuffer;
};
type CsvCleanerWorkerResponse = CsvCleanerWorkerSuccess | { id: string; ok: false; error: string };
type InspectionResult = {
  sourceName: string;
  summary: CsvSourceSummary;
  columns: Array<{ index: number; label: string }>;
  preview: string[][];
};
type CleanResult = {
  filename: string;
  summary: CsvCleanerSummary;
  preview: string[][];
  blob: Blob;
};

const OWASP_CSV_URL = "https://owasp.org/www-community/attacks/CSV_Injection";
const RFC_4180_URL = "https://www.rfc-editor.org/info/rfc4180/";
const SAMPLE_CSV = `รหัส,อีเมล,ชื่อ,จังหวัด,หมายเหตุ
001,mali@example.com," มะลิ ",กรุงเทพ,"ลูกค้าประจำ"
002,SOMCHAI@example.com," สมชาย ",เชียงใหม่,"สั่งเดือนละครั้ง"
002,somchai@example.com,สมชาย,เชียงใหม่,"สั่งเดือนละครั้ง"
,,,,
003,,น้ำฝน,ขอนแก่น,"=HYPERLINK(""https://example.com"",""เปิด"" )"
004,,ปอ,ขอนแก่น,"พร้อมติดต่อ"`;

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

function CsvPreviewTable({ rows, columns, label, firstRowIsHeader }: { rows: string[][]; columns: number; label: string; firstRowIsHeader: boolean }) {
  if (!rows.length) return <EmptyOutput size="compact" text="ไม่มีแถวสำหรับแสดง Preview" />;
  return (
    <div className="max-h-[28rem] overflow-auto rounded-xl border" data-testid="csv-cleaner-preview-table" aria-label={label}>
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={firstRowIsHeader && rowIndex === 0 ? "bg-primary/10 font-semibold" : "odd:bg-muted/10"}>
              {Array.from({ length: Math.min(columns, CSV_PREVIEW_COLUMN_LIMIT) }, (_, columnIndex) => (
                <td key={columnIndex} className="max-w-56 border-b border-r px-3 py-2 align-top last:border-r-0">
                  <span className="block whitespace-pre-wrap break-words">{row[columnIndex] ?? ""}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function runCsvCleanerWorker(request: {
  action: "inspect" | "clean";
  buffer: ArrayBuffer;
  encoding: CsvEncoding;
  delimiter: CsvDelimiterOption;
  options: CsvCleanerOptions;
}, signal: AbortSignal): Promise<CsvCleanerWorkerSuccess> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./csv-cleaner.worker.ts", import.meta.url), { type: "module", name: "meaw-csv-cleaner" });
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
    worker.addEventListener("message", (event: MessageEvent<CsvCleanerWorkerResponse>) => {
      if (event.data.id !== id || settled) return;
      settled = true;
      cleanup();
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error));
    });
    worker.addEventListener("error", (event) => rejectOnce(new Error(event.message || "Web Worker สำหรับ CSV หยุดทำงาน")));
    worker.postMessage({ id, ...request }, [request.buffer]);
  });
}

export function CsvCleanerTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerAbortRef = useRef<AbortController | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [encoding, setEncoding] = useState<CsvEncoding>("utf-8");
  const [delimiter, setDelimiter] = useState<CsvDelimiterOption>("auto");
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [trimCells, setTrimCells] = useState(true);
  const [removeBlankRows, setRemoveBlankRows] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [ignoreBlankDuplicateKeys, setIgnoreBlankDuplicateKeys] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [keepDuplicate, setKeepDuplicate] = useState<CsvDuplicateRetention>("first");
  const [protectSpreadsheetFormulas, setProtectSpreadsheetFormulas] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [inspection, setInspection] = useState<InspectionResult | null>(null);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const busy = busyAction !== null;
  useEffect(() => () => workerAbortRef.current?.abort(), []);

  const invalidateSource = () => {
    setInspection(null);
    setCleanResult(null);
    setSelectedColumns([]);
    setError("");
  };
  const invalidateResult = () => {
    setCleanResult(null);
    setError("");
  };

  const chooseFile = (nextFile: File | null) => {
    invalidateSource();
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
      setError(`ไฟล์ใหญ่เกิน ${formatBytes(CSV_FILE_LIMIT_BYTES)} สำหรับทำความสะอาดใน Browser`);
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

  const cleanerOptions = (): CsvCleanerOptions => ({
    firstRowIsHeader,
    trimCells,
    removeBlankRows,
    duplicateColumns: selectedColumns,
    caseSensitive,
    ignoreBlankDuplicateKeys,
    removeDuplicates,
    keepDuplicate,
    protectSpreadsheetFormulas,
  });

  const inspect = async () => {
    const controller = new AbortController();
    const options = cleanerOptions();
    workerAbortRef.current = controller;
    setBusyAction("inspect");
    setError("");
    try {
      const source = await sourceBuffer();
      const response = await runCsvCleanerWorker({
        action: "inspect",
        buffer: source.buffer,
        encoding: sourceMode === "paste" ? "utf-8" : encoding,
        delimiter,
        options,
      }, controller.signal);
      setInspection({ sourceName: source.sourceName, summary: response.sourceSummary, columns: response.columns, preview: response.preview });
      setSelectedColumns(response.columns.map((column) => column.index));
      setCleanResult(null);
      toast.success(`วิเคราะห์ข้อมูล ${response.sourceSummary.rowCount.toLocaleString("th-TH")} แถวแล้ว`);
    } catch (caught) {
      if (controller.signal.aborted) return;
      invalidateSource();
      setError(caught instanceof Error ? caught.message : "วิเคราะห์ CSV ไม่สำเร็จ");
    } finally {
      if (workerAbortRef.current === controller) workerAbortRef.current = null;
      if (!controller.signal.aborted) setBusyAction(null);
    }
  };

  const cleanAndPrepare = async () => {
    if (!inspection || selectedColumns.length === 0) {
      setError("กรุณาเลือกอย่างน้อย 1 คอลัมน์สำหรับตรวจข้อมูลซ้ำ");
      return;
    }
    const controller = new AbortController();
    const options = cleanerOptions();
    workerAbortRef.current = controller;
    setBusyAction("clean");
    setError("");
    try {
      const source = await sourceBuffer();
      const response = await runCsvCleanerWorker({
        action: "clean",
        buffer: source.buffer,
        encoding: sourceMode === "paste" ? "utf-8" : encoding,
        delimiter,
        options,
      }, controller.signal);
      if (!response.cleanSummary || !response.cleanedCsv) throw new Error("ไม่ได้รับไฟล์ CSV ที่ทำความสะอาดจาก Worker");
      const filename = sanitizeCleanCsvFilename(source.sourceName);
      setCleanResult({
        filename,
        summary: response.cleanSummary,
        preview: response.preview,
        blob: new Blob([response.cleanedCsv], { type: "text/csv;charset=utf-8" }),
      });
      toast.success(`ทำความสะอาดแล้ว เหลือ ${response.cleanSummary.outputDataRowCount.toLocaleString("th-TH")} แถวข้อมูล`);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setCleanResult(null);
      setError(caught instanceof Error ? caught.message : "ทำความสะอาด CSV ไม่สำเร็จ");
    } finally {
      if (workerAbortRef.current === controller) workerAbortRef.current = null;
      if (!controller.signal.aborted) setBusyAction(null);
    }
  };

  const toggleColumn = (index: number) => {
    setSelectedColumns((current) => {
      if (!current.includes(index)) return [...current, index].sort((left, right) => left - right);
      if (current.length === 1) {
        toast.error("ต้องเลือกอย่างน้อย 1 คอลัมน์");
        return current;
      }
      return current.filter((item) => item !== index);
    });
    invalidateResult();
  };

  const loadExample = () => {
    setSourceMode("paste");
    setPastedText(SAMPLE_CSV);
    setFile(null);
    setEncoding("utf-8");
    setDelimiter("auto");
    setFirstRowIsHeader(true);
    setTrimCells(true);
    setRemoveBlankRows(true);
    setCaseSensitive(false);
    setIgnoreBlankDuplicateKeys(true);
    setRemoveDuplicates(true);
    setKeepDuplicate("first");
    setProtectSpreadsheetFormulas(true);
    invalidateSource();
  };

  const clear = () => {
    workerAbortRef.current?.abort();
    setFile(null);
    setPastedText("");
    setDragActive(false);
    invalidateSource();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><ListFilter className="size-5 text-primary" /><h2 className="font-semibold">ล้างข้อมูลซ้ำและจัดระเบียบ CSV</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">วิเคราะห์ใน Web Worker เลือกคอลัมน์เทียบแถวซ้ำ และตรวจผลก่อนดาวน์โหลด</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Client-only · สูงสุด 10 MB</span>
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-600" />
        <AlertTitle>เครื่องมือไม่เดาว่าแถวไหนสำคัญแทนคุณ</AlertTitle>
        <AlertDescription className="leading-6">ค่าเริ่มต้นเทียบครบทุกคอลัมน์ คุณสามารถเลือกเฉพาะ ID, Email หรือ SKU และเลือกว่าจะเก็บแถวแรกหรือแถวสุดท้ายได้ แถวที่คีย์ว่างจะไม่ถูกยุบรวม</AlertDescription>
      </Alert>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
        <section className="min-w-0" aria-labelledby="csv-cleaner-source-title">
          <h3 id="csv-cleaner-source-title" className="font-semibold">1. เลือกและวิเคราะห์ข้อมูล</h3>
          <Tabs value={sourceMode} onValueChange={(value) => { setSourceMode(value as SourceMode); invalidateSource(); }} className="mt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" disabled={busy}><UploadCloud className="size-4" />อัปโหลดไฟล์</TabsTrigger>
              <TabsTrigger value="paste" disabled={busy}><ClipboardPaste className="size-4" />วาง CSV / TSV</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-4 space-y-2.5">
              <Label htmlFor="csv-cleaner-source-file">ไฟล์ CSV, TSV หรือ TXT</Label>
              <input ref={inputRef} id="csv-cleaner-source-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" disabled={busy} className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              <Label
                htmlFor="csv-cleaner-source-file"
                className={`grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed p-5 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-primary/[0.03]"}`}
                onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragActive(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }}
                onDrop={(event) => { event.preventDefault(); setDragActive(false); if (!busy) chooseFile(event.dataTransfer.files[0] ?? null); }}
              >
                <span><UploadCloud className="mx-auto size-8 text-primary" /><span className="mt-2 block text-sm font-semibold">{file ? file.name : "คลิกหรือลากไฟล์มาวาง"}</span><span className="mt-1 block text-xs text-muted-foreground">{file ? `${formatBytes(file.size)} · พร้อมวิเคราะห์` : `สูงสุด ${formatBytes(CSV_FILE_LIMIT_BYTES)} · ไม่อัปโหลดขึ้น Server`}</span></span>
              </Label>
            </TabsContent>
            <TabsContent value="paste" className="mt-4 space-y-2.5">
              <Label htmlFor="csv-cleaner-pasted-text">ข้อความ CSV หรือ TSV</Label>
              <Textarea id="csv-cleaner-pasted-text" aria-label="ข้อความ CSV หรือ TSV สำหรับทำความสะอาด" value={pastedText} disabled={busy} onChange={(event) => { setPastedText(event.target.value); invalidateSource(); }} className="min-h-44 resize-y font-mono text-xs leading-5" placeholder={'id,email,name\n001,mali@example.com,มะลิ'} />
            </TabsContent>
          </Tabs>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="csv-cleaner-encoding">Encoding ของไฟล์</Label>
              <Select value={sourceMode === "paste" ? "utf-8" : encoding} disabled={sourceMode === "paste" || busy} onValueChange={(value) => { setEncoding(value as CsvEncoding); invalidateSource(); }}><SelectTrigger id="csv-cleaner-encoding" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="utf-8">UTF-8 (แนะนำ)</SelectItem><SelectItem value="windows-874">Windows-874 / ภาษาไทยเดิม</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="csv-cleaner-delimiter">ตัวคั่นคอลัมน์</Label>
              <Select value={delimiter} disabled={busy} onValueChange={(value) => { setDelimiter(value as CsvDelimiterOption); invalidateSource(); }}><SelectTrigger id="csv-cleaner-delimiter" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">ตรวจอัตโนมัติ</SelectItem><SelectItem value="comma">Comma ( , )</SelectItem><SelectItem value="tab">Tab</SelectItem><SelectItem value="semicolon">Semicolon ( ; )</SelectItem><SelectItem value="pipe">Pipe ( | )</SelectItem></SelectContent></Select>
            </div>
          </div>

          <label className="mt-4 flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">แถวแรกคือหัวตาราง</span><span className="mt-0.5 block text-xs text-muted-foreground">เก็บหัวตารางไว้และไม่นำไปตรวจซ้ำ</span></span><Switch checked={firstRowIsHeader} disabled={busy} onCheckedChange={(checked) => { setFirstRowIsHeader(checked); invalidateSource(); }} aria-label="แถวแรกคือหัวตาราง" /></label>

          <div className="mt-5"><ActionBar><Button type="button" onClick={() => void inspect()} disabled={busy}>{busyAction === "inspect" ? <LoaderCircle className="size-4 animate-spin" /> : <FileSearch2 className="size-4" />}วิเคราะห์และดู Preview</Button><ExampleButton onExample={loadExample} disabled={busy} /><ClearButton onClear={clear} disabled={busy} /></ActionBar></div>
          {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

          {inspection ? (
            <div className="mt-7 border-t pt-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">2. เลือกกฎทำความสะอาด</h3><p className="mt-1 text-xs text-muted-foreground">เลือกคอลัมน์ที่ใช้สร้างคีย์ตรวจข้อมูลซ้ำ</p></div><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setSelectedColumns(inspection.columns.map((column) => column.index)); invalidateResult(); }}>เลือกทุกคอลัมน์</Button></div>
              <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto rounded-xl border bg-muted/10 p-3 sm:grid-cols-2" role="group" aria-label="คอลัมน์สำหรับตรวจข้อมูลซ้ำ">
                {inspection.columns.map((column) => {
                  const selected = selectedColumns.includes(column.index);
                  return <Button key={column.index} type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} disabled={busy} className="min-w-0 justify-start" onClick={() => toggleColumn(column.index)}><span className="truncate">{column.index + 1}. {column.label}</span></Button>;
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">ตัดช่องว่างหัวท้าย</span><span className="mt-0.5 block text-xs text-muted-foreground">ไม่แตะช่องว่างภายในข้อความ</span></span><Switch checked={trimCells} disabled={busy} onCheckedChange={(checked) => { setTrimCells(checked); invalidateResult(); }} aria-label="ตัดช่องว่างหัวท้ายเซลล์" /></label>
                <label className="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">ลบแถวว่าง</span><span className="mt-0.5 block text-xs text-muted-foreground">ไม่ลบแถวหัวตาราง</span></span><Switch checked={removeBlankRows} disabled={busy} onCheckedChange={(checked) => { setRemoveBlankRows(checked); invalidateResult(); }} aria-label="ลบแถวว่าง" /></label>
                <label className="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">แยกตัวพิมพ์เล็ก-ใหญ่</span><span className="mt-0.5 block text-xs text-muted-foreground">ปิดไว้: A และ a ถือว่าซ้ำ</span></span><Switch checked={caseSensitive} disabled={busy} onCheckedChange={(checked) => { setCaseSensitive(checked); invalidateResult(); }} aria-label="แยกตัวพิมพ์เล็กและใหญ่เมื่อตรวจซ้ำ" /></label>
                <label className="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">ข้ามคีย์ที่ว่างทั้งหมด</span><span className="mt-0.5 block text-xs text-muted-foreground">ป้องกันแถวไร้ Email/ID ถูกยุบรวม</span></span><Switch checked={ignoreBlankDuplicateKeys} disabled={busy} onCheckedChange={(checked) => { setIgnoreBlankDuplicateKeys(checked); invalidateResult(); }} aria-label="ข้ามแถวที่คีย์ตรวจซ้ำว่างทั้งหมด" /></label>
                <label className="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">ลบแถวซ้ำ</span><span className="mt-0.5 block text-xs text-muted-foreground">ปิดเพื่อค้นหาและรายงานอย่างเดียว</span></span><Switch checked={removeDuplicates} disabled={busy} onCheckedChange={(checked) => { setRemoveDuplicates(checked); invalidateResult(); }} aria-label="ลบแถวซ้ำจากผลลัพธ์" /></label>
                <label className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"><span><span className="block font-medium">ป้องกัน Spreadsheet Formula</span><span className="mt-0.5 block text-xs text-muted-foreground">เติม Tab หน้าเซลล์เสี่ยงตามแนวทาง OWASP</span></span><Switch checked={protectSpreadsheetFormulas} disabled={busy} onCheckedChange={(checked) => { setProtectSpreadsheetFormulas(checked); invalidateResult(); }} aria-label="ป้องกันสูตรอันตรายใน Spreadsheet" /></label>
              </div>

              <div className="mt-4 space-y-2.5">
                <Label htmlFor="csv-cleaner-keep">เมื่อพบข้อมูลซ้ำ ให้เก็บ</Label>
                <Select value={keepDuplicate} disabled={!removeDuplicates || busy} onValueChange={(value) => { setKeepDuplicate(value as CsvDuplicateRetention); invalidateResult(); }}><SelectTrigger id="csv-cleaner-keep" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="first">แถวแรกที่พบ</SelectItem><SelectItem value="last">แถวสุดท้ายที่พบ</SelectItem></SelectContent></Select>
              </div>

              <div className="mt-5"><Button type="button" onClick={() => void cleanAndPrepare()} disabled={busy}>{busyAction === "clean" ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}ทำความสะอาดและสร้างไฟล์</Button></div>
            </div>
          ) : null}
        </section>

        <section className="min-w-0" aria-labelledby="csv-cleaner-result-title">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="csv-cleaner-result-title" className="font-semibold">ผลการวิเคราะห์และไฟล์ผลลัพธ์</h3><p className="mt-1 text-xs text-muted-foreground">ผลลัพธ์เป็น UTF-8 CSV พร้อม BOM สำหรับภาษาไทย</p></div>{cleanResult ? <Button type="button" onClick={() => downloadBlob(cleanResult.blob, cleanResult.filename)}><Download className="size-4" />ดาวน์โหลด CSV</Button> : null}</div>

          {!inspection ? <div className="mt-3"><EmptyOutput text="เลือกไฟล์หรือวาง CSV แล้วกด “วิเคราะห์และดู Preview”" /></div> : (
            <div className="mt-3 space-y-4" aria-live="polite" data-testid="csv-cleaner-result">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">แถวต้นฉบับ</p><p data-testid="csv-cleaner-source-rows" className="mt-1 text-xl font-bold text-primary tabular-nums">{inspection.summary.rowCount.toLocaleString("th-TH")}</p></div>
                <div className="rounded-xl border bg-muted/15 p-3"><p className="text-xs text-muted-foreground">คอลัมน์</p><p className="mt-1 text-xl font-semibold tabular-nums">{inspection.summary.columnCount.toLocaleString("th-TH")}</p></div>
                <div className="rounded-xl border bg-muted/15 p-3"><p className="text-xs text-muted-foreground">ตัวคั่น</p><p className="mt-1 text-sm font-semibold">{delimiterLabels[inspection.summary.delimiter] ?? inspection.summary.delimiter}</p></div>
                <div className="rounded-xl border bg-muted/15 p-3"><p className="text-xs text-muted-foreground">คอลัมน์เทียบซ้ำ</p><p className="mt-1 text-xl font-semibold tabular-nums">{selectedColumns.length.toLocaleString("th-TH")}</p></div>
              </div>

              {inspection.summary.raggedRowCount > 0 ? <Alert className="border-amber-500/30 bg-amber-500/5"><TriangleAlert className="text-amber-600" /><AlertTitle>พบแถวจำนวนคอลัมน์ไม่เท่ากัน</AlertTitle><AlertDescription>มี {inspection.summary.raggedRowCount.toLocaleString("th-TH")} แถว เครื่องมือจะรักษาจำนวนเซลล์เดิมไว้ ควรตรวจ Preview ก่อนใช้จริง</AlertDescription></Alert> : null}

              {cleanResult ? (
                <>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="csv-cleaner-summary">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-primary">ทำความสะอาดเสร็จแล้ว</p><span className="text-xs text-muted-foreground">{cleanResult.filename}</span></div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div><p className="text-xs text-muted-foreground">แถวข้อมูลคงเหลือ</p><p data-testid="csv-cleaner-output-rows" className="mt-1 text-lg font-bold tabular-nums">{cleanResult.summary.outputDataRowCount.toLocaleString("th-TH")}</p></div>
                      <div><p className="text-xs text-muted-foreground">พบแถวซ้ำ</p><p data-testid="csv-cleaner-duplicates" className="mt-1 text-lg font-bold tabular-nums">{cleanResult.summary.duplicateRowCount.toLocaleString("th-TH")}</p></div>
                      <div><p className="text-xs text-muted-foreground">ลบแถวซ้ำ</p><p className="mt-1 text-lg font-bold tabular-nums">{cleanResult.summary.removedDuplicateRowCount.toLocaleString("th-TH")}</p></div>
                      <div><p className="text-xs text-muted-foreground">ลบแถวว่าง</p><p className="mt-1 text-lg font-bold tabular-nums">{cleanResult.summary.removedBlankRowCount.toLocaleString("th-TH")}</p></div>
                      <div><p className="text-xs text-muted-foreground">ตัดช่องว่าง</p><p className="mt-1 text-lg font-bold tabular-nums">{cleanResult.summary.trimmedCellCount.toLocaleString("th-TH")} เซลล์</p></div>
                      <div><p className="text-xs text-muted-foreground">ป้องกันสูตร</p><p data-testid="csv-cleaner-protected" className="mt-1 text-lg font-bold tabular-nums">{cleanResult.summary.protectedCellCount.toLocaleString("th-TH")} เซลล์</p></div>
                    </div>
                  </div>
                  <CsvPreviewTable rows={cleanResult.preview} columns={inspection.summary.columnCount} label="Preview CSV หลังทำความสะอาด" firstRowIsHeader={firstRowIsHeader} />
                </>
              ) : (
                <>
                  <Alert className="border-primary/25 bg-primary/5"><FileCheck2 className="text-primary" /><AlertTitle>ไฟล์พร้อมตั้งกฎทำความสะอาด</AlertTitle><AlertDescription>เลือกคอลัมน์และตัวเลือกด้านซ้าย แล้วกด “ทำความสะอาดและสร้างไฟล์”</AlertDescription></Alert>
                  <CsvPreviewTable rows={inspection.preview} columns={inspection.summary.columnCount} label="Preview CSV ต้นฉบับ" firstRowIsHeader={firstRowIsHeader} />
                </>
              )}
              <p className="text-xs leading-5 text-muted-foreground">Preview สูงสุด {CSV_PREVIEW_ROW_LIMIT} แถว × {CSV_PREVIEW_COLUMN_LIMIT} คอลัมน์ แต่ผลลัพธ์ใช้ข้อมูลครบตามเพดานที่กำหนด</p>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>ไฟล์ถูกอ่านและทำความสะอาดใน Browser ผ่าน Web Worker ไม่มี API ของ Meaw Tools รับหรือบันทึกข้อมูล</span></p>
        <p className="flex gap-2"><Table2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>ไฟล์ผลลัพธ์ quote ทุกเซลล์ตามรูปแบบ <a href={RFC_4180_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">RFC 4180</a> และมีตัวเลือกป้องกัน <a href={OWASP_CSV_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">CSV Injection ตาม OWASP</a></span></p>
      </div>
    </WorkspaceFrame>
  );
}
