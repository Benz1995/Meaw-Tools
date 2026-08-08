"use client";

import {
  Braces,
  ClipboardPaste,
  Columns3,
  Merge,
  Rows3,
  ShieldCheck,
  Split,
  TableProperties,
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
  applyHtmlTableSpan,
  createEmptyHtmlTable,
  createHtmlTable,
  createHtmlTableCell,
  createStandaloneHtmlTablePage,
  flattenHtmlTableMerges,
  HTML_TABLE_CELL_CHARACTER_LIMIT,
  HTML_TABLE_COLUMN_LIMIT,
  HTML_TABLE_ROW_LIMIT,
  importDelimitedHtmlTable,
  unmergeHtmlTableCell,
  type HtmlTableData,
  type HtmlTableOptions,
  type HtmlTableOutputMode,
  type HtmlTableStylePreset,
} from "@/lib/tools/html-table";

const W3C_TABLE_TUTORIAL_URL = "https://www.w3.org/WAI/tutorials/tables/";

type SelectedCell = { row: number; column: number };

const outputModeOptions: Array<{ value: HtmlTableOutputMode; label: string; detail: string }> = [
  { value: "css", label: "CSS + class", detail: "แก้ง่าย เหมาะกับเว็บทั่วไป" },
  { value: "inline", label: "Inline CSS", detail: "นำไปวางในระบบที่แยกไฟล์ CSS ไม่ได้" },
  { value: "html-only", label: "Semantic HTML", detail: "ไม่มี CSS และ wrapper responsive" },
];

const presetOptions: Array<{ value: HtmlTableStylePreset; label: string }> = [
  { value: "clean", label: "Clean" },
  { value: "striped", label: "Striped" },
  { value: "minimal", label: "Minimal" },
];

function initialTable(): HtmlTableData {
  return {
    rows: [
      [createHtmlTableCell("สินค้า"), createHtmlTableCell("ราคา"), createHtmlTableCell("สถานะ")],
      [createHtmlTableCell("ชาไทย"), createHtmlTableCell("65"), createHtmlTableCell("พร้อมขาย")],
      [createHtmlTableCell("กาแฟ"), createHtmlTableCell("80"), createHtmlTableCell("หมด")],
    ],
  };
}

function delimiterLabel(value: string): string {
  if (value === "\t") return "Tab (TSV / Excel)";
  if (value === ",") return "Comma (CSV)";
  if (value === ";") return "Semicolon";
  return "Pipe";
}

function tableDimensions(table: HtmlTableData) {
  return { rows: table.rows.length, columns: table.rows[0]?.length ?? 0 };
}

function hasMerges(table: HtmlTableData): boolean {
  return table.rows.some((row) => row.some((cell) => cell.hidden || cell.rowSpan > 1 || cell.colSpan > 1));
}

function isNumeric(value: string): boolean {
  const normalized = value.trim().replaceAll(",", "");
  return normalized !== "" && Number.isFinite(Number(normalized));
}

