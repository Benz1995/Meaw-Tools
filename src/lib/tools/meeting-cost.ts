export const MEETING_COST_MAX_MONEY = 1_000_000_000_000;
export const MEETING_COST_MAX_RESULT = 1_000_000_000_000_000;
export const MEETING_COST_MAX_GROUPS = 20;
export const MEETING_COST_MAX_PARTICIPANTS_PER_GROUP = 10_000;
export const MEETING_COST_MAX_DURATION_MINUTES = 1_440;
export const MEETING_COST_MAX_OVERHEAD_PERCENT = 500;
export const MEETING_COST_MAX_HOURS_PER_WEEK = 168;
export const MEETING_COST_MAX_WEEKS_PER_YEAR = 53;
export const MEETING_COST_MAX_MEETINGS_PER_WEEK = 168;

export type MeetingRatePeriod = "hourly" | "monthly" | "annual";

export type MeetingParticipantGroup = {
  label: string;
  count: number;
  rateAmount: number;
  ratePeriod: MeetingRatePeriod;
};

export type MeetingCostInput = {
  groups: MeetingParticipantGroup[];
  durationMinutes: number;
  hoursPerWeek: number;
  workWeeksPerYear: number;
  overheadPercent: number;
  directCostPerMeeting: number;
  meetingsPerWeek: number;
  recurringWeeksPerYear: number;
  shorterByMinutes: number;
};

export type MeetingGroupCost = MeetingParticipantGroup & {
  hourlyRate: number;
  teamHourlyCost: number;
  meetingLaborCost: number;
};

export type MeetingCostResult = {
  annualWorkHours: number;
  participantCount: number;
  peopleHours: number;
  groupCosts: MeetingGroupCost[];
  teamBaseHourlyCost: number;
  teamLoadedHourlyCost: number;
  baseLaborCost: number;
  overheadCost: number;
  loadedLaborCost: number;
  directCostPerMeeting: number;
  totalMeetingCost: number;
  costPerMinute: number;
  annualMeetingCount: number;
  monthlyRecurringCost: number;
  annualRecurringCost: number;
  shortenedDurationMinutes: number;
  savingsPerMeeting: number;
  annualSavings: number;
};

