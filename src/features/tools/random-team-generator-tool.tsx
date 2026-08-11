"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ClipboardList, Copy, Dices, Download, Eraser, FlaskConical, Printer, RefreshCw, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import {
  RANDOM_TEAM_DEFAULT_SKILL,
  RANDOM_TEAM_MAX_PARTICIPANTS,
  generateRandomTeams,
  parseTeamParticipants,
  randomTeamsCsv,
  randomTeamsSummary,
  type GeneratedTeam,
  type TeamGenerationMode,
  type TeamGenerationResult,
  type TeamSplitMethod,
} from "@/lib/tools/random-team-generator";

const RANDOM_EXAMPLE = ["มะลิ", "สมชาย", "น้ำฝน", "ต้นกล้า", "ฟ้าใส", "ภูผา", "ใบหม่อน", "นนท์", "พิม", "อาร์ม", "ข้าวหอม", "เจ"].join("\n");
const BALANCED_EXAMPLE = ["มะลิ,5", "สมชาย,4", "น้ำฝน,3", "ต้นกล้า,2", "ฟ้าใส,1", "ภูผา,5", "ใบหม่อน,4", "นนท์,3", "พิม,2", "อาร์ม,1", "ข้าวหอม", "เจ"].join("\n");
const TEAM_STYLES = [
  "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300",
  "border-sky-500/30 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300",
  "border-violet-500/30 bg-violet-500/[0.06] text-violet-700 dark:text-violet-300",
  "border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300",
  "border-rose-500/30 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300",
  "border-cyan-500/30 bg-cyan-500/[0.06] text-cyan-700 dark:text-cyan-300",
] as const;

function teamCopyText(team: GeneratedTeam, mode: TeamGenerationMode): string {
  return `${team.name}\n${team.members.map((member, index) => `${index + 1}. ${member.name}${mode === "balanced" ? ` (${member.skill ?? RANDOM_TEAM_DEFAULT_SKILL}${member.skill === null ? "*" : ""})` : ""}`).join("\n")}`;
}

