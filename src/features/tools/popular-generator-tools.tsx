"use client";

import { Copy, Dices, Download, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { assessPasswordStrength, generatePasswords, generateRandomIntegers, getPasswordPool, type PasswordOptions, type RandomNumberOptions } from "@/lib/tools/generators";

function OptionSwitch({ id, label, description, checked, onCheckedChange }: { id: string; label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
      <div><Label htmlFor={id} className="cursor-pointer">{label}</Label><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

const defaultPasswordOptions: PasswordOptions = { length: 16, count: 5, lowercase: true, uppercase: true, numbers: true, symbols: true, excludeSimilar: true };

export function PasswordGeneratorTool() {
  const [options, setOptions] = useState<PasswordOptions>(defaultPasswordOptions);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [error, setError] = useState("");
  const poolSize = getPasswordPool(options).pool.length;
  const strength = assessPasswordStrength(options.length, poolSize);

  const update = <Key extends keyof PasswordOptions>(key: Key, value: PasswordOptions[Key]) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setPasswords([]);
    setError("");
  };

  const generate = (nextOptions = options) => {
    try {
      const nextPasswords = generatePasswords(nextOptions);
      setPasswords(nextPasswords);
      setError("");
      toast.success(`สร้างรหัสผ่าน ${nextPasswords.length} รายการแล้ว`);
    } catch (caught) {
      setPasswords([]);
      setError(caught instanceof Error ? caught.message : "สร้างรหัสผ่านไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setOptions(defaultPasswordOptions);
    generate(defaultPasswordOptions);
  };

  const clear = () => { setPasswords([]); setError(""); };
  const strengthWidth = Math.min(100, Math.round((strength.entropyBits / 100) * 100));

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="password-length">ความยาวรหัสผ่าน</Label><Input id="password-length" type="number" min={8} max={128} value={options.length} onChange={(event) => update("length", Number(event.target.value))} /></div>
        <div><Label htmlFor="password-count">จำนวนรหัสผ่าน</Label><Input id="password-count" type="number" min={1} max={20} value={options.count} onChange={(event) => update("count", Number(event.target.value))} /></div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <OptionSwitch id="password-lowercase" label="ตัวพิมพ์เล็ก" description="a–z" checked={options.lowercase} onCheckedChange={(checked) => update("lowercase", checked)} />
        <OptionSwitch id="password-uppercase" label="ตัวพิมพ์ใหญ่" description="A–Z" checked={options.uppercase} onCheckedChange={(checked) => update("uppercase", checked)} />
        <OptionSwitch id="password-numbers" label="ตัวเลข" description="0–9" checked={options.numbers} onCheckedChange={(checked) => update("numbers", checked)} />
        <OptionSwitch id="password-symbols" label="สัญลักษณ์" description="! @ # $ % และอื่น ๆ" checked={options.symbols} onCheckedChange={(checked) => update("symbols", checked)} />
        <OptionSwitch id="password-similar" label="ตัดตัวคล้ายกัน" description="ไม่ใช้ i I l L 1 o O 0" checked={options.excludeSimilar} onCheckedChange={(checked) => update("excludeSimilar", checked)} />
      </div>

      <div className="mt-4 rounded-xl border bg-muted/10 p-4">
        <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><span className="text-sm font-medium">ความแข็งแรงโดยประมาณ</span></div><span className="text-sm font-semibold text-primary">{strength.label} · {strength.entropyBits} bits</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${strengthWidth}%` }} /></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">ประเมินจากความยาวและขนาดชุดตัวอักษร ไม่ได้ตรวจการรั่วไหลหรือรับรองความปลอดภัยของระบบปลายทาง</p>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4"><ActionBar><Button type="button" onClick={() => generate()}><RefreshCw className="size-4" />สร้างรหัสผ่าน</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>

      {passwords.length ? (
        <section data-testid="password-output" className="mt-5 overflow-hidden rounded-xl border" aria-labelledby="password-results-heading" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3"><h2 id="password-results-heading" className="text-sm font-semibold">รหัสผ่านที่สร้างแล้ว</h2><Button type="button" size="sm" variant="outline" onClick={() => void copyText(passwords.join("\n"), "คัดลอกรหัสผ่านทั้งหมดแล้ว")}><Copy className="size-4" />คัดลอกทั้งหมด</Button></div>
          <ol className="divide-y">
            {passwords.map((password, index) => (
              <li key={`${password}-${index}`} className="flex items-center gap-3 px-3 py-3 sm:px-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span><code className="min-w-0 flex-1 break-all text-sm font-semibold">{password}</code><Button type="button" size="icon-sm" variant="ghost" onClick={() => void copyText(password, `คัดลอกรหัสผ่านลำดับ ${index + 1} แล้ว`)} aria-label={`คัดลอกรหัสผ่านลำดับ ${index + 1}`}><Copy /></Button></li>
            ))}
          </ol>
        </section>
      ) : (
        <div className="mt-5 grid min-h-36 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center"><div><KeyRound className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">เลือกเงื่อนไข แล้วกดสร้างรหัสผ่าน</p></div></div>
      )}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">ใช้ Web Crypto ภายในอุปกรณ์และไม่บันทึกรหัสผ่าน ควรเก็บด้วย Password Manager และอย่าใช้รหัสเดียวกันหลายบริการ</p>
    </WorkspaceFrame>
  );
}

const defaultRandomOptions: RandomNumberOptions = { min: 1, max: 100, count: 5, unique: true, sort: true };

export function RandomNumberGeneratorTool() {
  const [options, setOptions] = useState<RandomNumberOptions>(defaultRandomOptions);
  const [values, setValues] = useState<number[]>([]);
  const [error, setError] = useState("");
  const outputText = useMemo(() => values.join("\n"), [values]);

  const update = <Key extends keyof RandomNumberOptions>(key: Key, value: RandomNumberOptions[Key]) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setValues([]);
    setError("");
  };

  const generate = (nextOptions = options) => {
    try {
      const nextValues = generateRandomIntegers(nextOptions);
      setValues(nextValues);
      setError("");
      toast.success(`สุ่มตัวเลข ${nextValues.length} รายการแล้ว`);
    } catch (caught) {
      setValues([]);
      setError(caught instanceof Error ? caught.message : "สุ่มตัวเลขไม่สำเร็จ");
    }
  };

  const preset = (nextOptions: RandomNumberOptions) => { setOptions(nextOptions); generate(nextOptions); };
  const clear = () => { setValues([]); setError(""); };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><Label htmlFor="random-min">ค่าต่ำสุด</Label><Input id="random-min" type="number" value={options.min} onChange={(event) => update("min", Number(event.target.value))} /></div>
        <div><Label htmlFor="random-max">ค่าสูงสุด</Label><Input id="random-max" type="number" value={options.max} onChange={(event) => update("max", Number(event.target.value))} /></div>
        <div><Label htmlFor="random-count">จำนวนผลลัพธ์</Label><Input id="random-count" type="number" min={1} max={1_000} value={options.count} onChange={(event) => update("count", Number(event.target.value))} /></div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <OptionSwitch id="random-unique" label="ไม่ให้ตัวเลขซ้ำ" description="แต่ละค่าเกิดได้หนึ่งครั้ง" checked={options.unique} onCheckedChange={(checked) => update("unique", checked)} />
        <OptionSwitch id="random-sort" label="เรียงจากน้อยไปมาก" description="จัดผลลัพธ์ให้อ่านง่าย" checked={options.sort} onCheckedChange={(checked) => update("sort", checked)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted-foreground">ตัวเลือกด่วน:</span><Button type="button" size="sm" variant="outline" onClick={() => preset({ min: 1, max: 6, count: 1, unique: false, sort: false })}>ลูกเต๋า 1–6</Button><Button type="button" size="sm" variant="outline" onClick={() => preset({ min: 0, max: 1, count: 1, unique: false, sort: false })}>หัว/ก้อย 0–1</Button><Button type="button" size="sm" variant="outline" onClick={() => preset({ min: 1, max: 100, count: 5, unique: true, sort: true })}>จับฉลาก 5 คน</Button></div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4"><ActionBar><Button type="button" onClick={() => generate()}><Dices className="size-4" />สุ่มตัวเลข</Button><ExampleButton onExample={() => preset(defaultRandomOptions)} /><ClearButton onClear={clear} /></ActionBar></div>

      {values.length ? (
        <section data-testid="random-output" className="mt-5 rounded-xl border bg-primary/[0.03] p-4" aria-labelledby="random-results-heading" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="random-results-heading" className="text-sm font-semibold">ผลการสุ่ม</h2><p className="mt-1 text-xs text-muted-foreground">ช่วง {options.min.toLocaleString("th-TH")}–{options.max.toLocaleString("th-TH")} · {values.length} รายการ</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void copyText(values.join(", "), "คัดลอกผลการสุ่มแล้ว")}><Copy className="size-4" />คัดลอก</Button><Button type="button" size="sm" variant="outline" onClick={() => downloadText(outputText, "meaw-random-numbers.txt")}><Download className="size-4" />TXT</Button></div></div>
          <div className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto rounded-lg border bg-background/70 p-3">{values.map((value, index) => <span data-testid="random-value" key={`${value}-${index}`} className="inline-flex min-w-12 items-center justify-center rounded-lg bg-primary/10 px-3 py-2 font-mono text-base font-bold text-primary">{value.toLocaleString("th-TH")}</span>)}</div>
        </section>
      ) : <div className="mt-5 grid min-h-36 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center"><div><Dices className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">กำหนดช่วงและจำนวน แล้วกดสุ่มตัวเลข</p></div></div>}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">ใช้ Web Crypto เพื่อลดความเอนเอียงของการสุ่ม เหมาะกับเกม ตัวอย่าง และการจับฉลากทั่วไป แต่ไม่ใช่ระบบรับรองผลสำหรับการพนันหรือรางวัลมูลค่าสูง</p>
    </WorkspaceFrame>
  );
}
