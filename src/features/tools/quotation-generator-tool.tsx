"use client";

import { Building2, Download, FileText, ListPlus, Plus, ReceiptText, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  QUOTATION_ITEM_LIMIT,
  calculateQuotation,
  formatThaiBahtText,
  formatThaiDocumentDate,
  quotationFilename,
  type QuotationCalculation,
  type QuotationDocument,
  type QuotationItem,
  type QuotationParty,
  type QuotationVatMode,
} from "@/lib/tools/quotation";

type LineDraft = { id: string; description: string; quantity: string; unitPrice: string };
type PdfOutput = { blob: Blob; filename: string; bytes: number };

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const emptyParty = (): QuotationParty => ({ name: "", taxId: "", address: "", contact: "" });

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateValue(date);
}

function newLineDraft(): LineDraft {
  return { id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" };
}

function parseRequiredNumber(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function parseOptionalNumber(value: string, label: string): number {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Building2; children: React.ReactNode }) {
  return <h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><Icon className="size-4 text-primary" />{children}</h2>;
}

function TextField({ id, label, value, onChange, placeholder, required = false, type = "text" }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "date" | "number" | "email";
}) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="leading-5">{label}{required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}</Label>
      <Input id={id} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} inputMode={type === "number" ? "decimal" : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}

function PartyFields({ prefix, party, onChange }: { prefix: "seller" | "customer"; party: QuotationParty; onChange: (party: QuotationParty) => void }) {
  const seller = prefix === "seller";
  return (
    <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
      <TextField id={`${prefix}-name`} label={seller ? "ชื่อร้าน / บริษัท" : "ชื่อลูกค้า / บริษัท"} value={party.name} onChange={(name) => onChange({ ...party, name })} placeholder={seller ? "บริษัท มีอาว์ ดิจิทัล จำกัด" : "ร้านกาแฟฮานะ"} required />
      <TextField id={`${prefix}-tax-id`} label="เลขประจำตัวผู้เสียภาษี (ถ้ามี)" value={party.taxId} onChange={(taxId) => onChange({ ...party, taxId })} placeholder="เลข 13 หลักหรือเลขสาขา" />
      <div className="space-y-2.5 md:col-span-2">
        <Label htmlFor={`${prefix}-address`}>ที่อยู่</Label>
        <Textarea id={`${prefix}-address`} value={party.address} onChange={(event) => onChange({ ...party, address: event.target.value })} placeholder="ที่อยู่สำหรับแสดงบนใบเสนอราคา" rows={2} />
      </div>
      <div className="space-y-2.5 md:col-span-2">
        <Label htmlFor={`${prefix}-contact`}>ข้อมูลติดต่อ</Label>
        <Input id={`${prefix}-contact`} value={party.contact} onChange={(event) => onChange({ ...party, contact: event.target.value })} placeholder="โทรศัพท์ อีเมล หรือ LINE" />
      </div>
    </div>
  );
}

