import { describe, expect, it } from "vitest";
import {
  PDF_ORGANIZER_PAGE_LIMIT,
  createPdfPagePlan,
  isPdfPagePlanChanged,
  movePdfPage,
  removePdfPage,
  reorderPdfPage,
  rotatePdfPage,
} from "@/lib/tools/pdf-organizer";

describe("PDF organizer page plan", () => {
  it("creates a stable plan and enforces the preview limit", () => {
    expect(createPdfPagePlan(3)).toEqual([
      { id: "page-1", sourceIndex: 0, rotation: 0 },
      { id: "page-2", sourceIndex: 1, rotation: 0 },
      { id: "page-3", sourceIndex: 2, rotation: 0 },
    ]);
    expect(() => createPdfPagePlan(0)).toThrow("อย่างน้อย 1 หน้า");
    expect(() => createPdfPagePlan(PDF_ORGANIZER_PAGE_LIMIT + 1)).toThrow("สูงสุด 100 หน้า");
  });

  it("moves and drag-reorders pages without changing source indexes", () => {
    const pages = createPdfPagePlan(4);
    expect(movePdfPage(pages, "page-3", -1).map((page) => page.sourceIndex)).toEqual([0, 2, 1, 3]);
    expect(reorderPdfPage(pages, "page-4", "page-1").map((page) => page.sourceIndex)).toEqual([3, 0, 1, 2]);
    expect(movePdfPage(pages, "page-1", -1)).toBe(pages);
  });

  it("rotates in quarter turns and wraps in both directions", () => {
    const pages = createPdfPagePlan(2);
    const clockwise = rotatePdfPage(pages, "page-1");
    expect(clockwise[0]?.rotation).toBe(90);
    expect(rotatePdfPage(clockwise, "page-1", -1)[0]?.rotation).toBe(0);
    expect(rotatePdfPage(pages, "page-2", -1)[1]?.rotation).toBe(270);
  });

  it("deletes pages but never permits an empty PDF", () => {
    const pages = removePdfPage(createPdfPagePlan(3), "page-2");
    expect(pages.map((page) => page.sourceIndex)).toEqual([0, 2]);
    expect(() => removePdfPage(createPdfPagePlan(1), "page-1")).toThrow("เหลืออย่างน้อย 1 หน้า");
  });

  it("detects order, rotation, and deletion changes", () => {
    const pages = createPdfPagePlan(3);
    expect(isPdfPagePlanChanged(pages, 3)).toBe(false);
    expect(isPdfPagePlanChanged(movePdfPage(pages, "page-2", 1), 3)).toBe(true);
    expect(isPdfPagePlanChanged(rotatePdfPage(pages, "page-1"), 3)).toBe(true);
    expect(isPdfPagePlanChanged(removePdfPage(pages, "page-3"), 3)).toBe(true);
  });
});
