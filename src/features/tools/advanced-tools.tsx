"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { diffLines, type Change } from "diff";
import { Play, Rows3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, PanelLabel, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { describeCronThai, nextCronRuns, validateCron } from "@/lib/tools/cron";
import { DIFF_SIDE_LIMIT_BYTES, REGEX_TEXT_LIMIT, assertWithinLimit } from "@/lib/tools/limits";

type RegexMatch = { value: string; index: number; groups: string[] };
type RegexResponse = { ok: true; matches: RegexMatch[]; preview: string } | { ok: false; error: string };
const riskyRegex = /(\([^)]*[+*][^)]*\))[+*{]|(\.\*){2,}|(\.\+){2,}/;
export function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matches, setMatches] = useState<RegexMatch[]>([]);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const run = () => {
    setError("");
    setMatches([]);
    setPreview("");
    if (!pattern) { setError("กรุณากรอก Regex pattern"); return; }
    if (text.length > REGEX_TEXT_LIMIT) { setError("ข้อความยาวเกิน 100,000 ตัวอักษร"); return; }
    if (riskyRegex.test(pattern)) { setError("Pattern มี quantifier ซ้อนกันและเสี่ยงทำให้ Browser ค้าง กรุณาปรับ pattern"); return; }

    workerRef.current?.terminate();
    const worker = new Worker(new URL("./regex.worker.ts", import.meta.url));
    workerRef.current = worker;
    const timer = window.setTimeout(() => {
      worker.terminate();
      setError("Regex ใช้เวลานานเกิน 750ms และถูกหยุดเพื่อป้องกัน Browser ค้าง");
    }, 750);

    worker.onmessage = (event: MessageEvent<RegexResponse>) => {
      window.clearTimeout(timer);
      worker.terminate();
      if (event.data.ok) {
        setMatches(event.data.matches);
        setPreview(event.data.preview);
        toast.success(`พบ ${event.data.matches.length} match`);
      } else setError(event.data.error);
    };
    worker.onerror = () => {
      window.clearTimeout(timer);
      worker.terminate();
      setError("ไม่สามารถประมวลผล Regex ได้");
    };
    worker.postMessage({ pattern, flags, text, replacement });
  };

  const clear = () => {
    setPattern("");
    setText("");
    setReplacement("");
    setMatches([]);
    setPreview("");
    setError("");
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <Label htmlFor="regex-pattern">Pattern</Label>
          <Input id="regex-pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} className="font-mono" placeholder="\\b[A-Z]+\\b" />
        </div>
        <div>
          <Label htmlFor="regex-flags">Flags</Label>
          <Input id="regex-flags" value={flags} onChange={(event) => setFlags(event.target.value.replace(/[^gimsuy]/g, ""))} className="font-mono" placeholder="gim" />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="regex-text">ข้อความทดสอบ</Label>
        <Textarea id="regex-text" value={text} onChange={(event) => setText(event.target.value)} className="min-h-52 font-mono" />
      </div>
      <div className="mt-4">
        <Label htmlFor="regex-replace">Replace preview (ไม่บังคับ)</Label>
        <Input id="regex-replace" value={replacement} onChange={(event) => setReplacement(event.target.value)} className="font-mono" />
      </div>
      <div className="mt-4">
        <ActionBar>
          <Button onClick={run}><Play className="size-4" />ทดสอบ</Button>
          <ExampleButton onExample={() => { setPattern("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"); setFlags("gi"); setText("ติดต่อ dev@example.com หรือ support@devthai.tools"); }} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <PanelLabel meta={`${matches.length} match`}>Matches</PanelLabel>
          {matches.length ? (
            <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3">
              {matches.map((match, index) => <div key={`${match.index}-${index}`} className="rounded-md bg-muted p-3 text-sm"><p><Badge variant="secondary">index {match.index}</Badge> <code>{match.value}</code></p>{match.groups.length ? <p className="mt-2 text-xs text-muted-foreground">Groups: {match.groups.join(" · ")}</p> : null}</div>)}
            </div>
          ) : <EmptyOutput text="Match, index และ capture group จะแสดงที่นี่" />}
        </div>
        <div>
          <PanelLabel>Replace Preview</PanelLabel>
          {preview ? <Textarea value={preview} readOnly className="min-h-72 font-mono" /> : <EmptyOutput text="กรอก replacement เพื่อดูตัวอย่าง" />}
        </div>
      </div>
    </WorkspaceFrame>
  );
}

