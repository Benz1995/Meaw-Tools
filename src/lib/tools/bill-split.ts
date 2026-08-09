export const BILL_SPLIT_MAX_PARTICIPANTS = 12;
export const BILL_SPLIT_MAX_ITEMS = 30;
export const BILL_SPLIT_MAX_ADJUSTMENTS = 8;
export const BILL_SPLIT_MAX_AMOUNT = 1_000_000_000;

export type BillSplitCurrency = "THB" | "USD" | "EUR" | "JPY" | "GBP";
export type BillSplitAllocationMode = "proportional" | "equal" | "weighted";

export type BillSplitParticipant = {
  id: string;
  name: string;
  weight: number;
  paid: number;
};

export type BillSplitItem = {
  description: string;
  amount: number;
  participantIds: string[];
};

export type BillSplitAdjustment = {
  name: string;
  amount: number;
  allocationMode: BillSplitAllocationMode;
};

export type BillSplitInput = {
  currency: BillSplitCurrency;
  groupName: string;
  participants: BillSplitParticipant[];
  items: BillSplitItem[];
  adjustments: BillSplitAdjustment[];
};

export type BillSplitShare = { participantId: string; amount: number };
export type BillSplitItemResult = BillSplitItem & { shares: BillSplitShare[] };
export type BillSplitAdjustmentResult = BillSplitAdjustment & { shares: BillSplitShare[] };
export type BillSplitParticipantResult = BillSplitParticipant & {
  itemShare: number;
  adjustmentShare: number;
  owed: number;
  balance: number;
};
export type BillSplitSettlement = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
};

export type BillSplitResult = {
  itemSubtotal: number;
  adjustmentTotal: number;
  grandTotal: number;
  totalPaid: number;
  paymentGap: number;
  canSettle: boolean;
  participants: BillSplitParticipantResult[];
  items: BillSplitItemResult[];
  adjustments: BillSplitAdjustmentResult[];
  settlements: BillSplitSettlement[];
};

type AllocationCandidate = { id: string; weight: number; order: number };

function assertNumber(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function toCents(value: number, label: string) {
  if (!Number.isFinite(value) || Math.abs(value) > BILL_SPLIT_MAX_AMOUNT) {
    throw new Error(`${label}สูงเกินขอบเขตที่รองรับ`);
  }
  const cents = Math.round(value * 100 + Math.sign(value) * 1e-8);
  if (!Number.isSafeInteger(cents)) throw new Error(`${label}ละเอียดหรือสูงเกินกว่าจะคำนวณได้อย่างปลอดภัย`);
  return cents;
}

function fromCents(value: number) {
  return value / 100;
}

function allocateCents(totalCents: number, candidates: AllocationCandidate[]) {
  if (candidates.length === 0) throw new Error("ไม่พบผู้ร่วมจ่ายสำหรับการจัดสรร");
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) throw new Error("น้ำหนักรวมสำหรับการจัดสรรต้องมากกว่า 0");
  const sign = Math.sign(totalCents) || 1;
  const absoluteTotal = Math.abs(totalCents);
  const portions = candidates.map((candidate) => {
    const exact = absoluteTotal * candidate.weight / totalWeight;
    const cents = Math.floor(exact);
    return { ...candidate, cents, remainder: exact - cents };
  });
  const remaining = absoluteTotal - portions.reduce((sum, portion) => sum + portion.cents, 0);
  const remainderOrder = [...portions].sort((a, b) => b.remainder - a.remainder || a.order - b.order);
  for (let index = 0; index < remaining; index += 1) remainderOrder[index]!.cents += 1;
  return new Map(portions.map((portion) => [portion.id, portion.cents * sign]));
}

