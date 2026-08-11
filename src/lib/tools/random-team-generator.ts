export const RANDOM_TEAM_MAX_PARTICIPANTS = 500;
export const RANDOM_TEAM_MAX_TEAMS = 50;
export const RANDOM_TEAM_MAX_MEMBERS_PER_TEAM = 100;
export const RANDOM_TEAM_MAX_NAME_LENGTH = 80;
export const RANDOM_TEAM_MAX_INPUT_LENGTH = 100_000;
export const RANDOM_TEAM_DEFAULT_SKILL = 3;

export type TeamGenerationMode = "random" | "balanced";
export type TeamSplitMethod = "team-count" | "members-per-team";

export type TeamParticipant = {
  name: string;
  skill: number | null;
};

export type ParsedTeamParticipants = {
  participants: TeamParticipant[];
  duplicateNames: string[];
  assumedSkillCount: number;
};

export type GeneratedTeam = {
  name: string;
  members: TeamParticipant[];
  skillTotal: number | null;
  skillAverage: number | null;
};

export type TeamGenerationInput = {
  names: string;
  mode: TeamGenerationMode;
  splitMethod: TeamSplitMethod;
  splitValue: number;
  teamNamePrefix?: string;
};

export type TeamGenerationResult = {
  mode: TeamGenerationMode;
  splitMethod: TeamSplitMethod;
  teams: GeneratedTeam[];
  participantCount: number;
  duplicateNames: string[];
  assumedSkillCount: number;
  memberCountMin: number;
  memberCountMax: number;
  skillAverageMin: number | null;
  skillAverageMax: number | null;
  skillAverageDifference: number | null;
};

export type RandomSource = () => number;

function cleanName(value: string, lineNumber: number): string {
  const name = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) throw new Error(`บรรทัดที่ ${lineNumber} ไม่มีชื่อผู้เข้าร่วม`);
  if (name.length > RANDOM_TEAM_MAX_NAME_LENGTH) throw new Error(`ชื่อบรรทัดที่ ${lineNumber} ยาวเกิน ${RANDOM_TEAM_MAX_NAME_LENGTH} ตัวอักษร`);
  return name;
}

function normalizedNameKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("th-TH");
}

export function parseTeamParticipants(input: string, parseSkills = false): ParsedTeamParticipants {
  if (input.length > RANDOM_TEAM_MAX_INPUT_LENGTH) throw new Error("รายการยาวเกินขนาดที่รองรับ กรุณาใช้ไม่เกิน 100,000 ตัวอักษร");
  const participants: TeamParticipant[] = [];
  const duplicateNames: string[] = [];
  const seen = new Set<string>();
  let assumedSkillCount = 0;

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const lineNumber = index + 1;
    let nameSource = rawLine;
    let skill: number | null = null;

    if (parseSkills) {
      const skillMatch = rawLine.match(/^(.*?)(?:\t|,\s*)(-?\d+(?:\.\d+)?)\s*$/);
      if (skillMatch) {
        const parsedSkill = Number(skillMatch[2]);
        if (!Number.isInteger(parsedSkill) || parsedSkill < 1 || parsedSkill > 5) {
          throw new Error(`คะแนนบรรทัดที่ ${lineNumber} ต้องเป็นจำนวนเต็ม 1–5`);
        }
        nameSource = skillMatch[1] ?? "";
        skill = parsedSkill;
      } else {
        assumedSkillCount += 1;
      }
    }

    const name = cleanName(nameSource, lineNumber);
    const key = normalizedNameKey(name);
    if (seen.has(key)) {
      duplicateNames.push(name);
      if (parseSkills && skill === null) assumedSkillCount -= 1;
      continue;
    }
    seen.add(key);
    participants.push({ name, skill });
    if (participants.length > RANDOM_TEAM_MAX_PARTICIPANTS) {
      throw new Error(`รองรับสูงสุด ${RANDOM_TEAM_MAX_PARTICIPANTS} รายชื่อ กรุณาแบ่งรายการเป็นหลายรอบ`);
    }
  }

  return { participants, duplicateNames, assumedSkillCount };
}

