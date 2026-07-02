import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizeRubAmountInput, rubAmountInputMissingStep } from '../rubAmountInput.js';

describe('normalizeRubAmountInput', () => {
  test('returns null for empty strings', () => {
    assert.strictEqual(normalizeRubAmountInput(''), null);
    assert.strictEqual(normalizeRubAmountInput('   '), null);
  });

  test('returns null for strings with letters or non-numeric characters', () => {
    assert.strictEqual(normalizeRubAmountInput('100a'), null);
    assert.strictEqual(normalizeRubAmountInput('a100'), null);
    assert.strictEqual(normalizeRubAmountInput('100-'), null);
    assert.strictEqual(normalizeRubAmountInput('-100'), null);
  });

  test('returns null for decimals (non-whole numbers)', () => {
    assert.strictEqual(normalizeRubAmountInput('100.50'), null);
    assert.strictEqual(normalizeRubAmountInput('100,50'), null);
  });

  test('strips standard and non-breaking spaces and returns parsed number', () => {
    assert.strictEqual(normalizeRubAmountInput(' 100 '), 100);
    assert.strictEqual(normalizeRubAmountInput('1 000'), 1000);
    assert.strictEqual(normalizeRubAmountInput('1\u00A0000'), 1000); // Non-breaking space
    assert.strictEqual(normalizeRubAmountInput(' 1 000 000 '), 1000000);
  });

  test('returns parsed number for valid positive integers', () => {
    assert.strictEqual(normalizeRubAmountInput('0'), 0);
    assert.strictEqual(normalizeRubAmountInput('5'), 5);
    assert.strictEqual(normalizeRubAmountInput('999999'), 999999);
  });

  test('returns null if number exceeds MAX_SAFE_INTEGER', () => {
    const tooLargeStr = (Number.MAX_SAFE_INTEGER + 1).toString() + '0';
    assert.strictEqual(normalizeRubAmountInput(tooLargeStr), null);
  });
});

describe('rubAmountInputMissingStep', () => {
  test('returns zeroMessage for empty or whitespace-only input', () => {
    assert.strictEqual(rubAmountInputMissingStep(''), 'укажите сумму больше нуля');
    assert.strictEqual(rubAmountInputMissingStep('   '), 'укажите сумму больше нуля');
  });

  test('returns zeroMessage for zero or negative values', () => {
    assert.strictEqual(rubAmountInputMissingStep('0'), 'укажите сумму больше нуля');
    assert.strictEqual(rubAmountInputMissingStep('-5'), 'укажите сумму целыми рублями без копеек'); // normalize returns null for negative, triggers invalidMessage
  });

  test('returns zeroMessage when explicitly provided and input is 0', () => {
    assert.strictEqual(rubAmountInputMissingStep('0', 'Custom zero message'), 'Custom zero message');
  });

  test('returns invalidMessage for invalid inputs', () => {
    assert.strictEqual(rubAmountInputMissingStep('abc'), 'укажите сумму целыми рублями без копеек');
    assert.strictEqual(rubAmountInputMissingStep('123.45'), 'укажите сумму целыми рублями без копеек');
  });

  test('returns invalidMessage when explicitly provided', () => {
    assert.strictEqual(rubAmountInputMissingStep('abc', 'zero', 'Custom invalid message'), 'Custom invalid message');
  });

  test('returns null for valid positive integers', () => {
    assert.strictEqual(rubAmountInputMissingStep('1'), null);
    assert.strictEqual(rubAmountInputMissingStep('100'), null);
    assert.strictEqual(rubAmountInputMissingStep('1 000'), null);
    assert.strictEqual(rubAmountInputMissingStep(' 1\u00A0000 '), null);
  });
});
