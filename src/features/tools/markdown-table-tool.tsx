"use client";

import {
  ClipboardPaste,
  Columns3,
  FileCode2,
  Plus,
  Rows3,
  ShieldCheck,
  Table2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, DownloadButton, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createMarkdownTable,
  importDelimitedMarkdownTable,
  MARKDOWN_TABLE_CELL_CHARACTER_LIMIT,
  MARKDOWN_TABLE_COLUMN_LIMIT,
  MARKDOWN_TABLE_ROW_LIMIT,
  type MarkdownTableAlignment,
  type MarkdownTableData,
} from "@/lib/tools/markdown-table";

const GITHUB_MARKDOWN_TABLE_URL = "https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables";

const alignmentOptions: Array<{ value: MarkdownTableAlignment; label: string }> = [
  { value: "default", label: "ค่าเริ่มต้น" },
  { value: "left", label: "ซ้าย" },
  { value: "center", label: "กลาง" },
  { value: "right", label: "ขวา" },
];

function emptyTable(): MarkdownTableData {
  return {
    headers: ["คอลัมน์ 1", "คอลัมน์ 2", "คอลัมน์ 3"],
    rows: [["", "", ""], ["", "", ""]],
    alignments: ["default", "default", "default"],
  };
}

function exampleTable(): MarkdownTableData {
  return {
    headers: ["สินค้า", "ราคา", "สถานะ"],
    rows: [["ชาไทย", "65", "พร้อมขาย"], ["กาแฟ", "80", "หมด"], ["ครัวซองต์ | เนยสด", "95", "พร้อมขาย"]],
    alignments: ["left", "right", "center"],
  };
}

function delimiterLabel(value: string): string {
  if (value === "\t") return "Tab (TSV / Excel)";
  if (value === ",") return "Comma (CSV)";
  if (value === ";") return "Semicolon";
  return "Pipe";
}

