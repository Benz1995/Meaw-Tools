"use client";

import { ArrowLeftRight, Check, Copy, Palette, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contrastRatio, getContrastChecks, hexToRgb, mixHex, normalizeHex, rgbToHsl, type HslColor, type RgbColor } from "@/lib/tools/colors";

type ContrastBadgeProps = { label: string; passes: boolean };
type ColorData =
  | { valid: false; error: string }
  | { valid: true; foregroundHex: string; backgroundHex: string; rgb: RgbColor; hsl: HslColor; ratio: number; checks: ReturnType<typeof getContrastChecks>; palette: string[] };

function ContrastBadge({ label, passes }: ContrastBadgeProps) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${passes ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/25 bg-destructive/5"}`}>
      <span>{label}</span>
      <span className={`inline-flex items-center gap-1 font-medium ${passes ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
        {passes ? <Check className="size-4" /> : <X className="size-4" />}{passes ? "ผ่าน" : "ไม่ผ่าน"}
      </span>
    </div>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  let pickerValue = "#000000";
  try { pickerValue = normalizeHex(value); } catch { /* Keep the native picker valid while the text input is incomplete. */ }
  return (
    <div>
      <Label htmlFor={`${id}-text`}>{label}</Label>
      <div className="flex gap-2">
        <Input id={`${id}-text`} value={value} onChange={(event) => onChange(event.target.value)} onBlur={() => { try { onChange(normalizeHex(value)); } catch { /* Error is shown by the parent. */ } }} spellCheck={false} className="font-mono uppercase" />
        <Input id={`${id}-picker`} type="color" value={pickerValue} onChange={(event) => onChange(event.target.value.toUpperCase())} className="w-12 shrink-0 p-1" aria-label={`เลือก${label}`} />
      </div>
    </div>
  );
}

export function ColorPickerTool() {
  const [foreground, setForeground] = useState("#0F9F8F");
  const [background, setBackground] = useState("#FFFFFF");

  const colorData = useMemo<ColorData>(() => {
    try {
      const foregroundHex = normalizeHex(foreground);
      const backgroundHex = normalizeHex(background);
      const rgb = hexToRgb(foregroundHex);
      const hsl = rgbToHsl(rgb);
      const ratio = contrastRatio(foregroundHex, backgroundHex);
      return {
        valid: true,
        foregroundHex,
        backgroundHex,
        rgb,
        hsl,
        ratio,
        checks: getContrastChecks(ratio),
        palette: [0.8, 0.6, 0.4, 0.2].map((weight) => mixHex(foregroundHex, "#FFFFFF", weight)).concat(foregroundHex, [0.2, 0.4].map((weight) => mixHex(foregroundHex, "#000000", weight))),
      };
    } catch (caught) {
      return { valid: false, error: caught instanceof Error ? caught.message : "รหัสสีไม่ถูกต้อง" };
    }
  }, [background, foreground]);

  const reset = () => { setForeground(""); setBackground(""); };
  const example = () => { setForeground("#0F9F8F"); setBackground("#FFFFFF"); toast.success("โหลดคู่สีตัวอย่างแล้ว"); };

  if (!colorData.valid) {
    return (
      <WorkspaceFrame>
        <div className="grid gap-4 sm:grid-cols-2"><ColorField id="foreground" label="สีข้อความหรือวัตถุ" value={foreground} onChange={setForeground} /><ColorField id="background" label="สีพื้นหลัง" value={background} onChange={setBackground} /></div>
        <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{colorData.error}</p>
        <div className="mt-4"><ActionBar><ExampleButton onExample={example} /><ClearButton onClear={reset} /></ActionBar></div>
      </WorkspaceFrame>
    );
  }

  const rgbText = `rgb(${colorData.rgb.red}, ${colorData.rgb.green}, ${colorData.rgb.blue})`;
  const hslText = `hsl(${colorData.hsl.hue} ${colorData.hsl.saturation}% ${colorData.hsl.lightness}%)`;
  const cssVariables = `--color-primary: ${colorData.foregroundHex};\n--color-background: ${colorData.backgroundHex};`;

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField id="foreground" label="สีข้อความหรือวัตถุ" value={foreground} onChange={setForeground} />
        <ColorField id="background" label="สีพื้นหลัง" value={background} onChange={setBackground} />
      </div>
      <div className="mt-4"><ActionBar><Button type="button" variant="outline" onClick={() => { setForeground(colorData.backgroundHex); setBackground(colorData.foregroundHex); }}><ArrowLeftRight className="size-4" />สลับสี</Button><ExampleButton onExample={example} /><ClearButton onClear={reset} /></ActionBar></div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="overflow-hidden rounded-xl border">
          <div className="grid min-h-64 place-items-center p-8 text-center transition-colors" style={{ color: colorData.foregroundHex, backgroundColor: colorData.backgroundHex }}>
            <div><p className="text-3xl font-bold">ตัวอย่างข้อความ</p><p className="mt-3 text-base">Preview สีสำหรับเว็บไซต์ แอป และงานออกแบบ</p><span className="mt-5 inline-flex rounded-lg border border-current px-4 py-2 font-medium">ตัวอย่างปุ่ม</span></div>
          </div>
          <div className="grid grid-cols-2 border-t bg-card text-center text-sm"><div className="border-r p-3"><p className="text-xs text-muted-foreground">Foreground</p><p className="mt-1 font-mono font-semibold">{colorData.foregroundHex}</p></div><div className="p-3"><p className="text-xs text-muted-foreground">Background</p><p className="mt-1 font-mono font-semibold">{colorData.backgroundHex}</p></div></div>
        </div>

        <div className="rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">Contrast Ratio</p><p data-testid="contrast-ratio" className="mt-1 text-4xl font-bold tracking-tight text-primary">{colorData.ratio}:1</p></div><Palette className="size-8 text-primary/60" /></div>
          <div className="mt-4 grid gap-2"><ContrastBadge label="AA · ข้อความปกติ" passes={colorData.checks.aaNormal} /><ContrastBadge label="AA · ข้อความขนาดใหญ่" passes={colorData.checks.aaLarge} /><ContrastBadge label="AAA · ข้อความปกติ" passes={colorData.checks.aaaNormal} /><ContrastBadge label="AAA · ข้อความขนาดใหญ่" passes={colorData.checks.aaaLarge} /></div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">ข้อความปกติต้องมีอัตราส่วนอย่างน้อย 4.5:1 ตาม WCAG AA ส่วนข้อความขนาดใหญ่ใช้ 3:1</p>
        </div>
      </div>

      <section className="mt-5" aria-labelledby="color-values-heading">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="color-values-heading" className="text-sm font-semibold">ค่าสีและ CSS</h2><Button type="button" size="sm" variant="outline" onClick={() => void copyText(cssVariables, "คัดลอก CSS variables แล้ว")}><Copy className="size-4" />คัดลอก CSS</Button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["HEX", colorData.foregroundHex], ["RGB", rgbText], ["HSL", hslText], ["CSS", `color: ${colorData.foregroundHex};`]].map(([label, value]) => (
            <button type="button" key={label} onClick={() => void copyText(value!, `คัดลอก ${label} แล้ว`)} className="rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]" aria-label={`คัดลอก ${label} ${value}`}><span className="text-xs text-muted-foreground">{label}</span><span className="mt-1 block truncate font-mono text-sm font-medium">{value}</span></button>
          ))}
        </div>
      </section>

      <section className="mt-5" aria-labelledby="palette-heading">
        <h2 id="palette-heading" className="text-sm font-semibold">เฉดสีอัตโนมัติ</h2>
        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-4 lg:grid-cols-7">
          {colorData.palette.map((color) => {
            const textColor = contrastRatio(color, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#111827";
            return <button type="button" key={color} onClick={() => void copyText(color, `คัดลอก ${color} แล้ว`)} className="min-h-24 p-3 text-left font-mono text-xs font-semibold transition-transform hover:scale-[1.02] focus-visible:z-10" style={{ backgroundColor: color, color: textColor }} aria-label={`คัดลอกสี ${color}`}>{color}</button>;
          })}
        </div>
      </section>
    </WorkspaceFrame>
  );
}
