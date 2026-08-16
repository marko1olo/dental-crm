import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ResuscitationKitWatchdogService } from './ResuscitationKitWatchdogService.js';

describe('ResuscitationKitWatchdogService', () => {
    it('should report expired medication', () => {
        const kit = {
            medications: [{ id: '1', name: 'Адреналин', expiryDate: '2026-01-01' }],
            oxygenPressureBar: 150,
            defibrillatorChargePercent: 100
        };
        const alerts = ResuscitationKitWatchdogService.checkStatus(kit);
        assert.strictEqual(alerts.some(a => a.type === 'EXPIRY_BLOCK'), true);
    });

    it('should report low oxygen pressure', () => {
        const kit = {
            medications: [],
            oxygenPressureBar: 40,
            defibrillatorChargePercent: 100
        };
        const alerts = ResuscitationKitWatchdogService.checkStatus(kit);
        assert.strictEqual(alerts.some(a => a.type === 'PRESSURE_LOW' && a.severity === 'critical'), true);
    });
});
