import assert from 'node:assert';
import { describe, it } from 'node:test';
import { DentalWaterLineSafetyService } from './DentalWaterLineSafetyService.js';

describe('DentalWaterLineSafetyService', () => {
	it('should return normal status for <= 200 CFU/ml', () => {
		const result = DentalWaterLineSafetyService.evaluateWaterQuality(150, new Date('2026-08-01'));
		assert.strictEqual(result.status, 'normal');
		assert.strictEqual(result.isUnitLocked, false);
	});

	it('should return warning status for 201-500 CFU/ml', () => {
		const result = DentalWaterLineSafetyService.evaluateWaterQuality(300, new Date('2026-08-01'));
		assert.strictEqual(result.status, 'warning');
		assert.strictEqual(result.isUnitLocked, false);
	});

	it('should return critical status for > 500 CFU/ml', () => {
		const result = DentalWaterLineSafetyService.evaluateWaterQuality(600, new Date('2026-08-01'));
		assert.strictEqual(result.status, 'critical');
		assert.strictEqual(result.isUnitLocked, true);
	});

    it('should calculate next shock disinfection date correctly', () => {
        const lastDisinfection = new Date('2026-08-01');
        const result = DentalWaterLineSafetyService.evaluateWaterQuality(100, lastDisinfection);
        const expectedDate = new Date('2026-08-01');
        expectedDate.setDate(expectedDate.getDate() + 30);
        assert.deepStrictEqual(result.nextShockDisinfectionDate, expectedDate);
    });
});
