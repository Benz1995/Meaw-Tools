"use client";

import { Calculator, CheckCircle2, ExternalLink, GraduationCap, Info, Plus, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COURSE_GRADE_LIMIT,
  GRADE_OPTIONS,
  GPA_TERM_LIMIT,
  calculateCourseGpa,
  calculateCumulativeGpax,
  type CourseGpaResult,
  type GradeSymbol,
  type CumulativeGpaxResult,
} from "@/lib/tools/grades";

type CourseDraft = { id: string; name: string; credits: string; grade: GradeSymbol };
type TermDraft = { id: string; name: string; credits: string; gpa: string };
type CalculatorMode = "courses" | "terms";

const MFU_GRADE_GUIDE_URL = "https://reg.mfu.ac.th/backend/api/files/media_library/CAL_2022-09-07%2013%3A40%3A41.809577.pdf";
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const pointsFormatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let draftSequence = 0;

function nextDraftId(prefix: "course" | "term") {
  draftSequence += 1;
  return `${prefix}-${draftSequence}`;
}

function newCourse(name = "", credits = "", grade: GradeSymbol = "A"): CourseDraft {
  return { id: nextDraftId("course"), name, credits, grade };
}

function newTerm(name = "", credits = "", gpa = ""): TermDraft {
  return { id: nextDraftId("term"), name, credits, gpa };
}

