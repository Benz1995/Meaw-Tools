"use client";

import { BadgeCheck, CheckCircle2, CircleAlert, Eye, EyeOff, Info, MinusCircle, SearchCheck, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { THAI_ID_LENGTH, validateThaiId, type ThaiIdValidationResult } from "@/lib/tools/thai-id";

const statusCopy = {
  empty: { title: "ยังไม่มีข้อมูลให้ตรวจ", description: "กรอกเลขประจำตัวประชาชน 13 หลักก่อนกดตรวจสอบ" },
  invalid_characters: { title: "พบอักขระที่ไม่รองรับ", description: "ใช้เฉพาะตัวเลข 0–9 โดยเว้นวรรคหรือใส่ขีดคั่นได้" },
  wrong_length: { title: "จำนวนหลักยังไม่ครบ", description: "เลขประจำตัวประชาชนต้องมีตัวเลขทั้งหมด 13 หลัก" },
  invalid_category: { title: "หลักแรกไม่อยู่ในรูปแบบที่กำหนด", description: "หลักแรกต้องเป็นประเภทบุคคลหมายเลข 1–8 ตามโครงสร้างของกรมการปกครอง" },
  invalid_checksum: { title: "เลขตรวจสอบไม่สอดคล้อง", description: "หลักที่ 13 ไม่ตรงกับผลคำนวณจาก 12 หลักแรก โปรดตรวจการพิมพ์อีกครั้ง" },
  valid: { title: "checksum สอดคล้องตามสูตร", description: "โครงสร้างและเลขตรวจสอบผ่าน แต่ผลนี้ไม่ได้ยืนยันบุคคล สถานะบัตร หรือข้อมูลในทะเบียนราษฎร" },
} as const;

function CheckRow({ state, label, detail }: { state: boolean | null; label: string; detail: string }) {
  const Icon = state === true ? CheckCircle2 : state === false ? XCircle : MinusCircle;
  return (
    <li className="flex items-start gap-3 rounded-lg border bg-background/70 p-3">
      <Icon className={state === true ? "mt-0.5 size-4 shrink-0 text-emerald-600" : state === false ? "mt-0.5 size-4 shrink-0 text-destructive" : "mt-0.5 size-4 shrink-0 text-muted-foreground"} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

function ValidationOutput({ validation }: { validation: ThaiIdValidationResult }) {
  const copy = statusCopy[validation.code];
  const valid = validation.isValid;
  return (
    <section
      data-testid="thai-id-validation-result"
      aria-live="polite"
      className={valid ? "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5" : "rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5"}
    >
      <div className="flex items-start gap-3">
        {valid ? <BadgeCheck className="mt-0.5 size-6 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-6 shrink-0 text-amber-600" />}
        <div>
          <h2 className="font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-3 lg:grid-cols-3">
        <CheckRow
          state={validation.formatValid}
          label="รูปแบบ 13 หลัก"
          detail={validation.formatValid ? "พบตัวเลขครบ 13 หลัก" : `พบตัวเลข ${validation.digitCount} จาก ${THAI_ID_LENGTH} หลัก`}
        />
        <CheckRow
          state={validation.categoryValid}
          label="ประเภทในหลักแรก"
          detail={validation.categoryValid === true ? "อยู่ในช่วงประเภท 1–8" : validation.categoryValid === false ? "ไม่อยู่ในช่วงประเภท 1–8" : "รอรูปแบบครบก่อนตรวจ"}
        />
        <CheckRow
          state={validation.checksumValid}
          label="เลขตรวจสอบหลักที่ 13"
          detail={validation.checksumValid === true ? "สอดคล้องกับ 12 หลักแรก" : validation.checksumValid === false ? "ไม่สอดคล้องกับ 12 หลักแรก" : "รอรูปแบบและประเภทผ่านก่อนตรวจ"}
        />
      </ul>
    </section>
  );
}

export function ThaiIdValidatorTool() {
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [validation, setValidation] = useState<ThaiIdValidationResult | null>(null);

  const check = () => {
    const nextValidation = validateThaiId(value);
    setValidation(nextValidation);
    if (nextValidation.isValid) toast.success("checksum สอดคล้องตามสูตร");
  };

  const clear = () => {
    setValue("");
    setRevealed(false);
    setValidation(null);
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-5 border-sky-500/30 bg-sky-500/5">
        <ShieldCheck className="text-sky-600" />
        <AlertTitle>ตรวจใน Browser เท่านั้น และซ่อนค่าที่กรอกเป็นค่าเริ่มต้น</AlertTitle>
        <AlertDescription>เครื่องมือไม่ส่ง ไม่บันทึก และไม่ใส่เลขที่กรอกลง URL กรุณาหลีกเลี่ยงการใช้บนหน้าจอสาธารณะหรืออุปกรณ์ที่ไม่ไว้ใจ</AlertDescription>
      </Alert>

      <form onSubmit={(event) => { event.preventDefault(); check(); }}>
        <div className="space-y-3">
          <Label htmlFor="thai-id-number" className="leading-5">เลขประจำตัวประชาชน 13 หลัก</Label>
          <div className="relative">
            <Input
              id="thai-id-number"
              type={revealed ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={32}
              value={value}
              onChange={(event) => { setValue(event.target.value); setValidation(null); }}
              placeholder="X-XXXX-XXXXX-XX-X"
              aria-describedby="thai-id-hint"
              className="pr-11 font-mono tracking-wide"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
              onClick={() => setRevealed((current) => !current)}
              aria-label={revealed ? "ซ่อนเลขประจำตัวประชาชน" : "แสดงเลขประจำตัวประชาชน"}
              aria-pressed={revealed}
            >
              {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          <p id="thai-id-hint" className="text-xs leading-5 text-muted-foreground">พิมพ์ติดกัน หรือใช้ช่องว่างและขีดคั่นได้ เครื่องมือจะตรวจรูปแบบ ประเภทหลักแรก และ checksum เท่านั้น</p>
        </div>

        <div className="mt-5 border-t pt-5">
          <ActionBar>
            <Button type="submit"><SearchCheck className="size-4" />ตรวจ checksum</Button>
            <ClearButton onClear={clear} />
          </ActionBar>
        </div>
      </form>

      <div className="mt-5">
        {validation ? <ValidationOutput validation={validation} /> : <EmptyOutput size="compact" text="กรอกเลข 13 หลัก แล้วกดตรวจ checksum โดยข้อมูลจะอยู่ในอุปกรณ์นี้เท่านั้น" />}
      </div>

      <div className="mt-5 space-y-3 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground sm:p-5">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="font-medium text-foreground">ขอบเขตสำคัญ:</strong> checksum เป็นเพียงการตรวจความสอดคล้องทางคณิตศาสตร์ ไม่สามารถบอกได้ว่าเลขนี้มีเจ้าของจริง บัตรยังไม่หมดอายุ หรือผู้กรอกเป็นเจ้าของเลข</span></p>
        <p>โครงสร้าง 13 หลักและหลักตรวจสอบอ้างอิงข้อมูลของ <a className="font-medium text-primary hover:underline" href="https://stat.bora.dopa.go.th/fop/e-registration040.html" target="_blank" rel="noreferrer">กรมการปกครอง</a> ส่วนการยืนยันตัวตนจริงต้องใช้ข้อมูลเพิ่มและตรวจสิทธิ์กับระบบทางการ เช่นแนวทาง <a className="font-medium text-primary hover:underline" href="https://kb.dga.or.th/gdx/5api-lasercode/" target="_blank" rel="noreferrer">Laser Code ของ DGA</a> ตรวจทานล่าสุด 3 สิงหาคม 2569</p>
      </div>
    </WorkspaceFrame>
  );
}
