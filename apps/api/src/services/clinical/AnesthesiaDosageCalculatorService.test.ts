import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AnesthesiaDosageCalculatorService } from './AnesthesiaDosageCalculatorService.js';

describe('AnesthesiaDosageCalculatorService', () => {
    it('should calculate correct max dose for 70kg patient with Articaine 4%', () => {
        const result = AnesthesiaDosageCalculatorService.calculateMaxDose(70, 'ARTICAINE_4');
        // 70 * 7 = 490 мг, < 500 мг.
        assert.strictEqual(result.maxMg, 490);
        // 4% * 10 * 1.8 = 72 мг/карпула
        // 490 / 72 = 6.8 -> 6 карпул
        assert.strictEqual(result.maxCarpules, 6);
    });

    it('should cap at absolute max for heavy patient (100kg) with Articaine 4%', () => {
        const result = AnesthesiaDosageCalculatorService.calculateMaxDose(100, 'ARTICAINE_4');
        // 100 * 7 = 700 мг, cap 500 мг
        assert.strictEqual(result.maxMg, 500);
        assert.strictEqual(result.maxCarpules, 6);
    });

    it('should detect toxic risk', () => {
        const result = AnesthesiaDosageCalculatorService.checkToxicRisk(70, 'ARTICAINE_4', 500);
        assert.strictEqual(result.isToxicRisk, true);
        assert.strictEqual(result.safetyMarginMg, 0);
    });

    it('should identify safe dose', () => {
        const result = AnesthesiaDosageCalculatorService.checkToxicRisk(70, 'ARTICAINE_4', 100);
        assert.strictEqual(result.isToxicRisk, false);
        assert.strictEqual(result.safetyMarginMg, 390);
    });
});
