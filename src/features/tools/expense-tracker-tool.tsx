"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  Upload,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_TRACKER_MAX_IMPORT_LENGTH,
  EXPENSE_TRACKER_MAX_TRANSACTIONS,
  EXPENSE_TRACKER_STORAGE_KEY,
  INCOME_CATEGORIES,
  amountToMinor,
  buildExpenseMonthTrend,
  buildExpenseTrackerCsv,
  calculateExpenseMonthSummary,
  createEmptyExpenseTrackerState,
  expenseCategoryBreakdown,
  expenseTrackerToday,
  normalizeExpenseTransaction,
  parseExpenseTrackerState,
  serializeExpenseTrackerState,
  shiftExpenseMonth,
  transactionsForMonth,
  type ExpenseCategory,
  type ExpenseTrackerCurrency,
  type ExpenseTrackerState,
  type ExpenseTransaction,
  type ExpenseTransactionType,
} from "@/lib/tools/expense-tracker";

type TransactionDraft = {
  date: string;
  type: ExpenseTransactionType;
  amount: string;
  category: ExpenseCategory;
  description: string;
  note: string;
};

type TypeFilter = "all" | ExpenseTransactionType;

const CURRENCY_LABELS: Record<ExpenseTrackerCurrency, string> = {
  THB: "บาท (THB)",
  USD: "ดอลลาร์ (USD)",
  EUR: "ยูโร (EUR)",
  JPY: "เยน (JPY)",
  GBP: "ปอนด์ (GBP)",
};

function emptyDraft(today: string): TransactionDraft {
  return { date: today, type: "expense", amount: "", category: "food", description: "", note: "" };
}

function money(amountMinor: number, currency: ExpenseTrackerCurrency): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amountMinor / 100);
}

