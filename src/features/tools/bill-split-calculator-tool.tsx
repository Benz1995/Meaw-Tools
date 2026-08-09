"use client";

import {
  ArrowRight,
  BadgeDollarSign,
  Calculator,
  Cat,
  Check,
  ClipboardList,
  Download,
  Info,
  Plus,
  ReceiptText,
  Scale,
  Sparkles,
  Trash2,
  TriangleAlert,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BILL_SPLIT_MAX_ADJUSTMENTS,
  BILL_SPLIT_MAX_ITEMS,
  BILL_SPLIT_MAX_PARTICIPANTS,
  billSplitCsv,
  calculateBillSplit,
  type BillSplitAdjustment,
  type BillSplitAllocationMode,
  type BillSplitCurrency,
  type BillSplitInput,
  type BillSplitResult,
} from "@/lib/tools/bill-split";

type ParticipantForm = { id: string; name: string; weight: string; paid: string };
type ItemForm = { id: number; description: string; amount: string; participantIds: string[] };
type AdjustmentForm = { id: number; name: string; amount: string; allocationMode: BillSplitAllocationMode };
type BillSplitForm = {
  currency: BillSplitCurrency;
  groupName: string;
  participants: ParticipantForm[];
  items: ItemForm[];
  adjustments: AdjustmentForm[];
};

const currencyLabels: Record<BillSplitCurrency, string> = {
  THB: "บาท (THB)", USD: "ดอลลาร์ (USD)", EUR: "ยูโร (EUR)", JPY: "เยน (JPY)", GBP: "ปอนด์ (GBP)",
};
const currencySymbols: Record<BillSplitCurrency, string> = { THB: "฿", USD: "$", EUR: "€", JPY: "¥", GBP: "£" };
const allocationLabels: Record<BillSplitAllocationMode, { label: string; hint: string }> = {
  proportional: { label: "ตามยอดรายการของแต่ละคน", hint: "เหมาะกับ Service, VAT หรือส่วนลดทั้งบิล" },
  equal: { label: "หารเท่ากันทุกคน", hint: "เหมาะกับค่าจอดรถหรือค่าใช้จ่ายส่วนกลาง" },
  weighted: { label: "ตามน้ำหนักของแต่ละคน", hint: "ใช้สัดส่วนเดียวกับช่องน้ำหนักด้านบน" },
};

function createInitialForm(): BillSplitForm {
  return {
    currency: "THB",
    groupName: "",
    participants: [
      { id: "p1", name: "", weight: "1", paid: "0" },
      { id: "p2", name: "", weight: "1", paid: "0" },
    ],
    items: [{ id: 1, description: "", amount: "", participantIds: ["p1", "p2"] }],
    adjustments: [],
  };
}

function createExampleForm(): BillSplitForm {
  return {
    currency: "THB",
    groupName: "มื้อเย็นวันเกิด",
    participants: [
      { id: "p1", name: "Mew", weight: "1", paid: "1500" },
      { id: "p2", name: "Nana", weight: "1", paid: "383.20" },
      { id: "p3", name: "Taro", weight: "0.5", paid: "0" },
    ],
    items: [
      { id: 1, description: "อาหารจานหลัก", amount: "1200", participantIds: ["p1", "p2", "p3"] },
      { id: 2, description: "ของหวาน", amount: "300", participantIds: ["p1", "p2"] },
      { id: 3, description: "เครื่องดื่ม", amount: "200", participantIds: ["p1", "p2"] },
    ],
    adjustments: [
      { id: 1, name: "ส่วนลดจากร้าน", amount: "-100", allocationMode: "proportional" },
      { id: 2, name: "Service charge", amount: "160", allocationMode: "proportional" },
      { id: 3, name: "VAT จากใบเสร็จ", amount: "123.20", allocationMode: "proportional" },
    ],
  };
}