function validateInput(input: BillSplitInput) {
  if (!["THB", "USD", "EUR", "JPY", "GBP"].includes(input.currency)) throw new Error("สกุลเงินไม่ถูกต้อง");
  const groupName = input.groupName.trim();
  if (!groupName) throw new Error("กรุณากรอกชื่อบิลหรือกลุ่ม");
  if (groupName.length > 120) throw new Error("ชื่อบิลหรือกลุ่มต้องไม่เกิน 120 ตัวอักษร");
  if (input.participants.length < 2 || input.participants.length > BILL_SPLIT_MAX_PARTICIPANTS) {
    throw new Error(`ผู้ร่วมจ่ายต้องมี 2–${BILL_SPLIT_MAX_PARTICIPANTS} คน`);
  }

  const participantIds = new Set<string>();
  const participantNames = new Set<string>();
  input.participants.forEach((participant, index) => {
    const prefix = `คนที่ ${index + 1}`;
    if (!participant.id || participantIds.has(participant.id)) throw new Error(`รหัส${prefix}ไม่ถูกต้องหรือซ้ำ`);
    participantIds.add(participant.id);
    const name = participant.name.trim();
    if (!name) throw new Error(`กรุณากรอกชื่อ${prefix}`);
    if (name.length > 60) throw new Error(`ชื่อ${prefix}ต้องไม่เกิน 60 ตัวอักษร`);
    const normalizedName = name.toLocaleLowerCase("th-TH");
    if (participantNames.has(normalizedName)) throw new Error("ชื่อผู้ร่วมจ่ายต้องไม่ซ้ำกัน");
    participantNames.add(normalizedName);
    assertNumber(participant.weight, `น้ำหนักของ${prefix}`, 0.01, 1_000_000);
    assertNumber(participant.paid, `ยอดที่${prefix}ออกเงินจริง`, 0, BILL_SPLIT_MAX_AMOUNT);
  });

  if (input.items.length < 1 || input.items.length > BILL_SPLIT_MAX_ITEMS) {
    throw new Error(`รายการค่าใช้จ่ายต้องมี 1–${BILL_SPLIT_MAX_ITEMS} รายการ`);
  }
  input.items.forEach((item, index) => {
    const prefix = `รายการที่ ${index + 1}`;
    const description = item.description.trim();
    if (!description) throw new Error(`กรุณากรอกชื่อ${prefix}`);
    if (description.length > 100) throw new Error(`ชื่อ${prefix}ต้องไม่เกิน 100 ตัวอักษร`);
    assertNumber(item.amount, `ยอดเงิน${prefix}`, 0.01, BILL_SPLIT_MAX_AMOUNT);
    if (item.participantIds.length < 1) throw new Error(`${prefix}ต้องเลือกผู้ร่วมจ่ายอย่างน้อย 1 คน`);
    if (new Set(item.participantIds).size !== item.participantIds.length) throw new Error(`ผู้ร่วมจ่ายใน${prefix}ต้องไม่ซ้ำ`);
    item.participantIds.forEach((participantId) => {
      if (!participantIds.has(participantId)) throw new Error(`${prefix}อ้างถึงผู้ร่วมจ่ายที่ไม่มีอยู่`);
    });
  });

  if (input.adjustments.length > BILL_SPLIT_MAX_ADJUSTMENTS) {
    throw new Error(`ค่าเพิ่มหรือส่วนลดต้องไม่เกิน ${BILL_SPLIT_MAX_ADJUSTMENTS} รายการ`);
  }
  input.adjustments.forEach((adjustment, index) => {
    const prefix = `ค่าเพิ่ม/ส่วนลดที่ ${index + 1}`;
    if (!adjustment.name.trim()) throw new Error(`กรุณากรอกชื่อ${prefix}`);
    if (adjustment.name.trim().length > 80) throw new Error(`ชื่อ${prefix}ต้องไม่เกิน 80 ตัวอักษร`);
    assertNumber(adjustment.amount, `ยอด${prefix}`, -BILL_SPLIT_MAX_AMOUNT, BILL_SPLIT_MAX_AMOUNT);
    if (adjustment.amount === 0) throw new Error(`ยอด${prefix}ต้องไม่เท่ากับ 0`);
    if (!["proportional", "equal", "weighted"].includes(adjustment.allocationMode)) throw new Error(`วิธีหาร${prefix}ไม่ถูกต้อง`);
  });
}