function monthLabel(month: string): string {
  const parts = month.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const monthNumber = parts[1] ?? 1;
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function shortMonthLabel(month: string): string {
  const parts = month.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const monthNumber = parts[1] ?? 1;
  return new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function dateLabel(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function ExpenseTrackerTool() {
  const today = useMemo(() => expenseTrackerToday(), []);
  const [state, setState] = useState<ExpenseTrackerState>(() => {
    try { return parseExpenseTrackerState(window.localStorage.getItem(EXPENSE_TRACKER_STORAGE_KEY), today); }
    catch { return createEmptyExpenseTrackerState(); }
  });
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [draft, setDraft] = useState<TransactionDraft>(() => emptyDraft(today));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  const monthTransactions = useMemo(() => transactionsForMonth(state.transactions, selectedMonth), [selectedMonth, state.transactions]);
  const summary = useMemo(() => calculateExpenseMonthSummary(monthTransactions), [monthTransactions]);
  const categoryTotals = useMemo(() => expenseCategoryBreakdown(monthTransactions), [monthTransactions]);
  const trend = useMemo(() => buildExpenseMonthTrend(state.transactions, selectedMonth, 6), [selectedMonth, state.transactions]);
  const trendMax = Math.max(1, ...trend.flatMap((item) => [item.incomeMinor, item.expenseMinor]));
  const filteredTransactions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("th-TH");
    return monthTransactions.filter((transaction) => {
      if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
      if (!normalizedQuery) return true;
      return `${transaction.description} ${transaction.note} ${EXPENSE_CATEGORY_LABELS[transaction.category]}`.toLocaleLowerCase("th-TH").includes(normalizedQuery);
    });
  }, [deferredQuery, monthTransactions, typeFilter]);
  const visibleTransactions = filteredTransactions.slice(0, visibleLimit);

  function persist(next: ExpenseTrackerState) {
    const normalized = parseExpenseTrackerState(serializeExpenseTrackerState(next), today);
    setState(normalized);
    try {
      window.localStorage.setItem(EXPENSE_TRACKER_STORAGE_KEY, JSON.stringify(normalized));
      setError("");
    } catch {
      setError("Browser บันทึกข้อมูลไม่ได้ พื้นที่อาจเต็มหรือโหมดนี้ปิดการเก็บข้อมูล กรุณาส่งออก CSV หรือ JSON ก่อนปิดหน้า");
    }
  }

  function setTransactionType(type: ExpenseTransactionType) {
    setDraft((current) => ({
      ...current,
      type,
      category: type === "expense"
        ? (EXPENSE_CATEGORIES.includes(current.category) ? current.category : "food")
        : (INCOME_CATEGORIES.includes(current.category) ? current.category : "salary"),
    }));
  }

  function resetDraft() {
    setDraft(emptyDraft(today));
    setEditingId(null);
    setError("");
  }

  function saveTransaction() {
    const current = editingId ? state.transactions.find((transaction) => transaction.id === editingId) : undefined;
    if (!current && state.transactions.length >= EXPENSE_TRACKER_MAX_TRANSACTIONS) {
      setError(`เพิ่มได้สูงสุด ${EXPENSE_TRACKER_MAX_TRANSACTIONS.toLocaleString("th-TH")} รายการ กรุณาส่งออกข้อมูลและลบรายการเก่าก่อน`);
      return;
    }
    let amountMinor: number;
    try {
      amountMinor = amountToMinor(Number(draft.amount));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "จำนวนเงินไม่ถูกต้อง");
      return;
    }
    const now = Date.now();
    const transaction = normalizeExpenseTransaction({
      id: current?.id ?? crypto.randomUUID(),
      date: draft.date,
      type: draft.type,
      amountMinor,
      category: draft.category,
      description: draft.description,
      note: draft.note,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }, state.transactions.length, today, now);
    if (!transaction) {
      setError("กรุณากรอกวันที่ จำนวนเงิน รายการ และหมวดให้ครบถ้วน");
      return;
    }
    persist({
      ...state,
      transactions: current
        ? state.transactions.map((item) => item.id === current.id ? transaction : item)
        : [transaction, ...state.transactions],
    });
    setSelectedMonth(transaction.date.slice(0, 7));
    resetDraft();
    toast.success(current ? "แก้ไขรายการแล้ว" : "บันทึกรายการแล้ว");
  }

  function editTransaction(transaction: ExpenseTransaction) {
    setEditingId(transaction.id);
    setDraft({
      date: transaction.date,
      type: transaction.type,
      amount: String(transaction.amountMinor / 100),
      category: transaction.category,
      description: transaction.description,
      note: transaction.note,
    });
    setError("");
    document.getElementById("expense-form-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteTransaction(transaction: ExpenseTransaction) {
    if (!window.confirm(`ลบ “${transaction.description}” ${money(transaction.amountMinor, state.currency)} หรือไม่?`)) return;
    persist({ ...state, transactions: state.transactions.filter((item) => item.id !== transaction.id) });
    if (editingId === transaction.id) resetDraft();
    toast.info("ลบรายการแล้ว");
  }

  function addExample() {
    const base = Date.now();
    const exampleCandidates: ExpenseTransaction[] = [
      { id: crypto.randomUUID(), date: `${selectedMonth}-01`, type: "income", amountMinor: 45_000_00, category: "salary", description: "เงินเดือน", note: "ตัวอย่าง", createdAt: base, updatedAt: base },
      { id: crypto.randomUUID(), date: `${selectedMonth}-03`, type: "expense", amountMinor: 9_500_00, category: "housing", description: "ค่าเช่าห้อง", note: "ตัวอย่าง", createdAt: base + 1, updatedAt: base + 1 },
      { id: crypto.randomUUID(), date: `${selectedMonth}-05`, type: "expense", amountMinor: 1_250_00, category: "food", description: "ซื้อของเข้าบ้าน", note: "ตัวอย่าง", createdAt: base + 2, updatedAt: base + 2 },
      { id: crypto.randomUUID(), date: `${selectedMonth}-08`, type: "income", amountMinor: 3_500_00, category: "freelance", description: "งานออกแบบ", note: "ตัวอย่าง", createdAt: base + 3, updatedAt: base + 3 },
      { id: crypto.randomUUID(), date: `${selectedMonth}-10`, type: "expense", amountMinor: 680_00, category: "transport", description: "ค่าเดินทาง", note: "ตัวอย่าง", createdAt: base + 4, updatedAt: base + 4 },
    ];
    const examples = exampleCandidates.filter((transaction) => transaction.date <= today);
    if (!examples.length) {
      setError("เดือนไม่ควรอยู่ในอนาคตเมื่อต้องการเพิ่มตัวอย่าง");
      return;
    }
    persist({ ...state, transactions: [...examples, ...state.transactions].slice(0, EXPENSE_TRACKER_MAX_TRANSACTIONS) });
    toast.success("เพิ่มข้อมูลตัวอย่างแล้ว");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    if (file.size > EXPENSE_TRACKER_MAX_IMPORT_LENGTH) {
      setError("ไฟล์สำรองต้องมีขนาดไม่เกิน 2 MB");
      return;
    }
    try {
      const raw = await file.text();
      const candidate = JSON.parse(raw) as unknown;
      if (!candidate || typeof candidate !== "object" || !("transactions" in candidate)) throw new Error("invalid");
      const imported = parseExpenseTrackerState(raw, today);
      if (!window.confirm(`นำเข้า ${imported.transactions.length.toLocaleString("th-TH")} รายการและแทนที่ข้อมูลปัจจุบันหรือไม่?`)) return;
      persist(imported);
      setSelectedMonth(imported.transactions[0]?.date.slice(0, 7) ?? today.slice(0, 7));
      resetDraft();
      toast.success(`นำเข้า ${imported.transactions.length.toLocaleString("th-TH")} รายการแล้ว`);
    } catch {
      setError("ไฟล์ JSON ไม่ใช่ข้อมูลสำรองของ Expense Tracker หรือรูปแบบไม่ถูกต้อง");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  function clearAll() {
    if (!state.transactions.length || !window.confirm("ลบรายการรายรับรายจ่ายทั้งหมดในอุปกรณ์นี้หรือไม่? ควรส่งออก JSON ก่อน เพราะการลบย้อนกลับไม่ได้")) return;
    persist({ ...createEmptyExpenseTrackerState(), currency: state.currency });
    resetDraft();
    toast.info("ล้างรายการทั้งหมดแล้ว");
  }

  const categories = draft.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <WorkspaceFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-teal-500/20 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,#14b8a6_15%,transparent),transparent_44%),linear-gradient(135deg,color-mix(in_oklch,var(--background)_94%,#ccfbf1),var(--background))] p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="gap-1.5"><WalletCards className="size-3.5" />รู้ว่าเงินจริงไปไหน ไม่ต้องเชื่อมบัญชี</Badge>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">Expense Tracker สำหรับบันทึกรายรับรายจ่ายจริง</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">เพิ่มรายการรายวัน ดูยอดตามเดือน หมวดค่าใช้จ่าย และแนวโน้ม 6 เดือน ข้อมูลอยู่ใน Browser เครื่องนี้ พร้อมส่งออก CSV หรือสำรอง JSON ได้</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Label htmlFor="expense-currency" className="text-xs">สกุลเงินของสมุดนี้</Label>
              <Select value={state.currency} onValueChange={(value) => persist({ ...state, currency: value as ExpenseTrackerCurrency })}>
                <SelectTrigger id="expense-currency" className="w-44" data-testid="expense-currency"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CURRENCY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {error ? <Alert variant="destructive" data-testid="expense-error"><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <section className="rounded-2xl border bg-background/60 p-4 sm:p-5" aria-label="เลือกเดือนและสรุปยอด">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-medium text-muted-foreground">กำลังดูข้อมูล</p><h3 className="mt-1 text-xl font-bold" data-testid="expense-month-label">{monthLabel(selectedMonth)}</h3></div>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon-sm" variant="outline" onClick={() => setSelectedMonth((month) => shiftExpenseMonth(month, -1))} aria-label="เดือนก่อน"><ChevronLeft /></Button>
              <Button type="button" variant="outline" onClick={() => setSelectedMonth(today.slice(0, 7))}>เดือนนี้</Button>
              <Button type="button" size="icon-sm" variant="outline" disabled={selectedMonth >= today.slice(0, 7)} onClick={() => setSelectedMonth((month) => shiftExpenseMonth(month, 1))} aria-label="เดือนถัดไป"><ChevronRight /></Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="expense-summary">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.055] p-4"><p className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"><ArrowDownLeft className="size-4" />รายรับ</p><p className="mt-2 break-words text-xl font-black tabular-nums" data-testid="expense-income-total">{money(summary.incomeMinor, state.currency)}</p></div>
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.055] p-4"><p className="flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-300"><ArrowUpRight className="size-4" />รายจ่าย</p><p className="mt-2 break-words text-xl font-black tabular-nums" data-testid="expense-expense-total">{money(summary.expenseMinor, state.currency)}</p></div>
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.055] p-4"><p className="flex items-center gap-2 text-xs font-medium text-sky-700 dark:text-sky-300"><Landmark className="size-4" />คงเหลือสุทธิ</p><p className={`mt-2 break-words text-xl font-black tabular-nums ${summary.balanceMinor < 0 ? "text-destructive" : ""}`} data-testid="expense-balance-total">{money(summary.balanceMinor, state.currency)}</p></div>
            <div className="rounded-2xl border bg-muted/15 p-4"><p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><TrendingDown className="size-4" />สัดส่วนคงเหลือ</p><p className="mt-2 text-xl font-black tabular-nums">{summary.savingsRate === null ? "—" : `${summary.savingsRate.toLocaleString("th-TH", { maximumFractionDigits: 2 })}%`}</p><p className="mt-1 text-[11px] text-muted-foreground">จากรายรับ • {summary.transactionCount.toLocaleString("th-TH")} รายการ</p></div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]">
          <aside className="space-y-5">
            <section className="rounded-2xl border bg-background/60 p-4 sm:p-5" aria-labelledby="expense-form-title">
              <div className="flex items-center justify-between gap-3"><div><h3 id="expense-form-title" className="font-semibold">{editingId ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}</h3><p className="mt-1 text-xs text-muted-foreground">กรอกยอดเงินจริงที่รับหรือจ่าย</p></div>{editingId ? <Badge variant="outline">กำลังแก้ไข</Badge> : <Plus className="size-5 text-primary" />}</div>
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border bg-muted/15 p-1" role="group" aria-label="ประเภทรายการ">
                <Button type="button" variant={draft.type === "expense" ? "default" : "ghost"} onClick={() => setTransactionType("expense")} data-testid="expense-type-expense"><ArrowUpRight />รายจ่าย</Button>
                <Button type="button" variant={draft.type === "income" ? "default" : "ghost"} onClick={() => setTransactionType("income")} data-testid="expense-type-income"><ArrowDownLeft />รายรับ</Button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="expense-date">วันที่</Label><Input id="expense-date" type="date" max={today} value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} data-testid="expense-date" /></div>
                <div className="space-y-2"><Label htmlFor="expense-amount">จำนวนเงิน</Label><Input id="expense-amount" type="number" min="0.01" max="10000000000" step="0.01" inputMode="decimal" placeholder="0.00" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} data-testid="expense-amount" /></div>
              </div>
              <div className="mt-4 space-y-2"><Label htmlFor="expense-category">หมวด</Label><Select value={draft.category} onValueChange={(value) => setDraft((current) => ({ ...current, category: value as ExpenseCategory }))}><SelectTrigger id="expense-category" data-testid="expense-category"><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{EXPENSE_CATEGORY_LABELS[category]}</SelectItem>)}</SelectContent></Select></div>
              <div className="mt-4 space-y-2"><Label htmlFor="expense-description">รายการ</Label><Input id="expense-description" maxLength={80} placeholder={draft.type === "expense" ? "เช่น อาหารกลางวัน" : "เช่น เงินเดือน"} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} data-testid="expense-description" /></div>
              <div className="mt-4 space-y-2"><Label htmlFor="expense-note">หมายเหตุ <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span></Label><Textarea id="expense-note" maxLength={160} rows={2} placeholder="รายละเอียดสั้น ๆ" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} data-testid="expense-note" /></div>
              <div className="mt-5 flex flex-wrap gap-2"><Button type="button" onClick={saveTransaction} data-testid="expense-save"><Plus />{editingId ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}</Button>{editingId ? <Button type="button" variant="outline" onClick={resetDraft}>ยกเลิก</Button> : <Button type="button" variant="outline" onClick={addExample}>เพิ่มตัวอย่าง</Button>}</div>
            </section>

            <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-600" /><div><h3 className="font-semibold">สำรองก่อนย้ายเครื่องหรือล้าง Browser</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">CSV เหมาะกับ Excel/Sheets ส่วน JSON ใช้นำกลับเข้า Expense Tracker และจะแทนที่ข้อมูลเดิมหลังยืนยัน</p></div></div>
              <div className="mt-4"><ActionBar>
                <Button type="button" variant="outline" disabled={!monthTransactions.length} data-testid="expense-export-csv" onClick={() => downloadText(buildExpenseTrackerCsv(state, selectedMonth), `meaw-expenses-${selectedMonth}.csv`, "text/csv;charset=utf-8")}><Download />CSV เดือนนี้</Button>
                <Button type="button" variant="outline" disabled={!state.transactions.length} data-testid="expense-export-json" onClick={() => downloadText(JSON.stringify(state, null, 2), `meaw-expense-tracker-backup-${today}.json`, "application/json;charset=utf-8")}><Download />สำรอง JSON</Button>
                <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" aria-label="นำเข้าไฟล์สำรอง Expense Tracker" onChange={(event) => void importBackup(event.target.files?.[0])} />
                <Button type="button" variant="outline" data-testid="expense-import-json" onClick={() => importRef.current?.click()}><Upload />นำเข้า JSON</Button>
              </ActionBar></div>
            </section>
          </aside>

          <section className="space-y-5 min-w-0">
            <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">ค่าใช้จ่ายตามหมวด</h3><p className="mt-1 text-xs text-muted-foreground">คิดจากรายจ่ายของ {monthLabel(selectedMonth)}</p></div><Badge variant="outline">{categoryTotals.length} หมวด</Badge></div>
              <div className="mt-5 space-y-4" data-testid="expense-category-breakdown">
                {categoryTotals.map((item) => <div key={item.category}><div className="mb-1.5 flex items-end justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{EXPENSE_CATEGORY_LABELS[item.category]} <span className="text-xs font-normal text-muted-foreground">({item.transactionCount})</span></span><span className="shrink-0 font-semibold tabular-nums">{money(item.amountMinor, state.currency)} <span className="text-xs font-normal text-muted-foreground">{item.sharePercent}%</span></span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-500" style={{ width: `${Math.max(2, item.sharePercent)}%` }} /></div></div>)}
                {!categoryTotals.length ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">ยังไม่มีรายจ่ายในเดือนนี้ เพิ่มรายการเพื่อดูสัดส่วนแต่ละหมวด</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
              <div><h3 className="font-semibold">ภาพรวม 6 เดือน</h3><p className="mt-1 text-xs text-muted-foreground">แท่งเขียวคือรายรับ แท่งชมพูคือรายจ่าย — ไม่ได้แปลงค่าเงินข้ามสกุล</p></div>
              <div className="mt-5 grid h-44 grid-cols-6 gap-2" data-testid="expense-trend">
                {trend.map((item) => <div key={item.month} className="flex min-w-0 flex-col items-center justify-end gap-2"><div className="flex h-28 w-full max-w-12 items-end justify-center gap-1 rounded-t-lg bg-muted/20 px-1" title={`${shortMonthLabel(item.month)} รายรับ ${money(item.incomeMinor, state.currency)} รายจ่าย ${money(item.expenseMinor, state.currency)}`}><div className="w-2.5 rounded-t bg-emerald-500" style={{ height: `${item.incomeMinor ? Math.max(5, (item.incomeMinor / trendMax) * 100) : 0}%` }} /><div className="w-2.5 rounded-t bg-rose-500" style={{ height: `${item.expenseMinor ? Math.max(5, (item.expenseMinor / trendMax) * 100) : 0}%` }} /></div><span className="w-full truncate text-center text-[10px] text-muted-foreground">{shortMonthLabel(item.month)}</span></div>)}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border bg-background/60 p-4 sm:p-5" aria-labelledby="expense-list-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h3 id="expense-list-title" className="font-semibold">รายการใน {monthLabel(selectedMonth)}</h3><p className="mt-1 text-xs text-muted-foreground">แสดง {visibleTransactions.length.toLocaleString("th-TH")} จากผลลัพธ์ {filteredTransactions.length.toLocaleString("th-TH")} รายการ • ทั้งเดือน {monthTransactions.length.toLocaleString("th-TH")} รายการ</p></div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_170px] lg:w-[480px]">
              <div className="space-y-2"><Label htmlFor="expense-search" className="sr-only">ค้นหารายการ</Label><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="expense-search" className="pl-9" placeholder="ค้นหารายการ หมวด หรือหมายเหตุ" value={query} onChange={(event) => setQuery(event.target.value)} data-testid="expense-search" /></div></div>
              <div className="space-y-2"><Label htmlFor="expense-filter" className="sr-only">กรองประเภทรายการ</Label><Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}><SelectTrigger id="expense-filter" data-testid="expense-filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">ทั้งหมด</SelectItem><SelectItem value="expense">เฉพาะรายจ่าย</SelectItem><SelectItem value="income">เฉพาะรายรับ</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <div className="mt-5 space-y-2" data-testid="expense-transaction-list">
            {visibleTransactions.map((transaction) => <article key={transaction.id} className="flex flex-col gap-3 rounded-xl border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4" data-testid={`expense-transaction-${transaction.id}`}>
              <div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${transaction.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{transaction.type === "income" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span><div className="min-w-0"><p className="truncate font-medium">{transaction.description}</p><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span>{dateLabel(transaction.date)}</span><span>•</span><span>{EXPENSE_CATEGORY_LABELS[transaction.category]}</span>{transaction.note ? <><span>•</span><span className="truncate">{transaction.note}</span></> : null}</p></div></div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t pt-3 sm:justify-end sm:border-0 sm:pt-0"><strong className={`tabular-nums ${transaction.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{transaction.type === "income" ? "+" : "−"}{money(transaction.amountMinor, state.currency)}</strong><div className="flex gap-1"><Button type="button" size="icon-sm" variant="ghost" aria-label={`แก้ไข ${transaction.description}`} onClick={() => editTransaction(transaction)}><Pencil /></Button><Button type="button" size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`ลบ ${transaction.description}`} onClick={() => deleteTransaction(transaction)}><Trash2 /></Button></div></div>
            </article>)}
            {!visibleTransactions.length ? <div className="rounded-xl border border-dashed p-10 text-center"><CalendarDays className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">{monthTransactions.length ? "ไม่พบรายการที่ตรงกับการค้นหาและตัวกรอง" : "ยังไม่มีรายการในเดือนนี้"}</p></div> : null}
          </div>
          {visibleTransactions.length < filteredTransactions.length ? <div className="mt-4 flex justify-center"><Button type="button" variant="outline" onClick={() => setVisibleLimit((current) => Math.min(filteredTransactions.length, current + 100))}>แสดงเพิ่มอีก {Math.min(100, filteredTransactions.length - visibleTransactions.length).toLocaleString("th-TH")} รายการ</Button></div> : null}
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-5 text-muted-foreground">สูงสุด {EXPENSE_TRACKER_MAX_TRANSACTIONS.toLocaleString("th-TH")} รายการใน Browser นี้</p><Button type="button" variant="outline" className="text-destructive hover:text-destructive" disabled={!state.transactions.length} onClick={clearAll}><Trash2 />ล้างทั้งหมด</Button></div>
        </section>

        <Alert className="border-teal-500/30 bg-teal-500/5">
          <ShieldCheck className="text-teal-600" />
          <AlertTitle>ข้อมูลอยู่เฉพาะ Browser ของอุปกรณ์นี้</AlertTitle>
          <AlertDescription>เครื่องมือไม่เชื่อมบัญชีธนาคารและไม่ส่งรายการไป Server จึงไม่ซิงก์ข้ามเครื่อง ข้อมูลอาจหายเมื่อล้าง Site data ใช้ Private mode หรือเปลี่ยน Browser ควรสำรอง JSON เป็นระยะ และผลสรุปเป็นบันทึกส่วนตัว ไม่ใช่ระบบบัญชี เอกสารภาษี หรือคำแนะนำทางการเงิน</AlertDescription>
        </Alert>
      </div>
    </WorkspaceFrame>
  );
}