function parseNumber(value: string, label: string, required = false) {
  if (!value.trim()) {
    if (required) throw new Error(`กรุณากรอก${label}`);
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function money(value: number, currency: BillSplitCurrency) {
  return `${currencySymbols[currency]}${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

function NumberField({ id, label, value, onChange, hint, min, max, step = 0.01, placeholder }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "default", testId }: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "warm";
  testId?: string;
}) {
  const toneClass = tone === "positive"
    ? "border-emerald-500/30 bg-emerald-500/7"
    : tone === "warm"
      ? "border-pink-400/35 bg-pink-400/8"
      : "border-white/55 bg-white/55 dark:border-white/10 dark:bg-white/4";
  return (
    <article className={`rounded-2xl border p-4 shadow-sm backdrop-blur-xl ${toneClass}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 break-words text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function BillSplitResults({ input, result }: { input: BillSplitInput; result: BillSplitResult }) {
  const participantName = new Map(result.participants.map((participant) => [participant.id, participant.name]));
  const summary = [
    `สรุปหารบิล: ${input.groupName}`,
    `ยอดรายการ ${money(result.itemSubtotal, input.currency)} | ค่าเพิ่ม/ส่วนลด ${money(result.adjustmentTotal, input.currency)} | รวม ${money(result.grandTotal, input.currency)}`,
    ...result.participants.map((participant) => `${participant.name}: รับผิดชอบ ${money(participant.owed, input.currency)}, ออกจริง ${money(participant.paid, input.currency)}, ${participant.balance > 0 ? `รับคืน ${money(participant.balance, input.currency)}` : participant.balance < 0 ? `จ่ายเพิ่ม ${money(-participant.balance, input.currency)}` : "ยอดพอดี"}`),
    ...(result.canSettle
      ? result.settlements.map((settlement) => `${participantName.get(settlement.fromParticipantId)} โอนให้ ${participantName.get(settlement.toParticipantId)} ${money(settlement.amount, input.currency)}`)
      : [`ยอดที่ออกเงินจริงยัง${result.paymentGap > 0 ? "ขาด" : "เกิน"} ${money(Math.abs(result.paymentGap), input.currency)} จึงยังไม่สร้างรายการโอน`]),
  ].join("\n");

  return (
    <section className="mt-8 space-y-6" aria-live="polite" aria-labelledby="bill-results-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="bill-results-title" className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-pink-500" />4. สรุปบิลและยอดของแต่ละคน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ทุกยอดถูกปัดและกระจายเศษในหน่วยย่อย 2 ตำแหน่ง เพื่อให้บวกกลับได้ตรงบิล</p>
        </div>
        <span className="w-fit rounded-full border border-pink-300/40 bg-pink-100/60 px-3 py-1 text-xs text-pink-800 shadow-sm backdrop-blur dark:bg-pink-400/10 dark:text-pink-200">お会計 · Check please</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="ยอดรายการ" value={money(result.itemSubtotal, input.currency)} detail={`${result.items.length} รายการก่อนค่าเพิ่มและส่วนลด`} />
        <MetricCard label="ค่าเพิ่ม / ส่วนลดสุทธิ" value={money(result.adjustmentTotal, input.currency)} detail="ค่าบวกเพิ่ม ส่วนลดเป็นยอดติดลบ" tone="warm" />
        <MetricCard label="ยอดรวมทั้งบิล" value={money(result.grandTotal, input.currency)} detail={`ออกเงินจริงรวม ${money(result.totalPaid, input.currency)}`} tone="positive" testId="bill-grand-total" />
        <MetricCard label="ส่วนต่างยอดที่ออกจริง" value={money(Math.abs(result.paymentGap), input.currency)} detail={result.paymentGap === 0 ? "ยอดตรงกัน พร้อมสรุปการโอน" : result.paymentGap > 0 ? "ยอดที่ออกจริงยังขาด" : "ยอดที่ออกจริงเกินบิล"} />
      </div>

      {!result.canSettle ? (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <TriangleAlert className="text-amber-600 dark:text-amber-300" />
          <AlertTitle>ยังสรุปว่าใครโอนให้ใครไม่ได้</AlertTitle>
          <AlertDescription>ยอดที่ทุกคนออกเงินจริงรวม {money(result.totalPaid, input.currency)} แต่บิลรวม {money(result.grandTotal, input.currency)} ต่างกัน {money(Math.abs(result.paymentGap), input.currency)} กรุณาแก้ช่อง “ออกเงินจริง” ให้ตรงยอดบิลก่อน</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-3xl border border-pink-300/25 bg-gradient-to-br from-pink-100/55 via-white/45 to-amber-100/45 p-4 shadow-sm backdrop-blur-xl dark:from-pink-500/9 dark:via-white/3 dark:to-amber-400/7 sm:p-5" aria-labelledby="bill-settlement-title">
        <h3 id="bill-settlement-title" className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-pink-500" />รายการโอนเพื่อปิดบิล</h3>
        {result.canSettle && result.settlements.length > 0 ? (
          <div className="mt-5 grid gap-3" data-testid="bill-settlements">
            {result.settlements.map((settlement, index) => (
              <article key={`${settlement.fromParticipantId}-${settlement.toParticipantId}-${index}`} className="flex flex-col gap-3 rounded-2xl border bg-card/65 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pink-500/10 text-sm font-bold text-pink-600 dark:text-pink-300">{index + 1}</span>
                  <p className="min-w-0 break-words font-medium"><strong>{participantName.get(settlement.fromParticipantId)}</strong> <ArrowRight className="mx-1 inline size-4 text-muted-foreground" /> <strong>{participantName.get(settlement.toParticipantId)}</strong></p>
                </div>
                <p className="shrink-0 text-xl font-black tabular-nums">{money(settlement.amount, input.currency)}</p>
              </article>
            ))}
          </div>
        ) : result.canSettle ? (
          <p className="mt-4 rounded-xl border bg-card/60 p-4 text-sm text-muted-foreground">ทุกคนออกเงินตรงส่วนของตัวเองแล้ว ไม่ต้องโอนเพิ่ม</p>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed bg-card/35 p-4 text-sm text-muted-foreground">รายการโอนจะแสดงเมื่อยอด “ออกเงินจริง” รวมตรงกับยอดบิล</p>
        )}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">ระบบจับคู่คนที่จ่ายขาดกับคนที่ออกเกินแบบ deterministic เพื่อให้รายการอ่านง่าย ไม่อ้างว่าเป็นจำนวนธุรกรรมต่ำสุดทางคณิตศาสตร์ในทุกกรณี</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="bill-participants-result">
        {result.participants.map((participant) => {
          const balanceLabel = participant.balance > 0 ? "รับคืน" : participant.balance < 0 ? "จ่ายเพิ่ม" : "พอดี";
          const balanceClass = participant.balance > 0
            ? "text-emerald-700 dark:text-emerald-300"
            : participant.balance < 0
              ? "text-pink-700 dark:text-pink-300"
              : "text-foreground";
          return (
            <article key={participant.id} className="rounded-2xl border border-white/55 bg-white/50 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/4" data-testid={`bill-person-${participant.id}`}>
              <div className="flex items-center justify-between gap-3"><h3 className="break-words font-semibold">{participant.name}</h3><span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">น้ำหนัก {participant.weight}</span></div>
              <p className={`mt-4 text-2xl font-black tabular-nums ${balanceClass}`}>{balanceLabel} {money(Math.abs(participant.balance), input.currency)}</p>
              <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 border-t pt-4 text-sm">
                <dt className="text-muted-foreground">ส่วนจากรายการ</dt><dd className="text-right tabular-nums">{money(participant.itemShare, input.currency)}</dd>
                <dt className="text-muted-foreground">ค่าเพิ่ม/ส่วนลด</dt><dd className="text-right tabular-nums">{money(participant.adjustmentShare, input.currency)}</dd>
                <dt className="font-medium">ต้องรับผิดชอบ</dt><dd className="text-right font-semibold tabular-nums">{money(participant.owed, input.currency)}</dd>
                <dt className="text-muted-foreground">ออกเงินจริง</dt><dd className="text-right tabular-nums">{money(participant.paid, input.currency)}</dd>
              </dl>
            </article>
          );
        })}
      </div>

      <details className="group rounded-2xl border bg-muted/10 p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold marker:content-none"><span className="flex items-center gap-2"><ReceiptText className="size-4 text-primary" />ตรวจรายละเอียดการกระจายแต่ละรายการ</span><span className="text-xs font-normal text-primary group-open:hidden">เปิดดู</span><span className="hidden text-xs font-normal text-muted-foreground group-open:inline">ซ่อน</span></summary>
        <div className="mt-5 space-y-4">
          {result.items.map((item, index) => (
            <article key={`${item.description}-${index}`} className="rounded-xl border bg-card/55 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h4 className="font-medium">{item.description}</h4><strong className="tabular-nums">{money(item.amount, input.currency)}</strong></div>
              <div className="mt-3 flex flex-wrap gap-2">{item.shares.filter((share) => share.amount !== 0).map((share) => <span key={share.participantId} className="rounded-full border bg-background/70 px-2.5 py-1 text-xs">{participantName.get(share.participantId)} {money(share.amount, input.currency)}</span>)}</div>
            </article>
          ))}
          {result.adjustments.map((adjustment, index) => (
            <article key={`${adjustment.name}-${index}`} className="rounded-xl border border-dashed bg-card/35 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h4 className="font-medium">{adjustment.name} · {allocationLabels[adjustment.allocationMode].label}</h4><strong className="tabular-nums">{money(adjustment.amount, input.currency)}</strong></div>
              <div className="mt-3 flex flex-wrap gap-2">{adjustment.shares.filter((share) => share.amount !== 0).map((share) => <span key={share.participantId} className="rounded-full border bg-background/70 px-2.5 py-1 text-xs">{participantName.get(share.participantId)} {money(share.amount, input.currency)}</span>)}</div>
            </article>
          ))}
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="bill-formula-title">
          <h3 id="bill-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />วิธีหารและจัดการเศษ</h3>
          <ol className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">1.</strong> แต่ละรายการถูกหารตามน้ำหนักของคนที่เลือกเฉพาะรายการนั้น</li>
            <li><strong className="text-foreground">2.</strong> ค่าเพิ่ม/ส่วนลดถูกหารตามยอดรายการ เท่ากัน หรือตามน้ำหนักตามที่เลือก</li>
            <li><strong className="text-foreground">3.</strong> คำนวณเป็นหน่วยย่อย 2 ตำแหน่ง แล้วแจกเศษให้ผลรวมตรงต้นฉบับทุกบรรทัด</li>
          </ol>
        </section>
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="bill-boundary-title">
          <h3 id="bill-boundary-title" className="flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" />เหตุผลที่ให้กรอกยอดจากใบเสร็จ</h3>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">ร้านและประเทศอาจใช้ฐาน/ลำดับ Discount, Service charge, VAT/Tax และ Tip ต่างกัน หน้านี้จึงให้กรอกยอดจริงแต่ละบรรทัดเป็นบวกหรือลบ ไม่เดา Rate หรือฐานภาษี แล้วเน้นกระจายยอดให้ตรงใบเสร็จ</p>
        </section>
      </div>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปหารบิลแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="bill-split-csv" onClick={() => downloadText(billSplitCsv(input, result), "meaw-bill-split.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </section>
  );
}

export function BillSplitCalculatorTool() {
  const [form, setForm] = useState<BillSplitForm>(createInitialForm);
  const [nextParticipantId, setNextParticipantId] = useState(3);
  const [nextItemId, setNextItemId] = useState(2);
  const [nextAdjustmentId, setNextAdjustmentId] = useState(1);
  const [calculation, setCalculation] = useState<{ input: BillSplitInput; result: BillSplitResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateTopLevel = <Key extends "currency" | "groupName">(key: Key, value: BillSplitForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value })); invalidate();
  };
  const updateParticipant = (id: string, key: "name" | "weight" | "paid", value: string) => {
    setForm((current) => ({ ...current, participants: current.participants.map((participant) => participant.id === id ? { ...participant, [key]: value } : participant) })); invalidate();
  };
  const addParticipant = () => {
    if (form.participants.length >= BILL_SPLIT_MAX_PARTICIPANTS) return;
    const id = `p${nextParticipantId}`;
    setForm((current) => ({ ...current, participants: [...current.participants, { id, name: "", weight: "1", paid: "0" }] }));
    setNextParticipantId((value) => value + 1); invalidate();
  };
  const removeParticipant = (id: string) => {
    if (form.participants.length <= 2) return;
    setForm((current) => {
      const participants = current.participants.filter((participant) => participant.id !== id);
      const remainingIds = participants.map((participant) => participant.id);
      return {
        ...current,
        participants,
        items: current.items.map((item) => {
          const participantIds = item.participantIds.filter((participantId) => participantId !== id);
          return { ...item, participantIds: participantIds.length > 0 ? participantIds : remainingIds };
        }),
      };
    });
    invalidate();
  };
  const updateItem = (id: number, key: "description" | "amount", value: string) => {
    setForm((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [key]: value } : item) })); invalidate();
  };
  const toggleItemParticipant = (itemId: number, participantId: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) return item;
        const isSelected = item.participantIds.includes(participantId);
        if (isSelected && item.participantIds.length === 1) return item;
        return { ...item, participantIds: isSelected ? item.participantIds.filter((id) => id !== participantId) : [...item.participantIds, participantId] };
      }),
    }));
    invalidate();
  };
  const addItem = () => {
    if (form.items.length >= BILL_SPLIT_MAX_ITEMS) return;
    setForm((current) => ({ ...current, items: [...current.items, { id: nextItemId, description: "", amount: "", participantIds: current.participants.map((participant) => participant.id) }] }));
    setNextItemId((value) => value + 1); invalidate();
  };
  const removeItem = (id: number) => {
    if (form.items.length <= 1) return;
    setForm((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) })); invalidate();
  };
  const updateAdjustment = <Key extends keyof Omit<AdjustmentForm, "id">>(id: number, key: Key, value: AdjustmentForm[Key]) => {
    setForm((current) => ({ ...current, adjustments: current.adjustments.map((adjustment) => adjustment.id === id ? { ...adjustment, [key]: value } : adjustment) })); invalidate();
  };
  const addAdjustment = () => {
    if (form.adjustments.length >= BILL_SPLIT_MAX_ADJUSTMENTS) return;
    setForm((current) => ({ ...current, adjustments: [...current.adjustments, { id: nextAdjustmentId, name: "", amount: "", allocationMode: "proportional" }] }));
    setNextAdjustmentId((value) => value + 1); invalidate();
  };
  const removeAdjustment = (id: number) => {
    setForm((current) => ({ ...current, adjustments: current.adjustments.filter((adjustment) => adjustment.id !== id) })); invalidate();
  };

  const calculate = () => {
    try {
      const input: BillSplitInput = {
        currency: form.currency,
        groupName: form.groupName,
        participants: form.participants.map((participant, index) => ({
          id: participant.id,
          name: participant.name,
          weight: parseNumber(participant.weight, `น้ำหนักคนที่ ${index + 1}`, true),
          paid: parseNumber(participant.paid, `ยอดออกเงินจริงคนที่ ${index + 1}`),
        })),
        items: form.items.map((item, index) => ({
          description: item.description,
          amount: parseNumber(item.amount, `ยอดรายการที่ ${index + 1}`, true),
          participantIds: item.participantIds,
        })),
        adjustments: form.adjustments.map((adjustment, index): BillSplitAdjustment => ({
          name: adjustment.name,
          amount: parseNumber(adjustment.amount, `ยอดค่าเพิ่ม/ส่วนลดที่ ${index + 1}`, true),
          allocationMode: adjustment.allocationMode,
        })),
      };
      setCalculation({ input, result: calculateBillSplit(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "หารบิลไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setForm(createExampleForm());
    setNextParticipantId(4); setNextItemId(4); setNextAdjustmentId(4); invalidate();
  };
  const clear = () => {
    setForm(createInitialForm());
    setNextParticipantId(3); setNextItemId(2); setNextAdjustmentId(1); invalidate();
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-7 overflow-hidden border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/6 to-amber-300/10 shadow-sm backdrop-blur-xl">
        <Cat className="text-pink-600 dark:text-pink-300" />
        <AlertTitle className="flex flex-wrap items-center gap-2">กินด้วยกัน หารอย่างแฟร์ <span aria-hidden="true" className="rounded-full border border-pink-300/40 bg-white/55 px-2 py-0.5 text-xs font-normal text-pink-700 shadow-sm backdrop-blur dark:bg-white/5 dark:text-pink-200">割り勘ねこ · ฅ(•ㅅ•❀)ฅ</span></AlertTitle>
        <AlertDescription className="leading-6">แยกรายการว่าใครใช้ หารเท่ากันหรือถ่วงน้ำหนัก ใส่ Service/VAT/Tip/ส่วนลดจากใบเสร็จ และบอกว่าใครควรโอนให้ใคร ข้อมูลทั้งหมดคำนวณใน Browser</AlertDescription>
      </Alert>

      <section aria-labelledby="bill-group-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="bill-group-title" className="flex items-center gap-2 font-semibold"><UsersRound className="size-4 text-primary" />1. ตั้งชื่อบิลและเพิ่มคน</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">น้ำหนัก 1 คือส่วนปกติ, 0.5 คือครึ่งส่วน, 2 คือสองส่วน ใช้กับรายการที่เลือกคนนั้น</p></div>
          <Button type="button" variant="outline" onClick={addParticipant} disabled={form.participants.length >= BILL_SPLIT_MAX_PARTICIPANTS}><Plus className="size-4" />เพิ่มคน ({form.participants.length}/{BILL_SPLIT_MAX_PARTICIPANTS})</Button>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
          <div className="grid gap-3"><Label htmlFor="bill-group-name">ชื่อบิล / กลุ่ม</Label><Input id="bill-group-name" value={form.groupName} maxLength={120} placeholder="เช่น มื้อเย็นวันเกิด หรือทริปเชียงใหม่" onChange={(event) => updateTopLevel("groupName", event.target.value)} /><p className="text-xs leading-5 text-muted-foreground">ใช้ในสรุปและ CSV ไม่ต้องใส่ข้อมูลบัญชีธนาคาร</p></div>
          <div className="grid gap-3"><Label htmlFor="bill-currency">หน่วยเงิน</Label><Select value={form.currency} onValueChange={(value) => updateTopLevel("currency", value as BillSplitCurrency)}><SelectTrigger id="bill-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(currencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">จัดรูปแบบเท่านั้น ไม่มี FX</p></div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {form.participants.map((participant, index) => (
            <article key={participant.id} className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/70 via-pink-50/30 to-amber-50/35 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:from-white/5 dark:via-pink-500/5 dark:to-amber-400/4">
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">คนที่ {index + 1}</h3><Button type="button" size="icon" variant="ghost" disabled={form.participants.length <= 2} onClick={() => removeParticipant(participant.id)} aria-label={`ลบคนที่ ${index + 1}`}><Trash2 className="size-4" /></Button></div>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div className="grid gap-3"><Label htmlFor={`bill-person-name-${participant.id}`}>ชื่อ</Label><Input id={`bill-person-name-${participant.id}`} value={participant.name} maxLength={60} placeholder={index === 0 ? "เช่น Mew" : "เช่น Nana"} onChange={(event) => updateParticipant(participant.id, "name", event.target.value)} /><p className="text-xs leading-5 text-muted-foreground">ต้องไม่ซ้ำกัน</p></div>
                <NumberField id={`bill-person-weight-${participant.id}`} label="น้ำหนักการหาร" value={participant.weight} onChange={(value) => updateParticipant(participant.id, "weight", value)} hint="เช่น 0.5, 1 หรือ 2" min={0.01} />
                <NumberField id={`bill-person-paid-${participant.id}`} label="ออกเงินจริง" value={participant.paid} onChange={(value) => updateParticipant(participant.id, "paid", value)} hint="ยอดที่คนนี้จ่ายหน้าร้าน" min={0} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-9 border-t pt-8" aria-labelledby="bill-items-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="bill-items-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />2. แยกรายการและคนที่ร่วมใช้</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ยอดแต่ละรายการควรเป็นยอดจากใบเสร็จก่อนค่าเพิ่ม/ส่วนลดรวม เลือกเฉพาะคนที่ใช้รายการนั้น</p></div>
          <Button type="button" variant="outline" onClick={addItem} disabled={form.items.length >= BILL_SPLIT_MAX_ITEMS}><Plus className="size-4" />เพิ่มรายการ ({form.items.length}/{BILL_SPLIT_MAX_ITEMS})</Button>
        </div>
        <div className="mt-6 space-y-4">
          {form.items.map((item, index) => (
            <article key={item.id} className="rounded-2xl border bg-card/55 p-4 shadow-sm backdrop-blur-xl [content-visibility:auto] sm:p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">รายการ {index + 1}</h3><Button type="button" size="icon" variant="ghost" disabled={form.items.length <= 1} onClick={() => removeItem(item.id)} aria-label={`ลบรายการ ${index + 1}`}><Trash2 className="size-4" /></Button></div>
              <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
                <div className="grid gap-3"><Label htmlFor={`bill-item-name-${item.id}`}>ชื่อรายการ</Label><Input id={`bill-item-name-${item.id}`} value={item.description} maxLength={100} placeholder="เช่น อาหารจานหลัก" onChange={(event) => updateItem(item.id, "description", event.target.value)} /><p className="text-xs leading-5 text-muted-foreground">รวมรายการที่คนใช้กลุ่มเดียวกันได้</p></div>
                <NumberField id={`bill-item-amount-${item.id}`} label="ยอดเงิน" value={item.amount} onChange={(value) => updateItem(item.id, "amount", value)} hint="ยอดของรายการทั้งหมด" min={0.01} />
              </div>
              <fieldset className="mt-5"><legend className="text-sm font-medium">ใครร่วมรายการนี้</legend><div className="mt-3 flex flex-wrap gap-2">{form.participants.map((participant, participantIndex) => { const selected = item.participantIds.includes(participant.id); return <Button key={participant.id} type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={() => toggleItemParticipant(item.id, participant.id)}>{selected ? <Check className="size-3.5" /> : null}{participant.name.trim() || `คนที่ ${participantIndex + 1}`} · ×{participant.weight || "?"}</Button>; })}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">อย่างน้อย 1 คน · รายการถูกหารตามน้ำหนักของคนที่เลือก</p></fieldset>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-9 border-t pt-8" aria-labelledby="bill-adjustments-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="bill-adjustments-title" className="flex items-center gap-2 font-semibold"><Scale className="size-4 text-primary" />3. ใส่ค่าเพิ่มหรือส่วนลดจากใบเสร็จ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">กรอกยอดจริง เช่น Service +160, VAT +123.20, ส่วนลด −100 เว้นส่วนนี้ได้ถ้าไม่มี</p></div>
          <Button type="button" variant="outline" onClick={addAdjustment} disabled={form.adjustments.length >= BILL_SPLIT_MAX_ADJUSTMENTS}><Plus className="size-4" />เพิ่มค่า ({form.adjustments.length}/{BILL_SPLIT_MAX_ADJUSTMENTS})</Button>
        </div>
        {form.adjustments.length > 0 ? <div className="mt-6 space-y-4">{form.adjustments.map((adjustment, index) => (
          <article key={adjustment.id} className="rounded-2xl border border-dashed bg-muted/10 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">ค่าเพิ่ม / ส่วนลด {index + 1}</h3><Button type="button" size="icon" variant="ghost" onClick={() => removeAdjustment(adjustment.id)} aria-label={`ลบค่าเพิ่มหรือส่วนลด ${index + 1}`}><Trash2 className="size-4" /></Button></div>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div className="grid gap-3"><Label htmlFor={`bill-adjustment-name-${adjustment.id}`}>ชื่อ</Label><Input id={`bill-adjustment-name-${adjustment.id}`} value={adjustment.name} maxLength={80} placeholder="เช่น Service charge" onChange={(event) => updateAdjustment(adjustment.id, "name", event.target.value)} /><p className="text-xs leading-5 text-muted-foreground">ใช้ข้อความตามใบเสร็จ</p></div>
              <NumberField id={`bill-adjustment-amount-${adjustment.id}`} label="ยอดเงิน (+ เพิ่ม / − ลด)" value={adjustment.amount} onChange={(value) => updateAdjustment(adjustment.id, "amount", value)} hint="เช่น 160 หรือ -100" />
              <div className="grid gap-3"><Label htmlFor={`bill-adjustment-mode-${adjustment.id}`}>วิธีหาร</Label><Select value={adjustment.allocationMode} onValueChange={(value) => updateAdjustment(adjustment.id, "allocationMode", value as BillSplitAllocationMode)}><SelectTrigger id={`bill-adjustment-mode-${adjustment.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(allocationLabels).map(([value, option]) => <SelectItem key={value} value={value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">{allocationLabels[adjustment.allocationMode].hint}</p></div>
            </div>
          </article>
        ))}</div> : <div className="mt-6 rounded-2xl border border-dashed bg-muted/5 p-5 text-center text-sm text-muted-foreground">ไม่มีค่าเพิ่มหรือส่วนลด กด “เพิ่มค่า” เมื่อใบเสร็จมี Service, VAT/Tax, Tip, Coupon หรือส่วนลดทั้งบิล</div>}

        {error ? <Alert variant="destructive" className="mt-5"><TriangleAlert /><AlertTitle>ยังหารบิลไม่ได้</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <ActionBar>
          <Button type="button" onClick={calculate}><BadgeDollarSign className="size-4" />คำนวณและสรุปยอดโอน</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </section>

      {calculation ? <BillSplitResults input={calculation.input} result={calculation.result} /> : (
        <div className="mt-8 grid min-h-56 place-items-center rounded-3xl border border-dashed bg-gradient-to-br from-pink-500/5 via-transparent to-amber-400/7 p-6 text-center text-sm leading-6 text-muted-foreground">
          <div><WalletCards className="mx-auto size-9 text-pink-400" /><p className="mt-3 font-medium text-foreground">เพิ่มคน แยกรายการ และใส่ยอดที่ออกจริง</p><p className="mt-1">ระบบจะกระจายเศษให้ตรงบิลและสรุปว่าใครควรโอนให้ใคร</p></div>
        </div>
      )}

      <Alert className="mt-8 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-600 dark:text-amber-300" />
        <AlertTitle>ตรวจใบเสร็จและตกลงวิธีหารร่วมกัน</AlertTitle>
        <AlertDescription className="leading-6">เครื่องมือคำนวณตามรายการ น้ำหนัก ยอดที่จ่าย และวิธีจัดสรรที่ผู้ใช้กรอก ไม่ตัดสินว่าใครควรรับผิดชอบรายการใด ไม่ตรวจ Rate ภาษี/Service/Tip และไม่โอนเงินจริง ควรให้ทุกคนตรวจสรุปก่อนชำระ</AlertDescription>
      </Alert>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/percentage-calculator" className="text-primary underline-offset-4 hover:underline">คำนวณเปอร์เซ็นต์ →</Link>
        <Link href="/vat-calculator" className="text-primary underline-offset-4 hover:underline">ตรวจ VAT →</Link>
        <Link href="/fuel-cost-calculator" className="text-primary underline-offset-4 hover:underline">หารค่าเดินทาง →</Link>
        <Link href="/wholesale-price-calculator" className="text-primary underline-offset-4 hover:underline">วางราคาขายสินค้า →</Link>
      </div>
    </WorkspaceFrame>
  );
}