export function resolveTeamCount(participantCount: number, splitMethod: TeamSplitMethod, splitValue: number): number {
  if (!Number.isInteger(participantCount) || participantCount < 2) throw new Error("เพิ่มรายชื่อที่ไม่ซ้ำกันอย่างน้อย 2 คน");
  if (!Number.isInteger(splitValue)) throw new Error("จำนวนทีมและจำนวนคนต่อทีมต้องเป็นจำนวนเต็ม");

  const teamCount = splitMethod === "team-count"
    ? splitValue
    : Math.ceil(participantCount / splitValue);

  if (splitMethod === "team-count" && (splitValue < 2 || splitValue > RANDOM_TEAM_MAX_TEAMS || splitValue > participantCount)) {
    throw new Error(`จำนวนทีมต้องอยู่ระหว่าง 2–${Math.min(RANDOM_TEAM_MAX_TEAMS, participantCount)}`);
  }
  if (splitMethod === "members-per-team" && (splitValue < 1 || splitValue > RANDOM_TEAM_MAX_MEMBERS_PER_TEAM)) {
    throw new Error(`จำนวนคนต่อทีมต้องอยู่ระหว่าง 1–${RANDOM_TEAM_MAX_MEMBERS_PER_TEAM}`);
  }
  if (teamCount < 2) throw new Error("จำนวนคนต่อทีมต้องทำให้เกิดอย่างน้อย 2 ทีม");
  if (teamCount > RANDOM_TEAM_MAX_TEAMS) throw new Error(`ผลลัพธ์ต้องไม่เกิน ${RANDOM_TEAM_MAX_TEAMS} ทีม กรุณาเพิ่มจำนวนคนต่อทีม`);
  return teamCount;
}

function cryptoRandomFloat(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return (values[0] ?? 0) / 4_294_967_296;
}

function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex] as T, result[index] as T];
  }
  return result;
}

function targetTeamSizes(participantCount: number, teamCount: number): number[] {
  const baseSize = Math.floor(participantCount / teamCount);
  const remainder = participantCount % teamCount;
  return Array.from({ length: teamCount }, (_, index) => baseSize + (index < remainder ? 1 : 0));
}

function distributeRandom(participants: TeamParticipant[], sizes: number[], random: RandomSource): TeamParticipant[][] {
  const shuffled = shuffle(participants, random);
  let cursor = 0;
  return sizes.map((size) => {
    const members = shuffled.slice(cursor, cursor + size);
    cursor += size;
    return members;
  });
}

function distributeBalanced(participants: TeamParticipant[], sizes: number[], random: RandomSource): TeamParticipant[][] {
  const ranked = participants
    .map((participant) => ({ participant, tieBreaker: random() }))
    .toSorted((left, right) => (right.participant.skill ?? RANDOM_TEAM_DEFAULT_SKILL) - (left.participant.skill ?? RANDOM_TEAM_DEFAULT_SKILL) || left.tieBreaker - right.tieBreaker)
    .map(({ participant }) => participant);
  const teams = sizes.map(() => [] as TeamParticipant[]);
  let participantIndex = 0;
  let round = 0;

  while (participantIndex < ranked.length) {
    const order = Array.from({ length: teams.length }, (_, index) => index);
    if (round % 2 === 1) order.reverse();
    for (const teamIndex of order) {
      if (participantIndex >= ranked.length) break;
      const team = teams[teamIndex];
      if (!team || team.length >= (sizes[teamIndex] ?? 0)) continue;
      team.push(ranked[participantIndex] as TeamParticipant);
      participantIndex += 1;
    }
    round += 1;
  }
  return teams;
}

