import readExcelFile from "read-excel-file/web-worker";
import {
  createExcelCsv,
  createExcelCsvArchive,
  createExcelCsvFilename,
  createExcelCsvPreview,
  EXCEL_TO_CSV_FILE_LIMIT_BYTES,
  sanitizeExcelCsvBaseName,
  validateExcelWorkbook,
  type ExcelCsvOptions,
  type ExcelSheetData,
} from "@/lib/tools/excel-to-csv";

type ExcelWorkerRequest = {
  id: string;
  action: "inspect" | "convert";
  buffer: ArrayBuffer;
  sourceName: string;
  selectedSheet: string | "all";
  options: ExcelCsvOptions;
};

type ExcelWorkerSheet = {
  sheet: string;
  summary: ReturnType<typeof validateExcelWorkbook>[number];
  preview: string[][];
};

type ExcelWorkerSuccess = {
  id: string;
  ok: true;
  action: "inspect" | "convert";
  sheets: ExcelWorkerSheet[];
  totalCellCount: number;
  output?: ArrayBuffer;
  filename?: string;
  mimeType?: string;
  protectedCellCount?: number;
};

type ExcelWorkerFailure = { id: string; ok: false; error: string };

function outputBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

self.addEventListener("message", async (event: MessageEvent<ExcelWorkerRequest>) => {
  const { id, action, buffer, sourceName, selectedSheet, options } = event.data;
  try {
    if (buffer.byteLength > EXCEL_TO_CSV_FILE_LIMIT_BYTES) throw new Error("ไฟล์ใหญ่เกิน 10 MB สำหรับการแปลงใน Browser");
    const workbook = await readExcelFile<string>(buffer, { trim: false, parseNumber: (value) => value });
    const sheets = workbook.map((item) => ({ sheet: item.sheet, data: item.data as ExcelSheetData }));
    const summaries = validateExcelWorkbook(sheets);
    const responseSheets = sheets.map((item, index) => ({
      sheet: item.sheet,
      summary: summaries[index]!,
      preview: createExcelCsvPreview(item.data),
    }));
    const totalCellCount = summaries.reduce((total, summary) => total + summary.cellCount, 0);

    if (action === "inspect") {
      const response: ExcelWorkerSuccess = { id, ok: true, action, sheets: responseSheets, totalCellCount };
      self.postMessage(response);
      return;
    }

    if (selectedSheet === "all") {
      const archive = createExcelCsvArchive(sourceName, sheets, options);
      const output = outputBuffer(archive.bytes);
      const response: ExcelWorkerSuccess = {
        id,
        ok: true,
        action,
        sheets: responseSheets,
        totalCellCount,
        output,
        filename: archive.filename,
        mimeType: "application/zip",
        protectedCellCount: archive.protectedCellCount,
      };
      self.postMessage(response, { transfer: [output] });
      return;
    }

    const sheetIndex = sheets.findIndex((item) => item.sheet === selectedSheet);
    if (sheetIndex < 0) throw new Error("ไม่พบ Worksheet ที่เลือก กรุณาตรวจไฟล์ใหม่");
    const selected = sheets[sheetIndex]!;
    const converted = createExcelCsv(selected.sheet, selected.data, options);
    const output = outputBuffer(new TextEncoder().encode(converted.csv));
    const response: ExcelWorkerSuccess = {
      id,
      ok: true,
      action,
      sheets: responseSheets,
      totalCellCount,
      output,
      filename: createExcelCsvFilename(sourceName, selected.sheet, sheets.length > 1),
      mimeType: "text/csv;charset=utf-8",
      protectedCellCount: converted.protectedCellCount,
    };
    self.postMessage(response, { transfer: [output] });
  } catch (caught) {
    const isLegacyExcel = /\.xls$/i.test(sourceName) && !/\.xlsx$/i.test(sourceName);
    const response: ExcelWorkerFailure = {
      id,
      ok: false,
      error: isLegacyExcel
        ? "ไฟล์ .xls แบบเก่าไม่รองรับ กรุณาเปิดใน Excel หรือ LibreOffice แล้วบันทึกเป็น .xlsx ก่อน"
        : caught instanceof Error ? caught.message : `แปลง ${sanitizeExcelCsvBaseName(sourceName)} เป็น CSV ไม่สำเร็จ`,
    };
    self.postMessage(response);
  }
});

export {};
