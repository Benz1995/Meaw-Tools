export type RandomIntSource = (maxExclusive: number) => number;

export type PasswordOptions = {
  length: number;
  count: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
};

export type RandomNumberOptions = {
  min: number;
  max: number;
  count: number;
  unique: boolean;
  sort: boolean;
};

const UINT32_RANGE = 0x1_0000_0000;
const SIMILAR_CHARACTERS = new Set("iIlL1oO0".split(""));
const characterGroups = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};

export const cryptoRandomInt: RandomIntSource = (maxExclusive) => {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new Error("ช่วงสุ่มไม่ถูกต้อง");
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const buffer = new Uint32Array(1);
  let value = limit;
  while (value >= limit) {
    globalThis.crypto.getRandomValues(buffer);
    value = buffer[0]!;
  }
  return value % maxExclusive;
};

function validateRandomResult(value: number, maxExclusive: number) {
  if (!Number.isInteger(value) || value < 0 || value >= maxExclusive) {
    throw new Error("แหล่งสุ่มส่งค่าที่อยู่นอกช่วง");
  }
  return value;
}

function pick(characters: string, randomInt: RandomIntSource) {
  return characters[validateRandomResult(randomInt(characters.length), characters.length)]!;
}

export function getPasswordPool(options: PasswordOptions) {
  const groups = [
    options.lowercase ? characterGroups.lowercase : "",
    options.uppercase ? characterGroups.uppercase : "",
    options.numbers ? characterGroups.numbers : "",
    options.symbols ? characterGroups.symbols : "",
  ]
    .filter(Boolean)
    .map((group) => options.excludeSimilar ? [...group].filter((character) => !SIMILAR_CHARACTERS.has(character)).join("") : group);
  return { groups, pool: groups.join("") };
}

export function assessPasswordStrength(length: number, poolSize: number) {
  const entropyBits = poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;
  const label = entropyBits < 40 ? "อ่อน" : entropyBits < 60 ? "พอใช้" : entropyBits < 80 ? "แข็งแรง" : "แข็งแรงมาก";
  return { entropyBits, label };
}

export function generatePasswords(options: PasswordOptions, randomInt: RandomIntSource = cryptoRandomInt): string[] {
  if (!Number.isInteger(options.length) || options.length < 8 || options.length > 128) throw new Error("ความยาวต้องอยู่ระหว่าง 8–128 ตัวอักษร");
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 20) throw new Error("จำนวนรหัสผ่านต้องอยู่ระหว่าง 1–20");
  const { groups, pool } = getPasswordPool(options);
  if (!groups.length || !pool.length) throw new Error("กรุณาเลือกชุดตัวอักษรอย่างน้อย 1 ชุด");
  if (options.length < groups.length) throw new Error("ความยาวน้อยกว่าจำนวนชุดตัวอักษรที่เลือก");

  return Array.from({ length: options.count }, () => {
    const characters = groups.map((group) => pick(group, randomInt));
    while (characters.length < options.length) characters.push(pick(pool, randomInt));
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const target = validateRandomResult(randomInt(index + 1), index + 1);
      [characters[index], characters[target]] = [characters[target]!, characters[index]!];
    }
    return characters.join("");
  });
}

export function generateRandomIntegers(options: RandomNumberOptions, randomInt: RandomIntSource = cryptoRandomInt): number[] {
  const { min, max, count, unique, sort } = options;
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < -1_000_000_000 || max > 1_000_000_000) throw new Error("ค่าต่ำสุดและสูงสุดต้องเป็นจำนวนเต็มระหว่าง -1,000,000,000 ถึง 1,000,000,000");
  if (min > max) throw new Error("ค่าต่ำสุดต้องไม่มากกว่าค่าสูงสุด");
  if (!Number.isInteger(count) || count < 1 || count > 1_000) throw new Error("จำนวนผลลัพธ์ต้องอยู่ระหว่าง 1–1,000");
  const range = max - min + 1;
  if (unique && count > range) throw new Error("จำนวนผลลัพธ์ไม่ซ้ำมากกว่าช่วงตัวเลขที่มี");

  const results: number[] = [];
  if (unique) {
    const swaps = new Map<number, number>();
    for (let index = 0; index < count; index += 1) {
      const offset = validateRandomResult(randomInt(range - index), range - index);
      const selectedIndex = index + offset;
      const selectedValue = swaps.get(selectedIndex) ?? selectedIndex;
      swaps.set(selectedIndex, swaps.get(index) ?? index);
      results.push(min + selectedValue);
    }
  } else {
    for (let index = 0; index < count; index += 1) {
      results.push(min + validateRandomResult(randomInt(range), range));
    }
  }
  return sort ? results.sort((first, second) => first - second) : results;
}