function cleanTeamPrefix(value: string | undefined): string {
  const cleaned = (value ?? "ทีม").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
  return cleaned || "ทีม";
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

export function generateRandomTeams(input: TeamGenerationInput, random: RandomSource = cryptoRandomFloat): TeamGenerationResult {
  const parsed = parseTeamParticipants(input.names, input.mode === "balanced");
  const teamCount = resolveTeamCount(parsed.participants.length, input.splitMethod, input.splitValue);
  const sizes = targetTeamSizes(parsed.participants.length, teamCount);
  const distributed = input.mode === "balanced"
    ? distributeBalanced(parsed.participants, sizes, random)
    : distributeRandom(parsed.participants, sizes, random);
  const prefix = cleanTeamPrefix(input.teamNamePrefix);
  const teams: GeneratedTeam[] = distributed.map((members, index) => {
    if (input.mode === "random") return { name: `${prefix} ${index + 1}`, members, skillTotal: null, skillAverage: null };
    const skillTotal = members.reduce((total, member) => total + (member.skill ?? RANDOM_TEAM_DEFAULT_SKILL), 0);
    return { name: `${prefix} ${index + 1}`, members, skillTotal, skillAverage: rounded(skillTotal / members.length) };
  });
  const memberCounts = teams.map((team) => team.members.length);
  const skillAverages = teams.flatMap((team) => team.skillAverage === null ? [] : [team.skillAverage]);
  const skillAverageMin = skillAverages.length ? Math.min(...skillAverages) : null;
  const skillAverageMax = skillAverages.length ? Math.max(...skillAverages) : null;

  return {
    mode: input.mode,
    splitMethod: input.splitMethod,
    teams,
    participantCount: parsed.participants.length,
    duplicateNames: parsed.duplicateNames,
    assumedSkillCount: parsed.assumedSkillCount,
    memberCountMin: Math.min(...memberCounts),
    memberCountMax: Math.max(...memberCounts),
    skillAverageMin,
    skillAverageMax,
    skillAverageDifference: skillAverageMin === null || skillAverageMax === null ? null : rounded(skillAverageMax - skillAverageMin),
  };
}

export function randomTeamsSummary(result: TeamGenerationResult): string {
  const header = `แบ่ง ${result.participantCount} คน เป็น ${result.teams.length} ทีม${result.mode === "balanced" ? " • โหมดสมดุลคะแนน" : " • โหมดสุ่ม"}`;
  const sections = result.teams.map((team) => {
    const skill = team.skillAverage === null ? "" : ` • คะแนนเฉลี่ย ${team.skillAverage.toFixed(2)}`;
    const members = team.members.map((member, index) => `${index + 1}. ${member.name}${result.mode === "balanced" ? ` (${member.skill ?? RANDOM_TEAM_DEFAULT_SKILL}${member.skill === null ? "*" : ""})` : ""}`);
    return `${team.name} — ${team.members.length} คน${skill}\n${members.join("\n")}`;
  });
  const note = result.assumedSkillCount ? `\n* ใช้คะแนนเริ่มต้น ${RANDOM_TEAM_DEFAULT_SKILL} กับ ${result.assumedSkillCount} คนที่ไม่ได้ระบุคะแนน` : "";
  return `${header}\n\n${sections.join("\n\n")}${note}`;
}

function spreadsheetSafeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const text = typeof value === "number" ? String(value) : spreadsheetSafeText(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function randomTeamsCsv(result: TeamGenerationResult): string {
  const rows: Array<Array<string | number>> = [["Team", "Member number", "Member", "Skill", "Used default skill", "Team members", "Team average skill"]];
  for (const team of result.teams) {
    team.members.forEach((member, index) => {
      rows.push([
        team.name,
        index + 1,
        member.name,
        result.mode === "balanced" ? member.skill ?? RANDOM_TEAM_DEFAULT_SKILL : "",
        result.mode === "balanced" ? member.skill === null ? "Yes" : "No" : "",
        team.members.length,
        team.skillAverage ?? "",
      ]);
    });
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
