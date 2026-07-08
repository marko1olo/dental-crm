import { test, describe } from 'node:test';
import assert from 'node:assert';
import { classifyMisch } from './boneQualityEngine.js';

describe('classifyMisch', () => {
  test('returns "D1" for avgHU > 1250', () => {
    assert.strictEqual(classifyMisch(1500), 'D1');
    assert.strictEqual(classifyMisch(1251), 'D1');
  });

  test('returns "D2" for 850 <= avgHU <= 1250', () => {
    assert.strictEqual(classifyMisch(1250), 'D2');
    assert.strictEqual(classifyMisch(1000), 'D2');
    assert.strictEqual(classifyMisch(850), 'D2');
  });

  test('returns "D3" for 350 <= avgHU < 850', () => {
    assert.strictEqual(classifyMisch(849), 'D3');
    assert.strictEqual(classifyMisch(500), 'D3');
    assert.strictEqual(classifyMisch(350), 'D3');
  });

  test('returns "D4" for avgHU < 350', () => {
    assert.strictEqual(classifyMisch(349), 'D4');
    assert.strictEqual(classifyMisch(200), 'D4');
    assert.strictEqual(classifyMisch(0), 'D4');
    assert.strictEqual(classifyMisch(-100), 'D4');
  });
});