function TeamCard({ team, index, mode }: { team: GeneratedTeam; index: number; mode: TeamGenerationMode }) {
  const style = TEAM_STYLES[index % TEAM_STYLES.length] ?? TEAM_STYLES[0];
  return (
    <article className={`min-w-0 rounded-2xl border p-4 shadow-sm [content-visibility:auto] ${style}`} aria-labelledby={`generated-team-${index}`} data-testid="generated-team">
      <div className="flex items-start justify-between gap-3 border-b border-current/15 pb-3">
        <div className="min-w-0">
          <h3 id={`generated-team-${index}`} className="truncate font-heading text-lg font-bold">{team.name}</h3>
          <p className="mt-1 text-xs text-current/75">{team.members.length} คน{team.skillAverage === null ? "" : ` • เฉลี่ย ${team.skillAverage.toFixed(2)}`}</p>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" className="shrink-0 text-current hover:text-current" onClick={() => void copyText(teamCopyText(team, mode), `คัดลอก ${team.name} แล้ว`)} aria-label={`คัดลอก ${team.name}`}><Copy /></Button>
      </div>
      <ol className="mt-3 space-y-2">
        {team.members.map((member, memberIndex) => (
          <li key={`${member.name}-${memberIndex}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-current/10 bg-background/65 px-3 py-2 text-foreground backdrop-blur-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-current/10 text-xs font-bold text-current">{memberIndex + 1}</span>
            <span className="min-w-0 flex-1 break-words text-sm font-medium">{member.name}</span>
            {mode === "balanced" ? <span className="shrink-0 rounded-full border bg-background/80 px-2 py-0.5 text-xs font-semibold" aria-label={member.skill === null ? `ใช้คะแนนเริ่มต้น ${RANDOM_TEAM_DEFAULT_SKILL}` : `คะแนน ${member.skill}`}>{member.skill ?? RANDOM_TEAM_DEFAULT_SKILL}{member.skill === null ? "*" : ""}</span> : null}
          </li>
        ))}
      </ol>
    </article>
  );
}

function TeamResults({ result, onReshuffle }: { result: TeamGenerationResult; onReshuffle: () => void }) {
  const summary = useMemo(() => randomTeamsSummary(result), [result]);
  return (
    <div className="random-team-print-surface" data-testid="team-results" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="secondary"><Sparkles />แบ่งกลุ่มสำเร็จ</Badge>
          <h2 className="mt-2 font-heading text-xl font-bold">{result.participantCount} คน • {result.teams.length} ทีม</h2>
          <p className="mt-1 text-sm text-muted-foreground">{result.mode === "balanced" ? "กระจายคะแนนด้วย Snake draft" : "สุ่มลำดับด้วย Web Crypto"}</p>
        </div>
        <div className="random-team-no-print"><ActionBar>
          <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกผลแบ่งทีมแล้ว")} data-testid="team-copy"><ClipboardList />คัดลอกทั้งหมด</Button>
          <Button type="button" variant="outline" onClick={() => downloadText(randomTeamsCsv(result), "meaw-random-teams.csv", "text/csv;charset=utf-8")} data-testid="team-csv"><Download />CSV</Button>
          <Button type="button" variant="outline" onClick={() => window.print()}><Printer />พิมพ์</Button>
          <Button type="button" onClick={onReshuffle} data-testid="team-reshuffle"><RefreshCw />สุ่มใหม่</Button>
        </ActionBar></div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3" data-testid="team-balance-summary">
        <div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">จำนวนสมาชิก</p><p className="mt-1 font-mono text-lg font-bold">{result.memberCountMin === result.memberCountMax ? `${result.memberCountMin} คน/ทีม` : `${result.memberCountMin}–${result.memberCountMax} คน`}</p></div>
        <div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">ส่วนต่างจำนวนคน</p><p className="mt-1 font-mono text-lg font-bold">{result.memberCountMax - result.memberCountMin}</p></div>
        <div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">{result.mode === "balanced" ? "ส่วนต่างคะแนนเฉลี่ย" : "ชื่อซ้ำที่ตัดออก"}</p><p className="mt-1 font-mono text-lg font-bold" data-testid="team-skill-difference">{result.mode === "balanced" ? (result.skillAverageDifference ?? 0).toFixed(2) : result.duplicateNames.length}</p></div>
      </div>

      {result.duplicateNames.length || result.assumedSkillCount ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {result.duplicateNames.length ? <Badge variant="outline">ตัดชื่อซ้ำ {result.duplicateNames.length} รายการ</Badge> : null}
          {result.assumedSkillCount ? <Badge variant="outline">ใช้คะแนนเริ่มต้น {RANDOM_TEAM_DEFAULT_SKILL} จำนวน {result.assumedSkillCount} คน</Badge> : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 print:grid-cols-2" data-testid="team-grid">
        {result.teams.map((team, index) => <TeamCard key={team.name} team={team} index={index} mode={result.mode} />)}
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <BarChart3 className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>วิธีอ่านคำว่า “สมดุล”</AlertTitle>
        <AlertDescription>ระบบเรียงคะแนนสูงไปต่ำ สุ่มลำดับเมื่อคะแนนเท่ากัน แล้วแจกแบบกลับทิศในแต่ละรอบเพื่อกระจายคะแนน ไม่ได้ประเมินทักษะให้เองและไม่รับประกันว่าทีมจะมีผลงานเท่ากัน{result.assumedSkillCount ? ` เครื่องหมาย * คือผู้ที่ใช้คะแนนเริ่มต้น ${RANDOM_TEAM_DEFAULT_SKILL}` : ""}</AlertDescription>
      </Alert>
    </div>
  );
}

export function RandomTeamGeneratorTool() {
  const { motionEnabled } = useMotionPreference();
  const [names, setNames] = useState("");
  const [mode, setMode] = useState<TeamGenerationMode>("random");
  const [splitMethod, setSplitMethod] = useState<TeamSplitMethod>("team-count");
  const [splitValue, setSplitValue] = useState("2");
  const [teamNamePrefix, setTeamNamePrefix] = useState("ทีม");
  const [result, setResult] = useState<TeamGenerationResult | null>(null);
  const [error, setError] = useState("");
  const [isShuffling, setIsShuffling] = useState(false);
  const revealTimerRef = useRef<number | null>(null);

  const preview = useMemo(() => {
    try { return parseTeamParticipants(names, mode === "balanced"); }
    catch { return { participants: [], duplicateNames: [], assumedSkillCount: 0 }; }
  }, [mode, names]);

  useEffect(() => () => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
  }, []);

  const resetResult = () => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
    setResult(null);
    setError("");
    setIsShuffling(false);
  };

  const updateNames = (value: string) => { setNames(value); resetResult(); };

  const generate = () => {
    try {
      const nextResult = generateRandomTeams({ names, mode, splitMethod, splitValue: Number(splitValue), teamNamePrefix });
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
      setError("");
      if (!motionEnabled) {
        setResult(nextResult);
        setIsShuffling(false);
      } else {
        setResult(null);
        setIsShuffling(true);
        revealTimerRef.current = window.setTimeout(() => {
          setResult(nextResult);
          setIsShuffling(false);
          revealTimerRef.current = null;
        }, 520);
      }
      toast.success(`แบ่ง ${nextResult.participantCount} คน เป็น ${nextResult.teams.length} ทีมแล้ว`);
    } catch (caught) {
      setResult(null);
      setIsShuffling(false);
      setError(caught instanceof Error ? caught.message : "แบ่งทีมไม่สำเร็จ กรุณาตรวจข้อมูลอีกครั้ง");
    }
  };

  const loadExample = () => {
    const balanced = mode === "balanced";
    setNames(balanced ? BALANCED_EXAMPLE : RANDOM_EXAMPLE);
    setSplitMethod("team-count");
    setSplitValue("3");
    setTeamNamePrefix("ทีม");
    resetResult();
  };

  const clear = () => {
    setNames("");
    setMode("random");
    setSplitMethod("team-count");
    setSplitValue("2");
    setTeamNamePrefix("ทีม");
    resetResult();
    toast.info("ล้างรายชื่อและผลแบ่งทีมแล้ว");
  };

  return (
    <WorkspaceFrame>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,.8fr)_minmax(0,1.2fr)]">
        <form className="space-y-5 print:hidden" onSubmit={(event) => { event.preventDefault(); generate(); }} aria-labelledby="team-generator-form-heading">
          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 id="team-generator-form-heading" className="font-heading text-lg font-bold">รายชื่อผู้เข้าร่วม</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">หนึ่งคนต่อหนึ่งบรรทัด • ระบบตัดช่องว่างและชื่อซ้ำให้อัตโนมัติ</p></div>
              <Badge variant="secondary" data-testid="team-participant-count"><UsersRound />{preview.participants.length}/{RANDOM_TEAM_MAX_PARTICIPANTS}</Badge>
            </div>
            <div className="mt-4 space-y-2.5">
              <Label htmlFor="team-participants">ชื่อผู้เข้าร่วม{mode === "balanced" ? " และคะแนน" : ""}</Label>
              <Textarea id="team-participants" value={names} onChange={(event) => updateNames(event.target.value)} className="min-h-72 resize-y leading-7" placeholder={mode === "balanced" ? "มะลิ,5\nสมชาย,3\nน้ำฝน,1\nต้นกล้า" : "มะลิ\nสมชาย\nน้ำฝน\nต้นกล้า"} data-testid="team-names" aria-describedby="team-participants-hint" />
              <p id="team-participants-hint" className="text-xs leading-5 text-muted-foreground">{mode === "balanced" ? `ใส่ “ชื่อ,คะแนน” 1–5 คนที่ไม่ระบุคะแนนจะใช้ ${RANDOM_TEAM_DEFAULT_SKILL} และแสดง * ในผลลัพธ์` : "ชื่อที่เหมือนกันโดยไม่สนตัวพิมพ์ใหญ่–เล็กจะใช้เพียงครั้งเดียว"}</p>
            </div>
            <div className="mt-4"><ActionBar><Button type="button" size="sm" variant="outline" onClick={loadExample}><FlaskConical />ตัวอย่าง</Button><Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={clear} disabled={!names && !result}><Eraser />ล้าง</Button></ActionBar></div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">วิธีแบ่งทีม</h2>
            <div className="mt-4 space-y-2.5">
              <Label>รูปแบบการสุ่ม</Label>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="รูปแบบการสุ่ม">
                <Button type="button" variant={mode === "random" ? "default" : "outline"} className="h-auto min-h-14 flex-col gap-1 py-2" aria-pressed={mode === "random"} onClick={() => { setMode("random"); resetResult(); }} data-testid="team-mode-random"><Dices />สุ่มล้วน<span className="text-[10px] font-normal opacity-75">ทุกคนโอกาสเท่ากัน</span></Button>
                <Button type="button" variant={mode === "balanced" ? "default" : "outline"} className="h-auto min-h-14 flex-col gap-1 py-2" aria-pressed={mode === "balanced"} onClick={() => { setMode("balanced"); resetResult(); }} data-testid="team-mode-balanced"><BarChart3 />สมดุลคะแนน<span className="text-[10px] font-normal opacity-75">กระจายคะแนน 1–5</span></Button>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              <Label>กำหนดขนาดผลลัพธ์</Label>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="กำหนดขนาดผลลัพธ์">
                <Button type="button" variant={splitMethod === "team-count" ? "secondary" : "outline"} aria-pressed={splitMethod === "team-count"} onClick={() => { setSplitMethod("team-count"); setSplitValue("2"); resetResult(); }} data-testid="team-split-count">จำนวนทีม</Button>
                <Button type="button" variant={splitMethod === "members-per-team" ? "secondary" : "outline"} aria-pressed={splitMethod === "members-per-team"} onClick={() => { setSplitMethod("members-per-team"); setSplitValue("4"); resetResult(); }} data-testid="team-split-size">คนต่อทีม</Button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2.5"><Label htmlFor="team-split-value">{splitMethod === "team-count" ? "จำนวนทีม" : "จำนวนคนต่อทีม"}</Label><Input id="team-split-value" type="number" inputMode="numeric" min={splitMethod === "team-count" ? 2 : 1} max={splitMethod === "team-count" ? 50 : 100} step="1" value={splitValue} onChange={(event) => { setSplitValue(event.target.value); resetResult(); }} data-testid="team-split-value" /></div>
              <div className="space-y-2.5"><Label htmlFor="team-name-prefix">คำนำหน้าชื่อทีม</Label><Input id="team-name-prefix" value={teamNamePrefix} maxLength={30} onChange={(event) => { setTeamNamePrefix(event.target.value); resetResult(); }} placeholder="ทีม" data-testid="team-prefix" /></div>
            </div>
            {error ? <Alert variant="destructive" className="mt-4"><AlertTitle>ยังแบ่งทีมไม่ได้</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="submit" size="lg" className="mt-5 h-12 w-full" disabled={isShuffling} data-testid="team-generate"><Dices className={isShuffling ? "animate-spin motion-reduce:animate-none" : ""} />{isShuffling ? "กำลังสับรายชื่อ…" : "สุ่มและแบ่งทีม"}</Button>
          </section>

          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="text-emerald-700 dark:text-emerald-300" /><AlertTitle>รายชื่ออยู่ในหน้าปัจจุบันเท่านั้น</AlertTitle><AlertDescription>ไม่ส่งไป API ไม่บันทึกลง Server หรือ localStorage และจะหายเมื่อ refresh หรือปิดหน้า หากต้องเก็บผลให้คัดลอก ดาวน์โหลด CSV หรือพิมพ์ก่อนออกจากหน้า</AlertDescription>
          </Alert>
        </form>

        <section className="min-w-0 rounded-2xl border bg-primary/[0.025] p-4 sm:p-5" aria-label="ผลการแบ่งทีม">
          {isShuffling ? (
            <div className="grid min-h-[34rem] place-items-center text-center" role="status" aria-live="polite" data-testid="team-shuffling"><div><span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary"><Dices className="size-10 animate-spin motion-reduce:animate-none" /></span><p className="mt-5 font-heading text-xl font-bold">กำลังสับรายชื่ออย่างยุติธรรม…</p><p className="mt-2 text-sm text-muted-foreground">จัดขนาดทีมและคำนวณความสมดุล</p></div></div>
          ) : result ? <TeamResults result={result} onReshuffle={generate} /> : (
            <div className="grid min-h-[34rem] place-items-center rounded-2xl border border-dashed bg-card/45 p-6 text-center" data-testid="team-empty-state">
              <div className="max-w-md"><span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary"><UsersRound className="size-10" /></span><h2 className="mt-5 font-heading text-xl font-bold">พร้อมแบ่งกลุ่มโดยไม่ลำเอียง</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">วางรายชื่อ เลือกจำนวนทีม แล้วกดสุ่ม เหมาะกับห้องเรียน กีฬา Workshop, Breakout room และกิจกรรมทีม</p><div className="mt-5 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3"><div className="rounded-xl border bg-background/65 p-3">🎓 แบ่งกลุ่มนักเรียน</div><div className="rounded-xl border bg-background/65 p-3">⚽ สุ่มทีมกีฬา</div><div className="rounded-xl border bg-background/65 p-3">💼 ทีม Workshop</div></div></div>
            </div>
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}