function QuotationPreview({ data, calculation }: { data: QuotationDocument; calculation: QuotationCalculation }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-muted/20 p-3 sm:p-5" data-testid="quotation-preview">
      <article className="mx-auto min-w-[680px] max-w-[820px] bg-white p-8 text-slate-900 shadow-sm" aria-label="ตัวอย่างใบเสนอราคา">
        <header className="flex items-start justify-between gap-8 border-b-2 border-emerald-700 pb-5">
          <div className="max-w-[430px]">
            <h3 className="text-xl font-bold text-emerald-800">{data.seller.name || "ชื่อร้าน / บริษัท"}</h3>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{data.seller.address || "ที่อยู่ผู้เสนอราคา"}</p>
            {data.seller.taxId ? <p className="text-xs text-slate-600">เลขประจำตัวผู้เสียภาษี {data.seller.taxId}</p> : null}
            {data.seller.contact ? <p className="text-xs text-slate-600">{data.seller.contact}</p> : null}
          </div>
          <div className="text-right"><p className="text-2xl font-bold text-emerald-800">ใบเสนอราคา</p><p className="text-xs tracking-[0.18em] text-slate-500">QUOTATION</p></div>
        </header>

        <div className="grid grid-cols-[1fr_240px] gap-8 py-6 text-sm">
          <section><p className="text-xs font-semibold text-emerald-700">เสนอราคาให้</p><p className="mt-2 font-semibold">{data.customer.name || "ชื่อลูกค้า"}</p><p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600">{data.customer.address}</p>{data.customer.taxId ? <p className="text-xs text-slate-600">เลขประจำตัวผู้เสียภาษี {data.customer.taxId}</p> : null}{data.customer.contact ? <p className="text-xs text-slate-600">{data.customer.contact}</p> : null}</section>
          <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-xs"><dt className="text-slate-500">เลขที่</dt><dd className="font-medium">{data.number || "-"}</dd><dt className="text-slate-500">วันที่ออก</dt><dd>{formatThaiDocumentDate(data.issueDate)}</dd><dt className="text-slate-500">ยืนราคาถึง</dt><dd>{data.validUntil ? formatThaiDocumentDate(data.validUntil) : "ไม่ระบุ"}</dd></dl>
        </div>

        <table className="w-full table-fixed border-collapse text-xs">
          <thead><tr className="bg-emerald-800 text-white"><th className="w-10 px-2 py-2 text-center">#</th><th className="px-3 py-2 text-left">รายละเอียด</th><th className="w-20 px-2 py-2 text-right">จำนวน</th><th className="w-28 px-2 py-2 text-right">ราคา/หน่วย</th><th className="w-28 px-2 py-2 text-right">รวม</th></tr></thead>
          <tbody>{data.items.map((item, index) => <tr key={item.id} className="border-b border-slate-200 odd:bg-slate-50"><td className="px-2 py-3 text-center text-slate-500">{index + 1}</td><td className="break-words px-3 py-3">{item.description}</td><td className="px-2 py-3 text-right tabular-nums">{item.quantity.toLocaleString("th-TH")}</td><td className="px-2 py-3 text-right tabular-nums">{moneyFormatter.format(item.unitPrice)}</td><td className="px-2 py-3 text-right font-medium tabular-nums">{moneyFormatter.format(calculation.itemTotals[index]!)}</td></tr>)}</tbody>
        </table>

        <div className="mt-5 grid grid-cols-[1fr_260px] gap-8">
          <div className="space-y-4 text-xs"><div><p className="font-semibold text-emerald-700">เงื่อนไขการชำระเงิน</p><p className="mt-1 whitespace-pre-line leading-5 text-slate-600">{data.paymentTerms || "ไม่ระบุ"}</p></div><div><p className="font-semibold text-emerald-700">หมายเหตุ</p><p className="mt-1 whitespace-pre-line leading-5 text-slate-600">{data.notes || "-"}</p></div></div>
          <dl className="space-y-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-slate-500">รวมสินค้า</dt><dd className="tabular-nums">{moneyFormatter.format(calculation.subtotal)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">ส่วนลด</dt><dd className="tabular-nums">-{moneyFormatter.format(calculation.discount)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">VAT {data.vatMode === "none" ? "" : `${data.vatRate}%${data.vatMode === "included" ? " (รวมแล้ว)" : ""}`}</dt><dd className="tabular-nums">{moneyFormatter.format(calculation.vat)}</dd></div><div className="mt-3 flex items-center justify-between gap-4 bg-emerald-50 px-3 py-3 font-bold text-emerald-800"><dt>ยอดสุทธิ</dt><dd className="text-base tabular-nums" data-testid="quotation-total">{moneyFormatter.format(calculation.total)}</dd></div></dl>
        </div>
        <p className="mt-5 text-xs font-semibold">({formatThaiBahtText(calculation.total)})</p>
        <div className="mt-14 grid grid-cols-2 gap-20 text-center text-xs text-slate-500"><div className="border-t pt-2">ผู้เสนอราคา</div><div className="border-t pt-2">ผู้อนุมัติ</div></div>
      </article>
    </div>
  );
}

