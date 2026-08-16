import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PeriodontalChartingEngine, type ToothChart } from './PeriodontalChartingEngine.js';

describe('PeriodontalChartingEngine', () => {
  const engine = new PeriodontalChartingEngine();

  it('should calculate CAL correctly', () => {
    const point = { pocketDepth: 3, recession: 2, hasBleeding: false, hasPlaque: false };
    assert.strictEqual(engine.calculateCAL(point), 5);
  });

  it('should calculate BOP correctly', () => {
    const chart: ToothChart[] = [{
      toothId: '11',
      points: {
        mesioBuccal: { pocketDepth: 2, recession: 0, hasBleeding: true, hasPlaque: false },
        buccal: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
        distoBuccal: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
        mesioLingual: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
        lingual: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
        distoLingual: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
      },
      mobility: '0',
      furcation: '0'
    }];
    assert.ok(Math.abs(engine.calculateBOP(chart) - 16.666666666666664) < 0.0001);
  });

  it('should calculate OLeary Index correctly', () => {
    const chart: ToothChart[] = [{
      toothId: '11',
      points: {
        mesioBuccal: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: true },
        buccal: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
        distoBuccal: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: true },
        mesioLingual: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
        lingual: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
        distoLingual: { pocketDepth: 2, recession: 0, hasBleeding: false, hasPlaque: false },
      },
      mobility: '0',
      furcation: '0'
    }];
    assert.ok(Math.abs(engine.calculateOLearyIndex(chart) - 33.33333333333333) < 0.0001);
  });
});
