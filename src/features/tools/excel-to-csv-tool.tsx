"use client";

import { Archive, Download, FileCheck2, FileSpreadsheet, Info, LoaderCircle, ShieldCheck, Table2, TriangleAlert, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createXlsxWorkbook, parseCsv } from "@/lib/tools/csv";
import {
  EXCEL_TO_CSV_FILE_LIMIT_BYTES,
  EXCEL_TO_CSV_PREVIEW_COLUMN_LIMIT,
  EXCEL_TO_CSV_PREVIEW_ROW_LIMIT,
  type ExcelCsvDelimiter,
  type ExcelCsvLineEnding,
  type ExcelCsvOptions,
  type ExcelSheetSummary,
} from "@/lib/tools/excel-to-csv";

type BusyAction = "inspect" | "convert" | null;
type WorkerSheet = { sheet: string; summary: ExcelSheetSummary; preview: string[][] };
type ExcelWorkerSuccess = {
  id: string;
  ok: true;
  action: "inspect" | "convert";
  sheets: WorkerSheet[];
  totalCellCount: number;
  output?: ArrayBuffer;
  filename?: string;
  mimeType?: string;
  protectedCellCount?: number;
};
type ExcelWorkerResponse = ExcelWorkerSuccess | { id: string; ok: false; error: string };
type InspectionResult = { sourceName: string; sourceSize: number; sheets: WorkerSheet[]; totalCellCount: number };

const MICROSOFT_CSV_UTF8_URL = "https://support.microsoft.com/en-US/Excel/opening-csv-utf-8-files-correctly-in-excel";
const SAMPLE_XLSX_SOURCE = `รหัส,สินค้า,ยอดขาย,พร้อมขาย,วันที่,หมายเหตุ
00123,ชาไทย,1250.50,TRUE,2026-08-08,"พร้อมส่ง"
00987,"ครัวซองต์, เนยสด",95,FALSE,2026-08-09,"=HYPERLINK(""https://example.com"",""เปิด"" )"`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sampleWorkbookFile(): File {
  const workbook = createXlsxWorkbook(parseCsv(SAMPLE_XLSX_SOURCE), {
    sheetName: "ยอดขาย สิงหาคม",
    firstRowIsHeader: true,
    detectNumbers: true,
  });
  const buffer = workbook.buffer.slice(workbook.byteOffset, workbook.byteOffset + workbook.byteLength) as ArrayBuffer;
  return new File([buffer], "meaw-sales-sample.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function runExcelWorker(request: {
  action: "inspect" | "convert";
  buffer: ArrayBuffer;
  sourceName: string;
  selectedSheet: string | "all";
  options: ExcelCsvOptions;
}, signal: AbortSignal): Promise<ExcelWorkerSuccess> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./excel-to-csv.worker.ts", import.meta.url), { type: "module", name: "meaw-excel-to-csv" });
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
    const handleAbort = () => rejectOnce(new DOMException("ยกเลิกการอ่านไฟล์ Excel แล้ว", "AbortError"));

    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }
    timeout = window.setTimeout(() => rejectOnce(new Error("ประมวลผลนานเกิน 45 วินาที กรุณาลดขนาด Workbook แล้วลองใหม่")), 45_000);
    worker.addEventListener("message", (event: MessageEvent<ExcelWorkerResponse>) => {
      if (event.data.id !== id || settled) return;
      settled = true;
      cleanup();
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error));
    });
    worker.addEventListener("error", (event) => rejectOnce(new Error(event.message || "Web Worker สำหรับ Excel หยุดทำงาน")));
    worker.postMessage({ id, ...request }, [request.buffer]);
  });
}

