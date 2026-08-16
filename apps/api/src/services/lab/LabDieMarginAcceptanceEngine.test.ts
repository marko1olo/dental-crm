import { LabDieMarginAcceptanceEngine } from './LabDieMarginAcceptanceEngine.js';
import assert from 'node:assert';
import { test } from 'node:test';

const engine = new LabDieMarginAcceptanceEngine();

test('LabDieMarginAcceptanceEngine should accept valid die', () => {
  const status = engine.evaluate({
    ditchDepthMm: 0.75,
    hasContinuousMargin: true,
    hasChips: false,
  });
  assert.strictEqual(status, 'accepted');
});

test('LabDieMarginAcceptanceEngine should reject inadequate undercut', () => {
  const status = engine.evaluate({
    ditchDepthMm: 0.3,
    hasContinuousMargin: true,
    hasChips: false,
  });
  assert.strictEqual(status, 'rejected_undercut_inadequate');
});

test('LabDieMarginAcceptanceEngine should reject risk of fracture', () => {
  const status = engine.evaluate({
    ditchDepthMm: 1.6,
    hasContinuousMargin: true,
    hasChips: false,
  });
  assert.strictEqual(status, 'rejected_risk_of_fracture');
});

test('LabDieMarginAcceptanceEngine should reject missing continuous margin', () => {
  const status = engine.evaluate({
    ditchDepthMm: 0.75,
    hasContinuousMargin: false,
    hasChips: false,
  });
  assert.strictEqual(status, 'rejected_remake_required');
});

test('LabDieMarginAcceptanceEngine should reject if chips present', () => {
  const status = engine.evaluate({
    ditchDepthMm: 0.75,
    hasContinuousMargin: true,
    hasChips: true,
  });
  assert.strictEqual(status, 'rejected_remake_required');
});
