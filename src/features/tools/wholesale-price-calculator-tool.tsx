"use client";

import {
  BadgeDollarSign,
  Calculator,
  Cat,
  ClipboardList,
  Download,
  Info,
  Layers3,
  PackageCheck,
  Plus,
  ReceiptText,
  Sparkles,
  Store,
  Trash2,
  TriangleAlert,
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
  calculateWholesalePricing,
  wholesalePricingCsv,
  WHOLESALE_PRICING_MAX_CHANNELS,
  type WholesalePricingChannel,
  type WholesalePricingCosts,
  type WholesalePricingCurrency,
  type WholesalePricingInput,
  type WholesalePricingResult,
} from "@/lib/tools/wholesale-pricing";

type CostKey = keyof WholesalePricingCosts;
type ChannelKind = "wholesale" | "direct" | "marketplace" | "distributor";
type ChannelForm = { id: number; kind: ChannelKind } & Record<keyof WholesalePricingChannel, string>;
type WholesalePricingForm = {
  currency: WholesalePricingCurrency;
  productName: string;
  costs: Record<CostKey, string>;
  channels: ChannelForm[];
};

const currencyLabels: Record<WholesalePricingCurrency, string> = {
  THB: "บาท (THB)", USD: "ดอลลาร์ (USD)", EUR: "ยูโร (EUR)", JPY: "เยน (JPY)", GBP: "ปอนด์ (GBP)",
};
const currencySymbols: Record<WholesalePricingCurrency, string> = { THB: "฿", USD: "$", EUR: "€", JPY: "¥", GBP: "£" };
const costFields: Array<{ key: CostKey; label: string; hint: string; placeholder: string }> = [
  { key: "materials", label: "วัตถุดิบ / ราคาซื้อ", hint: "ต้นทุนหลักของสินค้าหนึ่งหน่วย", placeholder: "เช่น 100" },
  { key: "packaging", label: "บรรจุภัณฑ์", hint: "กล่อง ฉลาก ถุง และวัสดุกันกระแทก", placeholder: "เช่น 20" },
  { key: "labor", label: "แรงงานต่อหน่วย", hint: "ผลิต ประกอบ ตรวจ หรือแพ็ก", placeholder: "เช่น 35" },
  { key: "fulfillment", label: "จัดเตรียมและส่งมอบ", hint: "Picking, packing หรือจัดส่งที่แบกรับเอง", placeholder: "เช่น 10" },
  { key: "inbound", label: "ขนส่งเข้า / อากร", hint: "เฉลี่ย Freight-in และ Duty ต่อหน่วย", placeholder: "เช่น 5" },
  { key: "overhead", label: "ค่าใช้จ่ายจัดสรร", hint: "พื้นที่ ระบบ ค่าเสื่อม หรือค่าใช้จ่ายร่วม", placeholder: "เช่น 8" },
  { key: "other", label: "ต้นทุนอื่น", hint: "ต้นทุนต่อหน่วยที่ยังไม่อยู่ด้านบน", placeholder: "เช่น 2" },
];

const presetLabels: Record<ChannelKind, string> = {
  wholesale: "ขายส่ง / ร้านคู่ค้า",
  direct: "ขายตรง / ร้านของเรา",
  marketplace: "Marketplace",
  distributor: "Distributor",
};

const presetValues: Record<ChannelKind, Omit<ChannelForm, "id" | "kind">> = {
  wholesale: { name: "ขายส่งร้านคู่ค้า", orderQuantity: "50", variableFeePercent: "2", fixedFeePerOrder: "100", fixedFeePerUnit: "0", targetMarginPercent: "25", downstreamMarginPercent: "40" },
  direct: { name: "ร้านออนไลน์ของเรา", orderQuantity: "1", variableFeePercent: "3", fixedFeePerOrder: "0", fixedFeePerUnit: "10", targetMarginPercent: "40", downstreamMarginPercent: "0" },
  marketplace: { name: "Marketplace", orderQuantity: "1", variableFeePercent: "15", fixedFeePerOrder: "0", fixedFeePerUnit: "20", targetMarginPercent: "30", downstreamMarginPercent: "0" },
  distributor: { name: "ตัวแทนจำหน่าย", orderQuantity: "100", variableFeePercent: "1", fixedFeePerOrder: "200", fixedFeePerUnit: "0", targetMarginPercent: "20", downstreamMarginPercent: "35" },
};