export function HtmlTableTool() {
  const [table, setTable] = useState<HtmlTableData>(initialTable);
  const [caption, setCaption] = useState("ตารางสินค้า Meaw Cafe");
  const [headerRow, setHeaderRow] = useState(true);
  const [headerColumn, setHeaderColumn] = useState(false);
  const [responsive, setResponsive] = useState(true);
  const [stylePreset, setStylePreset] = useState<HtmlTableStylePreset>("striped");
  const [outputMode, setOutputMode] = useState<HtmlTableOutputMode>("css");
  const [selected, setSelected] = useState<SelectedCell>({ row: 0, column: 0 });
  const [requestedRowSpan, setRequestedRowSpan] = useState(1);
  const [requestedColSpan, setRequestedColSpan] = useState(1);
  const [importText, setImportText] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [error, setError] = useState("");

  const options = useMemo<HtmlTableOptions>(() => ({ caption, headerRow, headerColumn, responsive, stylePreset, outputMode }), [caption, headerRow, headerColumn, responsive, stylePreset, outputMode]);
  const generated = useMemo(() => {
    try {
      return { code: createHtmlTable(table, options), error: "" };
    } catch (caught) {
      return { code: "", error: caught instanceof Error ? caught.message : "สร้าง HTML ไม่สำเร็จ" };
    }
  }, [table, options]);
  const dimensions = tableDimensions(table);
  const selectedCell = table.rows[selected.row]?.[selected.column];
  const maxRowSpan = headerRow && selected.row === 0 ? 1 : dimensions.rows - selected.row;
  const maxColSpan = dimensions.columns - selected.column;

  const selectCell = (row: number, column: number) => {
    setSelected({ row, column });
    const cell = table.rows[row]?.[column];
    setRequestedRowSpan(cell?.rowSpan ?? 1);
    setRequestedColSpan(cell?.colSpan ?? 1);
    setError("");
  };

  const updateCell = (row: number, column: number, value: string) => {
    setTable((current) => ({
      rows: current.rows.map((currentRow, rowIndex) => currentRow.map((cell, columnIndex) => (
        rowIndex === row && columnIndex === column ? { ...cell, value } : cell
      ))),
    }));
  };

  const addRow = () => {
    if (dimensions.rows >= HTML_TABLE_ROW_LIMIT) { toast.error(`เพิ่มได้ไม่เกิน ${HTML_TABLE_ROW_LIMIT} แถว`); return; }
    if (hasMerges(table)) toast.info("แยก merged cells ก่อนเปลี่ยนโครงสร้างตารางแล้ว");
    setTable((current) => {
      const flat = flattenHtmlTableMerges(current);
      return { rows: [...flat.rows, Array.from({ length: dimensions.columns }, () => createHtmlTableCell())] };
    });
  };

  const addColumn = () => {
    if (dimensions.columns >= HTML_TABLE_COLUMN_LIMIT) { toast.error(`เพิ่มได้ไม่เกิน ${HTML_TABLE_COLUMN_LIMIT} คอลัมน์`); return; }
    if (hasMerges(table)) toast.info("แยก merged cells ก่อนเปลี่ยนโครงสร้างตารางแล้ว");
    setTable((current) => {
      const flat = flattenHtmlTableMerges(current);
      return { rows: flat.rows.map((row) => [...row, createHtmlTableCell()]) };
    });
  };

  const removeSelectedRow = () => {
    if (dimensions.rows <= 1) { toast.error("ตารางต้องมีอย่างน้อย 1 แถว"); return; }
    if (hasMerges(table)) toast.info("แยก merged cells ก่อนเปลี่ยนโครงสร้างตารางแล้ว");
    setTable((current) => {
      const flat = flattenHtmlTableMerges(current);
      return { rows: flat.rows.filter((_, rowIndex) => rowIndex !== selected.row) };
    });
    setSelected((current) => ({ row: Math.min(current.row, dimensions.rows - 2), column: current.column }));
    setRequestedRowSpan(1);
    setRequestedColSpan(1);
  };

  const removeSelectedColumn = () => {
    if (dimensions.columns <= 1) { toast.error("ตารางต้องมีอย่างน้อย 1 คอลัมน์"); return; }
    if (hasMerges(table)) toast.info("แยก merged cells ก่อนเปลี่ยนโครงสร้างตารางแล้ว");
    setTable((current) => {
      const flat = flattenHtmlTableMerges(current);
      return { rows: flat.rows.map((row) => row.filter((_, columnIndex) => columnIndex !== selected.column)) };
    });
    setSelected((current) => ({ row: current.row, column: Math.min(current.column, dimensions.columns - 2) }));
    setRequestedRowSpan(1);
    setRequestedColSpan(1);
  };

  const mergeCells = () => {
    try {
      if (headerRow && selected.row === 0 && requestedRowSpan > 1) throw new Error("หัวตารางใน thead ไม่ควรรวมข้ามลงไปยัง tbody");
      const next = applyHtmlTableSpan(table, selected.row, selected.column, requestedRowSpan, requestedColSpan);
      setTable(next);
      setError("");
      toast.success(requestedRowSpan === 1 && requestedColSpan === 1 ? "เซลล์อยู่ในรูปแบบปกติแล้ว" : "รวมเซลล์แล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "รวมเซลล์ไม่สำเร็จ");
    }
  };

  const unmergeCell = () => {
    try {
      setTable(unmergeHtmlTableCell(table, selected.row, selected.column));
      setRequestedRowSpan(1);
      setRequestedColSpan(1);
      setError("");
      toast.success("แยกเซลล์แล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "แยกเซลล์ไม่สำเร็จ");
    }
  };

  const importData = () => {
    try {
      const imported = importDelimitedHtmlTable(importText);
      setTable(imported.table);
      setSelected({ row: 0, column: 0 });
      setRequestedRowSpan(1);
      setRequestedColSpan(1);
      setImportSummary(`นำเข้า ${imported.importedRowCount.toLocaleString("th-TH")} แถว × ${imported.columnCount.toLocaleString("th-TH")} คอลัมน์ · ${delimiterLabel(imported.delimiter)}`);
      setError("");
      toast.success("นำข้อมูลเข้าตารางแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "นำเข้าข้อมูลไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setTable(initialTable());
    setCaption("ตารางสินค้า Meaw Cafe");
    setHeaderRow(true);
    setHeaderColumn(false);
    setResponsive(true);
    setStylePreset("striped");
    setOutputMode("css");
    setSelected({ row: 0, column: 0 });
    setRequestedRowSpan(1);
    setRequestedColSpan(1);
    setImportText("สินค้า\tราคา\tสถานะ\nชาไทย\t65\tพร้อมขาย\nกาแฟ\t80\tหมด");
    setImportSummary("โหลดตัวอย่างตารางสินค้าแล้ว");
    setError("");
  };

  const clear = () => {
    setTable(createEmptyHtmlTable(3, 3));
    setCaption("");
    setSelected({ row: 0, column: 0 });
    setRequestedRowSpan(1);
    setRequestedColSpan(1);
    setImportText("");
    setImportSummary("");
    setError("");
  };

  const changeHeaderRow = (checked: boolean) => {
    if (checked && table.rows[0]?.some((cell) => !cell.hidden && cell.rowSpan > 1)) {
      setTable(flattenHtmlTableMerges(table));
      setRequestedRowSpan(1);
      setRequestedColSpan(1);
      toast.info("แยก merged cells ที่ข้าม thead ก่อนเปิดหัวตารางแล้ว");
    }
    setHeaderRow(checked);
  };

  const previewRows = (rows: typeof table.rows, rowOffset: number) => rows.map((row, localRowIndex) => {
    const rowIndex = localRowIndex + rowOffset;
    return (
      <tr key={`preview-row-${rowIndex}`}>
        {row.map((cell, columnIndex) => {
          if (cell.hidden) return null;
          const columnHeader = headerRow && rowIndex === 0;
          const rowHeader = headerColumn && columnIndex === 0 && !columnHeader;
          const Tag = columnHeader || rowHeader ? "th" : "td";
          const scope = columnHeader ? (cell.colSpan > 1 ? "colgroup" : "col") : rowHeader ? (cell.rowSpan > 1 ? "rowgroup" : "row") : undefined;
          return <Tag key={`preview-cell-${rowIndex}-${columnIndex}`} data-testid={`html-preview-cell-${rowIndex}-${columnIndex}`} scope={scope} colSpan={cell.colSpan} rowSpan={cell.rowSpan} className={`whitespace-pre-line px-3 py-2.5 align-top ${stylePreset === "minimal" ? "border-b" : "border"} ${(columnHeader || rowHeader) ? "bg-emerald-50 font-semibold dark:bg-emerald-950/30" : stylePreset === "striped" && rowIndex % 2 === 0 ? "bg-muted/25" : ""} ${isNumeric(cell.value) ? "text-right tabular-nums" : "text-left"}`}>{cell.value}</Tag>;
        })}
      </tr>
    );
  });

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><TableProperties className="size-5 text-primary" /><h2 className="font-semibold">สร้างตาราง HTML แบบ Semantic และ Responsive</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">วางข้อมูลจาก Excel, Google Sheets, CSV หรือ TSV แล้วสร้าง <code>table</code>, <code>thead</code>, <code>tbody</code>, <code>scope</code>, colspan และ rowspan ที่พร้อมนำไปใช้</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">HTML · ทำงานใน Browser</span>
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <Braces className="text-sky-700" />
        <AlertTitle>โครงสร้างที่ดีช่วยให้คนและ Screen reader เข้าใจตาราง</AlertTitle>
        <AlertDescription className="leading-6">W3C แนะนำให้ใช้ <code>caption</code>, <code>th</code> และ <code>scope</code> เพื่อบอกความสัมพันธ์ของข้อมูล และไม่ใช้ตารางเพื่อจัดหน้าเว็บ เครื่องมือนี้ใส่โครงสร้างเหล่านั้นให้ตามตัวเลือก · <a href={W3C_TABLE_TUTORIAL_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">อ่าน W3C Tables Tutorial</a></AlertDescription>
      </Alert>

      <section className="mt-7" aria-labelledby="html-table-import-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 id="html-table-import-title" className="font-semibold">1. นำเข้าข้อมูล หรือเริ่มจากตารางตัวอย่าง</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">ตรวจ Comma, Tab, Semicolon หรือ Pipe อัตโนมัติ และอ่าน quoted CSV ได้</p></div>
          <span className="text-xs text-muted-foreground">สูงสุด {HTML_TABLE_ROW_LIMIT} แถว × {HTML_TABLE_COLUMN_LIMIT} คอลัมน์</span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-3">
            <Label htmlFor="html-table-import">ข้อมูลจาก Excel / Sheets / CSV / TSV</Label>
            <Textarea id="html-table-import" className="min-h-32 resize-y font-mono text-xs leading-5" value={importText} onChange={(event) => { setImportText(event.target.value); setError(""); }} placeholder={'สินค้า\tราคา\tสถานะ\nชาไทย\t65\tพร้อมขาย'} spellCheck={false} />
          </div>
          <div className="rounded-xl border bg-muted/10 p-4">
            <p className="text-sm font-medium">นำเข้าทั้งแถวแรก</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">เลือก “แถวแรกเป็นหัวตาราง” ในขั้นที่ 3 เพื่อสร้าง <code>thead</code></p>
            <div className="mt-4"><ActionBar><Button type="button" onClick={importData}><ClipboardPaste className="size-4" />นำเข้า</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
            {importSummary ? <p className="mt-3 text-xs leading-5 text-primary" role="status">{importSummary}</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="html-table-editor-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 id="html-table-editor-title" className="font-semibold">2. แก้ไขและรวมเซลล์</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">เลือกเซลล์ แล้วกำหนด colspan / rowspan ในแผงด้านขวา บนมือถือเลื่อนเฉพาะตารางได้</p></div>
          <ActionBar><Button type="button" size="sm" variant="outline" onClick={addRow}><Rows3 className="size-4" />เพิ่มแถว</Button><Button type="button" size="sm" variant="outline" onClick={addColumn}><Columns3 className="size-4" />เพิ่มคอลัมน์</Button></ActionBar>
        </div>

        <div className="mt-4 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="relative w-full max-w-full overflow-x-auto rounded-xl border" role="region" tabIndex={0} aria-label="ตัวแก้ไขตาราง HTML ที่เลื่อนได้แนวนอน">
            <table className="min-w-max border-collapse text-sm">
              <caption className="sr-only">แก้ไขข้อมูลสำหรับสร้างตาราง HTML</caption>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={`editor-row-${rowIndex}`} className="border-b last:border-b-0">
                    <th scope="row" className="w-12 border-r bg-muted/20 p-2 text-center font-mono text-xs text-muted-foreground">{rowIndex + 1}</th>
                    {row.map((cell, columnIndex) => {
                      if (cell.hidden) return null;
                      const active = selected.row === rowIndex && selected.column === columnIndex;
                      return (
                        <td key={`editor-cell-${rowIndex}-${columnIndex}`} colSpan={cell.colSpan} rowSpan={cell.rowSpan} className={`min-w-48 border-r p-2 align-top last:border-r-0 ${active ? "bg-primary/8 ring-2 ring-inset ring-primary/45" : ""}`}>
                          <Label className="sr-only" htmlFor={`html-cell-${rowIndex}-${columnIndex}`}>แถว {rowIndex + 1} คอลัมน์ {columnIndex + 1}</Label>
                          <Input id={`html-cell-${rowIndex}-${columnIndex}`} value={cell.value} maxLength={HTML_TABLE_CELL_CHARACTER_LIMIT} aria-label={`แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1}`} onFocus={() => selectCell(rowIndex, columnIndex)} onClick={() => selectCell(rowIndex, columnIndex)} onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)} />
                          {(cell.colSpan > 1 || cell.rowSpan > 1) ? <span className="mt-1.5 block text-[10px] font-medium text-primary">{cell.colSpan > 1 ? `colspan=${cell.colSpan}` : ""}{cell.colSpan > 1 && cell.rowSpan > 1 ? " · " : ""}{cell.rowSpan > 1 ? `rowspan=${cell.rowSpan}` : ""}</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-xl border bg-muted/10 p-4" aria-label="จัดการเซลล์ที่เลือก">
            <p className="font-semibold">เซลล์ที่เลือก</p>
            <p className="mt-1 text-xs text-muted-foreground">แถว {selected.row + 1} · คอลัมน์ {selected.column + 1}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="space-y-2.5"><Label htmlFor="html-rowspan">rowspan</Label><Input id="html-rowspan" type="number" min={1} max={Math.max(1, maxRowSpan)} value={requestedRowSpan} onChange={(event) => setRequestedRowSpan(Math.max(1, Math.min(maxRowSpan, Number(event.target.value) || 1)))} /></div>
              <div className="space-y-2.5"><Label htmlFor="html-colspan">colspan</Label><Input id="html-colspan" type="number" min={1} max={Math.max(1, maxColSpan)} value={requestedColSpan} onChange={(event) => setRequestedColSpan(Math.max(1, Math.min(maxColSpan, Number(event.target.value) || 1)))} /></div>
            </div>
            {headerRow && selected.row === 0 ? <p className="mt-3 text-[11px] leading-5 text-muted-foreground">หัวตารางรวมแนวนอนได้ แต่ไม่ข้ามจาก <code>thead</code> ไป <code>tbody</code></p> : null}
            <div className="mt-4 grid gap-2">
              <Button type="button" data-testid="html-merge-cell" onClick={mergeCells}><Merge className="size-4" />ใช้ colspan / rowspan</Button>
              <Button type="button" variant="outline" onClick={unmergeCell} disabled={!selectedCell || (selectedCell.colSpan === 1 && selectedCell.rowSpan === 1)}><Split className="size-4" />แยกเซลล์</Button>
            </div>
            <div className="mt-5 border-t pt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">ลบตามเซลล์ที่เลือก</p><ActionBar><Button type="button" size="sm" variant="ghost" onClick={removeSelectedRow} disabled={dimensions.rows <= 1}><Trash2 className="size-4" />แถว</Button><Button type="button" size="sm" variant="ghost" onClick={removeSelectedColumn} disabled={dimensions.columns <= 1}><Trash2 className="size-4" />คอลัมน์</Button></ActionBar></div>
          </aside>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="html-table-settings-title">
        <div><h3 id="html-table-settings-title" className="font-semibold">3. กำหนดโครงสร้างและรูปแบบ</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Caption ที่ชัดเจนและหัวตารางที่สัมพันธ์กับข้อมูลช่วยทั้งผู้ใช้ทั่วไปและเทคโนโลยีช่วยการเข้าถึง</p></div>
        <div className="mt-4 grid gap-5 rounded-xl border p-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2"><Label htmlFor="html-table-caption">Caption / ชื่อตาราง</Label><Input id="html-table-caption" value={caption} maxLength={160} onChange={(event) => setCaption(event.target.value)} placeholder="เช่น ตารางราคาสินค้าเดือนสิงหาคม" /></div>
          <div className="space-y-3"><Label htmlFor="html-output-mode">รูปแบบโค้ด</Label><select id="html-output-mode" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" value={outputMode} onChange={(event) => { const next = event.target.value as HtmlTableOutputMode; setOutputMode(next); if (next === "html-only") setResponsive(false); }}>{outputModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.detail}</option>)}</select></div>
          <div className="space-y-3"><Label htmlFor="html-style-preset">รูปแบบตาราง</Label><select id="html-style-preset" disabled={outputMode === "html-only"} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" value={stylePreset} onChange={(event) => setStylePreset(event.target.value as HtmlTableStylePreset)}>{presetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            <label className="flex min-h-16 items-center justify-between gap-4 rounded-lg border p-3 text-sm"><span><span className="block font-medium">แถวแรกเป็นหัวตาราง</span><span className="mt-1 block text-xs text-muted-foreground">สร้าง thead + scope=col</span></span><Switch checked={headerRow} onCheckedChange={changeHeaderRow} aria-label="แถวแรกเป็นหัวตาราง" /></label>
            <label className="flex min-h-16 items-center justify-between gap-4 rounded-lg border p-3 text-sm"><span><span className="block font-medium">คอลัมน์แรกเป็นหัวแถว</span><span className="mt-1 block text-xs text-muted-foreground">สร้าง th + scope=row</span></span><Switch checked={headerColumn} onCheckedChange={setHeaderColumn} aria-label="คอลัมน์แรกเป็นหัวแถว" /></label>
          </div>
          <label className={`flex min-h-16 items-center justify-between gap-4 rounded-lg border p-3 text-sm ${outputMode === "html-only" ? "opacity-50" : ""}`}><span><span className="block font-medium">Responsive wrapper</span><span className="mt-1 block text-xs text-muted-foreground">เลื่อนแนวนอนเมื่อจอแคบ</span></span><Switch checked={responsive && outputMode !== "html-only"} disabled={outputMode === "html-only"} onCheckedChange={setResponsive} aria-label="Responsive wrapper" /></label>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="html-table-output-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 id="html-table-output-title" className="font-semibold">4. ตรวจ Preview แล้วนำโค้ดไปใช้</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{dimensions.rows.toLocaleString("th-TH")} แถว · {dimensions.columns.toLocaleString("th-TH")} คอลัมน์ · {generated.code.length.toLocaleString("th-TH")} ตัวอักษร</p></div>
          <ActionBar><CopyButton value={generated.code} label="คัดลอก HTML" /><DownloadButton value={generated.code ? createStandaloneHtmlTablePage(table, options) : ""} filename="meaw-html-table.html" type="text/html;charset=utf-8" /></ActionBar>
        </div>
        {(error || generated.error) ? <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive" role="alert">{error || generated.error}</p> : null}
        <div className="mt-4 grid min-w-0 gap-5 xl:grid-cols-2">
          <div className="min-w-0"><p className="mb-3 text-sm font-semibold">HTML ที่สร้าง</p><pre data-testid="html-table-output" className="min-h-80 max-h-[34rem] max-w-full overflow-auto rounded-xl border bg-slate-950 p-4 text-xs leading-6 text-slate-100" role="region" tabIndex={0} aria-label="โค้ด HTML ที่สร้างและเลื่อนได้"><code>{generated.code}</code></pre></div>
          <div className="min-w-0"><p className="mb-3 text-sm font-semibold">ตัวอย่างตาราง</p><div className="min-h-80 max-w-full overflow-x-auto rounded-xl border bg-background p-4" tabIndex={0} role="region" aria-label={`เลื่อนดูตัวอย่างตาราง: ${caption || "ตารางข้อมูล"}`}><table className="w-full min-w-lg border-collapse text-sm"><caption className="mb-3 text-left font-semibold">{caption || "ตารางข้อมูล"}</caption>{headerRow ? <thead>{previewRows(table.rows.slice(0, 1), 0)}</thead> : null}<tbody>{previewRows(headerRow ? table.rows.slice(1) : table.rows, headerRow ? 1 : 0)}</tbody></table></div></div>
        </div>
      </section>

      <div className="mt-7 grid gap-4 border-t pt-5 md:grid-cols-2">
        <div className="flex gap-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p>ข้อมูลและ HTML ประมวลผลใน Browser เท่านั้น Meaw Tools ไม่มี API รับหรือบันทึกตารางของคุณ</p></div>
        <div className="flex gap-3 text-xs leading-5 text-muted-foreground"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /><p>ใช้ตารางกับข้อมูลที่มีความสัมพันธ์เป็นแถวและคอลัมน์ ไม่ควรใช้เพื่อจัด Layout หน้าเว็บ และควรตรวจผลกับ Screen reader เมื่อเป็นข้อมูลสำคัญ</p></div>
      </div>
    </WorkspaceFrame>
  );
}
