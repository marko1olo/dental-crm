import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeDate } from '../utils/dates.js';

describe('normalizeDate', () => {
  test('returns null for null or empty values', () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(''), null);
  });


  });
});
