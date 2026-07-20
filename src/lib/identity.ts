/** Edad mínima para operar / registrarse */
export const MIN_AGE = 18;

export function ageFromDateOfBirth(dob: Date, now = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function parseDateOfBirth(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function isAdult(dob: Date, now = new Date()): boolean {
  return ageFromDateOfBirth(dob, now) >= MIN_AGE;
}

export function displayName(
  first?: string | null,
  last?: string | null,
  full?: string | null,
): string {
  const joined = [first, last].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  if (full?.trim()) return full.trim();
  return "—";
}
