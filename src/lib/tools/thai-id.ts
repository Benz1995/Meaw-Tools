export const THAI_ID_LENGTH = 13;

export type ThaiIdValidationCode =
  | "empty"
  | "invalid_characters"
  | "wrong_length"
  | "invalid_category"
  | "invalid_checksum"
  | "valid";

export type ThaiIdValidationResult = {
  code: ThaiIdValidationCode;
  isValid: boolean;
  digitCount: number;
  formatValid: boolean;
  categoryValid: boolean | null;
  checksumValid: boolean | null;
};

function result(
  code: ThaiIdValidationCode,
  digitCount: number,
  formatValid: boolean,
  categoryValid: boolean | null,
  checksumValid: boolean | null,
): ThaiIdValidationResult {
  return { code, isValid: code === "valid", digitCount, formatValid, categoryValid, checksumValid };
}

/**
 * Validates the structure and check digit of a Thai 13-digit personal ID.
 * Spaces and ASCII hyphens are accepted only as visual separators.
 * This function never verifies a person, card status, or government record.
 */
export function validateThaiId(value: string): ThaiIdValidationResult {
  const compact = value.replace(/[\s-]/g, "");
  const digitCount = compact.replace(/\D/g, "").length;

  if (!compact) return result("empty", 0, false, null, null);
  if (/\D/.test(compact)) return result("invalid_characters", digitCount, false, null, null);
  if (compact.length !== THAI_ID_LENGTH) return result("wrong_length", compact.length, false, null, null);

  const categoryValid = /^[1-8]/.test(compact);
  if (!categoryValid) return result("invalid_category", THAI_ID_LENGTH, true, false, null);

  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(compact[index]) * (13 - index);
  }

  const expectedCheckDigit = (11 - (sum % 11)) % 10;
  const checksumValid = expectedCheckDigit === Number(compact[12]);
  if (!checksumValid) return result("invalid_checksum", THAI_ID_LENGTH, true, true, false);

  return result("valid", THAI_ID_LENGTH, true, true, true);
}
