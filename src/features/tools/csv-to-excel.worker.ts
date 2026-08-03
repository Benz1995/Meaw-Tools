import {
  CSV_FILE_LIMIT_BYTES,
  createCsvPreview,
  createXlsxWorkbook,
  decodeCsvBytes,
  parseCsv,
  type CsvDelimiterOption,
  type CsvEncoding,
  type CsvWorkbookOptions,
} from "@/lib/tools/csv";

type CsvWorkerRequest = {
  id: string;
  action: "inspect" | "convert";
  buffer: ArrayBuffer;
  encoding: CsvEncoding;
  delimiter: CsvDelimiterOption;
  workbook: CsvWorkbookOptions;
};

type CsvWorkerSuccess = {
  id: string;
  ok: true;
  action: "inspect" | "convert";
  summary: {
    delimiter: string;
    rowCount: number;
    columnCount: number;
    cellCount: number;
    raggedRowCount: number;
    blankRowCount: number;
  };
  preview: string[][];
  workbook?: ArrayBuffer;
};

type CsvWorkerFailure = { id: string; ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<CsvWorkerRequest>) => {
  const { id, action, buffer, encoding, delimiter, workbook } = event.data;
  try {
    if (buffer.byteLength > CSV_FILE_LIMIT_BYTES) throw new Error("ไฟล์ใหญ่เกิน 10 MB สำหรับการแปลงใน Browser");
    const parsed = parseCsv(decodeCsvBytes(new Uint8Array(buffer), encoding), delimiter);
    const summary = {
      delimiter: parsed.delimiter,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      cellCount: parsed.cellCount,
      raggedRowCount: parsed.raggedRowCount,
      blankRowCount: parsed.blankRowCount,
    };
    const preview = createCsvPreview(parsed);
    if (action === "inspect") {
      const response: CsvWorkerSuccess = { id, ok: true, action, summary, preview };
      self.postMessage(response);
      return;
    }

    const bytes = createXlsxWorkbook(parsed, workbook);
    const workbookBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const response: CsvWorkerSuccess = { id, ok: true, action, summary, preview, workbook: workbookBuffer };
    self.postMessage(response, { transfer: [workbookBuffer] });
  } catch (caught) {
    const response: CsvWorkerFailure = {
      id,
      ok: false,
      error: caught instanceof Error ? caught.message : "แปลง CSV เป็น Excel ไม่สำเร็จ",
    };
    self.postMessage(response);
  }
});

export {};
