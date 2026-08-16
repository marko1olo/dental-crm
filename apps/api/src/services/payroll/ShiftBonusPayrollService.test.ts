import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ShiftBonusPayrollService } from "./ShiftBonusPayrollService.js";

describe("ShiftBonusPayrollService", () => {
    it("should correctly calculate overtime bonuses (1.5x for first 2, 2.0x for rest)", () => {
        const hourlyRate = 1000;
        // 3 hours overtime: 2 * 0.5 * 1000 + 1 * 1.0 * 1000 = 1000 + 1000 = 2000
        const result = ShiftBonusPayrollService.calculateShiftBonus(hourlyRate, 8, 3, 0, 0);
        assert.equal(result.overtimeBonus, 2000);
        assert.equal(result.totalBonus, 2000);
    });

    it("should correctly calculate night shift bonus (+20% of rate)", () => {
        const hourlyRate = 1000;
        // 2 hours night: 2 * 0.2 * 1000 = 400
        const result = ShiftBonusPayrollService.calculateShiftBonus(hourlyRate, 8, 0, 2, 0);
        assert.equal(result.nightBonus, 400);
        assert.equal(result.totalBonus, 400);
    });

    it("should correctly calculate holiday/weekend bonus (2.0x of rate)", () => {
        const hourlyRate = 1000;
        // 8 hours holiday: 8 * 1.0 * 1000 = 8000
        const result = ShiftBonusPayrollService.calculateShiftBonus(hourlyRate, 8, 0, 0, 8);
        assert.equal(result.holidayBonus, 8000);
        assert.equal(result.totalBonus, 8000);
    });

    it("should combine multiple bonuses correctly", () => {
        const hourlyRate = 1000;
        // Overtime 3h: 2000
        // Night 2h: 400
        // Holiday 8h: 8000
        // Total: 10400
        const result = ShiftBonusPayrollService.calculateShiftBonus(hourlyRate, 13, 3, 2, 8);
        assert.equal(result.overtimeBonus, 2000);
        assert.equal(result.nightBonus, 400);
        assert.equal(result.holidayBonus, 8000);
        assert.equal(result.totalBonus, 10400);
    });
});