export function calculateBillSplit(input: BillSplitInput): BillSplitResult {
  validateInput(input);
  const participantOrder = new Map(input.participants.map((participant, index) => [participant.id, index]));
  const participantById = new Map(input.participants.map((participant) => [participant.id, participant]));
  const itemShareCents = new Map(input.participants.map((participant) => [participant.id, 0]));
  const adjustmentShareCents = new Map(input.participants.map((participant) => [participant.id, 0]));

  const items = input.items.map((item, itemIndex): BillSplitItemResult => {
    const amountCents = toCents(item.amount, `ยอดรายการที่ ${itemIndex + 1}`);
    const shares = allocateCents(amountCents, item.participantIds.map((participantId) => ({
      id: participantId,
      weight: participantById.get(participantId)!.weight,
      order: participantOrder.get(participantId)!,
    })));
    shares.forEach((amount, participantId) => itemShareCents.set(participantId, itemShareCents.get(participantId)! + amount));
    return {
      ...item,
      description: item.description.trim(),
      amount: fromCents(amountCents),
      shares: item.participantIds.map((participantId) => ({ participantId, amount: fromCents(shares.get(participantId)!) })),
    };
  });

  const itemSubtotalCents = items.reduce((sum, item) => sum + toCents(item.amount, "ยอดรวมรายการ"), 0);
  const adjustments = input.adjustments.map((adjustment, adjustmentIndex): BillSplitAdjustmentResult => {
    const amountCents = toCents(adjustment.amount, `ยอดค่าเพิ่ม/ส่วนลดที่ ${adjustmentIndex + 1}`);
    let candidates: AllocationCandidate[];
    if (adjustment.allocationMode === "proportional") {
      candidates = input.participants
        .map((participant, order) => ({ id: participant.id, weight: itemShareCents.get(participant.id)!, order }))
        .filter((candidate) => candidate.weight > 0);
    } else if (adjustment.allocationMode === "weighted") {
      candidates = input.participants.map((participant, order) => ({ id: participant.id, weight: participant.weight, order }));
    } else {
      candidates = input.participants.map((participant, order) => ({ id: participant.id, weight: 1, order }));
    }
    const shares = allocateCents(amountCents, candidates);
    shares.forEach((amount, participantId) => adjustmentShareCents.set(participantId, adjustmentShareCents.get(participantId)! + amount));
    return {
      ...adjustment,
      name: adjustment.name.trim(),
      amount: fromCents(amountCents),
      shares: input.participants.map((participant) => ({ participantId: participant.id, amount: fromCents(shares.get(participant.id) ?? 0) })),
    };
  });

  const adjustmentTotalCents = adjustments.reduce((sum, adjustment) => sum + toCents(adjustment.amount, "ยอดรวมค่าเพิ่ม/ส่วนลด"), 0);
  const grandTotalCents = itemSubtotalCents + adjustmentTotalCents;
  if (grandTotalCents <= 0) throw new Error("ยอดรวมหลังค่าเพิ่มและส่วนลดต้องมากกว่า 0");

  const participants = input.participants.map((participant): BillSplitParticipantResult => {
    const itemCents = itemShareCents.get(participant.id)!;
    const adjustmentCents = adjustmentShareCents.get(participant.id)!;
    const owedCents = itemCents + adjustmentCents;
    if (owedCents < 0) throw new Error(`ส่วนลดทำให้ยอดของ ${participant.name.trim()} ติดลบ กรุณาเปลี่ยนวิธีจัดสรร`);
    const paidCents = toCents(participant.paid, `ยอดที่ ${participant.name.trim()} ออกเงินจริง`);
    return {
      ...participant,
      name: participant.name.trim(),
      paid: fromCents(paidCents),
      itemShare: fromCents(itemCents),
      adjustmentShare: fromCents(adjustmentCents),
      owed: fromCents(owedCents),
      balance: fromCents(paidCents - owedCents),
    };
  });

  const totalPaidCents = participants.reduce((sum, participant) => sum + toCents(participant.paid, "ยอดที่ออกเงินจริงรวม"), 0);
  const paymentGapCents = grandTotalCents - totalPaidCents;
  const canSettle = paymentGapCents === 0;
  const settlements: BillSplitSettlement[] = [];

  if (canSettle) {
    const creditors = participants
      .map((participant, order) => ({ id: participant.id, cents: toCents(participant.balance, "ยอดรับคืน"), order }))
      .filter((participant) => participant.cents > 0)
      .sort((a, b) => b.cents - a.cents || a.order - b.order);
    const debtors = participants
      .map((participant, order) => ({ id: participant.id, cents: -toCents(participant.balance, "ยอดค้างจ่าย"), order }))
      .filter((participant) => participant.cents > 0)
      .sort((a, b) => b.cents - a.cents || a.order - b.order);
    let creditorIndex = 0;
    let debtorIndex = 0;
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex]!;
      const debtor = debtors[debtorIndex]!;
      const transferCents = Math.min(creditor.cents, debtor.cents);
      if (transferCents > 0) settlements.push({ fromParticipantId: debtor.id, toParticipantId: creditor.id, amount: fromCents(transferCents) });
      creditor.cents -= transferCents;
      debtor.cents -= transferCents;
      if (creditor.cents === 0) creditorIndex += 1;
      if (debtor.cents === 0) debtorIndex += 1;
    }
  }

  return {
    itemSubtotal: fromCents(itemSubtotalCents),
    adjustmentTotal: fromCents(adjustmentTotalCents),
    grandTotal: fromCents(grandTotalCents),
    totalPaid: fromCents(totalPaidCents),
    paymentGap: fromCents(paymentGapCents),
    canSettle,
    participants,
    items,
    adjustments,
    settlements,
  };
}

