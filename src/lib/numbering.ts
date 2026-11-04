const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function romanMonth(month: number): string {
  return ROMAN[Math.min(Math.max(month, 1), 12) - 1];
}

export interface NumberingInput {
  sequence: number;
  date: Date;
  record?: Record<string, unknown>;
}

/**
 * Expands the administrator-defined number pattern, e.g.
 * `SP-{seq}/DISPENDIK/{romanMonth}/{year}` -> `SP-001/DISPENDIK/IX/2026`.
 * Unknown tokens are left empty so a typo never produces a broken document.
 */
export function formatLetterNumber(pattern: string, input: NumberingInput): string {
  const { sequence, date, record = {} } = input;

  return pattern.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, rawToken: string) => {
    const token = rawToken.toLowerCase();
    switch (token) {
      case "seq":
        return String(sequence).padStart(3, "0");
      case "month":
        return String(date.getMonth() + 1).padStart(2, "0");
      case "romanmonth":
        return romanMonth(date.getMonth() + 1);
      case "year":
        return String(date.getFullYear());
      case "day":
        return String(date.getDate()).padStart(2, "0");
      default: {
        const value = record[rawToken] ?? record[token];
        return value === undefined || value === null ? "" : String(value);
      }
    }
  });
}

export function nextSequence(existingNumbers: string[], pattern: string): number {
  const seqTokenIndex = pattern.indexOf("{seq}");
  if (seqTokenIndex === -1) return existingNumbers.length + 1;

  const prefix = pattern.slice(0, seqTokenIndex);
  let highest = 0;
  for (const value of existingNumbers) {
    if (!value.startsWith(prefix)) continue;
    const digits = value.slice(prefix.length).match(/^(\d+)/);
    if (digits) highest = Math.max(highest, Number(digits[1]));
  }
  return highest + 1;
}
