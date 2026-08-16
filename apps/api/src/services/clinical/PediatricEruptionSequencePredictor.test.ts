import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PediatricEruptionSequencePredictor, SpaceMaintainerType } from './PediatricEruptionSequencePredictor.js';

describe('PediatricEruptionSequencePredictor', () => {
  const predictor = new PediatricEruptionSequencePredictor();

  it('should recommend Band-and-Loop for premature loss of 54', () => {
    const result = predictor.predict('54', 24, true);
    assert.strictEqual(result.recommendedIntervention, SpaceMaintainerType.BAND_AND_LOOP);
  });

  it('should recommend Distal Shoe for premature loss of 55', () => {
    const result = predictor.predict('55', 24, true);
    assert.strictEqual(result.recommendedIntervention, SpaceMaintainerType.DISTAL_SHOE);
  });

  it('should not recommend any appliance if no premature loss', () => {
    const result = predictor.predict('54', 24, false);
    assert.strictEqual(result.recommendedIntervention, SpaceMaintainerType.NONE);
  });

  it('should flag delay if current age is significantly past expected eruption', () => {
    const result = predictor.predict('54', 40, false);
    assert.strictEqual(result.isDelayed, true);
  });
});