function parseRequiredNumber(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function averageSummary(label: string, result: CourseGpaResult | CumulativeGpaxResult, estimated = false) {
  return [
    `${label} — Meaw Tools`,
    `คะแนนถ่วงน้ำหนักรวม: ${pointsFormatter.format(result.totalWeightedPoints)}`,
    `หน่วยกิตรวม: ${numberFormatter.format(result.totalCredits)}`,
    `ค่าคำนวณ: ${result.exactAverage.toFixed(4)}`,
    `ปัดทศนิยม 2 ตำแหน่ง: ${result.roundedAverage.toFixed(2)}`,
    `ตัดทศนิยม 2 ตำแหน่ง: ${result.truncatedAverage.toFixed(2)}`,
    estimated ? "หมายเหตุ: เป็นค่าประมาณจาก GPA รายเทอมที่กรอก ซึ่งอาจถูกปัดมาแล้ว" : "หมายเหตุ: โปรดตรวจนโยบายการปัดเศษและรายวิชาที่นับกับสถาบันของคุณ",
  ].join("\n");
}

function AverageCards({ result, primaryLabel, testId }: { result: CourseGpaResult | CumulativeGpaxResult; primaryLabel: string; testId: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:col-span-2 xl:col-span-1">
        <p className="text-xs text-muted-foreground">{primaryLabel}</p>
        <p data-testid={testId} className="mt-1 text-3xl font-bold text-primary tabular-nums">{result.roundedAverage.toFixed(2)}</p>
        <p className="mt-1 text-xs text-muted-foreground">แบบปัดทศนิยม 2 ตำแหน่ง</p>
      </div>
      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground">แบบตัดทศนิยม</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{result.truncatedAverage.toFixed(2)}</p>
        <p className="mt-1 text-xs text-muted-foreground">แสดงไว้เทียบข้อกำหนดสถาบัน</p>
      </div>
      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground">หน่วยกิตที่นำมาคำนวณ</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{numberFormatter.format(result.totalCredits)}</p>
      </div>
      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground">คะแนนถ่วงน้ำหนักรวม</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{pointsFormatter.format(result.totalWeightedPoints)}</p>
      </div>
    </div>
  );
}

export function GradeCalculatorTool() {
  const [mode, setMode] = useState<CalculatorMode>("courses");
  const [courses, setCourses] = useState<CourseDraft[]>(() => [newCourse()]);
  const [terms, setTerms] = useState<TermDraft[]>(() => [newTerm()]);
  const [courseResult, setCourseResult] = useState<CourseGpaResult | null>(null);
  const [termResult, setTermResult] = useState<CumulativeGpaxResult | null>(null);
  const [courseError, setCourseError] = useState("");
  const [termError, setTermError] = useState("");

  const invalidateCourses = () => { setCourseResult(null); setCourseError(""); };
  const invalidateTerms = () => { setTermResult(null); setTermError(""); };

  const updateCourse = (id: string, patch: Partial<CourseDraft>) => {
    setCourses((current) => current.map((course) => course.id === id ? { ...course, ...patch } : course));
    invalidateCourses();
  };

  const updateTerm = (id: string, patch: Partial<TermDraft>) => {
    setTerms((current) => current.map((term) => term.id === id ? { ...term, ...patch } : term));
    invalidateTerms();
  };

  const addCourse = () => {
    if (courses.length >= COURSE_GRADE_LIMIT) { setCourseError(`เพิ่มได้สูงสุด ${COURSE_GRADE_LIMIT} รายวิชา`); return; }
    setCourses((current) => [...current, newCourse()]);
    invalidateCourses();
  };

  const addTerm = () => {
    if (terms.length >= GPA_TERM_LIMIT) { setTermError(`เพิ่มได้สูงสุด ${GPA_TERM_LIMIT} ภาคเรียน`); return; }
    setTerms((current) => [...current, newTerm()]);
    invalidateTerms();
  };

  const calculateCourses = () => {
    try {
      const result = calculateCourseGpa(courses.map((course, index) => ({
        name: course.name.trim() || `วิชา ${index + 1}`,
        credits: parseRequiredNumber(course.credits, `หน่วยกิตของวิชา ${index + 1}`),
        grade: course.grade,
      })));
      setCourseResult(result);
      setCourseError("");
      toast.success("คำนวณ GPA รายภาคแล้ว");
    } catch (caught) {
      setCourseResult(null);
      setCourseError(caught instanceof Error ? caught.message : "คำนวณ GPA ไม่สำเร็จ");
    }
  };

  const calculateTerms = () => {
    try {
      const result = calculateCumulativeGpax(terms.map((term, index) => ({
        name: term.name.trim() || `เทอม ${index + 1}`,
        credits: parseRequiredNumber(term.credits, `หน่วยกิตของเทอม ${index + 1}`),
        gpa: parseRequiredNumber(term.gpa, `GPA ของเทอม ${index + 1}`),
      })));
      setTermResult(result);
      setTermError("");
      toast.success("ประมาณ GPAX แบบถ่วงน้ำหนักแล้ว");
    } catch (caught) {
      setTermResult(null);
      setTermError(caught instanceof Error ? caught.message : "คำนวณ GPAX ไม่สำเร็จ");
    }
  };

  const loadCourseExample = () => {
    setCourses([
      newCourse("AA", "2", "A"), newCourse("BB", "2", "B+"), newCourse("CC", "3", "B"),
      newCourse("DD", "3", "C+"), newCourse("EE", "3", "C"), newCourse("FF", "3", "D+"), newCourse("GG", "3", "D"),
    ]);
    invalidateCourses();
  };

  const loadTermExample = () => {
    setTerms([
      newTerm("ปี 1 เทอม 1", "18", "3.25"), newTerm("ปี 1 เทอม 2", "21", "3.50"),
      newTerm("ปี 2 เทอม 1", "19", "3.75"), newTerm("ปี 2 เทอม 2", "20", "3.40"),
    ]);
    invalidateTerms();
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><GraduationCap className="size-5 text-primary" /><h2 className="font-semibold">คำนวณ GPA รายวิชา และ GPAX หลายเทอม</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">ใช้สูตรถ่วงน้ำหนักตามหน่วยกิต พร้อมแสดงทั้งค่าปัดและค่าตัดทศนิยมเพื่อเทียบนโยบายสถาบัน</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">คำนวณใน Browser</span>
      </div>

      <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-600" />
        <AlertTitle>สูตรโปร่งใส: หน่วยกิต × แต้มระดับคะแนน</AlertTitle>
        <AlertDescription className="leading-6">GPA = คะแนนถ่วงน้ำหนักรวม ÷ หน่วยกิตที่นับ ตัวอย่างเกณฑ์ A ถึง F และการไม่นับ W/S/U อ้างอิงคู่มือของ <a href={MFU_GRADE_GUIDE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">มหาวิทยาลัยแม่ฟ้าหลวง<ExternalLink className="size-3" /></a> แต่การปัดเศษ วิชาเรียนซ้ำ และวิชาโอนอาจต่างกันในแต่ละสถาบัน</AlertDescription>
      </Alert>

      <Tabs value={mode} onValueChange={(value) => setMode(value as CalculatorMode)} className="mt-5">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-2">
          <TabsTrigger value="courses" className="min-h-10 px-3">รายวิชา · GPA</TabsTrigger>
          <TabsTrigger value="terms" className="min-h-10 px-3">หลายเทอม · GPAX</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-3">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
            <section className="min-w-0" aria-labelledby="course-editor-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 id="course-editor-title" className="font-semibold">รายวิชาในภาคเรียน</h3><p className="mt-1 text-xs text-muted-foreground">F นับหน่วยกิตด้วยแต้ม 0 ส่วน W, S และ U จะไม่นำมาคำนวณ</p></div>
                <Button type="button" variant="outline" size="sm" onClick={addCourse}><Plus className="size-4" />เพิ่มรายวิชา</Button>
              </div>

              <div className="mt-4 space-y-3">
                {courses.map((course, index) => (
                  <div key={course.id} className="min-w-0 rounded-xl border bg-muted/10 p-4" data-testid="grade-course-row">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">รายวิชา {index + 1}</p><Button type="button" variant="ghost" size="sm" disabled={courses.length === 1} aria-label={`ลบรายวิชา ${index + 1}`} onClick={() => { setCourses((current) => current.filter((item) => item.id !== course.id)); invalidateCourses(); }}><Trash2 className="size-4" />ลบ</Button></div>
                    <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_8rem_11rem]">
                      <div className="min-w-0 space-y-2.5"><Label htmlFor={`${course.id}-name`}>ชื่อวิชา (ไม่บังคับ)</Label><Input id={`${course.id}-name`} value={course.name} maxLength={80} onChange={(event) => updateCourse(course.id, { name: event.target.value })} placeholder="เช่น คณิตศาสตร์" /></div>
                      <div className="min-w-0 space-y-2.5"><Label htmlFor={`${course.id}-credits`}>หน่วยกิต</Label><Input id={`${course.id}-credits`} type="number" min="0.5" max="30" step="0.5" inputMode="decimal" value={course.credits} onChange={(event) => updateCourse(course.id, { credits: event.target.value })} placeholder="3" /></div>
                      <div className="min-w-0 space-y-2.5"><Label htmlFor={`${course.id}-grade`}>เกรด</Label><Select value={course.grade} onValueChange={(value) => updateCourse(course.id, { grade: value as GradeSymbol })}><SelectTrigger id={`${course.id}-grade`} className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{GRADE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t pt-5">
                <ActionBar>
                  <Button type="button" onClick={calculateCourses}><Calculator className="size-4" />คำนวณ GPA</Button>
                  <ExampleButton onExample={loadCourseExample} />
                  <ClearButton onClear={() => { setCourses([newCourse()]); invalidateCourses(); }} />
                  {courseResult ? <CopyButton value={averageSummary("สรุป GPA รายภาค", courseResult)} label="คัดลอกสรุป" /> : null}
                </ActionBar>
              </div>
              {courseError ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{courseError}</p> : null}
            </section>

            <section className="min-w-0" aria-labelledby="course-result-title">
              <h3 id="course-result-title" className="mb-3 font-semibold">ผล GPA รายภาค</h3>
              {!courseResult ? <EmptyOutput size="compact" text="กรอกหน่วยกิตและเกรด แล้วกดคำนวณ GPA" /> : (
                <div className="space-y-4" aria-live="polite" data-testid="course-gpa-result">
                  <AverageCards result={courseResult} primaryLabel="GPA แบบปัด" testId="course-gpa-rounded" />
                  <div className="rounded-xl border bg-muted/15 p-4">
                    <p className="font-mono text-sm font-semibold tabular-nums">{pointsFormatter.format(courseResult.totalWeightedPoints)} ÷ {numberFormatter.format(courseResult.totalCredits)} = {courseResult.exactAverage.toFixed(4)}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">นับ {courseResult.includedCourses} วิชา{courseResult.excludedCourses ? ` · ไม่นับ W/S/U ${courseResult.excludedCourses} วิชา` : ""}</p>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-auto rounded-xl border p-3">
                    {courseResult.lines.map((line, index) => <div key={`${line.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2 text-sm"><div className="min-w-0"><p className="truncate font-medium">{line.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{numberFormatter.format(line.credits)} หน่วยกิต · {line.grade}</p></div><span className={line.counted ? "shrink-0 font-mono font-semibold tabular-nums" : "shrink-0 text-xs text-muted-foreground"}>{line.weightedPoints === null ? "ไม่นับ" : pointsFormatter.format(line.weightedPoints)}</span></div>)}
                  </div>
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="terms" className="mt-3">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
            <section className="min-w-0" aria-labelledby="term-editor-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="term-editor-title" className="font-semibold">GPA และหน่วยกิตแต่ละภาคเรียน</h3><p className="mt-1 text-xs text-muted-foreground">GPAX ต้องถ่วงตามหน่วยกิต ไม่ใช่นำ GPA ทุกเทอมมาบวกแล้วหารจำนวนเทอม</p></div><Button type="button" variant="outline" size="sm" onClick={addTerm}><Plus className="size-4" />เพิ่มภาคเรียน</Button></div>

              <div className="mt-4 space-y-3">
                {terms.map((term, index) => (
                  <div key={term.id} className="min-w-0 rounded-xl border bg-muted/10 p-4" data-testid="gpax-term-row">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">ภาคเรียน {index + 1}</p><Button type="button" variant="ghost" size="sm" disabled={terms.length === 1} aria-label={`ลบภาคเรียน ${index + 1}`} onClick={() => { setTerms((current) => current.filter((item) => item.id !== term.id)); invalidateTerms(); }}><Trash2 className="size-4" />ลบ</Button></div>
                    <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_8rem_8rem]">
                      <div className="min-w-0 space-y-2.5"><Label htmlFor={`${term.id}-name`}>ชื่อเทอม (ไม่บังคับ)</Label><Input id={`${term.id}-name`} value={term.name} maxLength={80} onChange={(event) => updateTerm(term.id, { name: event.target.value })} placeholder="เช่น ปี 1 เทอม 1" /></div>
                      <div className="min-w-0 space-y-2.5"><Label htmlFor={`${term.id}-credits`}>หน่วยกิต</Label><Input id={`${term.id}-credits`} type="number" min="0.5" max="300" step="0.5" inputMode="decimal" value={term.credits} onChange={(event) => updateTerm(term.id, { credits: event.target.value })} placeholder="18" /></div>
                      <div className="min-w-0 space-y-2.5"><Label htmlFor={`${term.id}-gpa`}>GPA เทอม</Label><Input id={`${term.id}-gpa`} type="number" min="0" max="4" step="0.01" inputMode="decimal" value={term.gpa} onChange={(event) => updateTerm(term.id, { gpa: event.target.value })} placeholder="3.25" /></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t pt-5">
                <ActionBar>
                  <Button type="button" onClick={calculateTerms}><Calculator className="size-4" />คำนวณ GPAX</Button>
                  <ExampleButton onExample={loadTermExample} />
                  <ClearButton onClear={() => { setTerms([newTerm()]); invalidateTerms(); }} />
                  {termResult ? <CopyButton value={averageSummary("ประมาณ GPAX หลายเทอม", termResult, true)} label="คัดลอกสรุป" /> : null}
                </ActionBar>
              </div>
              {termError ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{termError}</p> : null}
            </section>

            <section className="min-w-0" aria-labelledby="term-result-title">
              <h3 id="term-result-title" className="mb-3 font-semibold">ประมาณ GPAX สะสม</h3>
              {!termResult ? <EmptyOutput size="compact" text="กรอก GPA และหน่วยกิตแต่ละเทอม แล้วกดคำนวณ GPAX" /> : (
                <div className="space-y-4" aria-live="polite" data-testid="gpax-result">
                  <AverageCards result={termResult} primaryLabel="GPAX แบบปัด" testId="gpax-rounded" />
                  <div className="rounded-xl border bg-muted/15 p-4"><p className="font-mono text-sm font-semibold tabular-nums">{pointsFormatter.format(termResult.totalWeightedPoints)} ÷ {numberFormatter.format(termResult.totalCredits)} = {termResult.exactAverage.toFixed(4)}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">ถ่วงน้ำหนักจาก {termResult.termCount} ภาคเรียนตามหน่วยกิตที่กรอก</p></div>
                  <Alert className="border-amber-500/30 bg-amber-500/5"><TriangleAlert className="text-amber-600" /><AlertTitle>ผลหลายเทอมเป็นค่าประมาณ</AlertTitle><AlertDescription>GPA รายเทอมที่เห็นบนผลการเรียนอาจถูกปัดหรือตัดทศนิยมมาแล้ว จึงอาจต่างจาก GPAX ของฝ่ายทะเบียนที่คำนวณจากคะแนนสะสมละเอียดกว่า</AlertDescription></Alert>
                </div>
              )}
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>ชื่อวิชา หน่วยกิต และเกรดถูกคำนวณภายใน Browser ไม่มี API ของ Meaw Tools รับหรือบันทึกข้อมูล</span></p>
        <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /><span>ใช้ผลลัพธ์เพื่อวางแผนและตรวจความเข้าใจ ควรยึด GPAX จากฝ่ายทะเบียนเมื่อใช้สมัครเรียน ทุน หรือเอกสารทางการ</span></p>
      </div>
    </WorkspaceFrame>
  );
}
