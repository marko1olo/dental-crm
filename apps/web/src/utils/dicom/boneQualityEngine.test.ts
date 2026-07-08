import { test, describe } from 'node:test';
import assert from 'node:assert';
import { extractHUZones } from './boneQualityEngine.js';

describe('extractHUZones', () => {
  test('returns 0 for all zones when array is empty', () => {
    const result = extractHUZones([]);
    assert.deepStrictEqual(result, { corticalHU: 0, cancellousHU: 0, apicalHU: 0 });
  });

  test('handles 10 samples correctly (20% cortical, 60% cancellous, 20% apical)', () => {
    // 2 cortical, 6 cancellous, 2 apical
    const samples = [
      1000, 1000, // cortical: avg 1000
      400, 500, 600, 500, 400, 600, // cancellous: sum 3000, avg 500
      800, 1200 // apical: avg 1000
    ];
    const result = extractHUZones(samples);
    assert.deepStrictEqual(result, { corticalHU: 1000, cancellousHU: 500, apicalHU: 1000 });
  });

  test('handles 5 samples correctly (1 cortical, 3 cancellous, 1 apical)', () => {
    const samples = [1200, 300, 400, 500, 1000];
    const result = extractHUZones(samples);
    // cortical: 1200
    // cancellous: 300, 400, 500 -> sum 1200, avg 400
    // apical: 1000
    assert.deepStrictEqual(result, { corticalHU: 1200, cancellousHU: 400, apicalHU: 1000 });
  });

  test('handles 1 sample correctly', () => {
    const samples = [800];
    const result = extractHUZones(samples);
    // corticalCount = 1, apicalCount = 1
    // cortical: [800] -> avg 800
    // cancellous: empty, falls back to full array -> avg 800
    // apical: [800] -> avg 800
    assert.deepStrictEqual(result, { corticalHU: 800, cancellousHU: 800, apicalHU: 800 });
  });

  test('handles 2 samples correctly', () => {
    const samples = [1000, 600];
    const result = extractHUZones(samples);
    // corticalCount = 1, apicalCount = 1
    // cortical: [1000] -> avg 1000
    // apical: [600] -> avg 600
    // cancellous: empty, falls back to full array -> avg 800
    assert.deepStrictEqual(result, { corticalHU: 1000, cancellousHU: 800, apicalHU: 600 });
  });

  test('handles array with varying values', () => {
    const samples = [1200, 1100, 300, 200, 150, 400, 800, 900];
    // length 8
    // corticalCount = round(8 * 0.2) = 2 -> [1200, 1100], avg 1150
    // apicalCount = round(8 * 0.2) = 2 -> [800, 900], avg 850
    // cancellous = middle 4 -> [300, 200, 150, 400], sum 1050, avg 262.5
    const result = extractHUZones(samples);
    assert.deepStrictEqual(result, { corticalHU: 1150, cancellousHU: 262.5, apicalHU: 850 });
  });
});
