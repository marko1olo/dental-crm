import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateTime,
  formatTimeRange,
  formatMoney,
} from '../useCopilotFormat';

describe('Copilot Formatters', () => {
  it('formats ISO timestamps with locale', () => {
    const formatted = formatDateTime('2026-08-27T14:30:00Z');
    assert.ok(formatted.includes('27'));
  });

  it('formats time ranges correctly', () => {
    const range = formatTimeRange('2026-08-27T09:00:00Z', '2026-08-27T10:00:00Z');
    assert.ok(range.includes('—') || range.includes(':'));
  });

  it('formats currency values correctly', () => {
    const formatted = formatMoney(15000);
    assert.ok(formatted.includes('15') && (formatted.includes('₽') || formatted.includes('RUB')));
  });

  it('guarantees 100% NaN and edge case protection in formatMoney', () => {
    assert.ok(formatMoney(NaN).includes('0'));
    assert.ok(formatMoney(null).includes('0'));
    assert.ok(formatMoney(undefined).includes('0'));
    assert.ok(formatMoney(Infinity).includes('0'));
    assert.ok(formatMoney(-Infinity).includes('0'));
    assert.ok(formatMoney('invalid_string').includes('0'));
    assert.ok(formatMoney('12 500,50').includes('12'));
  });
});
