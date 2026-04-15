export const GENERATED_STUDENT_CODE_DIGITS = 5;
export const GENERATED_STUDENT_CODE_MAX_SEQUENCE = 99999;

const GENERIC_STUDENT_CODE_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;

export function buildGeneratedStudentCodePrefix(schoolYear: number): string {
  return `u${schoolYear}`;
}

export function isGeneratedStudentCode(
  code: string,
  schoolYear?: number,
): boolean {
  const normalizedCode = code.trim().toLowerCase();
  const yearPattern =
    typeof schoolYear === 'number' ? String(schoolYear) : '\\d{4}';

  return new RegExp(
    `^u${yearPattern}\\d{${GENERATED_STUDENT_CODE_DIGITS}}$`,
  ).test(normalizedCode);
}

export function isSupportedStudentCode(code: string): boolean {
  const normalizedCode = code.trim().toLowerCase();

  if (!GENERIC_STUDENT_CODE_REGEX.test(normalizedCode)) {
    return false;
  }

  if (/^u\d+$/.test(normalizedCode)) {
    return isGeneratedStudentCode(normalizedCode);
  }

  return true;
}

export function extractGeneratedStudentSequence(
  code: string,
  schoolYear: number,
): number | null {
  const normalizedCode = code.trim().toLowerCase();
  const match = normalizedCode.match(
    new RegExp(
      `^${buildGeneratedStudentCodePrefix(schoolYear)}(\\d{${GENERATED_STUDENT_CODE_DIGITS}})$`,
    ),
  );

  if (!match?.[1]) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

export function formatGeneratedStudentCode(
  schoolYear: number,
  sequence: number,
): string {
  return `${buildGeneratedStudentCodePrefix(schoolYear)}${String(
    sequence,
  ).padStart(GENERATED_STUDENT_CODE_DIGITS, '0')}`;
}
