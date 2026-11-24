/**
 * Locale-aware formatters for Copilot cards and timestamps.
 * Canonical SSOT re-exports from @dental/shared/src/money.ts (Mandate 8bm, 8bf).
 */

import { formatCurrency, formatKopecksToRub } from '@dental/shared';

export { formatCurrency, formatKopecksToRub };

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

/**
 * Format money using canonical exact kopecks arithmetic without parseFloat drift (Mandate 8bm, 8bf).
 */
export function formatMoney(
  value?: number | string | null,
  currency: string = 'RUB',
  locale: string = 'ru-RU',
): string {
  if (value === null || value === undefined || value === '') return '0 ₽';
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value)) return '0 ₽';
    return formatCurrency(value);
  }
  const sanitized = String(value).replace(/\s+/g, '').replace(',', '.');
  return formatCurrency(sanitized);
}
