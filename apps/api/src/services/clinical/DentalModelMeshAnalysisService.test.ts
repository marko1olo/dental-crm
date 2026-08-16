import { DentalModelMeshAnalysisService } from './DentalModelMeshAnalysisService.js';
import assert from 'node:assert';

// Тест Болтона
const bolton = DentalModelMeshAnalysisService.calculateBolton(45.0, 35.0, 90.0, 80.0);
console.log('Bolton Test:', bolton);
assert.strictEqual(bolton.anteriorRatio, 77.78);
assert.strictEqual(bolton.overallRatio, 88.89);

// Тест Пона
const pon = DentalModelMeshAnalysisService.calculatePon(15.0, 20.0, 20.0, 30.0);
console.log('Pon Test:', pon);
assert.strictEqual(pon.premolarIndex, 75.0);
assert.strictEqual(pon.molarIndex, 66.67);

console.log('All tests passed.');
