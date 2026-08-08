"use client";

import { Calculator, Fuel, Gauge, Info, MapPinned, ReceiptText, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateFuelCost,
  type FuelCostResult,
  type FuelEfficiencyUnit,
  type TripDirection,
} from "@/lib/tools/fuel-cost";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const preciseFormatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

function parseRequiredNumber(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function parseOptionalMoney(value: string, label: string): number {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  min = 0,
  max = 100_000_000,
  step = 0.01,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ResultCard({ label, value, emphasized = false, testId }: { label: string; value: string; emphasized?: boolean; testId?: string }) {
  return (
    <div className={emphasized ? "rounded-xl border border-primary/30 bg-primary/5 p-4" : "rounded-xl border bg-muted/15 p-4"}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-primary tabular-nums" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p>
    </div>
  );
}

function CostRow({ label, amount, strong = false }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={strong ? "flex items-center justify-between gap-4 border-t pt-3 font-semibold" : "flex items-center justify-between gap-4 text-sm"}>
      <span className="text-muted-foreground">{label}</span>
      <span className="shrink-0 tabular-nums">{moneyFormatter.format(amount)}</span>
    </div>
  );
}

function buildSummary(result: FuelCostResult, input: { direction: TripDirection; efficiency: string; efficiencyUnit: FuelEfficiencyUnit; fuelPrice: string; passengers: string }) {
  return [
    "สรุปค่าน้ำมันและค่าเดินทาง — Meaw Tools",
    `ระยะทาง: ${numberFormatter.format(result.totalDistanceKm)} กม. (${input.direction === "round-trip" ? "ไป-กลับ" : "เที่ยวเดียว"})`,
    `อัตราสิ้นเปลือง: ${input.efficiency} ${input.efficiencyUnit === "km-per-liter" ? "กม./ลิตร" : "ลิตร/100 กม."}`,
    `ราคาน้ำมัน: ${moneyFormatter.format(Number(input.fuelPrice))}/ลิตร`,
    `น้ำมันที่ใช้: ${preciseFormatter.format(result.litersNeeded)} ลิตร`,
    `ค่าน้ำมัน: ${moneyFormatter.format(result.fuelCost)}`,
    `ค่าใช้จ่ายเพิ่มเติม: ${moneyFormatter.format(result.additionalCosts)}`,
    `ค่าเดินทางรวม: ${moneyFormatter.format(result.totalTripCost)}`,
    `เฉลี่ยต่อกิโลเมตร: ${moneyFormatter.format(result.totalCostPerKm)}`,
    `เฉลี่ยต่อคน (${input.passengers} คน): ${moneyFormatter.format(result.costPerPerson)}`,
    "หมายเหตุ: เป็นประมาณการจากระยะทาง อัตราสิ้นเปลือง และราคาที่กรอก การใช้จริงขึ้นกับเส้นทาง การจราจร น้ำหนักบรรทุก และสภาพรถ",
  ].join("\n");
}

export function FuelCostCalculatorTool() {
  const [tripDirection, setTripDirection] = useState<TripDirection>("round-trip");
  const [distance, setDistance] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [efficiencyUnit, setEfficiencyUnit] = useState<FuelEfficiencyUnit>("km-per-liter");
  const [fuelEfficiency, setFuelEfficiency] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [tolls, setTolls] = useState("");
  const [parking, setParking] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [result, setResult] = useState<FuelCostResult | null>(null);
  const [error, setError] = useState("");

  const clearResult = () => { setResult(null); setError(""); };
  const update = (setter: (value: string) => void) => (value: string) => { setter(value); clearResult(); };

  const calculate = () => {
    try {
      const nextResult = calculateFuelCost({
        distanceKm: parseRequiredNumber(distance, "ระยะทาง"),
        tripDirection,
        fuelEfficiency: parseRequiredNumber(fuelEfficiency, "อัตราสิ้นเปลืองเชื้อเพลิง"),
        efficiencyUnit,
        fuelPricePerLiter: parseRequiredNumber(fuelPrice, "ราคาน้ำมันต่อลิตร"),
        passengers: parseRequiredNumber(passengers, "จำนวนคนหารค่าเดินทาง"),
        tolls: parseOptionalMoney(tolls, "ค่าทางด่วนและค่าผ่านทาง"),
        parking: parseOptionalMoney(parking, "ค่าจอดรถ"),
        otherCosts: parseOptionalMoney(otherCosts, "ค่าใช้จ่ายอื่น"),
      });
      setResult(nextResult);
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณค่าน้ำมันไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setTripDirection("round-trip");
    setDistance("350");
    setPassengers("3");
    setEfficiencyUnit("km-per-liter");
    setFuelEfficiency("14");
    setFuelPrice("36.50");
    setTolls("200");
    setParking("100");
    setOtherCosts("0");
    clearResult();
  };

  const clearAll = () => {
    setTripDirection("round-trip");
    setDistance("");
    setPassengers("1");
    setEfficiencyUnit("km-per-liter");
    setFuelEfficiency("");
    setFuelPrice("");
    setTolls("");
    setParking("");
    setOtherCosts("");
    clearResult();
  };

  const summary = result ? buildSummary(result, { direction: tripDirection, efficiency: fuelEfficiency, efficiencyUnit, fuelPrice, passengers }) : "";
  const efficiencyLabel = efficiencyUnit === "km-per-liter" ? "ความประหยัดน้ำมัน (กม./ลิตร)" : "อัตราสิ้นเปลือง (ลิตร/100 กม.)";

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-600" />
        <AlertTitle>ใช้ราคาน้ำมันและอัตราสิ้นเปลืองของรถคุณ</AlertTitle>
        <AlertDescription className="leading-6">ราคาต่างกันตามชนิดน้ำมัน พื้นที่ ปั๊ม และเวลา เครื่องมือจึงไม่เดาราคาปัจจุบันให้ กรอกตัวเลขล่าสุดที่คุณจะจ่ายเพื่อให้ประมาณการใกล้เคียงที่สุด</AlertDescription>
      </Alert>

      <section aria-labelledby="fuel-trip-title">
        <h2 id="fuel-trip-title" className="mb-5 flex items-center gap-2 font-semibold"><MapPinned className="size-4 text-primary" />ข้อมูลการเดินทาง</h2>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="fuel-trip-direction" className="leading-5">รูปแบบการเดินทาง</Label>
            <Select value={tripDirection} onValueChange={(value) => { setTripDirection(value as TripDirection); clearResult(); }}>
              <SelectTrigger id="fuel-trip-direction" className="w-full" aria-label="รูปแบบการเดินทาง"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one-way">เที่ยวเดียว</SelectItem>
                <SelectItem value="round-trip">ไป-กลับ — คูณระยะทาง 2 เท่า</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">เลือกไป-กลับเมื่อระยะทางที่กรอกเป็นขาเดียว</p>
          </div>
          <NumberField
            id="fuel-distance"
            label={tripDirection === "round-trip" ? "ระยะทางขาเดียว (กม.)" : "ระยะทางทั้งหมด (กม.)"}
            value={distance}
            onChange={update(setDistance)}
            placeholder="350"
            min={0.01}
            max={1_000_000}
            hint={tripDirection === "round-trip" ? "ระบบจะคูณ 2 ให้อัตโนมัติ ไม่ต้องกรอกระยะทางรวม" : "ใช้ระยะทางจริงของเที่ยวนี้"}
          />
          <NumberField id="fuel-passengers" label="จำนวนคนหารค่าเดินทาง (รวมคนขับ)" value={passengers} onChange={update(setPassengers)} placeholder="3" min={1} max={100} step={1} hint="ใส่ 1 หากไม่ต้องหารกับคนอื่น" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="fuel-vehicle-title">
        <h2 id="fuel-vehicle-title" className="mb-5 flex items-center gap-2 font-semibold"><Gauge className="size-4 text-primary" />รถและเชื้อเพลิง</h2>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="fuel-efficiency-unit" className="leading-5">หน่วยอัตราสิ้นเปลือง</Label>
            <Select value={efficiencyUnit} onValueChange={(value) => { setEfficiencyUnit(value as FuelEfficiencyUnit); clearResult(); }}>
              <SelectTrigger id="fuel-efficiency-unit" className="w-full" aria-label="หน่วยอัตราสิ้นเปลือง"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="km-per-liter">กิโลเมตรต่อลิตร (กม./ลิตร)</SelectItem>
                <SelectItem value="liters-per-100km">ลิตรต่อ 100 กิโลเมตร (L/100 km)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">เลือกหน่วยเดียวกับข้อมูลหน้าปัดหรือคู่มือรถ</p>
          </div>
          <NumberField id="fuel-efficiency" label={efficiencyLabel} value={fuelEfficiency} onChange={update(setFuelEfficiency)} placeholder={efficiencyUnit === "km-per-liter" ? "14" : "7.14"} min={0.01} max={1_000} hint={efficiencyUnit === "km-per-liter" ? "ตัวเลขยิ่งสูง รถยิ่งวิ่งได้ไกลต่อน้ำมัน 1 ลิตร" : "ตัวเลขยิ่งต่ำ รถยิ่งใช้น้ำมันน้อยต่อ 100 กม."} />
          <NumberField
            id="fuel-price"
            label="ราคาน้ำมัน (บาท/ลิตร)"
            value={fuelPrice}
            onChange={update(setFuelPrice)}
            placeholder="36.50"
            min={0.01}
            max={10_000}
            hint={<>ตรวจราคาปัจจุบันจากปั๊มที่ใช้ หรือดู <a className="font-medium text-primary hover:underline" href="https://www.eppo.go.th/energy-price/oil-retail-price-today/%E0%B9%82%E0%B8%84%E0%B8%A3%E0%B8%87%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%B1%E0%B8%99%E0%B8%A7%E0%B8%B1%E0%B8%99-2/" target="_blank" rel="noreferrer">ราคาขายปลีกจาก สนพ.</a></>}
          />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="fuel-extra-title">
        <h2 id="fuel-extra-title" className="mb-5 flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />ค่าใช้จ่ายเพิ่มเติมทั้งทริป</h2>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
          <NumberField id="fuel-tolls" label="ค่าทางด่วน / ค่าผ่านทาง (บาท)" value={tolls} onChange={update(setTolls)} placeholder="200" hint="กรอกยอดรวมทั้งเที่ยว รวมขากลับหากมี" />
          <NumberField id="fuel-parking" label="ค่าจอดรถ (บาท)" value={parking} onChange={update(setParking)} placeholder="100" hint="เว้นว่างได้หากไม่มี" />
          <NumberField id="fuel-other-costs" label="ค่าใช้จ่ายรถอื่น ๆ (บาท)" value={otherCosts} onChange={update(setOtherCosts)} placeholder="0" hint="เช่น ค่าเรือข้ามฟาก ไม่รวมอาหารหรือที่พัก" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600" onClick={calculate}><Calculator className="size-4" />คำนวณค่าน้ำมัน</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clearAll} />
          {result ? <CopyButton value={summary} label="คัดลอกสรุป" /> : null}
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5">
        {!result ? <EmptyOutput size="compact" text="กรอกระยะทาง อัตราสิ้นเปลือง และราคาน้ำมัน แล้วกดคำนวณเพื่อดูค่าใช้จ่ายทั้งหมด" /> : (
          <div className="space-y-5" aria-live="polite">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResultCard label="ค่าเดินทางรวม" value={moneyFormatter.format(result.totalTripCost)} testId="fuel-total-cost" emphasized />
              <ResultCard label="ค่าน้ำมัน" value={moneyFormatter.format(result.fuelCost)} testId="fuel-only-cost" />
              <ResultCard label="น้ำมันที่ใช้" value={`${preciseFormatter.format(result.litersNeeded)} ลิตร`} testId="fuel-liters" />
              <ResultCard label={`เฉลี่ยต่อคน (${passengers} คน)`} value={moneyFormatter.format(result.costPerPerson)} testId="fuel-per-person" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3 rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="fuel-cost-breakdown-title">
                <h2 id="fuel-cost-breakdown-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />รายละเอียดค่าใช้จ่าย</h2>
                <CostRow label="ค่าน้ำมัน" amount={result.fuelCost} />
                <CostRow label="ค่าทางด่วนและค่าผ่านทาง" amount={parseOptionalMoney(tolls, "ค่าทางด่วน")} />
                <CostRow label="ค่าจอดรถ" amount={parseOptionalMoney(parking, "ค่าจอดรถ")} />
                <CostRow label="ค่าใช้จ่ายรถอื่น ๆ" amount={parseOptionalMoney(otherCosts, "ค่าใช้จ่ายอื่น")} />
                <CostRow label="ค่าเดินทางรวม" amount={result.totalTripCost} strong />
              </section>

              <section className="space-y-3 rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="fuel-trip-summary-title">
                <h2 id="fuel-trip-summary-title" className="flex items-center gap-2 font-semibold"><Users className="size-4 text-primary" />ระยะทางและค่าเฉลี่ย</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ResultCard label="ระยะทางรวม" value={`${numberFormatter.format(result.totalDistanceKm)} กม.`} />
                  <ResultCard label="ค่าเดินทางต่อกิโลเมตร" value={moneyFormatter.format(result.totalCostPerKm)} />
                  <ResultCard label="เฉพาะค่าน้ำมันต่อกิโลเมตร" value={moneyFormatter.format(result.fuelCostPerKm)} />
                  <ResultCard label="อัตราเทียบกลับ" value={efficiencyUnit === "km-per-liter" ? `${preciseFormatter.format(result.effectiveLitersPer100Km)} ลิตร/100 กม.` : `${preciseFormatter.format(result.effectiveKmPerLiter)} กม./ลิตร`} />
                </div>
              </section>
            </div>

            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-sm font-medium"><Fuel className="size-4 text-primary" />สูตรที่ใช้</p>
              <p className="mt-2 font-semibold tabular-nums">{efficiencyUnit === "km-per-liter"
                ? `${numberFormatter.format(result.totalDistanceKm)} กม. ÷ ${fuelEfficiency} กม./ลิตร = ${preciseFormatter.format(result.litersNeeded)} ลิตร`
                : `${numberFormatter.format(result.totalDistanceKm)} กม. × ${fuelEfficiency} ÷ 100 = ${preciseFormatter.format(result.litersNeeded)} ลิตร`}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">น้ำมันที่ใช้ × ราคาต่อลิตร + ค่าใช้จ่ายเพิ่มเติม = ค่าเดินทางรวม ระบบไม่ปัดเศษระหว่างคำนวณและแสดงผลเป็นทศนิยมสองตำแหน่ง</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ผลลัพธ์เป็นประมาณการ การใช้จริงเปลี่ยนตามการจราจร ความเร็ว น้ำหนักบรรทุก ลม ยาง แอร์ สภาพเครื่องยนต์ และเส้นทาง ควรเผื่อเชื้อเพลิงสำหรับการอ้อมหรือเหตุฉุกเฉิน</span></p>
        <p className="mt-2">ข้อมูลทั้งหมดคำนวณใน Browser และ Meaw Tools ไม่ได้รับหรือบันทึกเส้นทาง ราคา หรือค่าใช้จ่ายที่กรอก</p>
      </div>

      <p className="mt-5 text-sm leading-6 text-muted-foreground">ต้องการแปลงไมล์ แกลลอน หรือหน่วยอื่น ใช้ <Link className="font-medium text-primary hover:underline" href="/unit-converter">เครื่องมือแปลงหน่วย</Link> และใช้ <Link className="font-medium text-primary hover:underline" href="/percentage-calculator">เครื่องมือคำนวณเปอร์เซ็นต์</Link> สำหรับแบ่งสัดส่วนค่าใช้จ่ายเพิ่มเติม</p>
    </WorkspaceFrame>
  );
}
