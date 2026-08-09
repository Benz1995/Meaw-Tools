import { describe, expect, it } from "vitest";
import { billSplitCsv, calculateBillSplit, type BillSplitInput } from "@/lib/tools/bill-split";

const example: BillSplitInput = {
  currency: "THB",
  groupName: "มื้อเย็นวันเกิด",
  participants: [
    { id: "p1", name: "Mew", weight: 1, paid: 1_500 },
    { id: "p2", name: "Nana", weight: 1, paid: 383.2 },
    { id: "p3", name: "Taro", weight: 0.5, paid: 0 },
  ],
  items: [
    { description: "อาหารจานหลัก", amount: 1_200, participantIds: ["p1", "p2", "p3"] },
    { description: "ของหวาน", amount: 300, participantIds: ["p1", "p2"] },
    { description: "เครื่องดื่ม", amount: 200, participantIds: ["p1", "p2"] },
  ],
  adjustments: [
    { name: "ส่วนลดจากร้าน", amount: -100, allocationMode: "proportional" },
    { name: "Service charge", amount: 160, allocationMode: "proportional" },
    { name: "VAT จากใบเสร็จ", amount: 123.2, allocationMode: "proportional" },
  ],
};

describe("bill split calculator", () => {
  it("allocates weighted items and receipt adjustments to exact cents", () => {
    const result = calculateBillSplit(example);
    expect(result.itemSubtotal).toBe(1_700);
    expect(result.adjustmentTotal).toBe(183.2);
    expect(result.grandTotal).toBe(1_883.2);
    expect(result.participants.map((participant) => participant.itemShare)).toEqual([730, 730, 240]);
    expect(result.participants.map((participant) => participant.owed)).toEqual([808.68, 808.66, 265.86]);
    expect(result.participants.reduce((sum, participant) => sum + participant.owed, 0)).toBeCloseTo(result.grandTotal, 10);
  });

  it("produces a compact deterministic settlement when paid total reconciles", () => {
    const result = calculateBillSplit(example);
    expect(result.canSettle).toBe(true);
    expect(result.paymentGap).toBe(0);
    expect(result.settlements).toEqual([
      { fromParticipantId: "p2", toParticipantId: "p1", amount: 425.46 },
      { fromParticipantId: "p3", toParticipantId: "p1", amount: 265.86 },
    ]);
  });

  it("withholds settlement instructions until actual payments match the bill", () => {
    const result = calculateBillSplit({
      ...example,
      participants: example.participants.map((participant) => ({ ...participant, paid: 0 })),
    });
    expect(result.canSettle).toBe(false);
    expect(result.paymentGap).toBe(1_883.2);
    expect(result.settlements).toEqual([]);
  });

  it("supports equal and participant-weight adjustment allocation", () => {
    const result = calculateBillSplit({
      ...example,
      participants: example.participants.map((participant) => ({ ...participant, paid: 0 })),
      adjustments: [
        { name: "ค่าจอดรถ", amount: 100, allocationMode: "equal" },
        { name: "ค่าใช้พื้นที่", amount: 100, allocationMode: "weighted" },
      ],
    });
    expect(result.adjustments[0]!.shares.map((share) => share.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(result.adjustments[1]!.shares.map((share) => share.amount)).toEqual([40, 40, 20]);
  });

  it("rejects duplicate names, orphan items, and discounts that create negative shares", () => {
    expect(() => calculateBillSplit({
      ...example,
      participants: example.participants.map((participant) => ({ ...participant, name: "Mew" })),
    })).toThrow("ชื่อผู้ร่วมจ่ายต้องไม่ซ้ำ");
    expect(() => calculateBillSplit({
      ...example,
      items: [{ description: "รายการ", amount: 100, participantIds: [] }],
    })).toThrow("เลือกผู้ร่วมจ่าย");
    expect(() => calculateBillSplit({
      ...example,
      adjustments: [{ name: "ส่วนลด", amount: -1_000, allocationMode: "equal" }],
    })).toThrow("ส่วนลดทำให้ยอดของ");
  });
});

describe("bill split CSV", () => {
  it("exports reconciled details with UTF-8 BOM and neutralized spreadsheet formulas", () => {
    const input: BillSplitInput = {
      ...example,
      groupName: "=HYPERLINK(\"bad\")",
      participants: example.participants.map((participant, index) => ({ ...participant, name: index === 0 ? "+SUM(1,1)" : participant.name })),
    };
    const csv = billSplitCsv(input, calculateBillSplit(input));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"Group\",\"'=HYPERLINK(\"\"bad\"\")\"");
    expect(csv).toContain("\"'+SUM(1,1)\"");
    expect(csv).toContain('"Grand total","1883.20","THB"');
    expect(csv).toContain('"Nana","\'+SUM(1,1)","425.46"');
  });
});
