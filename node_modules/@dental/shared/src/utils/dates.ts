export function normalizeDate(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (!match) return trimmed;
  const day = match[1];
  const month = match[2];
  const year = match[3];
  if (!day || !month || !year) return trimmed;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
