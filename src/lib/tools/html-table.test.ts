import { describe, expect, it } from "vitest";
import {
  applyHtmlTableSpan,
  createEmptyHtmlTable,
  createHtmlTable,
  createHtmlTableCell,
  createStandaloneHtmlTablePage,
  escapeHtmlTableCell,
  importDelimitedHtmlTable,
  unmergeHtmlTableCell,
  validateHtmlTable,
  type HtmlTableOptions,
} from "./html-table";

const options: HtmlTableOptions = {
  caption: "ยอดขายประจำเดือน",
  headerRow: true,
  headerColumn: false,
  responsive: true,
  stylePreset: "striped",
  outputMode: "css",
};

describe("HTML table generator", () => {
  it("creates semantic responsive markup with caption, sections, and scopes", () => {
    const table = {
      rows: [
        [createHtmlTableCell("สินค้า"), createHtmlTableCell("ราคา")],
        [createHtmlTableCell("ชาไทย"), createHtmlTableCell("65")],
      ],
    };
    const html = createHtmlTable(table, options);

    expect(html).toContain("<style>");
    expect(html).toContain('role="region"');
    expect(html).toContain("<caption>ยอดขายประจำเดือน</caption>");
    expect(html).toContain("<thead>");
    expect(html).toContain('<th scope="col">สินค้า</th>');
    expect(html).toContain("<tbody>");
    expect(html).toContain("<td>ชาไทย</td>");
  });

  it("escapes cell HTML and preserves line breaks without allowing raw markup", () => {
    expect(escapeHtmlTableCell('<script>alert("x")</script>\nชาไทย & กาแฟ')).toBe('&lt;script&gt;alert("x")&lt;/script&gt;<br>\nชาไทย &amp; กาแฟ');
  });

  it("creates inline styles and row header scope", () => {
    const table = {
      rows: [
        [createHtmlTableCell("สินค้า"), createHtmlTableCell("จำนวน")],
        [createHtmlTableCell("ชาไทย"), createHtmlTableCell("10")],
      ],
    };
    const html = createHtmlTable(table, { ...options, headerRow: false, headerColumn: true, outputMode: "inline", responsive: false });

    expect(html).not.toContain("<style>");
    expect(html).toContain('style="width:100%');
    expect(html).toContain('<th scope="row"');
  });

  it("merges and unmerges cells with valid colspan and rowspan markup", () => {
    const base = createEmptyHtmlTable(3, 3);
    base.rows[0]![0]!.value = "หัวข้อรวม";
    const merged = applyHtmlTableSpan(base, 0, 0, 1, 2);
    const html = createHtmlTable(merged, options);

    expect(merged.rows[0]![1]!.hidden).toBe(true);
    expect(html).toContain('<th scope="colgroup" colspan="2">หัวข้อรวม</th>');
    expect(unmergeHtmlTableCell(merged, 0, 0).rows[0]![1]!.hidden).toBe(false);
  });

  it("rejects overlapping spans and header cells crossing from thead into tbody", () => {
    const merged = applyHtmlTableSpan(createEmptyHtmlTable(3, 3), 1, 0, 1, 2);
    expect(() => applyHtmlTableSpan(merged, 1, 1, 2, 1)).toThrow(/เลือกเซลล์หลัก|ทับกับเซลล์/);
    const invalidHeader = applyHtmlTableSpan(createEmptyHtmlTable(3, 3), 0, 0, 2, 1);
    expect(() => validateHtmlTable(invalidHeader, { headerRow: true })).toThrow(/thead/);
  });

  it("imports quoted CSV and normalizes ragged rows", () => {
    const imported = importDelimitedHtmlTable('สินค้า,หมายเหตุ,ราคา\n"ชาไทย","ชา,กาแฟ",65\nกาแฟ,,80');

    expect(imported.delimiter).toBe(",");
    expect(imported.importedRowCount).toBe(3);
    expect(imported.columnCount).toBe(3);
    expect(imported.table.rows[1]![1]!.value).toBe("ชา,กาแฟ");
    expect(imported.table.rows[2]![1]!.value).toBe("");
  });

  it("creates a complete downloadable UTF-8 HTML document", () => {
    const page = createStandaloneHtmlTablePage(createEmptyHtmlTable(1, 1), { ...options, caption: "ตาราง <ไทย>" });
    expect(page).toContain("<!doctype html>");
    expect(page).toContain('<meta charset="utf-8">');
    expect(page).toContain("<title>ตาราง &lt;ไทย&gt;</title>");
    expect(page.indexOf("<style>")).toBeLessThan(page.indexOf("</head>"));
    expect(page.indexOf("<table")).toBeGreaterThan(page.indexOf("<body>"));
  });
});
