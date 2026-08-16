import { ClinicalDisinfectionAuditService, type LampRecord } from './ClinicalDisinfectionAuditService.js';
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('ClinicalDisinfectionAuditService', () => {
    it('should correctly identify lamp status based on hours', () => {
        assert.strictEqual(ClinicalDisinfectionAuditService.checkLampStatus(7000).status, 'ok');
        assert.strictEqual(ClinicalDisinfectionAuditService.checkLampStatus(8500).status, 'warning');
        assert.strictEqual(ClinicalDisinfectionAuditService.checkLampStatus(9500).status, 'blocked');
    });

    it('should correctly increment lamp hours', () => {
        const lamp: LampRecord = { id: 'l1', room: 'Op 1', hoursWorked: 100, lastMaintenanceDate: new Date() };
        const updated = ClinicalDisinfectionAuditService.addLampHours(lamp, 50);
        assert.strictEqual(updated.hoursWorked, 150);
    });

    it('should validate disinfectant records', () => {
        assert.strictEqual(ClinicalDisinfectionAuditService.validateDisinfectant({
            id: 'd1', name: 'Alco', concentration: 70, exposureTimeMinutes: 5, testStripsUsed: true, datePrepared: new Date()
        }), true);
        assert.strictEqual(ClinicalDisinfectionAuditService.validateDisinfectant({
            id: 'd2', name: 'Alco', concentration: 70, exposureTimeMinutes: 5, testStripsUsed: false, datePrepared: new Date()
        }), false);
    });
});
