import { describe, expect, it } from "vitest";
import { assessPasswordStrength, generatePasswords, generateRandomIntegers, getPasswordPool } from "@/lib/tools/generators";

function cyclingRandom() {
  let value = 0;
  return (maxExclusive: number) => value++ % maxExclusive;
}

describe("password generator", () => {
  const options = { length: 16, count: 2, lowercase: true, uppercase: true, numbers: true, symbols: true, excludeSimilar: true };

  it("includes every selected character group", () => {
    const passwords = generatePasswords(options, cyclingRandom());
    expect(passwords).toHaveLength(2);
    expect(passwords[0]).toHaveLength(16);
    expect(passwords[0]).toMatch(/[a-z]/);
    expect(passwords[0]).toMatch(/[A-Z]/);
    expect(passwords[0]).toMatch(/[0-9]/);
    expect(passwords[0]).toMatch(/[^a-zA-Z0-9]/);
    expect(passwords[0]).not.toMatch(/[iIlL1oO0]/);
  });

  it("reports pool size and strength", () => {
    expect(getPasswordPool(options).groups).toHaveLength(4);
    expect(assessPasswordStrength(16, 80)).toMatchObject({ label: "แข็งแรงมาก" });
  });

  it("rejects an empty character selection", () => {
    expect(() => generatePasswords({ ...options, lowercase: false, uppercase: false, numbers: false, symbols: false })).toThrow("อย่างน้อย 1 ชุด");
  });
});

describe("random integer generator", () => {
  it("creates sorted unique numbers inside the range", () => {
    const values = generateRandomIntegers({ min: 10, max: 20, count: 5, unique: true, sort: true }, cyclingRandom());
    expect(values).toHaveLength(5);
    expect(new Set(values).size).toBe(5);
    expect(values).toEqual([...values].sort((first, second) => first - second));
    expect(values.every((value) => value >= 10 && value <= 20)).toBe(true);
  });

  it("rejects impossible unique requests", () => {
    expect(() => generateRandomIntegers({ min: 1, max: 3, count: 4, unique: true, sort: false })).toThrow("มากกว่าช่วง");
  });
});
