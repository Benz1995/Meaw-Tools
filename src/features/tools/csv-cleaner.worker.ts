import {
  CSV_FILE_LIMIT_BYTES,
  createCsvPreview,
  decodeCsvBytes,
  parseCsv,
  type CsvDelimiterOption,
  type CsvEncoding,
} from "@/lib/tools/csv";
import {
  cleanCsv,
  createCleanCsvPreview,
  createUtf8CsvBytes,
  getCsvCleanerColumns,
  type CsvCleanerOptions,
} from "@/lib/tools/csv-cleaner";

type CsvCleanerWorkerRequest = {
  id: string;
  action: "inspect" | "clean";
  buffer: ArrayBuffer;
  encoding: CsvEncoding;
  delimiter: CsvDelimiterOption;
  options: CsvCleanerOptions;
};

type CsvCleanerWorkerSuccess = {
  id: string;
  ok: true;
  action: "inspect" | "clean";
  sourceSummary: {
    delimiter: string;
    rowCount: number;
    columnCount: number;
    cellCount: number;
    raggedRowCount: number;
    blankRowCount: number;
  };
  columns: Array<{ index: number; label: string }>;
  preview: string[][];
  cleanSummary?: ReturnType<typeof cleanCsv>["summary"];
  cleanedCsv?: ArrayBuffer;
};

type CsvCleanerWorkerFailure = { id: string; ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<CsvCleanerWorkerRequest>) => {
  const { id, action, buffer, encoding, delimiter, options } = event.data;
  try {
    if (buffer.byteLength > CSV_FILE_LIMIT_BYTES) throw new Error("ไฟล์ใหญ่เกิน 10 MB สำหรับทำความสะอาดใน Browser");
    const parsed = parseCsv(decodeCsvBytes(new Uint8Array(buffer), encoding), delimiter);
    const sourceSummary = {
      delimiter: parsed.delimiter,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      cellCount: parsed.cellCount,
      raggedRowCount: parsed.raggedRowCount,
      blankRowCount: parsed.blankRowCount,
    };
    const columns = getCsvCleanerColumns(parsed, options.firstRowIsHeader);

    if (action === "inspect") {
      const response: CsvCleanerWorkerSuccess = {
        id,
        ok: true,
        action,
        sourceSummary,
        columns,
        preview: createCsvPreview(parsed),
      };
      self.postMessage(response);
      return;
    }

    const cleaned = cleanCsv(parsed, options);
    const bytes = createUtf8CsvBytes(cleaned.rows);
    const cleanedCsv = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const response: CsvCleanerWorkerSuccess = {
      id,
      ok: true,
      action,
      sourceSummary,
      columns,
      preview: createCleanCsvPreview(cleaned),
      cleanSummary: cleaned.summary,
      cleanedCsv,
    };
    self.postMessage(response, { transfer: [cleanedCsv] });
  } catch (caught) {
    const response: CsvCleanerWorkerFailure = {
      id,
      ok: false,
      error: caught instanceof Error ? caught.message : "ทำความสะอาด CSV ไม่สำเร็จ",
    };
    self.postMessage(response);
  }
});

export {};