const PERIOD_LABELS: Record<MeetingRatePeriod, string> = {
  hourly: "ต่อชั่วโมง",
  monthly: "ต่อเดือน",
  annual: "ต่อปี",
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || value > MEETING_COST_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

export function normalizeMeetingHourlyRate(
  amount: number,
  period: MeetingRatePeriod,
  annualWorkHours: number,
) {
  assertRange(amount, "ค่าจ้างหรือต้นทุน", 0.01, MEETING_COST_MAX_MONEY);
  assertRange(annualWorkHours, "ชั่วโมงทำงานต่อปี", 0.01, MEETING_COST_MAX_HOURS_PER_WEEK * MEETING_COST_MAX_WEEKS_PER_YEAR);
  if (!(period in PERIOD_LABELS)) throw new Error("งวดค่าจ้างไม่ถูกต้อง");

  if (period === "hourly") return amount;
  const annualAmount = period === "monthly" ? amount * 12 : amount;
  return annualAmount / annualWorkHours;
}

export function calculateMeetingCost(input: MeetingCostInput): MeetingCostResult {
  if (!Array.isArray(input.groups) || input.groups.length < 1 || input.groups.length > MEETING_COST_MAX_GROUPS) {
    throw new Error(`ต้องมีกลุ่มผู้เข้าร่วม 1 ถึง ${MEETING_COST_MAX_GROUPS} กลุ่ม`);
  }
  assertRange(input.durationMinutes, "ระยะเวลาประชุม", 1, MEETING_COST_MAX_DURATION_MINUTES);
  assertRange(input.hoursPerWeek, "ชั่วโมงทำงานต่อสัปดาห์", 0.01, MEETING_COST_MAX_HOURS_PER_WEEK);
  assertRange(input.workWeeksPerYear, "สัปดาห์ทำงานต่อปี", 0.01, MEETING_COST_MAX_WEEKS_PER_YEAR);
  assertRange(input.overheadPercent, "ต้นทุนแฝง", 0, MEETING_COST_MAX_OVERHEAD_PERCENT);
  assertRange(input.directCostPerMeeting, "ค่าใช้จ่ายตรงต่อครั้ง", 0, MEETING_COST_MAX_MONEY);
  assertRange(input.meetingsPerWeek, "จำนวนประชุมต่อสัปดาห์", 0, MEETING_COST_MAX_MEETINGS_PER_WEEK);
  assertRange(input.recurringWeeksPerYear, "สัปดาห์ที่ประชุมต่อปี", 0, MEETING_COST_MAX_WEEKS_PER_YEAR);
  assertRange(input.shorterByMinutes, "เวลาที่ต้องการลด", 0, input.durationMinutes);

  const annualWorkHours = input.hoursPerWeek * input.workWeeksPerYear;
  const durationHours = input.durationMinutes / 60;
  const groupCosts = input.groups.map((group, index) => {
    const cleanLabel = group.label.trim() || `กลุ่ม ${index + 1}`;
    if (cleanLabel.length > 80) throw new Error(`ชื่อกลุ่มที่ ${index + 1} ต้องไม่เกิน 80 ตัวอักษร`);
    assertRange(group.count, `จำนวนคนในกลุ่ม ${index + 1}`, 1, MEETING_COST_MAX_PARTICIPANTS_PER_GROUP);
    if (!Number.isInteger(group.count)) throw new Error(`จำนวนคนในกลุ่ม ${index + 1} ต้องเป็นจำนวนเต็ม`);
    const hourlyRate = normalizeMeetingHourlyRate(group.rateAmount, group.ratePeriod, annualWorkHours);
    const teamHourlyCost = hourlyRate * group.count;
    const meetingLaborCost = teamHourlyCost * durationHours;
    [hourlyRate, teamHourlyCost, meetingLaborCost].forEach(assertResult);
    return { ...group, label: cleanLabel, hourlyRate, teamHourlyCost, meetingLaborCost };
  });

  const participantCount = groupCosts.reduce((total, group) => total + group.count, 0);
  const teamBaseHourlyCost = groupCosts.reduce((total, group) => total + group.teamHourlyCost, 0);
  const baseLaborCost = teamBaseHourlyCost * durationHours;
  const overheadCost = baseLaborCost * (input.overheadPercent / 100);
  const loadedLaborCost = baseLaborCost + overheadCost;
  const teamLoadedHourlyCost = teamBaseHourlyCost * (1 + input.overheadPercent / 100);
  const totalMeetingCost = loadedLaborCost + input.directCostPerMeeting;
  const annualMeetingCount = input.meetingsPerWeek * input.recurringWeeksPerYear;
  const annualRecurringCost = totalMeetingCost * annualMeetingCount;
  const savingsPerMeeting = teamLoadedHourlyCost * (input.shorterByMinutes / 60);
  const annualSavings = savingsPerMeeting * annualMeetingCount;
  [teamBaseHourlyCost, totalMeetingCost, annualRecurringCost, annualSavings].forEach(assertResult);

  return {
    annualWorkHours,
    participantCount,
    peopleHours: participantCount * durationHours,
    groupCosts,
    teamBaseHourlyCost,
    teamLoadedHourlyCost,
    baseLaborCost,
    overheadCost,
    loadedLaborCost,
    directCostPerMeeting: input.directCostPerMeeting,
    totalMeetingCost,
    costPerMinute: totalMeetingCost / input.durationMinutes,
    annualMeetingCount,
    monthlyRecurringCost: annualRecurringCost / 12,
    annualRecurringCost,
    shortenedDurationMinutes: input.durationMinutes - input.shorterByMinutes,
    savingsPerMeeting,
    annualSavings,
  };
}

export function calculateLiveMeetingCost(teamLoadedHourlyCost: number, directCost: number, elapsedSeconds: number) {
  assertRange(teamLoadedHourlyCost, "ต้นทุนทีมต่อชั่วโมง", 0, MEETING_COST_MAX_RESULT);
  assertRange(directCost, "ค่าใช้จ่ายตรงต่อครั้ง", 0, MEETING_COST_MAX_MONEY);
  assertRange(elapsedSeconds, "เวลาประชุมที่ผ่านไป", 0, MEETING_COST_MAX_DURATION_MINUTES * 60);
  const laborCost = teamLoadedHourlyCost * (elapsedSeconds / 3_600);
  const totalCost = laborCost + directCost;
  [laborCost, totalCost].forEach(assertResult);
  return { laborCost, totalCost };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number) {
  return value.toFixed(2);
}

export function meetingCostCsv(input: MeetingCostInput, result: MeetingCostResult, currency: string) {
  const rows: Array<Array<string | number>> = [
    ["รายการ", "ค่า", "สกุลเงิน/หน่วย"],
    ["ระยะเวลาประชุม", csvNumber(input.durationMinutes), "นาที"],
    ["จำนวนผู้เข้าร่วม", result.participantCount, "คน"],
    ["People-hours", csvNumber(result.peopleHours), "ชั่วโมงคน"],
    ["ต้นทุนแรงงานก่อนต้นทุนแฝง", csvNumber(result.baseLaborCost), currency],
    ["ต้นทุนแฝง", csvNumber(result.overheadCost), `${input.overheadPercent}%`],
    ["ค่าใช้จ่ายตรงต่อครั้ง", csvNumber(result.directCostPerMeeting), currency],
    ["ต้นทุนรวมต่อครั้ง", csvNumber(result.totalMeetingCost), currency],
    ["ต้นทุนต่อนาที", csvNumber(result.costPerMinute), `${currency}/นาที`],
    ["จำนวนประชุมต่อปี", csvNumber(result.annualMeetingCount), "ครั้ง"],
    ["ต้นทุนประชุมต่อปี", csvNumber(result.annualRecurringCost), currency],
    ["ลดเวลาต่อครั้ง", csvNumber(input.shorterByMinutes), "นาที"],
    ["ประหยัดแรงงานต่อปี", csvNumber(result.annualSavings), currency],
    [],
    ["กลุ่มผู้เข้าร่วม", "จำนวนคน", "ค่าจ้างที่กรอก", "งวด", "ต้นทุนต่อชั่วโมง/คน", "ต้นทุนต่อการประชุม"],
    ...result.groupCosts.map((group) => [
      group.label,
      group.count,
      csvNumber(group.rateAmount),
      PERIOD_LABELS[group.ratePeriod],
      csvNumber(group.hourlyRate),
      csvNumber(group.meetingLaborCost),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
