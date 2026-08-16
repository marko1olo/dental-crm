import { test } from 'node:test';
import assert from 'node:assert';
import { PediatricFranklBehaviorService, FranklScale, TreatmentAdaptationMethod } from './PediatricFranklBehaviorService.js';

test('PediatricFranklBehaviorService determines correct adaptation method', async (t) => {
  const service = new PediatricFranklBehaviorService();

  await t.test('Positive behavior uses Standard Adaptation', () => {
    const result = service.determineAdaptationMethod({
      franklScore: FranklScale.POSITIVE,
      isEarlyChildhood: false,
      hasMultiplePulpitis: false,
    });
    assert.strictEqual(result, TreatmentAdaptationMethod.STANDARD_ADAPTATION);
  });

  await t.test('Categorically Positive behavior uses Standard Adaptation', () => {
    const result = service.determineAdaptationMethod({
      franklScore: FranklScale.CATEGORICALLY_POSITIVE,
      isEarlyChildhood: false,
      hasMultiplePulpitis: false,
    });
    assert.strictEqual(result, TreatmentAdaptationMethod.STANDARD_ADAPTATION);
  });

  await t.test('Negative behavior uses N2O/O2 sedation', () => {
    const result = service.determineAdaptationMethod({
      franklScore: FranklScale.NEGATIVE,
      isEarlyChildhood: false,
      hasMultiplePulpitis: false,
    });
    assert.strictEqual(result, TreatmentAdaptationMethod.SEDATION_N2O_O2);
  });

  await t.test('Categorically Negative in early childhood with multiple pulpitis uses General Anesthesia', () => {
    const result = service.determineAdaptationMethod({
      franklScore: FranklScale.CATEGORICALLY_NEGATIVE,
      isEarlyChildhood: true,
      hasMultiplePulpitis: true,
    });
    assert.strictEqual(result, TreatmentAdaptationMethod.GENERAL_ANESTHESIA);
  });
});
