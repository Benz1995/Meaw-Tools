export const COURSE_GRADE_LIMIT = 60;
export const GPA_TERM_LIMIT = 20;

export const GRADE_OPTIONS = [
  { value: "A", points: 4, label: "A — 4.00" },
  { value: "B+", points: 3.5, label: "B+ — 3.50" },
  { value: "B", points: 3, label: "B — 3.00" },
  { value: "C+", points: 2.5, label: "C+ — 2.50" },
  { value: "C", points: 2, label: "C — 2.00" },
  { value: "D+", points: 1.5, label: "D+ — 1.50" },
  { value: "D", points: 1, label: "D — 1.00" },
  { value: "F", points: 0, label: "F — 0.00" },
  { value: "W", points: null, label: "W — ไม่นับ GPA" },
  { value: "S", points: null, label: "S — ไม่นับ GPA" },
  { value: "U", points: null, label: "U — ไม่นับ GPA" },
] as const;

export type GradeSymbol = (typeof GRADE_OPTIONS)[number]["value"];
export type CourseGradeInput = { name: string; credits: number; grade: GradeSymbol };
export type GpaTermInput = { name: string; credits: number; gpa: number };

export type CourseGradeLine = CourseGradeInput & {
  points: number | null;
  weightedPoints: number | null;
  counted: boolean;
};

export type GradeAverageResult = {
  exactAverage: number;
  roundedAverage: number;
  truncatedAverage: number;
  totalCredits: number;
  totalWeightedPoints: number;
};

export type CourseGpaResult = GradeAverageResult & {
  includedCourses: number;
  excludedCourses: number;
  lines: CourseGradeLine[];
};

export type CumulativeGpaxResult = GradeAverageResult & {
  termCount: number;
};

const gradePointMap = new Map<GradeSymbol, number | null>(GRADE_OPTIONS.map((option) => [option.value, option.points]));

function assertCollectionSize(length: number, label: string, maximum: number) {
  if (length < 1) throw new Error(`กรุณาเพิ่ม${label}อย่างน้อย 1 รายการ`);
  if (length > maximum) throw new Error(`${label}เพิ่มได้สูงสุด ${maximum} รายการ`);
}

function assertName(name: string, label: string, index: number) {
  if (name.length > 80) throw new Error(`${label} ${index + 1}: ชื่อยาวได้ไม่เกิน 80 ตัวอักษร`);
}

function assertFiniteInRange(value: number, label: string, index: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} ${index + 1} ต้องอยู่ระหว่าง ${minimum} ถึง ${maximum}`);
  }
}

export function roundGradeAverage(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function truncateGradeAverage(value: number): number {
  return Math.trunc(value * 100 + 1e-9) / 100;
}

function averageResult(totalWeightedPoints: number, totalCredits: number): GradeAverageResult {
  const exactAverage = totalWeightedPoints / totalCredits;
  return {
    exactAverage,
    roundedAverage: roundGradeAverage(exactAverage),
    truncatedAverage: truncateGradeAverage(exactAverage),
    totalCredits,
    totalWeightedPoints,
  };
}

export function calculateCourseGpa(courses: readonly CourseGradeInput[]): CourseGpaResult {
  assertCollectionSize(courses.length, "รายวิชา", COURSE_GRADE_LIMIT);
  let totalCredits = 0;
  let totalWeightedPoints = 0;
  let includedCourses = 0;

  const lines = courses.map((course, index): CourseGradeLine => {
    assertName(course.name, "รายวิชา", index);
    assertFiniteInRange(course.credits, "หน่วยกิตของรายวิชา", index, 0.5, 30);
    if (!gradePointMap.has(course.grade)) throw new Error(`รายวิชา ${index + 1}: เกรดไม่ถูกต้อง`);
    const points = gradePointMap.get(course.grade)!;
    if (points === null) return { ...course, points, weightedPoints: null, counted: false };
    const weightedPoints = course.credits * points;
    totalCredits += course.credits;
    totalWeightedPoints += weightedPoints;
    includedCourses += 1;
    return { ...course, points, weightedPoints, counted: true };
  });

  if (!includedCourses || totalCredits <= 0) throw new Error("ต้องมีอย่างน้อย 1 รายวิชาที่นำมาคำนวณ GPA");
  if (totalCredits > 600) throw new Error("หน่วยกิตรวมต้องไม่เกิน 600 หน่วยกิตต่อครั้ง");

  return {
    ...averageResult(totalWeightedPoints, totalCredits),
    includedCourses,
    excludedCourses: courses.length - includedCourses,
    lines,
  };
}

export function calculateCumulativeGpax(terms: readonly GpaTermInput[]): CumulativeGpaxResult {
  assertCollectionSize(terms.length, "ภาคเรียน", GPA_TERM_LIMIT);
  let totalCredits = 0;
  let totalWeightedPoints = 0;

  terms.forEach((term, index) => {
    assertName(term.name, "ภาคเรียน", index);
    assertFiniteInRange(term.credits, "หน่วยกิตของภาคเรียน", index, 0.5, 300);
    assertFiniteInRange(term.gpa, "GPA ของภาคเรียน", index, 0, 4);
    totalCredits += term.credits;
    totalWeightedPoints += term.credits * term.gpa;
  });

  if (totalCredits > 6_000) throw new Error("หน่วยกิตรวมต้องไม่เกิน 6,000 หน่วยกิตต่อครั้ง");
  return { ...averageResult(totalWeightedPoints, totalCredits), termCount: terms.length };
}
