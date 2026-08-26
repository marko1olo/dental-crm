/**
 * Locale-aware formatters for Copilot cards and timestamps.
 */

export function formatDateTime(iso?: string | null, locale: string = 'ru-RU'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTimeRange(startIso?: string | null, endIso?: string | null, locale: string = 'ru-RU'): string {
  if (!startIso) return '';
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return startIso;
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(start);
  const t = (d: Date) =>
    new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
  const end = endIso ? new Date(endIso) : null;
  const range = end && !Number.isNaN(end.getTime()) ? `${t(start)} – ${t(end)}` : t(start);
  return `${day} · ${range}`;
}

export function formatTime(iso?: string | null, locale: string = 'ru-RU'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
}

export function formatMoney(value: number, currency: string = 'RUB', locale: string = 'ru-RU'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}