function PreviewTable({ sheet }: { sheet: WorkerSheet }) {
  if (!sheet.preview.length) return <div className="grid min-h-36 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">Worksheet นี้ไม่มีข้อมูลสำหรับ Preview</div>;
  return (
    <div className="relative max-h-[28rem] w-full max-w-full overflow-auto rounded-xl border" data-testid="excel-csv-preview" aria-label={`ตัวอย่างข้อมูล Worksheet ${sheet.sheet}`}>
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <caption className="sr-only">แสดงสูงสุด {EXCEL_TO_CSV_PREVIEW_ROW_LIMIT} แถวและ {EXCEL_TO_CSV_PREVIEW_COLUMN_LIMIT} คอลัมน์จาก Worksheet {sheet.sheet}</caption>
        <tbody>
          {sheet.preview.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex === 0 ? "bg-primary/10 font-semibold" : "odd:bg-muted/10"}>
              {Array.from({ length: Math.min(sheet.summary.columnCount, EXCEL_TO_CSV_PREVIEW_COLUMN_LIMIT) }, (_, columnIndex) => (
                <td key={columnIndex} className="max-w-64 border-b border-r px-3 py-2 align-top last:border-r-0">
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

export function ExcelToCsvTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerAbortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<InspectionResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [delimiter, setDelimiter] = useState<ExcelCsvDelimiter>("comma");
  const [lineEnding, setLineEnding] = useState<ExcelCsvLineEnding>("crlf");
  const [includeBom, setIncludeBom] = useState(true);
  const [quoteAll, setQuoteAll] = useState(false);
  const [protectSpreadsheetFormulas, setProtectSpreadsheetFormulas] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => () => workerAbortRef.current?.abort(), []);
  const busy = busyAction !== null;
  const options = (): ExcelCsvOptions => ({ delimiter, lineEnding, includeBom, quoteAll, protectSpreadsheetFormulas });

  const inspectFile = async (nextFile: File) => {
    workerAbortRef.current?.abort();
    workerAbortRef.current = null;
    setBusyAction(null);
    setFile(nextFile);
    setInspection(null);
    setResultMessage("");
    setError("");
    if (nextFile.size <= 0) { setError("ไฟล์ที่เลือกว่างเปล่า"); return; }
    if (nextFile.size > EXCEL_TO_CSV_FILE_LIMIT_BYTES) { setError(`ไฟล์ใหญ่เกิน ${formatBytes(EXCEL_TO_CSV_FILE_LIMIT_BYTES)} สำหรับการแปลงใน Browser`); return; }
    if (!/\.xlsx$/i.test(nextFile.name)) { setError("รองรับไฟล์ .xlsx เท่านั้น ไฟล์ .xls แบบเก่าต้องบันทึกใหม่เป็น .xlsx ก่อน"); return; }

    const controller = new AbortController();
    workerAbortRef.current = controller;
    setBusyAction("inspect");
    try {
      const response = await runExcelWorker({
        action: "inspect",
        buffer: await nextFile.arrayBuffer(),
        sourceName: nextFile.name,
        selectedSheet: "all",
        options: options(),
      }, controller.signal);
      const nextInspection = { sourceName: nextFile.name, sourceSize: nextFile.size, sheets: response.sheets, totalCellCount: response.totalCellCount };
      setInspection(nextInspection);
      setSelectedSheet(response.sheets[0]!.sheet);
      toast.success(`อ่าน ${response.sheets.length.toLocaleString("th-TH")} Worksheet แล้ว`);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "อ่านไฟล์ Excel ไม่สำเร็จ");
    } finally {
      if (workerAbortRef.current === controller) workerAbortRef.current = null;
      if (!controller.signal.aborted) setBusyAction(null);
    }
  };

  const chooseFile = (nextFile: File | null) => {
    if (!nextFile) return;
    void inspectFile(nextFile);
  };

  const convertAndDownload = async () => {
    if (!file || !inspection || !selectedSheet) return;
    const controller = new AbortController();
    workerAbortRef.current = controller;
    setBusyAction("convert");
    setError("");
    setResultMessage("");
    try {
      const response = await runExcelWorker({
        action: "convert",
        buffer: await file.arrayBuffer(),
        sourceName: file.name,
        selectedSheet,
        options: options(),
      }, controller.signal);
      if (!response.output || !response.filename || !response.mimeType) throw new Error("ไม่ได้รับไฟล์ CSV จาก Worker");
      downloadBlob(new Blob([response.output], { type: response.mimeType }), response.filename);
      const protectedText = response.protectedCellCount ? ` · ป้องกันสูตรเสี่ยง ${response.protectedCellCount.toLocaleString("th-TH")} เซลล์` : "";
      setResultMessage(`สร้าง ${response.filename} สำเร็จ${protectedText}`);
      toast.success(`สร้าง ${response.filename} แล้ว`);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "สร้าง CSV ไม่สำเร็จ");
    } finally {
      if (workerAbortRef.current === controller) workerAbortRef.current = null;
      if (!controller.signal.aborted) setBusyAction(null);
    }
  };

  const clear = () => {
    workerAbortRef.current?.abort();
    workerAbortRef.current = null;
    setBusyAction(null);
    setFile(null);
    setInspection(null);
    setSelectedSheet("");
    setError("");
    setResultMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const loadExample = () => {
    const sample = sampleWorkbookFile();
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(sample);
      inputRef.current.files = transfer.files;
    }
    void inspectFile(sample);
  };

  const previewSheet = inspection?.sheets.find((item) => item.sheet === selectedSheet) ?? inspection?.sheets[0];
  const selectedSummary = selectedSheet === "all"
    ? {
        rowCount: inspection?.sheets.reduce((total, item) => total + item.summary.rowCount, 0) ?? 0,
        columnCount: Math.max(0, ...(inspection?.sheets.map((item) => item.summary.columnCount) ?? [])),
      }
    : previewSheet?.summary;

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /><h2 className="font-semibold">แปลง Excel .xlsx เป็น CSV UTF-8</h2></div><p className="mt-1 text-xs leading-5 text-muted-foreground">เลือก Worksheet, ตัวคั่น, BOM และรูปแบบบรรทัด แล้วดาวน์โหลด CSV โดยไม่อัปโหลดไฟล์</p></div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">XLSX · Web Worker</span>
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-700" />
        <AlertTitle>UTF-8 BOM ช่วยให้ Excel เปิดภาษาไทยได้ตรงขึ้น</AlertTitle>
        <AlertDescription>Microsoft ระบุว่า Excel เปิด CSV แบบ UTF-8 ได้ตามปกติเมื่อไฟล์มี BOM เครื่องมือนี้จึงเปิด BOM เป็นค่าเริ่มต้น แต่ปิดได้สำหรับระบบนำเข้าที่ไม่ต้องการ · <a href={MICROSOFT_CSV_UTF8_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">คู่มือ Microsoft</a></AlertDescription>
      </Alert>

      <section className="mt-6" aria-labelledby="excel-source-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="excel-source-title" className="font-semibold">1. เลือกไฟล์ Excel</h3><p className="mt-1 text-xs text-muted-foreground">อ่านเฉพาะ .xlsx สูงสุด {formatBytes(EXCEL_TO_CSV_FILE_LIMIT_BYTES)} และตรวจไฟล์อัตโนมัติหลังเลือก</p></div><ActionBar><ExampleButton onExample={loadExample} disabled={busy} /><ClearButton onClear={clear} disabled={busy && !file} /></ActionBar></div>
        <div
          className={`mt-4 rounded-2xl border-2 border-dashed p-5 transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/10"}`}
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
          onDrop={(event) => { event.preventDefault(); setDragActive(false); chooseFile(event.dataTransfer.files[0] ?? null); }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><UploadCloud className="size-6" /></span><div className="min-w-0 flex-1"><Label htmlFor="excel-to-csv-file">ไฟล์ Excel .xlsx</Label><Input ref={inputRef} id="excel-to-csv-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-[12px]!" disabled={busy} onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /><p className="mt-2 text-xs text-muted-foreground">ลากไฟล์มาวางได้ · ไม่รองรับ .xls, macro, รูปภาพ หรือ Chart ในผลลัพธ์ CSV</p></div></div>
          {file ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background px-4 py-3 text-sm"><span className="min-w-0 truncate font-medium">{file.name}</span><span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span></div> : null}
        </div>
        {busyAction === "inspect" ? <p className="mt-3 flex items-center gap-2 text-sm text-primary" role="status"><LoaderCircle className="size-4 animate-spin" />กำลังอ่าน Workbook ใน Web Worker…</p> : null}
        {error ? <p className="mt-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive" role="alert">{error}</p> : null}
      </section>

      {inspection ? <>
        <section className="mt-7" aria-labelledby="excel-options-title">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="excel-options-title" className="font-semibold">2. เลือก Worksheet และรูปแบบ CSV</h3><p className="mt-1 text-xs text-muted-foreground">พบ {inspection.sheets.length.toLocaleString("th-TH")} Worksheet · {inspection.totalCellCount.toLocaleString("th-TH")} เซลล์</p></div><span className="flex items-center gap-1.5 text-xs font-medium text-primary" role="status"><FileCheck2 className="size-4" />อ่าน Workbook สำเร็จ</span></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div><Label htmlFor="excel-csv-sheet">Worksheet ที่ส่งออก</Label><select id="excel-csv-sheet" className="mt-[12px]! h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm" value={selectedSheet} onChange={(event) => { setSelectedSheet(event.target.value); setResultMessage(""); }}>{inspection.sheets.map((item) => <option key={item.sheet} value={item.sheet}>{item.sheet}</option>)}{inspection.sheets.length > 1 ? <option value="all">ทุก Worksheet — ZIP</option> : null}</select></div>
            <div><Label htmlFor="excel-csv-delimiter">ตัวคั่นคอลัมน์</Label><select id="excel-csv-delimiter" className="mt-[12px]! h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm" value={delimiter} onChange={(event) => { setDelimiter(event.target.value as ExcelCsvDelimiter); setResultMessage(""); }}><option value="comma">Comma ( , )</option><option value="semicolon">Semicolon ( ; )</option><option value="tab">Tab</option><option value="pipe">Pipe ( | )</option></select></div>
            <div><Label htmlFor="excel-csv-line-ending">รูปแบบขึ้นบรรทัด</Label><select id="excel-csv-line-ending" className="mt-[12px]! h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm" value={lineEnding} onChange={(event) => { setLineEnding(event.target.value as ExcelCsvLineEnding); setResultMessage(""); }}><option value="crlf">CRLF — Windows / Excel</option><option value="lf">LF — Linux / macOS</option></select></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex min-h-20 items-center justify-between gap-4 rounded-xl border bg-muted/10 p-4 text-sm"><span><span className="block font-medium">UTF-8 BOM</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">แนะนำสำหรับภาษาไทยใน Excel</span></span><Switch checked={includeBom} onCheckedChange={(value) => { setIncludeBom(value); setResultMessage(""); }} aria-label="เพิ่ม UTF-8 BOM" /></label>
            <label className="flex min-h-20 items-center justify-between gap-4 rounded-xl border bg-muted/10 p-4 text-sm"><span><span className="block font-medium">ใส่ Quote ทุกเซลล์</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">ปกติ Quote เฉพาะค่าที่จำเป็น</span></span><Switch checked={quoteAll} onCheckedChange={(value) => { setQuoteAll(value); setResultMessage(""); }} aria-label="ใส่ Quote ทุกเซลล์" /></label>
            <label className="flex min-h-20 items-center justify-between gap-4 rounded-xl border bg-muted/10 p-4 text-sm"><span><span className="block font-medium">ป้องกัน Formula Injection</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">กันข้อความที่ขึ้นต้น = + - @ เมื่อเปิดใน Spreadsheet</span></span><Switch checked={protectSpreadsheetFormulas} onCheckedChange={(value) => { setProtectSpreadsheetFormulas(value); setResultMessage(""); }} aria-label="ป้องกัน Formula Injection" /></label>
          </div>
        </section>

        <section className="mt-7" aria-labelledby="excel-preview-title">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="excel-preview-title" className="font-semibold">3. ตรวจ Preview แล้วดาวน์โหลด</h3><p className="mt-1 text-xs text-muted-foreground">{selectedSheet === "all" ? `Preview Worksheet แรก · ส่งออก ${inspection.sheets.length} ไฟล์ใน ZIP` : `${selectedSummary?.rowCount.toLocaleString("th-TH")} แถว × ${selectedSummary?.columnCount.toLocaleString("th-TH")} คอลัมน์`} · แสดงสูงสุด {EXCEL_TO_CSV_PREVIEW_ROW_LIMIT} × {EXCEL_TO_CSV_PREVIEW_COLUMN_LIMIT}</p></div><Button type="button" disabled={busy} onClick={() => void convertAndDownload()} aria-label={selectedSheet === "all" ? "ดาวน์โหลดทุก Worksheet เป็น ZIP" : "ดาวน์โหลด CSV"}>{busyAction === "convert" ? <LoaderCircle className="size-4 animate-spin" /> : selectedSheet === "all" ? <Archive className="size-4" /> : <Download className="size-4" />}{selectedSheet === "all" ? "ดาวน์โหลด ZIP" : "ดาวน์โหลด CSV"}</Button></div>
          <div className="mt-4">{previewSheet ? <PreviewTable sheet={previewSheet} /> : null}</div>
          {resultMessage ? <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary" role="status"><FileCheck2 className="size-4" />{resultMessage}</p> : null}
        </section>
      </> : null}

      <div className="mt-7 grid gap-3 border-t pt-5 md:grid-cols-2">
        <p className="flex gap-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>อ่านและสร้าง CSV ภายใน Web Worker ของ Browser ไม่มี API ของ Meaw Tools รับหรือบันทึก Workbook</span></p>
        <p className="flex gap-3 text-xs leading-5 text-muted-foreground"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /><span>CSV เก็บเฉพาะค่าของเซลล์ ไม่เก็บสี ฟอนต์ สูตร รูปภาพ Chart merged cell หรือหลาย Worksheet ในไฟล์เดียว; เลือกทุก Worksheet จะได้ ZIP แยกไฟล์</span></p>
      </div>
      <p className="mt-3 flex gap-2 text-[11px] leading-5 text-muted-foreground"><Table2 className="mt-0.5 size-3 shrink-0" /><span>ตัวเลขถูกอ่านเป็นข้อความเพื่อรักษาความแม่นยำ แต่รูปแบบแสดงผล เช่น 00123 ที่เก็บเป็น “ตัวเลขพร้อม custom format” อาจเหลือ 123; หากเซลล์เก็บเป็น Text จะรักษาเลขศูนย์นำหน้าได้</span></p>
    </WorkspaceFrame>
  );
}