type DiffView="inline"|"split";
export function DiffTool(){const [left,setLeft]=useState("");const [right,setRight]=useState("");const [ignoreWhitespace,setIgnoreWhitespace]=useState(false);const [ignoreCase,setIgnoreCase]=useState(false);const [view,setView]=useState<DiffView>("inline");const [changes,setChanges]=useState<Change[]>([]);const [error,setError]=useState("");const run=()=>{try{assertWithinLimit(left,DIFF_SIDE_LIMIT_BYTES);assertWithinLimit(right,DIFF_SIDE_LIMIT_BYTES);if(!left&&!right)throw new Error("กรุณากรอกข้อความอย่างน้อยหนึ่งฝั่ง");const normalize=(value:string)=>{let next=value;if(ignoreWhitespace)next=next.split("\n").map((line)=>line.trim().replace(/\s+/g," ")).join("\n");if(ignoreCase)next=next.toLocaleLowerCase("th");return next;};setChanges(diffLines(normalize(left),normalize(right)));setError("");toast.success("เปรียบเทียบข้อความแล้ว");}catch(caught){setError(caught instanceof Error?caught.message:"เปรียบเทียบไม่สำเร็จ");setChanges([]);}};const summary=useMemo(()=>({added:changes.filter((item)=>item.added).reduce((sum,item)=>sum+(item.count??0),0),removed:changes.filter((item)=>item.removed).reduce((sum,item)=>sum+(item.count??0),0)}),[changes]);return <WorkspaceFrame><div className="grid gap-4 lg:grid-cols-2"><div><PanelLabel>ข้อความเดิม</PanelLabel><Textarea value={left} onChange={(event)=>setLeft(event.target.value)} className="min-h-60 font-mono" aria-label="ข้อความเดิม"/></div><div><PanelLabel>ข้อความใหม่</PanelLabel><Textarea value={right} onChange={(event)=>setRight(event.target.value)} className="min-h-60 font-mono" aria-label="ข้อความใหม่"/></div></div><div className="mt-4 flex flex-wrap items-center gap-3"><ActionBar><Button onClick={run}><Rows3 className="size-4"/>เปรียบเทียบ</Button><ExampleButton onExample={()=>{setLeft("Meaw Tools\nใช้งานง่าย");setRight("Meaw Tools\nใช้งานฟรีและง่าย");}}/><ClearButton onClear={()=>{setLeft("");setRight("");setChanges([]);setError("");}}/></ActionBar><label className="flex items-center gap-2 text-sm">Ignore whitespace <Switch checked={ignoreWhitespace} onCheckedChange={setIgnoreWhitespace}/></label><label className="flex items-center gap-2 text-sm">Ignore case <Switch checked={ignoreCase} onCheckedChange={setIgnoreCase}/></label><Select value={view} onValueChange={(value)=>setView(value as DiffView)}><SelectTrigger className="ml-auto w-40" aria-label="รูปแบบ diff"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="inline">Inline</SelectItem><SelectItem value="split">Side by side</SelectItem></SelectContent></Select></div>{error?<p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>:null}<div className="mt-4"><PanelLabel meta={changes.length?`เพิ่ม ${summary.added} · ลบ ${summary.removed}`:undefined}>Diff Result</PanelLabel>{changes.length?view==="inline"?<pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm">{changes.map((change,index)=><span key={index} className={change.added?"bg-green-500/20 text-green-800 dark:text-green-300":change.removed?"bg-red-500/20 text-red-800 line-through dark:text-red-300":""}>{change.value}</span>)}</pre>:<div className="grid gap-2 sm:grid-cols-2"><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-red-500/5 p-4 text-sm">{changes.filter((change)=>!change.added).map((change,index)=><span key={index} className={change.removed?"bg-red-500/20":""}>{change.value}</span>)}</pre><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-green-500/5 p-4 text-sm">{changes.filter((change)=>!change.removed).map((change,index)=><span key={index} className={change.added?"bg-green-500/20":""}>{change.value}</span>)}</pre></div>:<EmptyOutput/>}</div></WorkspaceFrame>}

const cronField=z.string().regex(/^\*$|^\*\/\d+$|^\d+$|^\d+-\d+$/, "ใช้ *, */n, n หรือ n-n");
const cronSchema=z.object({minute:cronField,hour:cronField,day:cronField,month:cronField,weekday:cronField});
type CronForm=z.infer<typeof cronSchema>;
export function CronTool(){const {register,handleSubmit,reset,formState:{errors}}=useForm<CronForm>({resolver:zodResolver(cronSchema),defaultValues:{minute:"0",hour:"8",day:"*",month:"*",weekday:"1-5"}});const [expression,setExpression]=useState("");const [runs,setRuns]=useState<Date[]>([]);const [error,setError]=useState("");const submit=(values:CronForm)=>{const next=`${values.minute} ${values.hour} ${values.day} ${values.month} ${values.weekday}`;if(!validateCron(next)){setError("Cron Expression ไม่ถูกต้องหรือค่าอยู่นอกช่วง");return;}setExpression(next);setRuns(nextCronRuns(next));setError("");toast.success("สร้าง Cron Expression แล้ว");};return <WorkspaceFrame><form onSubmit={handleSubmit(submit)}><div className="grid gap-3 sm:grid-cols-5">{[["minute","Minute (0–59)"],["hour","Hour (0–23)"],["day","Day (1–31)"],["month","Month (1–12)"],["weekday","Weekday (0–6)"]].map(([name,label])=><div key={name}><Label htmlFor={`cron-${name}`}>{label}</Label><Input id={`cron-${name}`} {...register(name as keyof CronForm)} className="mt-1 font-mono" aria-invalid={Boolean(errors[name as keyof CronForm])}/>{errors[name as keyof CronForm]?<p className="mt-1 text-xs text-destructive">{errors[name as keyof CronForm]?.message}</p>:null}</div>)}</div><div className="mt-4"><ActionBar><Button type="submit"><Play className="size-4"/>สร้าง Cron</Button><ExampleButton onExample={()=>reset({minute:"0",hour:"8",day:"*",month:"*",weekday:"1-5"})}/><ClearButton onClear={()=>{reset({minute:"*",hour:"*",day:"*",month:"*",weekday:"*"});setExpression("");setRuns([]);setError("");}}/><CopyButton value={expression}/></ActionBar></div></form>{error?<p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>:null}<div className="mt-4 grid gap-4 lg:grid-cols-2"><div><PanelLabel>Cron Expression</PanelLabel>{expression?<div className="rounded-lg border bg-muted/20 p-6"><p className="break-all font-mono text-2xl font-semibold">{expression}</p><p className="mt-3 text-sm text-muted-foreground">{describeCronThai(expression)}</p></div>:<EmptyOutput text="กรอกแบบฟอร์มแล้วกด “สร้าง Cron”"/>}</div><div><PanelLabel>รอบเวลาถัดไป (เวลาท้องถิ่น)</PanelLabel>{runs.length?<ol className="space-y-2 rounded-lg border p-4">{runs.map((run,index)=><li key={run.toISOString()} className="flex items-center gap-3 text-sm"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">{index+1}</span><span>{run.toLocaleString("th-TH")}</span></li>)}</ol>:<EmptyOutput text="เวลาทำงานถัดไปจะแสดงที่นี่"/>}</div></div><p className="mt-4 text-xs text-muted-foreground">Cron แบบ 5 ช่องใช้ timezone ของระบบที่นำไป deploy โปรดตรวจเอกสารของ platform ก่อนใช้งานจริง</p></WorkspaceFrame>}