function csvSafeText(value: string) {
  const trimmed = value.trim();
  return /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number) {
  return value.toFixed(2);
}

export function billSplitCsv(input: BillSplitInput, result: BillSplitResult) {
  const participantName = new Map(result.participants.map((participant) => [participant.id, participant.name]));
  const rows: Array<Array<string | number>> = [
    ["Bill Split & Shared Expense Calculator", "Value", "Unit"],
    ["Group", csvSafeText(input.groupName), ""],
    ["Currency", input.currency, ""],
    ["Item subtotal", csvNumber(result.itemSubtotal), input.currency],
    ["Adjustments", csvNumber(result.adjustmentTotal), input.currency],
    ["Grand total", csvNumber(result.grandTotal), input.currency],
    ["Total paid", csvNumber(result.totalPaid), input.currency],
    ["Payment gap", csvNumber(result.paymentGap), input.currency],
    [],
    ["Participant", "Weight", "Item share", "Adjustment share", "Owed", "Paid", "Balance"],
    ...result.participants.map((participant) => [csvSafeText(participant.name), participant.weight, csvNumber(participant.itemShare), csvNumber(participant.adjustmentShare), csvNumber(participant.owed), csvNumber(participant.paid), csvNumber(participant.balance)]),
    [],
    ["Item", "Amount", "Shared by", ...result.participants.map((participant) => csvSafeText(participant.name))],
    ...result.items.map((item) => [csvSafeText(item.description), csvNumber(item.amount), item.participantIds.map((id) => csvSafeText(participantName.get(id)!)).join(" + "), ...result.participants.map((participant) => csvNumber(item.shares.find((share) => share.participantId === participant.id)?.amount ?? 0))]),
    [],
    ["Adjustment", "Amount", "Allocation", ...result.participants.map((participant) => csvSafeText(participant.name))],
    ...result.adjustments.map((adjustment) => [csvSafeText(adjustment.name), csvNumber(adjustment.amount), adjustment.allocationMode, ...result.participants.map((participant) => csvNumber(adjustment.shares.find((share) => share.participantId === participant.id)?.amount ?? 0))]),
    [],
    ["Settlement from", "Settlement to", "Amount"],
    ...(result.settlements.length > 0
      ? result.settlements.map((settlement) => [csvSafeText(participantName.get(settlement.fromParticipantId)!), csvSafeText(participantName.get(settlement.toParticipantId)!), csvNumber(settlement.amount)])
      : [[result.canSettle ? "No transfer required" : "Paid total must equal grand total before settlement", "", ""]]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