export function MarkdownTableTool() {
  const [table, setTable] = useState<MarkdownTableData>(emptyTable);
  const [importText, setImportText] = useState("");
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [importSummary, setImportSummary] = useState("");
  const [error, setError] = useState("");
  const markdown = useMemo(() => createMarkdownTable(table), [table]);

  const updateHeader = (columnIndex: number, value: string) => {
    setTable((current) => ({ ...current, headers: current.headers.map((header, index) => index === columnIndex ? value : header) }));
  };
  const updateAlignment = (columnIndex: number, value: MarkdownTableAlignment) => {
    setTable((current) => ({ ...current, alignments: current.alignments.map((alignment, index) => index === columnIndex ? value : alignment) }));
  };
  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setTable((current) => ({
      ...current,
      rows: current.rows.map((row, currentRowIndex) => currentRowIndex === rowIndex
        ? row.map((cell, currentColumnIndex) => currentColumnIndex === columnIndex ? value : cell)
        : row),
    }));
  };
  const addRow = () => {
    if (table.rows.length >= MARKDOWN_TABLE_ROW_LIMIT) { toast.error(`เพิ่มได้ไม่เกิน ${MARKDOWN_TABLE_ROW_LIMIT} แถว`); return; }
    setTable((current) => current.rows.length >= MARKDOWN_TABLE_ROW_LIMIT
      ? current
      : ({ ...current, rows: [...current.rows, Array.from({ length: current.headers.length }, () => "")] }));
  };
  const removeRow = (rowIndex: number) => {
    setTable((current) => ({ ...current, rows: current.rows.filter((_, index) => index !== rowIndex) }));
  };
  const addColumn = () => {
    if (table.headers.length >= MARKDOWN_TABLE_COLUMN_LIMIT) { toast.error(`เพิ่มได้ไม่เกิน ${MARKDOWN_TABLE_COLUMN_LIMIT} คอลัมน์`); return; }
    setTable((current) => current.headers.length >= MARKDOWN_TABLE_COLUMN_LIMIT ? current : ({
      headers: [...current.headers, `คอลัมน์ ${current.headers.length + 1}`],
      alignments: [...current.alignments, "default"],
      rows: current.rows.map((row) => [...row, ""]),
    }));
  };
  const removeColumn = (columnIndex: number) => {
    if (table.headers.length <= 1) { toast.error("ตารางต้องมีอย่างน้อย 1 คอลัมน์"); return; }
    setTable((current) => ({
      headers: current.headers.filter((_, index) => index !== columnIndex),
      alignments: current.alignments.filter((_, index) => index !== columnIndex),
      rows: current.rows.map((row) => row.filter((_, index) => index !== columnIndex)),
    }));
  };
  const importData = () => {
    try {
      const imported = importDelimitedMarkdownTable(importText, firstRowIsHeader);
      setTable({ headers: imported.headers, rows: imported.rows, alignments: imported.alignments });
      setImportSummary(`นำเข้า ${imported.importedRowCount.toLocaleString("th-TH")} แถว × ${imported.headers.length.toLocaleString("th-TH")} คอลัมน์ · ${delimiterLabel(imported.delimiter)}`);
      setError("");
      toast.success("นำข้อมูลเข้าตารางแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "นำเข้าข้อมูลไม่สำเร็จ");
    }
  };
  const loadExample = () => {
    setTable(exampleTable());
    setImportText("สินค้า\tราคา\tสถานะ\nชาไทย\t65\tพร้อมขาย\nกาแฟ\t80\tหมด\nครัวซองต์ | เนยสด\t95\tพร้อมขาย");
    setFirstRowIsHeader(true);
    setImportSummary("โหลดตัวอย่างตารางสินค้าแล้ว");
    setError("");
  };
  const clear = () => {
    setTable(emptyTable());
    setImportText("");
    setFirstRowIsHeader(true);
    setImportSummary("");
    setError("");
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Table2 className="size-5 text-primary" /><h2 className="font-semibold">สร้างและจัดรูปตาราง Markdown แบบเห็นภาพ</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">พิมพ์ในเซลล์หรือวางข้อมูลจาก Excel, Google Sheets, CSV และ TSV แล้วคัดลอก GitHub Flavored Markdown ได้ทันที</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">GFM · ทำงานใน Browser</span>
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <FileCode2 className="text-sky-700" />
        <AlertTitle>สร้าง delimiter row, alignment และ escape เครื่องหมาย Pipe ให้ถูกต้อง</AlertTitle>
        <AlertDescription className="leading-6">GitHub ระบุว่าตารางใช้ Pipe กับ Hyphen, ใช้ Colon เพื่อจัดแนว และต้อง escape <code>|</code> ภายในเซลล์เป็น <code>\|</code> เครื่องมือนี้ทำให้โดยอัตโนมัติ · <a href={GITHUB_MARKDOWN_TABLE_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">อ่านคู่มือ GitHub</a></AlertDescription>
      </Alert>

      <section className="mt-6" aria-labelledby="markdown-import-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 id="markdown-import-title" className="font-semibold">1. วางข้อมูล หรือเริ่มแก้ไขในตาราง</h3><p className="mt-1 text-xs text-muted-foreground">ตรวจตัวคั่น Comma, Tab, Semicolon หรือ Pipe อัตโนมัติ และรองรับ quoted CSV</p></div>
          <span className="text-xs text-muted-foreground">สูงสุด {MARKDOWN_TABLE_ROW_LIMIT} แถว × {MARKDOWN_TABLE_COLUMN_LIMIT} คอลัมน์</span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-2.5">
            <Label htmlFor="markdown-import-text">ข้อมูลจาก Excel / Sheets / CSV / TSV</Label>
            <Textarea id="markdown-import-text" className="min-h-32 resize-y font-mono text-xs leading-5" value={importText} onChange={(event) => { setImportText(event.target.value); setError(""); }} placeholder={'สินค้า\tราคา\tสถานะ\nชาไทย\t65\tพร้อมขาย'} spellCheck={false} />
          </div>
          <div className="rounded-xl border bg-muted/10 p-4">
            <label className="flex min-h-12 items-center justify-between gap-4 text-sm"><span><span className="block font-medium">ใช้แถวแรกเป็นหัวตาราง</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">ปิดเพื่อสร้างชื่อคอลัมน์อัตโนมัติ</span></span><Switch checked={firstRowIsHeader} onCheckedChange={setFirstRowIsHeader} aria-label="ใช้แถวแรกเป็นหัวตาราง" /></label>
            <div className="mt-4"><ActionBar><Button type="button" onClick={importData}><ClipboardPaste className="size-4" />นำเข้าตาราง</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
            {importSummary ? <p className="mt-3 text-xs leading-5 text-primary" role="status">{importSummary}</p> : null}
            {error ? <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs leading-5 text-destructive" role="alert">{error}</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="markdown-editor-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 id="markdown-editor-title" className="font-semibold">2. แก้ไขหัวตาราง เซลล์ และการจัดแนว</h3><p className="mt-1 text-xs text-muted-foreground">บนมือถือเลื่อนเฉพาะกรอบตารางด้านข้างได้ โดยหน้าเว็บหลักไม่ล้นแนวนอน</p></div>
          <ActionBar><Button type="button" size="sm" variant="outline" onClick={addRow}><Rows3 className="size-4" />เพิ่มแถว</Button><Button type="button" size="sm" variant="outline" onClick={addColumn}><Columns3 className="size-4" />เพิ่มคอลัมน์</Button></ActionBar>
        </div>
        <div className="relative mt-4 w-full max-w-full overflow-x-auto rounded-xl border" tabIndex={0} aria-label="ตัวแก้ไขตารางที่เลื่อนได้แนวนอน">
          <table className="min-w-max border-collapse text-sm">
            <caption className="sr-only">แก้ไขข้อมูลสำหรับสร้างตาราง Markdown</caption>
            <thead className="bg-muted/40">
              <tr>
                <th scope="col" className="w-14 border-r p-2 text-center text-xs text-muted-foreground">แถว</th>
                {table.headers.map((header, columnIndex) => (
                  <th key={`header-${columnIndex}`} scope="col" className="min-w-52 border-r p-3 text-left align-top last:border-r-0">
                    <Label className="sr-only" htmlFor={`markdown-header-${columnIndex}`}>หัวคอลัมน์ {columnIndex + 1}</Label>
                    <Input id={`markdown-header-${columnIndex}`} value={header} maxLength={MARKDOWN_TABLE_CELL_CHARACTER_LIMIT} onChange={(event) => updateHeader(columnIndex, event.target.value)} aria-label={`หัวคอลัมน์ ${columnIndex + 1}`} />
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        className="h-8 min-w-32 flex-1 rounded-lg border border-input bg-background px-2 text-base outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-7 md:text-sm"
                        value={table.alignments[columnIndex]}
                        aria-label={`การจัดแนวคอลัมน์ ${columnIndex + 1}`}
                        onChange={(event) => updateAlignment(columnIndex, event.target.value as MarkdownTableAlignment)}
                      >
                        {alignmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <Button type="button" size="icon-sm" variant="ghost" disabled={table.headers.length <= 1} aria-label={`ลบคอลัมน์ ${columnIndex + 1}`} onClick={() => removeColumn(columnIndex)}><Trash2 className="size-4" /></Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-t">
                  <th scope="row" className="border-r bg-muted/15 p-2 text-center font-mono text-xs text-muted-foreground">{rowIndex + 1}<Button type="button" size="icon-xs" variant="ghost" className="mx-auto mt-1 block" aria-label={`ลบแถว ${rowIndex + 1}`} onClick={() => removeRow(rowIndex)}><Trash2 className="size-3.5" /></Button></th>
                  {row.map((cell, columnIndex) => <td key={`cell-${rowIndex}-${columnIndex}`} className="border-r p-2 last:border-r-0"><Label className="sr-only" htmlFor={`markdown-cell-${rowIndex}-${columnIndex}`}>แถว {rowIndex + 1} คอลัมน์ {columnIndex + 1}</Label><Input id={`markdown-cell-${rowIndex}-${columnIndex}`} className="min-w-44" value={cell} maxLength={MARKDOWN_TABLE_CELL_CHARACTER_LIMIT} onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)} aria-label={`แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1}`} /></td>)}
                </tr>
              ))}
              {!table.rows.length ? <tr><td colSpan={table.headers.length + 1} className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีแถวข้อมูล กด “เพิ่มแถว” เพื่อเริ่มกรอก</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="markdown-output-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 id="markdown-output-title" className="font-semibold">3. ตรวจ Preview แล้วคัดลอก Markdown</h3><p className="mt-1 text-xs text-muted-foreground">{table.rows.length.toLocaleString("th-TH")} แถว · {table.headers.length.toLocaleString("th-TH")} คอลัมน์ · {markdown.length.toLocaleString("th-TH")} ตัวอักษร</p></div>
          <ActionBar><CopyButton value={markdown} label="คัดลอก Markdown" /><DownloadButton value={markdown} filename="meaw-markdown-table.md" type="text/markdown;charset=utf-8" /></ActionBar>
        </div>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">
          <div className="min-w-0"><p className="mb-2 text-sm font-semibold">Markdown ที่สร้าง</p><pre data-testid="markdown-table-output" className="min-h-72 max-w-full overflow-auto rounded-xl border bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{markdown}</code></pre></div>
          <div className="min-w-0"><p className="mb-2 text-sm font-semibold">ตัวอย่างตาราง</p><div className="min-h-72 max-w-full overflow-auto rounded-xl border bg-background p-4"><table className="w-full min-w-md border-collapse text-sm"><caption className="sr-only">ตัวอย่างผลลัพธ์ตาราง Markdown</caption><thead><tr>{table.headers.map((header, index) => <th key={`preview-head-${index}`} scope="col" className="border bg-muted/30 px-3 py-2 font-semibold" style={{ textAlign: table.alignments[index] === "default" ? undefined : table.alignments[index] }}>{header.trim() || `คอลัมน์ ${index + 1}`}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={`preview-row-${rowIndex}`}>{table.headers.map((_, columnIndex) => <td key={`preview-cell-${rowIndex}-${columnIndex}`} className="whitespace-pre-line border px-3 py-2" style={{ textAlign: table.alignments[columnIndex] === "default" ? undefined : table.alignments[columnIndex] }}>{row[columnIndex] ?? ""}</td>)}</tr>)}</tbody></table></div></div>
        </div>
      </section>

      <div className="mt-6 grid gap-3 border-t pt-5 md:grid-cols-2">
        <div className="flex gap-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p>ข้อมูลและ Markdown ทั้งหมดอยู่ใน Browser ไม่มี API ของ Meaw Tools รับหรือบันทึกตาราง</p></div>
        <div className="flex gap-3 text-xs leading-5 text-muted-foreground"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /><p>GFM ไม่รองรับ merged cells, colspan หรือ rowspan และ Markdown renderer บางตัวอาจไม่รองรับตารางหรือ HTML <code>&lt;br&gt;</code> เหมือน GitHub</p></div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground"><Plus className="mr-1 inline size-3" />หัวคอลัมน์ว่างจะถูกแทนด้วย “คอลัมน์ N” เพื่อให้ delimiter row จับคู่จำนวนคอลัมน์ได้ และเซลล์หลายบรรทัดจะใช้ <code>&lt;br&gt;</code></p>
    </WorkspaceFrame>
  );
}
