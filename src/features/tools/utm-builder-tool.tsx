"use client";

import { ExternalLink, Info, Link2, Megaphone, MousePointerClick, ShieldCheck, Sparkles, Tags, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { buildUtmUrl, emptyUtmFields, parseUtmUrl, type UtmBuildResult, type UtmFields } from "@/lib/tools/utm";

const GOOGLE_UTM_HELP_URL = "https://support.google.com/analytics/answer/10917952?hl=th";
const GOOGLE_CAMPAIGN_BUILDER_URL = "https://ga-dev-tools.google/campaign-url-builder/";

const channelPresets = [
  { label: "Google Ads", source: "google", medium: "cpc" },
  { label: "Facebook Ads", source: "facebook", medium: "paid_social" },
  { label: "Instagram Ads", source: "instagram", medium: "paid_social" },
  { label: "TikTok Ads", source: "tiktok", medium: "paid_social" },
  { label: "Email", source: "newsletter", medium: "email" },
  { label: "LINE OA", source: "line", medium: "social" },
] as const;

const commonFields: Array<{ key: keyof UtmFields; label: string; helper: string; placeholder: string; required?: boolean }> = [
  { key: "source", label: "Campaign Source", helper: "utm_source · แพลตฟอร์มหรือแหล่งที่มา", placeholder: "เช่น google, facebook, newsletter", required: true },
  { key: "medium", label: "Campaign Medium", helper: "utm_medium · ประเภทช่องทาง", placeholder: "เช่น cpc, email, paid_social", required: true },
  { key: "campaign", label: "Campaign Name", helper: "utm_campaign · ชื่อแคมเปญที่ใช้ร่วมกัน", placeholder: "เช่น august_sale", required: true },
];

const optionalFields: Array<{ key: keyof UtmFields; label: string; helper: string; placeholder: string }> = [
  { key: "id", label: "Campaign ID", helper: "utm_id · รหัสอ้างอิงแคมเปญ", placeholder: "เช่น ads_2026_08" },
  { key: "sourcePlatform", label: "Source Platform", helper: "utm_source_platform · แพลตฟอร์มจัดการ traffic", placeholder: "เช่น google_ads, search_ads_360" },
  { key: "term", label: "Campaign Term", helper: "utm_term · keyword สำหรับ paid search", placeholder: "เช่น cat_cafe_bangkok" },
  { key: "content", label: "Campaign Content", helper: "utm_content · แยก creative หรือ A/B test", placeholder: "เช่น hero_button, video_a" },
];

const parameterLabels: Record<string, string> = {
  utm_source: "แหล่งที่มา",
  utm_medium: "ช่องทาง",
  utm_campaign: "แคมเปญ",
  utm_id: "Campaign ID",
  utm_source_platform: "Source Platform",
  utm_term: "Keyword",
  utm_content: "Creative / Content",
};

function UtmInput({ item, value, onChange }: {
  item: { key: keyof UtmFields; label: string; helper: string; placeholder: string; required?: boolean };
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `utm-${item.key}`;
  return (
    <div className="min-w-0 space-y-2.5">
      <Label htmlFor={id}>{item.label}{item.required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={200} required={item.required} aria-describedby={`${id}-help`} placeholder={item.placeholder} autoComplete="off" />
      <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">{item.helper}</p>
    </div>
  );
}

export function UtmBuilderTool() {
  const [baseUrl, setBaseUrl] = useState("");
  const [fields, setFields] = useState<UtmFields>({ ...emptyUtmFields });
  const [lowercase, setLowercase] = useState(true);
  const [spacesToUnderscores, setSpacesToUnderscores] = useState(true);
  const [result, setResult] = useState<UtmBuildResult | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setResult(null); setError(""); };
  const updateField = (key: keyof UtmFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    invalidate();
  };

  const applyPreset = (source: string, medium: string, label: string) => {
    setFields((current) => ({ ...current, source, medium }));
    invalidate();
    toast.info(`เลือกช่องทาง ${label} แล้ว`);
  };

  const build = () => {
    try {
      const nextResult = buildUtmUrl(baseUrl, fields, { lowercase, spacesToUnderscores });
      setResult(nextResult);
      setError("");
      toast.success("สร้างลิงก์ UTM แล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "สร้างลิงก์ UTM ไม่สำเร็จ");
    }
  };

  const importFromUrl = () => {
    try {
      const parsed = parseUtmUrl(baseUrl);
      setBaseUrl(parsed.baseUrl);
      setFields(parsed.fields);
      setResult(null);
      setError("");
      toast.success(`นำเข้า UTM ${parsed.importedParameterCount.toLocaleString("th-TH")} ค่าแล้ว`);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "อ่าน UTM จาก URL ไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setBaseUrl("https://meaw-tools.vercel.app/tools?ref=homepage#popular-tools");
    setFields({ ...emptyUtmFields, source: "facebook", medium: "paid_social", campaign: "august_cat_cafe", id: "meta_2026_08", content: "carousel_a" });
    setLowercase(true);
    setSpacesToUnderscores(true);
    setResult(null);
    setError("");
  };

  const clear = () => {
    setBaseUrl("");
    setFields({ ...emptyUtmFields });
    setLowercase(true);
    setSpacesToUnderscores(true);
    setResult(null);
    setError("");
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Megaphone className="size-5 text-primary" /><h2 className="font-semibold">สร้างลิงก์ติดตามแคมเปญสำหรับ GA4</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">ใช้รูปแบบชื่อสม่ำเสมอ รักษา query/hash เดิม และตรวจ URL ก่อนนำไปเผยแพร่</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Client-only · ไม่เก็บลิงก์</span>
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-600" />
        <AlertTitle>UTM แยกที่มา ช่องทาง และแคมเปญใน Google Analytics</AlertTitle>
        <AlertDescription className="leading-6">Google แนะนำให้ใช้ <code>utm_source</code>, <code>utm_medium</code> และ <code>utm_campaign</code> ให้ครบและตั้งชื่อให้สม่ำเสมอ เพราะค่าตัวพิมพ์เล็ก-ใหญ่ถูกนับแยกกัน อ่านรายละเอียดได้จาก <a href={GOOGLE_UTM_HELP_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">Google Analytics Help</a></AlertDescription>
      </Alert>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
        <section className="min-w-0" aria-labelledby="utm-input-title">
          <h3 id="utm-input-title" className="font-semibold">1. URL และข้อมูลแคมเปญ</h3>
          <div className="mt-3 space-y-2.5">
            <Label htmlFor="utm-base-url">Website URL <span className="text-destructive" aria-hidden="true">*</span></Label>
            <Input id="utm-base-url" type="url" inputMode="url" autoComplete="url" value={baseUrl} onChange={(event) => { setBaseUrl(event.target.value); invalidate(); }} maxLength={8192} required placeholder="https://example.com/products?sku=123" aria-describedby="utm-base-url-help" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p id="utm-base-url-help" className="text-xs leading-5 text-muted-foreground">ต้องมี http:// หรือ https:// · query และ #fragment เดิมจะยังอยู่</p>
              <Button type="button" size="sm" variant="ghost" onClick={importFromUrl}><Tags className="size-3.5" />อ่าน UTM จาก URL</Button>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold">เลือกช่องทางเริ่มต้น</p>
            <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="ตัวอย่างแหล่งที่มาและช่องทาง">
              {channelPresets.map((preset) => {
                const active = fields.source === preset.source && fields.medium === preset.medium;
                return <Button key={preset.label} type="button" size="sm" variant={active ? "default" : "outline"} aria-pressed={active} onClick={() => applyPreset(preset.source, preset.medium, preset.label)}>{preset.label}</Button>;
              })}
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            {commonFields.map((item, index) => <div key={item.key} className={index === 2 ? "sm:col-span-2" : undefined}><UtmInput item={item} value={fields[item.key]} onChange={(value) => updateField(item.key, value)} /></div>)}
          </div>

          <details className="mt-5 rounded-xl border bg-muted/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold">ตัวเลือก UTM เพิ่มเติม</summary>
            <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
              {optionalFields.map((item) => <UtmInput key={item.key} item={item} value={fields[item.key]} onChange={(value) => updateField(item.key, value)} />)}
            </div>
          </details>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">ใช้ตัวพิมพ์เล็ก</span><span className="mt-0.5 block text-xs text-muted-foreground">ลดการแยกแถวในรายงาน GA4</span></span><Switch checked={lowercase} onCheckedChange={(checked) => { setLowercase(checked); invalidate(); }} aria-label="แปลงค่า UTM เป็นตัวพิมพ์เล็ก" /></label>
            <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3 text-sm"><span><span className="block font-medium">แทนช่องว่างด้วย _</span><span className="mt-0.5 block text-xs text-muted-foreground">ทำให้ชื่ออ่านและเทียบกันง่าย</span></span><Switch checked={spacesToUnderscores} onCheckedChange={(checked) => { setSpacesToUnderscores(checked); invalidate(); }} aria-label="แทนช่องว่างด้วยขีดล่าง" /></label>
          </div>

          <div className="mt-5 border-t pt-5">
            <ActionBar>
              <Button type="button" onClick={build}><Sparkles className="size-4" />สร้างลิงก์ UTM</Button>
              <ExampleButton onExample={loadExample} />
              <ClearButton onClear={clear} />
            </ActionBar>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
        </section>

        <section className="min-w-0" aria-labelledby="utm-result-title">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="utm-result-title" className="font-semibold">2. ตรวจลิงก์ก่อนนำไปใช้</h3><p className="mt-1 text-xs text-muted-foreground">ค่าจะแสดงหลัง URL encoding ตามมาตรฐาน Browser</p></div>{result ? <ActionBar><CopyButton value={result.url} label="คัดลอกลิงก์" /><Button type="button" variant="outline" asChild><a href={result.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />ทดลองเปิด</a></Button></ActionBar> : null}</div>

          {!result ? (
            <div className="mt-3 grid min-h-64 place-items-center rounded-xl border border-dashed bg-muted/15 p-6 text-center"><span><Link2 className="mx-auto size-9 text-primary/70" /><span className="mt-3 block text-sm font-medium">กรอก URL, Source, Medium และ Campaign</span><span className="mt-1 block text-xs text-muted-foreground">แล้วกด “สร้างลิงก์ UTM” เพื่อดูผลลัพธ์</span></span></div>
          ) : (
            <div className="mt-3 space-y-4" aria-live="polite" data-testid="utm-result">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-semibold text-primary">Campaign URL</p>
                <Textarea readOnly value={result.url} className="mt-2 min-h-28 resize-y break-all font-mono text-xs leading-5" aria-label="ลิงก์ UTM ที่สร้างแล้ว" data-testid="utm-result-url" />
                <p className="mt-2 text-right text-xs text-muted-foreground">{result.url.length.toLocaleString("th-TH")} ตัวอักษร</p>
              </div>

              {result.replacedParameterCount ? <Alert className="border-amber-500/30 bg-amber-500/5"><TriangleAlert className="text-amber-600" /><AlertTitle>แทนค่า UTM เดิมแล้ว</AlertTitle><AlertDescription>พบพารามิเตอร์ UTM เดิม {result.replacedParameterCount.toLocaleString("th-TH")} ค่า เครื่องมือแทนเฉพาะ UTM ที่รองรับและเก็บ query อื่นไว้</AlertDescription></Alert> : null}

              <div className="overflow-hidden rounded-xl border">
                <div className="border-b bg-muted/20 px-4 py-2.5 text-sm font-semibold">พารามิเตอร์ที่ส่งไป GA4</div>
                <dl className="divide-y" data-testid="utm-parameter-list">
                  {result.parameters.map((item) => <div key={item.key} className="grid min-w-0 gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]"><dt className="text-xs text-muted-foreground"><code>{item.key}</code><span className="mt-0.5 block">{parameterLabels[item.key]}</span></dt><dd className="break-all text-sm font-medium">{item.value}</dd></div>)}
                </dl>
              </div>
            </div>
          )}

          <Alert className="mt-4 border-amber-500/30 bg-amber-500/5">
            <MousePointerClick className="text-amber-600" />
            <AlertTitle>Google Ads ควรตรวจ Auto-tagging ก่อน</AlertTitle>
            <AlertDescription className="leading-6">การใส่ UTM ร่วมกับ Google Click ID โดยไม่วางแผนอาจทำให้ attribution ผิดช่องทาง ใช้ UTM เมื่อจำเป็นและทดสอบใน Traffic acquisition ก่อนเผยแพร่จริง</AlertDescription>
          </Alert>
        </section>
      </div>

      <div className="mt-6 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>ลิงก์ถูกสร้างใน Browser และไม่ถูกส่งไปบันทึกที่ Server ของ Meaw Tools</span></p>
        <p className="flex gap-2"><Link2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>เทียบชื่อและความหมายของพารามิเตอร์กับ <a href={GOOGLE_CAMPAIGN_BUILDER_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">Campaign URL Builder ของ Google</a> และเก็บ naming convention ไว้ใช้ร่วมกันทั้งทีม</span></p>
      </div>
    </WorkspaceFrame>
  );
}