export function QuotationGeneratorTool() {
  const initialDate = localDateValue(new Date());
  const [seller, setSeller] = useState<QuotationParty>(emptyParty);
  const [customer, setCustomer] = useState<QuotationParty>(emptyParty);
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(initialDate);
  const [validUntil, setValidUntil] = useState(dateAfter(15));
  const [items, setItems] = useState<LineDraft[]>(() => [newLineDraft()]);
  const [discount, setDiscount] = useState("0");
  const [vatMode, setVatMode] = useState<QuotationVatMode>("none");
  const [vatRate, setVatRate] = useState("7");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<PdfOutput | null>(null);
  const generationRef = useRef(0);

  const invalidate = () => {
    generationRef.current += 1;
    setProcessing(false);
    setOutput(null);
    setError("");
  };
  const updateSeller = (next: QuotationParty) => { setSeller(next); invalidate(); };
  const updateCustomer = (next: QuotationParty) => { setCustomer(next); invalidate(); };

  const parsedItems = useMemo<QuotationItem[] | null>(() => {
    try {
      return items.map((item) => ({ id: item.id, description: item.description, quantity: parseRequiredNumber(item.quantity, "จำนวน"), unitPrice: parseRequiredNumber(item.unitPrice, "ราคาต่อหน่วย") }));
    } catch {
      return null;
    }
  }, [items]);

  const liveCalculation = useMemo(() => {
    if (!parsedItems) return null;
    try { return calculateQuotation(parsedItems, parseOptionalNumber(discount, "ส่วนลด"), vatMode, parseOptionalNumber(vatRate, "อัตรา VAT")); }
    catch { return null; }
  }, [discount, parsedItems, vatMode, vatRate]);

  const documentData = useMemo<QuotationDocument | null>(() => {
    if (!parsedItems) return null;
    try {
      return {
        seller, customer, number, issueDate, validUntil, items: parsedItems,
        discount: parseOptionalNumber(discount, "ส่วนลด"), vatMode, vatRate: parseOptionalNumber(vatRate, "อัตรา VAT"), paymentTerms, notes,
      };
    } catch {
      return null;
    }
  }, [customer, discount, issueDate, notes, number, parsedItems, paymentTerms, seller, validUntil, vatMode, vatRate]);

  const updateItem = (id: string, patch: Partial<LineDraft>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    invalidate();
  };

  const addItem = () => {
    if (items.length >= QUOTATION_ITEM_LIMIT) { setError(`เพิ่มได้สูงสุด ${QUOTATION_ITEM_LIMIT} รายการ`); return; }
    setItems((current) => [...current, newLineDraft()]);
    invalidate();
  };

  const removeItem = (id: string) => {
    setItems((current) => current.length > 1 ? current.filter((item) => item.id !== id) : current);
    invalidate();
  };

  const validateDocument = (): QuotationDocument => {
    if (!seller.name.trim()) throw new Error("กรุณากรอกชื่อร้านหรือบริษัทผู้เสนอราคา");
    if (!customer.name.trim()) throw new Error("กรุณากรอกชื่อลูกค้า");
    if (!number.trim()) throw new Error("กรุณากรอกเลขที่ใบเสนอราคา");
    if (!issueDate) throw new Error("กรุณาเลือกวันที่ออกใบเสนอราคา");
    if (validUntil && validUntil < issueDate) throw new Error("วันที่ยืนราคาต้องไม่ก่อนวันที่ออกใบเสนอราคา");
    if (!documentData) throw new Error("กรุณากรอกจำนวนและราคาต่อหน่วยให้ครบ");
    calculateQuotation(documentData.items, documentData.discount, documentData.vatMode, documentData.vatRate);
    return documentData;
  };

  const generatePdf = async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setProcessing(true); setError(""); setOutput(null);
    try {
      const validDocument = validateDocument();
      const { createQuotationPdf } = await import("@/lib/tools/quotation-pdf");
      const bytes = await createQuotationPdf(validDocument);
      if (generationRef.current !== generation) return;
      const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
      const filename = quotationFilename(validDocument.number);
      setOutput({ blob, filename, bytes: blob.size });
      downloadBlob(blob, filename);
      toast.success("สร้างใบเสนอราคา PDF สำเร็จ");
    } catch (caught) {
      if (generationRef.current === generation) {
        setError(caught instanceof Error ? caught.message : "สร้างใบเสนอราคา PDF ไม่สำเร็จ");
      }
    } finally {
      if (generationRef.current === generation) setProcessing(false);
    }
  };

  const loadExample = () => {
    const today = localDateValue(new Date());
    setSeller({ name: "บริษัท มีอาว์ ดิจิทัล จำกัด", taxId: "0105569123456", address: "99/9 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110", contact: "โทร 02-123-4567 | hello@meaw.example" });
    setCustomer({ name: "ร้านกาแฟฮานะ", taxId: "", address: "88 ถนนนิมมานเหมินท์ ตำบลสุเทพ อำเภอเมือง จังหวัดเชียงใหม่ 50200", contact: "คุณฮานะ | 081-234-5678" });
    setNumber(`QT-${today.replaceAll("-", "")}-001`); setIssueDate(today); setValidUntil(dateAfter(15));
    setItems([
      { id: "example-design", description: "ออกแบบและพัฒนาเว็บไซต์ร้านค้า Responsive", quantity: "1", unitPrice: "25000" },
      { id: "example-photo", description: "ถ่ายภาพสินค้าและปรับแต่งภาพสำหรับเว็บไซต์", quantity: "2", unitPrice: "3500" },
      { id: "example-support", description: "ดูแลระบบและสำรองข้อมูลรายเดือน", quantity: "3", unitPrice: "2500" },
    ]);
    setDiscount("1000"); setVatMode("excluded"); setVatRate("7");
    setPaymentTerms("ชำระมัดจำ 50% ก่อนเริ่มงาน และชำระส่วนที่เหลือเมื่อส่งมอบงาน");
    setNotes("ราคานี้รวมการแก้ไขงาน 2 รอบ และยังไม่รวมค่าโดเมนหรือบริการภายนอก");
    invalidate();
  };

  const clearAll = () => {
    generationRef.current += 1;
    setSeller(emptyParty()); setCustomer(emptyParty()); setNumber(""); setIssueDate(localDateValue(new Date())); setValidUntil(dateAfter(15));
    setItems([newLineDraft()]); setDiscount("0"); setVatMode("none"); setVatRate("7"); setPaymentTerms(""); setNotes(""); setProcessing(false); setError(""); setOutput(null);
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5">
        <ShieldCheck className="text-sky-600" />
        <AlertTitle>ข้อมูลธุรกิจและลูกค้าอยู่ใน Browser ของคุณ</AlertTitle>
        <AlertDescription>Meaw Tools ไม่บันทึกข้อมูลในแบบฟอร์มหรือไฟล์ PDF ลง Server และจะโหลดชุดสร้าง PDF พร้อมฟอนต์ไทยเฉพาะตอนกดดาวน์โหลด</AlertDescription>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="quotation-seller-title"><SectionTitle icon={Building2}><span id="quotation-seller-title">ข้อมูลผู้เสนอราคา</span></SectionTitle><PartyFields prefix="seller" party={seller} onChange={updateSeller} /></section>
        <section className="rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="quotation-customer-title"><SectionTitle icon={UserRound}><span id="quotation-customer-title">ข้อมูลลูกค้า</span></SectionTitle><PartyFields prefix="customer" party={customer} onChange={updateCustomer} /></section>
      </div>

      <section className="mt-6 border-t pt-6" aria-labelledby="quotation-document-title">
        <SectionTitle icon={FileText}><span id="quotation-document-title">ข้อมูลเอกสาร</span></SectionTitle>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-3"><TextField id="quotation-number" label="เลขที่ใบเสนอราคา" value={number} onChange={(value) => { setNumber(value); invalidate(); }} placeholder="QT-20260803-001" required /><TextField id="quotation-issue-date" label="วันที่ออก" value={issueDate} onChange={(value) => { setIssueDate(value); invalidate(); }} type="date" required /><TextField id="quotation-valid-until" label="ยืนราคาถึง" value={validUntil} onChange={(value) => { setValidUntil(value); invalidate(); }} type="date" /></div>
      </section>

      <section className="mt-6 border-t pt-6" aria-labelledby="quotation-items-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><SectionTitle icon={ListPlus}><span id="quotation-items-title">รายการสินค้าและบริการ</span></SectionTitle><span className="text-xs text-muted-foreground">{items.length}/{QUOTATION_ITEM_LIMIT} รายการ</span></div>
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-xl border bg-muted/10 p-3 sm:p-4" data-testid="quotation-line-item">
              <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold">รายการที่ {index + 1}</p><p className="text-sm font-medium tabular-nums text-primary">{parsedItems && liveCalculation ? moneyFormatter.format(liveCalculation.itemTotals[index] ?? 0) : "-"}</p></div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_110px_160px_40px] md:items-end">
                <TextField id={`quotation-item-description-${item.id}`} label="รายละเอียด" value={item.description} onChange={(description) => updateItem(item.id, { description })} placeholder="สินค้า บริการ หรือขอบเขตงาน" required />
                <TextField id={`quotation-item-quantity-${item.id}`} label="จำนวน" value={item.quantity} onChange={(quantity) => updateItem(item.id, { quantity })} type="number" required />
                <TextField id={`quotation-item-price-${item.id}`} label="ราคาต่อหน่วย" value={item.unitPrice} onChange={(unitPrice) => updateItem(item.id, { unitPrice })} type="number" required />
                <Button type="button" variant="destructive" size="icon" disabled={items.length === 1} onClick={() => removeItem(item.id)} aria-label={`ลบรายการที่ ${index + 1}`} title="ลบรายการ"><Trash2 /></Button>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="outline" className="mt-3" onClick={addItem} disabled={items.length >= QUOTATION_ITEM_LIMIT}><Plus />เพิ่มรายการ</Button>
      </section>

      <section className="mt-6 border-t pt-6" aria-labelledby="quotation-summary-title">
        <SectionTitle icon={ReceiptText}><span id="quotation-summary-title">ส่วนลด ภาษี และเงื่อนไข</span></SectionTitle>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
          <TextField id="quotation-discount" label="ส่วนลดรวม (บาท)" value={discount} onChange={(value) => { setDiscount(value); invalidate(); }} type="number" />
          <div className="space-y-2.5"><Label htmlFor="quotation-vat-mode">รูปแบบ VAT</Label><Select value={vatMode} onValueChange={(value) => { setVatMode(value as QuotationVatMode); invalidate(); }}><SelectTrigger id="quotation-vat-mode" className="w-full" aria-label="รูปแบบ VAT"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">ไม่คิด VAT</SelectItem><SelectItem value="excluded">บวก VAT เพิ่มจากราคา</SelectItem><SelectItem value="included">ราคารวม VAT แล้ว</SelectItem></SelectContent></Select></div>
          <TextField id="quotation-vat-rate" label="อัตรา VAT (%)" value={vatRate} onChange={(value) => { setVatRate(value); invalidate(); }} type="number" />
          <div className="space-y-2.5 md:col-span-3"><Label htmlFor="quotation-payment-terms">เงื่อนไขการชำระเงิน</Label><Textarea id="quotation-payment-terms" value={paymentTerms} onChange={(event) => { setPaymentTerms(event.target.value); invalidate(); }} rows={2} placeholder="เช่น ชำระมัดจำ 50% ก่อนเริ่มงาน" /></div>
          <div className="space-y-2.5 md:col-span-3"><Label htmlFor="quotation-notes">หมายเหตุ</Label><Textarea id="quotation-notes" value={notes} onChange={(event) => { setNotes(event.target.value); invalidate(); }} rows={2} placeholder="ขอบเขตงาน ระยะเวลาส่งมอบ หรือเงื่อนไขเพิ่มเติม" /></div>
        </div>
      </section>

      <div className="mt-6 border-t pt-5"><ActionBar><Button type="button" onClick={() => void generatePdf()} disabled={processing}><Download />{processing ? "กำลังสร้าง PDF..." : "สร้างและดาวน์โหลด PDF"}</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clearAll} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6">
        {documentData && liveCalculation ? <QuotationPreview data={documentData} calculation={liveCalculation} /> : <div className="grid min-h-40 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">กรอกจำนวน ราคา และรายละเอียดให้ครบ หรือกดตัวอย่างเพื่อดูใบเสนอราคาสำเร็จรูป</div>}
      </div>

      {output ? <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5" data-testid="quotation-output" aria-live="polite"><p className="font-semibold text-emerald-700 dark:text-emerald-300">สร้างใบเสนอราคา PDF สำเร็จ</p><p className="mt-1 text-sm text-muted-foreground">{output.filename} · {(output.bytes / 1024).toFixed(1)} KB</p><Button type="button" variant="outline" className="mt-4" onClick={() => downloadBlob(output.blob, output.filename)}><Download />ดาวน์โหลดอีกครั้ง</Button></div> : null}

      <Alert className="mt-5 border-amber-500/30 bg-amber-500/5">
        <ReceiptText className="text-amber-600" /><AlertTitle>ใบเสนอราคาไม่ใช่เอกสารรับเงินหรือใบกำกับภาษี</AlertTitle><AlertDescription>ตรวจชื่อ เลขที่เอกสาร ราคา อัตรา VAT และเงื่อนไขกับผู้ทำบัญชีก่อนใช้งานจริง เครื่องมือนี้ไม่สร้างใบเสร็จ ใบกำกับภาษี หรือลายเซ็นดิจิทัล และอักขระ Emoji บางชนิดอาจไม่แสดงใน PDF</AlertDescription>
      </Alert>
    </WorkspaceFrame>
  );
}
