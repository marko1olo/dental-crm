import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrthodonticRetentionFailurePredictor } from './OrthodonticRetentionFailurePredictor.js';

test('OrthodonticRetentionFailurePredictor: should calculate high risk correctly', () => {
    const factors = {
        hasTraumaticDeepBite: true,
        hasSevereBruxism: true,
        usedDirectBondingWithoutTemplate: false,
        hasLingualInclination: false
    };
    const result = OrthodonticRetentionFailurePredictor.predictRisk(factors);
    
    assert.strictEqual(result.riskScore, 55); // 30 + 25
    assert.ok(result.recommendations.includes("Дублирование несъемного ретейнера ночной прозрачной ретенционной каппой (Vivera/Essix)."));
});

test('OrthodonticRetentionFailurePredictor: should calculate low risk correctly', () => {
    const factors = {
        hasTraumaticDeepBite: false,
        hasSevereBruxism: false,
        usedDirectBondingWithoutTemplate: true,
        hasLingualInclination: false
    };
    const result = OrthodonticRetentionFailurePredictor.predictRisk(factors);
    
    assert.strictEqual(result.riskScore, 15);
    assert.ok(!result.recommendations.includes("Дублирование несъемного ретейнера ночной прозрачной ретенционной каппой (Vivera/Essix)."));
});