function channelFromPreset(id: number, kind: ChannelKind): ChannelForm {
  return { id, kind, ...presetValues[kind] };
}

function createInitialForm(): WholesalePricingForm {
  return {
    currency: "THB",
    productName: "",
    costs: { materials: "", packaging: "", labor: "", fulfillment: "", inbound: "", overhead: "", other: "" },
    channels: [channelFromPreset(1, "wholesale"), channelFromPreset(2, "direct")],
  };
}

function createExampleForm(): WholesalePricingForm {
  return {
    currency: "THB",
    productName: "กระเป๋าผ้าแมว",
    costs: { materials: "100", packaging: "20", labor: "35", fulfillment: "10", inbound: "5", overhead: "8", other: "2" },
    channels: [channelFromPreset(1, "wholesale"), channelFromPreset(2, "direct"), channelFromPreset(3, "marketplace")],
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

function money(value: number, currency: WholesalePricingCurrency, maximumFractionDigits = 2) {
  return `${currencySymbols[currency]}${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits }).format(value)}`;
}

function percent(value: number) {
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value)}%`;
}

function NumberField({ id, label, value, onChange, hint, min = 0, max, step = 0.01 }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
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

function PricingResults({ input, result }: { input: WholesalePricingInput; result: WholesalePricingResult }) {
  const maximumPrice = Math.max(...result.channels.map((channel) => channel.requiredPrice));
  const summary = [
    `สรุปราคาสินค้า: ${input.productName}`,
    `ต้นทุนรวมต่อหน่วย ${money(result.unitCost, input.currency)}`,
    ...result.channels.map((channel) => `${channel.name}: ตั้งอย่างน้อย ${money(channel.requiredPrice, input.currency)} | กำไร ${money(channel.profitPerUnit, input.currency)}/หน่วย | Margin ${percent(channel.actualMarginPercent)}${channel.suggestedRetailPrice ? ` | ราคาปลีกแนะนำ ${money(channel.suggestedRetailPrice, input.currency)}` : ""}`),
    "หมายเหตุ: ผลเป็นแบบจำลองจากต้นทุน ค่าธรรมเนียม และ Margin ที่กรอก ยังไม่รวม VAT/ภาษี/คืนสินค้า/ความเสี่ยง เว้นแต่ใส่ไว้ในต้นทุนแล้ว",
  ].join("\n");

  return (
    <section className="mt-8 space-y-6" aria-live="polite" aria-labelledby="wholesale-results-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="wholesale-results-title" className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-pink-500" />3. ราคาที่ควรตั้งในแต่ละช่องทาง</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">เรียงอันดับตามราคาที่ต้องตั้งต่ำสุดเป็นอันดับ 1 แต่ราคาต่ำสุดไม่ใช่ช่องทางที่ดีที่สุดเสมอ</p>
        </div>
        <span className="w-fit rounded-full border border-pink-300/40 bg-pink-100/60 px-3 py-1 text-xs text-pink-800 shadow-sm backdrop-blur dark:bg-pink-400/10 dark:text-pink-200">価格プラン · Price plan</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="ต้นทุนรวมต่อหน่วย" value={money(result.unitCost, input.currency)} detail="รวมต้นทุน 7 หมวดก่อนค่าธรรมเนียมช่องทาง" testId="wholesale-unit-cost" />
        <MetricCard label="ราคาที่ต้องตั้งต่ำสุด" value={money(result.lowestRequiredPrice, input.currency)} detail="ค่าต่ำสุดใน Scenario ที่กรอก ไม่ใช่ราคาตลาด" tone="positive" testId="wholesale-lowest-price" />
        <MetricCard label="ราคาที่ต้องตั้งสูงสุด" value={money(result.highestRequiredPrice, input.currency)} detail="ช่องทางที่มี Fee หรือ Margin เป้าหมายสูงอาจต้องตั้งแพงขึ้น" tone="warm" />
        <MetricCard label="ช่วงห่างของราคา" value={money(result.priceSpread, input.currency)} detail={`${percent(result.priceSpreadPercent)} เทียบราคาต่ำสุด`} />
      </div>

      <div className="space-y-5" data-testid="wholesale-channel-results">
        {[...result.channels].sort((a, b) => a.rank - b.rank).map((channel) => (
          <article key={`${channel.rank}-${channel.name}`} className={`overflow-hidden rounded-3xl border shadow-sm backdrop-blur-xl ${channel.isLowestRequiredPrice ? "border-emerald-500/35 bg-emerald-500/6" : "border-white/55 bg-white/50 dark:border-white/10 dark:bg-white/4"}`}>
            <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,.8fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{channel.rank}</span>
                  <h3 className="break-words font-semibold">{channel.name}</h3>
                  {channel.isLowestRequiredPrice ? <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">ราคาที่ต้องตั้งต่ำสุด</span> : null}
                </div>
                <p className="mt-4 text-3xl font-black tracking-tight tabular-nums" data-testid={`wholesale-price-${channel.rank}`}>{money(channel.requiredPrice, input.currency)}</p>
                <p className="mt-1 text-sm text-muted-foreground">ต่อหน่วย · Order ละ {channel.orderQuantity.toLocaleString("th-TH")} หน่วย{channel.isLowestRequiredPrice ? "" : ` · สูงกว่าราคาต่ำสุด ${money(channel.differenceFromLowest, input.currency)} (${percent(channel.differenceFromLowestPercent)})`}</p>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" aria-label={`${channel.name} ราคาที่ต้องตั้ง ${money(channel.requiredPrice, input.currency)}`}>
                  <div className={`h-full rounded-full ${channel.isLowestRequiredPrice ? "bg-emerald-500" : "bg-gradient-to-r from-pink-400 to-violet-400"}`} style={{ width: `${Math.max(8, channel.requiredPrice / maximumPrice * 100)}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-xl border bg-card/45 p-3"><span className="block text-xs text-muted-foreground">กำไร/หน่วย</span><strong className="mt-1 block tabular-nums">{money(channel.profitPerUnit, input.currency)}</strong></div>
                  <div className="rounded-xl border bg-card/45 p-3"><span className="block text-xs text-muted-foreground">Fee/หน่วย</span><strong className="mt-1 block tabular-nums">{money(channel.totalFeePerUnit, input.currency)}</strong></div>
                  <div className="rounded-xl border bg-card/45 p-3"><span className="block text-xs text-muted-foreground">Margin</span><strong className="mt-1 block tabular-nums">{percent(channel.actualMarginPercent)}</strong></div>
                  <div className="rounded-xl border bg-card/45 p-3"><span className="block text-xs text-muted-foreground">Markup บนต้นทุน</span><strong className="mt-1 block tabular-nums">{percent(channel.markupPercent)}</strong></div>
                </div>
              </div>

              <div className="rounded-2xl border border-pink-300/25 bg-gradient-to-br from-pink-100/65 via-white/45 to-amber-100/55 p-4 dark:from-pink-500/10 dark:via-white/3 dark:to-amber-400/8">
                <h4 className="flex items-center gap-2 text-sm font-semibold"><ReceiptText className="size-4 text-pink-500" />เศรษฐศาสตร์ต่อ Order</h4>
                <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">รายได้</dt><dd className="text-right font-medium tabular-nums">{money(channel.orderRevenue, input.currency)}</dd>
                  <dt className="text-muted-foreground">ต้นทุนสินค้า</dt><dd className="text-right font-medium tabular-nums">− {money(channel.orderCost, input.currency)}</dd>
                  <dt className="text-muted-foreground">ค่าธรรมเนียมรวม</dt><dd className="text-right font-medium tabular-nums">− {money(channel.orderFees, input.currency)}</dd>
                  <dt className="border-t pt-2 font-medium">กำไรผู้ขาย</dt><dd className="border-t pt-2 text-right font-bold tabular-nums">{money(channel.orderProfit, input.currency)}</dd>
                </dl>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Break-even {money(channel.breakEvenPrice, input.currency)} · Fee ต่อ Order ที่เฉลี่ยลงหนึ่งหน่วย {money(channel.allocatedOrderFeePerUnit, input.currency)}</p>
                {channel.suggestedRetailPrice !== null ? (
                  <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/8 p-3">
                    <p className="text-xs text-muted-foreground">ราคาปลีกแนะนำให้ร้านคู่ค้า</p>
                    <p className="mt-1 text-xl font-bold tabular-nums" data-testid="wholesale-suggested-retail">{money(channel.suggestedRetailPrice, input.currency)}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">เพื่อให้ร้านคู่ค้าได้ Gross margin {percent(channel.downstreamMarginPercent)} หรือ {money(channel.downstreamProfitPerUnit ?? 0, input.currency)}/หน่วย ก่อนค่าใช้จ่ายของร้าน</p>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="wholesale-formula-title">
          <h3 id="wholesale-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรย้อนหารราคาที่ต้องตั้ง</h3>
          <p className="mt-4 rounded-xl border bg-card/60 p-3 text-sm leading-6"><strong>ราคา = (ต้นทุนต่อหน่วย + Fee คงที่ต่อหน่วย + Fee ต่อ Order ÷ จำนวน) ÷ (1 − Fee% − Margin เป้าหมาย%)</strong></p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Margin คิดจากราคาขาย ส่วน Markup คิดจากต้นทุน จึงเป็นคนละเปอร์เซ็นต์ หากมี Margin ร้านคู่ค้า ราคาปลีกแนะนำ = ราคาขายส่ง ÷ (1 − Margin ร้านคู่ค้า)</p>
        </section>
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="wholesale-boundary-title">
          <h3 id="wholesale-boundary-title" className="flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" />ก่อนนำราคาไปใช้จริง</h3>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">ตรวจราคาตลาด คุณค่าที่ลูกค้าได้รับ MOQ เครดิตเทอม คืนสินค้า ของเสีย โปรโมชัน ภาษี และสัญญาคู่ค้าจริง ราคาที่สูตรรองรับต้นทุนได้อาจสูงกว่าราคาที่ตลาดยอมรับ ซึ่งควรแก้ที่ต้นทุน ช่องทาง หรือ Positioning ไม่ใช่ลด Margin แบบไม่เห็นผลกระทบ</p>
        </section>
      </div>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปราคาแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="wholesale-pricing-csv" onClick={() => downloadText(wholesalePricingCsv(input, result), "meaw-wholesale-retail-pricing.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </section>
  );
}

export function WholesalePriceCalculatorTool() {
  const [form, setForm] = useState<WholesalePricingForm>(createInitialForm);
  const [nextChannelId, setNextChannelId] = useState(3);
  const [calculation, setCalculation] = useState<{ input: WholesalePricingInput; result: WholesalePricingResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateTopLevel = <Key extends "currency" | "productName">(key: Key, value: WholesalePricingForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value })); invalidate();
  };
  const updateCost = (key: CostKey, value: string) => {
    setForm((current) => ({ ...current, costs: { ...current.costs, [key]: value } })); invalidate();
  };
  const updateChannel = (id: number, key: keyof Omit<ChannelForm, "id" | "kind">, value: string) => {
    setForm((current) => ({ ...current, channels: current.channels.map((channel) => channel.id === id ? { ...channel, [key]: value } : channel) })); invalidate();
  };
  const applyPreset = (id: number, kind: ChannelKind) => {
    setForm((current) => ({ ...current, channels: current.channels.map((channel) => channel.id === id ? channelFromPreset(id, kind) : channel) })); invalidate();
  };
  const addChannel = () => {
    if (form.channels.length >= WHOLESALE_PRICING_MAX_CHANNELS) return;
    setForm((current) => ({ ...current, channels: [...current.channels, channelFromPreset(nextChannelId, "marketplace")] }));
    setNextChannelId((value) => value + 1); invalidate();
  };
  const removeChannel = (id: number) => {
    if (form.channels.length <= 1) return;
    setForm((current) => ({ ...current, channels: current.channels.filter((channel) => channel.id !== id) })); invalidate();
  };

  const calculate = () => {
    try {
      const input: WholesalePricingInput = {
        currency: form.currency,
        productName: form.productName,
        costs: Object.fromEntries(costFields.map(({ key, label }) => [key, parseNumber(form.costs[key], label)])) as WholesalePricingCosts,
        channels: form.channels.map((channel, index) => ({
          name: channel.name,
          orderQuantity: parseNumber(channel.orderQuantity, `จำนวนต่อ Order ช่องทาง ${index + 1}`, true),
          variableFeePercent: parseNumber(channel.variableFeePercent, `Fee เปอร์เซ็นต์ช่องทาง ${index + 1}`),
          fixedFeePerOrder: parseNumber(channel.fixedFeePerOrder, `Fee ต่อ Order ช่องทาง ${index + 1}`),
          fixedFeePerUnit: parseNumber(channel.fixedFeePerUnit, `Fee ต่อหน่วยช่องทาง ${index + 1}`),
          targetMarginPercent: parseNumber(channel.targetMarginPercent, `Margin เป้าหมายช่องทาง ${index + 1}`),
          downstreamMarginPercent: parseNumber(channel.downstreamMarginPercent, `Margin ร้านคู่ค้าช่องทาง ${index + 1}`),
        })),
      };
      setCalculation({ input, result: calculateWholesalePricing(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "คำนวณราคาไม่สำเร็จ");
    }
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-7 overflow-hidden border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/6 to-amber-300/10 shadow-sm backdrop-blur-xl">
        <Cat className="text-pink-600 dark:text-pink-300" />
        <AlertTitle className="flex flex-wrap items-center gap-2">ตั้งราคาแบบร้านเล็กที่คิดครบ <span aria-hidden="true" className="rounded-full border border-pink-300/40 bg-white/55 px-2 py-0.5 text-xs font-normal text-pink-700 shadow-sm backdrop-blur dark:bg-white/5 dark:text-pink-200">商いねこ · ฅ^•ﻌ•^ฅ</span></AlertTitle>
        <AlertDescription className="leading-6">หา Wholesale price, Retail price และ Selling price ที่เหลือ Margin ตามเป้าแม้แต่ละช่องทางมีค่าธรรมเนียมต่างกัน ข้อมูลคำนวณใน Browser และไม่ถูกส่งไป Server</AlertDescription>
      </Alert>

      <section aria-labelledby="wholesale-cost-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="wholesale-cost-title" className="flex items-center gap-2 font-semibold"><PackageCheck className="size-4 text-primary" />1. รวมต้นทุนสินค้าต่อหน่วย</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">กรอกต่อสินค้าหนึ่งชิ้น/หน่วยด้วยสกุลเงินเดียวกัน ช่องที่ไม่มีเว้นว่างได้</p>
          </div>
          <span className="w-fit rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">原価 · Unit cost</span>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3 md:col-span-2">
            <Label htmlFor="wholesale-product-name">ชื่อสินค้า</Label>
            <Input id="wholesale-product-name" value={form.productName} maxLength={120} placeholder="เช่น กระเป๋าผ้าแมว" onChange={(event) => updateTopLevel("productName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้ในสรุปและ CSV ไม่ต้องใส่ข้อมูลลูกค้า</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="wholesale-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateTopLevel("currency", value as WholesalePricingCurrency)}>
              <SelectTrigger id="wholesale-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(currencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ใช้จัดรูปแบบเท่านั้น ไม่มี FX</p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {costFields.map((field) => <NumberField key={field.key} id={`wholesale-cost-${field.key}`} label={field.label} value={form.costs[field.key]} onChange={(value) => updateCost(field.key, value)} hint={field.hint} />)}
        </div>
      </section>

      <section className="mt-9 border-t pt-8" aria-labelledby="wholesale-channel-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="wholesale-channel-title" className="flex items-center gap-2 font-semibold"><Layers3 className="size-4 text-primary" />2. วาง Scenario ช่องทางขาย</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Fee เปอร์เซ็นต์คิดจากราคาขาย ส่วน Fee ต่อ Order จะถูกหารด้วยจำนวนสินค้าใน Order ก่อนย้อนหารราคา</p>
          </div>
          <Button type="button" variant="outline" onClick={addChannel} disabled={form.channels.length >= WHOLESALE_PRICING_MAX_CHANNELS}><Plus className="size-4" />เพิ่มช่องทาง ({form.channels.length}/{WHOLESALE_PRICING_MAX_CHANNELS})</Button>
        </div>

        <div className="mt-6 space-y-5">
          {form.channels.map((channel, index) => (
            <article key={channel.id} className="rounded-3xl border border-white/60 bg-gradient-to-br from-white/70 via-pink-50/35 to-amber-50/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:from-white/5 dark:via-pink-500/5 dark:to-amber-400/4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid w-full gap-3 sm:max-w-xs">
                  <Label htmlFor={`wholesale-preset-${channel.id}`}>รูปแบบช่องทาง {index + 1}</Label>
                  <Select value={channel.kind} onValueChange={(value) => applyPreset(channel.id, value as ChannelKind)}>
                    <SelectTrigger id={`wholesale-preset-${channel.id}`} className="w-full bg-background/65"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(presetLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="button" size="icon" variant="ghost" disabled={form.channels.length <= 1} onClick={() => removeChannel(channel.id)} aria-label={`ลบช่องทาง ${index + 1}`}><Trash2 className="size-4" /></Button>
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-3 md:col-span-2">
                  <Label htmlFor={`wholesale-channel-name-${channel.id}`}>ชื่อช่องทาง</Label>
                  <Input id={`wholesale-channel-name-${channel.id}`} value={channel.name} maxLength={80} onChange={(event) => updateChannel(channel.id, "name", event.target.value)} />
                  <p className="text-xs leading-5 text-muted-foreground">เช่น ร้านคู่ค้า เว็บไซต์ของเรา หรือ Marketplace A</p>
                </div>
                <NumberField id={`wholesale-order-quantity-${channel.id}`} label="จำนวนสินค้าต่อ Order" value={channel.orderQuantity} onChange={(value) => updateChannel(channel.id, "orderQuantity", value)} hint="จำนวนเต็มอย่างน้อย 1" min={1} step={1} />
                <NumberField id={`wholesale-target-margin-${channel.id}`} label="Margin ผู้ขายเป้าหมาย (%)" value={channel.targetMarginPercent} onChange={(value) => updateChannel(channel.id, "targetMarginPercent", value)} hint="กำไร ÷ ราคาขาย ไม่ใช่ Markup" max={99} />
                <NumberField id={`wholesale-variable-fee-${channel.id}`} label="Fee จากราคาขาย (%)" value={channel.variableFeePercent} onChange={(value) => updateChannel(channel.id, "variableFeePercent", value)} hint="Commission หรือ Payment fee แบบเปอร์เซ็นต์" max={99} />
                <NumberField id={`wholesale-fixed-order-${channel.id}`} label="Fee คงที่ต่อ Order" value={channel.fixedFeePerOrder} onChange={(value) => updateChannel(channel.id, "fixedFeePerOrder", value)} hint="เฉลี่ยลงทุกหน่วยใน Order" />
                <NumberField id={`wholesale-fixed-unit-${channel.id}`} label="Fee คงที่ต่อหน่วย" value={channel.fixedFeePerUnit} onChange={(value) => updateChannel(channel.id, "fixedFeePerUnit", value)} hint="หักเพิ่มกับสินค้าทุกหน่วย" />
                <NumberField id={`wholesale-downstream-${channel.id}`} label="Margin ร้านคู่ค้า (%)" value={channel.downstreamMarginPercent} onChange={(value) => updateChannel(channel.id, "downstreamMarginPercent", value)} hint="ใส่ 0 หากไม่ต้องคำนวณราคาปลีกแนะนำ" max={99} />
              </div>
            </article>
          ))}
        </div>

        {error ? <Alert variant="destructive" className="mt-5"><TriangleAlert /><AlertTitle>ยังคำนวณไม่ได้</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <ActionBar>
          <Button type="button" onClick={calculate}><BadgeDollarSign className="size-4" />คำนวณราคาทุกช่องทาง</Button>
          <ExampleButton onExample={() => { setForm(createExampleForm()); setNextChannelId(4); invalidate(); }} />
          <ClearButton onClear={() => { setForm(createInitialForm()); setNextChannelId(3); invalidate(); }} />
        </ActionBar>
      </section>

      {calculation ? <PricingResults input={calculation.input} result={calculation.result} /> : (
        <div className="mt-8 grid min-h-56 place-items-center rounded-3xl border border-dashed bg-gradient-to-br from-pink-500/5 via-transparent to-amber-400/7 p-6 text-center text-sm leading-6 text-muted-foreground">
          <div><Store className="mx-auto size-9 text-pink-400" /><p className="mt-3 font-medium text-foreground">รวมต้นทุน เลือกช่องทาง แล้วกดคำนวณ</p><p className="mt-1">ระบบจะย้อนหารราคาขายที่ยังเหลือ Margin หลังค่าธรรมเนียม</p></div>
        </div>
      )}

      <Alert className="mt-8 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-600 dark:text-amber-300" />
        <AlertTitle>เครื่องมือช่วยวาง Scenario ไม่ใช่ราคาบังคับใช้</AlertTitle>
        <AlertDescription className="space-y-2 leading-6">
          <p>ผลไม่รวม VAT ภาษีหัก ณ ที่จ่าย FX เงินเฟ้อ คืนสินค้า ของเสีย เครดิตเทอม และค่าโฆษณา เว้นแต่รวมไว้ในต้นทุน/Fee แล้ว ตรวจ Rate และสัญญาจริงทุกครั้ง</p>
          <p>หลัก Margin อ้างอิง <a href="https://help.shopify.com/en/manual/products/details/product-details-page" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">Shopify Help Center</a> แนวคิด Cost-plus และการตรวจตลาดจาก <a href="https://help.shopify.com/en/manual/products/details/product-pricing/determine-pricing" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">Shopify: Pricing your products</a> และโครงสร้าง Fee แบบเปอร์เซ็นต์ร่วมกับยอดคงที่จาก <a href="https://docs.stripe.com/connect/platform-pricing-tools/pricing-schemes" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">Stripe Docs</a></p>
        </AlertDescription>
      </Alert>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/profit-margin-calculator" className="text-primary underline-offset-4 hover:underline">ตรวจ Margin จากราคาที่มีอยู่ →</Link>
        <Link href="/cost-of-goods-sold-calculator" className="text-primary underline-offset-4 hover:underline">คำนวณ COGS ของรอบบัญชี →</Link>
        <Link href="/vat-calculator" className="text-primary underline-offset-4 hover:underline">แยกหรือรวม VAT →</Link>
        <Link href="/quotation-generator" className="text-primary underline-offset-4 hover:underline">สร้างใบเสนอราคา →</Link>
      </div>
    </WorkspaceFrame>
  );
}
