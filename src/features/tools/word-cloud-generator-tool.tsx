"use client";

import { Cloud, Download, FileImage, Info, Palette, RefreshCw, ShieldCheck, Sparkles, TableProperties, Type } from "lucide-react";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadBlob } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  WORD_CLOUD_LIST_LIMIT,
  WORD_CLOUD_PALETTES,
  WORD_CLOUD_TEXT_LIMIT,
  analyzeWordCloudText,
  buildWordCloudSvg,
  layoutWordCloud,
  parseWeightedWordList,
  wordCloudFrequencyCsv,
  type WordCloudAnalysis,
  type WordCloudLayout,
  type WordCloudPalette,
  type WordCloudRotation,
} from "@/lib/tools/word-cloud";

type SourceMode = "text" | "weighted-list";
type BackgroundOption = "cream" | "white" | "dark" | "transparent";

const SAMPLE_TEXT = `Meaw Tools ช่วยให้งานประจำวันง่ายขึ้น เครื่องมือภาษาไทยใช้งานฟรีและทำงานใน Browser
แมวรักกาแฟ แมวรักการออกแบบ แมวสร้างเครื่องมือที่น่ารัก ใช้ง่าย และเป็นส่วนตัว
นักเรียนใช้ Word Cloud สรุปบทเรียน คุณครูใช้ Word Cloud ทำกิจกรรม และทีมงานใช้ Word Cloud มองเห็นหัวข้อสำคัญ
ภาษาไทย ภาษาไทย เครื่องมือ เครื่องมือ เครื่องมือ ความคิดสร้างสรรค์ ความคิดสร้างสรรค์ ข้อมูล ข้อมูล ออกแบบ ออกแบบ แมว แมว แมว แมว`;

const SAMPLE_WEIGHTED_LIST = `Meaw Tools,12
ภาษาไทย,10
เครื่องมือออนไลน์,9
คนรักแมว,8
คาเฟ่ญี่ปุ่น,7
ใช้งานฟรี,6
ความคิดสร้างสรรค์,5
ข้อมูลเป็นส่วนตัว,4
Word Cloud,3`;

const BACKGROUNDS: Record<BackgroundOption, string> = {
  cream: "#fffaf2",
  white: "#ffffff",
  dark: "#1f120b",
  transparent: "transparent",
};

const PALETTE_LABELS: Record<WordCloudPalette, string> = {
  cafe: "Meaw Café — เขียวและน้ำตาล",
  sakura: "Sakura — ชมพูและม่วง",
  ocean: "Ocean — ฟ้าและน้ำเงิน",
  night: "Night — สีสว่างสำหรับพื้นเข้ม",
};

const integerFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const countFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function SettingField({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ToggleCard({ id, label, description, checked, onCheckedChange }: { id: string; label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex min-h-24 items-start justify-between gap-4 rounded-xl border bg-muted/10 p-4">
      <div>
        <Label htmlFor={id} className="leading-5">{label}</Label>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

function StatCard({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-xl border bg-muted/10 p-4">
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("สร้างไฟล์ PNG ไม่สำเร็จ")), "image/png");
  });
}

async function svgToPngBlob(svg: string, width: number, height: number) {
  await document.fonts.ready;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("อ่านภาพ Word Cloud เพื่อสร้าง PNG ไม่สำเร็จ"));
      image.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser นี้ไม่รองรับการสร้าง PNG");
    context.scale(2, 2);
    context.drawImage(image, 0, 0, width, height);
    return await canvasToPngBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function WordCloudGeneratorTool() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("text");
  const [text, setText] = useState("");
  const [weightedList, setWeightedList] = useState("");
  const [excludeCommonWords, setExcludeCommonWords] = useState(true);
  const [excludeNumbers, setExcludeNumbers] = useState(true);
  const [customStopWords, setCustomStopWords] = useState("");
  const [minimumWordLength, setMinimumWordLength] = useState(1);
  const [minimumFrequency, setMinimumFrequency] = useState(1);
  const [maximumWords, setMaximumWords] = useState(50);
  const [palette, setPalette] = useState<WordCloudPalette>("cafe");
  const [background, setBackground] = useState<BackgroundOption>("cream");
  const [rotation, setRotation] = useState<WordCloudRotation>("horizontal");
  const [seed, setSeed] = useState(36);
  const [analysis, setAnalysis] = useState<WordCloudAnalysis | null>(null);
  const [layout, setLayout] = useState<WordCloudLayout | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const invalidate = () => { setAnalysis(null); setLayout(null); setError(""); };
  const changeSetting = <T,>(setter: (value: T) => void, value: T) => { setter(value); invalidate(); };
  const changePalette = (value: WordCloudPalette) => {
    setPalette(value);
    if (value === "night") setBackground("dark");
    else if (background === "dark") setBackground("cream");
    invalidate();
  };
  const changeBackground = (value: BackgroundOption) => {
    setBackground(value);
    if (value === "dark") setPalette("night");
    else if (palette === "night") setPalette("cafe");
    invalidate();
  };

  const generate = () => {
    try {
      const nextAnalysis = sourceMode === "text"
        ? analyzeWordCloudText(text, { excludeCommonWords, excludeNumbers, customStopWords, minimumWordLength, minimumFrequency, maximumWords })
        : parseWeightedWordList(weightedList, maximumWords);
      const nextLayout = layoutWordCloud(nextAnalysis.words, { rotation, palette, seed });
      setAnalysis(nextAnalysis);
      setLayout(nextLayout);
      setError("");
    } catch (caught) {
      setAnalysis(null);
      setLayout(null);
      setError(caught instanceof Error ? caught.message : "สร้าง Word Cloud ไม่สำเร็จ");
    }
  };

  const shuffle = () => {
    if (!analysis) return;
    const nextSeed = seed + 1;
    try {
      setSeed(nextSeed);
      setLayout(layoutWordCloud(analysis.words, { rotation, palette, seed: nextSeed }));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สลับตำแหน่งคำไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setSourceMode("text");
    setText(SAMPLE_TEXT);
    setWeightedList(SAMPLE_WEIGHTED_LIST);
    setExcludeCommonWords(true);
    setExcludeNumbers(true);
    setCustomStopWords("");
    setMinimumWordLength(1);
    setMinimumFrequency(1);
    setMaximumWords(50);
    setPalette("cafe");
    setBackground("cream");
    setRotation("horizontal");
    setSeed(36);
    invalidate();
  };

  const clearAll = () => {
    setSourceMode("text");
    setText("");
    setWeightedList("");
    setCustomStopWords("");
    setSeed(36);
    invalidate();
  };

  const svg = layout ? buildWordCloudSvg(layout, BACKGROUNDS[background]) : "";
  const frequencyText = analysis
    ? analysis.words.map((word, index) => `${index + 1}. ${word.text}: ${countFormatter.format(word.count)}`).join("\n")
    : "";

  const downloadSvg = () => {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "meaw-word-cloud.svg");
  };

  const downloadCsv = () => {
    if (!analysis) return;
    downloadBlob(new Blob([wordCloudFrequencyCsv(analysis.words)], { type: "text/csv;charset=utf-8" }), "meaw-word-cloud-frequency.csv");
  };

  const downloadPng = async () => {
    if (!layout || !svg || exporting) return;
    setExporting(true);
    setError("");
    try {
      const png = await svgToPngBlob(svg, layout.width, layout.height);
      downloadBlob(png, "meaw-word-cloud-2x.png");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ดาวน์โหลด PNG ไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>ตัดคำและสร้างภาพภายใน Browser</AlertTitle>
        <AlertDescription className="leading-6">ข้อความ รายการคำ และภาพที่สร้างจะไม่ถูกส่งไปยัง Server เหมาะกับบทเรียน แบบสอบถาม การประชุม คอนเทนต์ และสรุปหัวข้อที่ไม่ต้องการอัปโหลดข้อมูล</AlertDescription>
      </Alert>

      <section aria-labelledby="word-cloud-source-title">
        <h2 id="word-cloud-source-title" className="mb-5 flex items-center gap-2 font-semibold"><Type className="size-4 text-primary" />เลือกแหล่งคำ</h2>
        <Tabs value={sourceMode} onValueChange={(value) => { setSourceMode(value as SourceMode); invalidate(); }}>
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[30rem]">
            <TabsTrigger value="text" className="text-foreground">ตัดคำจากข้อความ</TabsTrigger>
            <TabsTrigger value="weighted-list" className="text-foreground">คำ / วลี + น้ำหนัก</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-5">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="word-cloud-text" className="leading-5">ข้อความภาษาไทยหรืออังกฤษ</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{integerFormatter.format(text.length)} / {integerFormatter.format(WORD_CLOUD_TEXT_LIMIT)} ตัวอักษร</span>
              </div>
              <Textarea id="word-cloud-text" value={text} onChange={(event) => { setText(event.target.value); invalidate(); }} className="min-h-56 resize-y leading-7" maxLength={WORD_CLOUD_TEXT_LIMIT} placeholder="วางบทความ คำตอบแบบสอบถาม บันทึกประชุม หรือข้อความที่ต้องการดูคำสำคัญ..." />
              <p className="text-xs leading-5 text-muted-foreground">ใช้ Intl.Segmenter ของ Browser สำหรับตัดคำไทย ผลอาจต่างตาม Browser หรือคำเฉพาะ หากต้องการเก็บวลีทั้งชุดให้ใช้แท็บ “คำ / วลี + น้ำหนัก”</p>
            </div>
          </TabsContent>
          <TabsContent value="weighted-list" className="mt-5">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="word-cloud-list" className="leading-5">หนึ่งคำหรือวลีต่อหนึ่งบรรทัด</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{integerFormatter.format(weightedList.length)} / {integerFormatter.format(WORD_CLOUD_LIST_LIMIT)} ตัวอักษร</span>
              </div>
              <Textarea id="word-cloud-list" value={weightedList} onChange={(event) => { setWeightedList(event.target.value); invalidate(); }} className="min-h-56 resize-y font-mono leading-7" maxLength={WORD_CLOUD_LIST_LIMIT} placeholder={"Meaw Tools,10\nภาษาไทย,8\nคนรักแมว,6\nคาเฟ่ญี่ปุ่น,4"} />
              <p className="text-xs leading-5 text-muted-foreground">ใส่น้ำหนักต่อท้ายด้วย comma, tab หรือ = เช่น “ภาษาไทย,8” หากไม่ใส่จะใช้น้ำหนัก 1 รายการซ้ำจะถูกรวมกัน</p>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="word-cloud-filter-title">
        <h2 id="word-cloud-filter-title" className="mb-5 flex items-center gap-2 font-semibold"><TableProperties className="size-4 text-primary" />ตัวกรองและจำนวนคำ</h2>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
          <SettingField id="word-cloud-max-words" label="จำนวนคำสูงสุด" hint="คำที่มีความถี่สูงจะถูกเลือกก่อน">
            <Select value={String(maximumWords)} onValueChange={(value) => changeSetting(setMaximumWords, Number(value))}>
              <SelectTrigger id="word-cloud-max-words" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{[20, 40, 50, 60, 80, 100].map((value) => <SelectItem key={value} value={String(value)}>{value} คำ</SelectItem>)}</SelectContent>
            </Select>
          </SettingField>
          <SettingField id="word-cloud-min-frequency" label="ความถี่ขั้นต่ำ" hint={sourceMode === "weighted-list" ? "โหมดรายการใช้ค่าน้ำหนักโดยตรง" : "ตัดคำที่พบน้อยกว่าค่านี้ออก"}>
            <Select value={String(minimumFrequency)} onValueChange={(value) => changeSetting(setMinimumFrequency, Number(value))} disabled={sourceMode === "weighted-list"}>
              <SelectTrigger id="word-cloud-min-frequency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 5, 10].map((value) => <SelectItem key={value} value={String(value)}>{value} ครั้งขึ้นไป</SelectItem>)}</SelectContent>
            </Select>
          </SettingField>
          <SettingField id="word-cloud-min-length" label="ความยาวคำขั้นต่ำ" hint={sourceMode === "weighted-list" ? "โหมดรายการจะรักษาคำและวลีที่กรอก" : "นับตามตัวอักษร Unicode"}>
            <Select value={String(minimumWordLength)} onValueChange={(value) => changeSetting(setMinimumWordLength, Number(value))} disabled={sourceMode === "weighted-list"}>
              <SelectTrigger id="word-cloud-min-length" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4].map((value) => <SelectItem key={value} value={String(value)}>{value} ตัวอักษรขึ้นไป</SelectItem>)}</SelectContent>
            </Select>
          </SettingField>
        </div>

        {sourceMode === "text" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ToggleCard id="word-cloud-stopwords" label="กรองคำทั่วไปไทยและอังกฤษ" description="เช่น ที่ และ ของ the and เพื่อให้คำสำคัญเด่นขึ้น" checked={excludeCommonWords} onCheckedChange={(checked) => changeSetting(setExcludeCommonWords, checked)} />
            <ToggleCard id="word-cloud-numbers" label="ตัดตัวเลขล้วนออก" description="ยังเก็บคำที่มีทั้งตัวอักษรและตัวเลข เช่น AI2026" checked={excludeNumbers} onCheckedChange={(checked) => changeSetting(setExcludeNumbers, checked)} />
            <div className="grid gap-3 md:col-span-2">
              <Label htmlFor="word-cloud-custom-stopwords" className="leading-5">คำที่ไม่ต้องการเพิ่มเติม</Label>
              <Input id="word-cloud-custom-stopwords" value={customStopWords} onChange={(event) => { setCustomStopWords(event.target.value); invalidate(); }} placeholder="เช่น บริษัท, โครงการ, คำถาม — คั่นด้วย comma หรือขึ้นบรรทัดใหม่" />
              <p className="text-xs leading-5 text-muted-foreground">เหมาะกับการตัดชื่อองค์กรหรือคำที่ปรากฏบ่อยแต่ไม่ช่วยสรุปความหมาย</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="word-cloud-style-title">
        <h2 id="word-cloud-style-title" className="mb-5 flex items-center gap-2 font-semibold"><Palette className="size-4 text-primary" />สีและการจัดวาง</h2>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
          <SettingField id="word-cloud-palette" label="ชุดสี">
            <Select value={palette} onValueChange={(value) => changePalette(value as WordCloudPalette)}>
              <SelectTrigger id="word-cloud-palette" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PALETTE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-1.5" aria-hidden="true">{WORD_CLOUD_PALETTES[palette].map((color) => <span key={color} className="size-5 rounded-full border" style={{ backgroundColor: color }} />)}</div>
          </SettingField>
          <SettingField id="word-cloud-background" label="พื้นหลัง" hint="พื้นโปร่งใสเหมาะกับงานนำเสนอและงานออกแบบ">
            <Select value={background} onValueChange={(value) => changeBackground(value as BackgroundOption)}>
              <SelectTrigger id="word-cloud-background" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cream">ครีม Meaw Café</SelectItem>
                <SelectItem value="white">ขาว</SelectItem>
                <SelectItem value="dark">น้ำตาลเข้ม</SelectItem>
                <SelectItem value="transparent">โปร่งใส</SelectItem>
              </SelectContent>
            </Select>
          </SettingField>
          <SettingField id="word-cloud-rotation" label="ทิศทางคำ" hint="แนวนอนอ่านไทยง่ายที่สุด ส่วนแบบผสมช่วยให้ภาพกระชับ">
            <Select value={rotation} onValueChange={(value) => changeSetting(setRotation, value as WordCloudRotation)}>
              <SelectTrigger id="word-cloud-rotation" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">แนวนอนทั้งหมด</SelectItem>
                <SelectItem value="mixed">ผสมแนวนอนและแนวตั้ง</SelectItem>
              </SelectContent>
            </Select>
          </SettingField>
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600" onClick={generate}><Sparkles className="size-4" />สร้าง Word Cloud</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clearAll} />
          {layout ? <Button type="button" variant="outline" onClick={shuffle}><RefreshCw className="size-4" />สลับตำแหน่ง</Button> : null}
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5" aria-live="polite">
        {!layout || !analysis ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><Cloud className="mx-auto mb-3 size-9 text-primary/70" /><p>ใส่ข้อความหรือรายการคำ แล้วกด “สร้าง Word Cloud”</p><p className="mt-1 text-xs">ตัวอย่างภาพและตารางความถี่จะแสดงที่นี่</p></div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={sourceMode === "text" ? "คำที่นับหลังกรอง" : "น้ำหนักรวม"} value={countFormatter.format(analysis.totalTokens)} testId="word-cloud-token-count" />
              <StatCard label="คำไม่ซ้ำก่อนจำกัดจำนวน" value={integerFormatter.format(analysis.uniqueWords)} />
              <StatCard label="คำที่แสดงในภาพ" value={integerFormatter.format(layout.words.length)} testId="word-cloud-visible-count" />
              <StatCard label="คำที่ถูกกรองหรือพื้นที่ไม่พอ" value={integerFormatter.format(analysis.filteredWords + layout.omittedWords)} />
            </div>

            <section className="rounded-xl border bg-muted/5 p-3 sm:p-5" aria-labelledby="word-cloud-preview-title">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h2 id="word-cloud-preview-title" className="font-semibold">ตัวอย่าง Word Cloud</h2><p className="mt-1 text-xs text-muted-foreground">ขนาดมาตรฐาน 1,000 × 600 px · PNG ดาวน์โหลดที่ความละเอียด 2×</p></div>
                <ActionBar>
                  <Button type="button" variant="outline" onClick={() => void downloadPng()} disabled={exporting}><FileImage className="size-4" />{exporting ? "กำลังสร้าง PNG..." : "ดาวน์โหลด PNG 2×"}</Button>
                  <Button type="button" variant="outline" onClick={downloadSvg}><Download className="size-4" />ดาวน์โหลด SVG</Button>
                </ActionBar>
              </div>
              <div className="overflow-hidden rounded-xl border bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
                <svg data-testid="word-cloud-preview" viewBox={`0 0 ${layout.width} ${layout.height}`} className="block h-auto w-full" role="img" aria-labelledby="word-cloud-preview-svg-title word-cloud-preview-svg-desc">
                  <title id="word-cloud-preview-svg-title">ตัวอย่าง Word Cloud</title>
                  <desc id="word-cloud-preview-svg-desc">ภาพแสดงคำตามความถี่จำนวน {layout.words.length} คำ</desc>
                  {BACKGROUNDS[background] !== "transparent" ? <rect width={layout.width} height={layout.height} fill={BACKGROUNDS[background]} /> : null}
                  {layout.words.map((word) => (
                    <text key={`${word.text}-${word.x}-${word.y}`} x={word.x} y={word.y} textAnchor="middle" dominantBaseline="central" fontFamily="Noto Sans Thai, Tahoma, Arial, sans-serif" fontSize={word.fontSize} fontWeight="700" fill={word.color} transform={word.rotation ? `rotate(${word.rotation} ${word.x} ${word.y})` : undefined}>
                      <title>{word.text}: {countFormatter.format(word.count)}</title>{word.text}
                    </text>
                  ))}
                </svg>
              </div>
              {layout.omittedWords ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-700 dark:text-amber-300"><Info className="mt-0.5 size-4 shrink-0" />มี {layout.omittedWords} คำที่จัดลงพื้นที่ไม่ได้ {rotation === "mixed" ? "ลองลดจำนวนคำหรือใช้แนวนอนทั้งหมด" : "ลองกดสลับตำแหน่งหรือลดจำนวนคำ"}</p> : null}
            </section>

            <section className="rounded-xl border p-4 sm:p-5" aria-labelledby="word-cloud-frequency-title">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h2 id="word-cloud-frequency-title" className="font-semibold">ตารางความถี่</h2><p className="mt-1 text-xs text-muted-foreground">เรียงจากจำนวนมากไปน้อย ใช้ตรวจผลการตัดคำก่อนดาวน์โหลด</p></div>
                <ActionBar>
                  <Button type="button" variant="outline" onClick={() => void copyText(frequencyText, "คัดลอกตารางความถี่แล้ว")}><TableProperties className="size-4" />คัดลอกตาราง</Button>
                  <Button type="button" variant="outline" onClick={downloadCsv}><Download className="size-4" />ดาวน์โหลด CSV</Button>
                </ActionBar>
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border" tabIndex={0} aria-label="ตารางความถี่แบบเลื่อนได้">
                <table className="w-full min-w-80 text-sm">
                  <thead className="sticky top-0 bg-card"><tr className="border-b"><th scope="col" className="w-16 px-4 py-3 text-left font-semibold">อันดับ</th><th scope="col" className="px-4 py-3 text-left font-semibold">คำ / วลี</th><th scope="col" className="w-28 px-4 py-3 text-right font-semibold">ความถี่</th></tr></thead>
                  <tbody>{analysis.words.map((word, index) => <tr key={word.text} className="border-b last:border-0"><td className="px-4 py-3 tabular-nums text-muted-foreground">{index + 1}</td><td className="px-4 py-3 font-medium">{word.text}</td><td className="px-4 py-3 text-right tabular-nums">{countFormatter.format(word.count)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>Word Cloud แสดงความถี่ ไม่ได้วิเคราะห์ความหมาย ความรู้สึก หรือความสัมพันธ์ของคำ ควรอ่านบริบทต้นฉบับร่วมด้วย โดยเฉพาะงานวิจัยและคำตอบแบบสอบถาม</span></p>
        <p className="mt-2">การตัดคำใช้ความสามารถของ Browser และอาจแยกคำเฉพาะ ชื่อบุคคล หรือคำประสมต่างจากที่คาด แท็บรายการคำ/วลีช่วยควบคุมผลลัพธ์ได้แม่นยำกว่า</p>
      </div>
    </WorkspaceFrame>
  );
}
