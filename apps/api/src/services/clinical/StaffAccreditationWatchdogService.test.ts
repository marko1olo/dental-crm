import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StaffAccreditationWatchdogService } from "./StaffAccreditationWatchdogService.js";

describe('StaffAccreditationWatchdogService', () => {
    it('should return null for valid accreditation', () => {
        const staff = {
            userId: '1',
            fullName: 'Иван Иванов',
            accreditationExpiryDate: '2030-01-01',
            nmoPoints: 250,
            totalRequiredNmoPoints: 250
        };
        assert.strictEqual(StaffAccreditationWatchdogService.checkStatus(staff), null);
    });

    it('should return critical for expired accreditation', () => {
        const staff = {
            userId: '1',
            fullName: 'Петр Петров',
            accreditationExpiryDate: '2025-01-01',
            nmoPoints: 250,
            totalRequiredNmoPoints: 250
        };
        const alert = StaffAccreditationWatchdogService.checkStatus(staff);
        assert.ok(alert);
        assert.strictEqual(alert.status, 'expired_suspended');
        assert.strictEqual(alert.severity, 'critical');
    });

    it('should return critical for expiring in 30 days', () => {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 25);
        
        const staff = {
            userId: '1',
            fullName: 'Сидор Сидоров',
            accreditationExpiryDate: thirtyDaysFromNow.toISOString().split('T')[0]!,
            nmoPoints: 250,
            totalRequiredNmoPoints: 250
        };
        const alert = StaffAccreditationWatchdogService.checkStatus(staff);
        assert.ok(alert);
        assert.strictEqual(alert.status, 'expiring_30d');
        assert.strictEqual(alert.severity, 'critical');
    });

    it('should return warning for expiring in 90 days', () => {
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 85);
        
        const staff = {
            userId: '1',
            fullName: 'Анна Аннова',
            accreditationExpiryDate: ninetyDaysFromNow.toISOString().split('T')[0]!,
            nmoPoints: 250,
            totalRequiredNmoPoints: 250
        };
        const alert = StaffAccreditationWatchdogService.checkStatus(staff);
        assert.ok(alert);
        assert.strictEqual(alert.status, 'expiring_90d');
        assert.strictEqual(alert.severity, 'warning');
    });

    it('should return warning for low NMO points', () => {
        const staff = {
            userId: '1',
            fullName: 'Мария Мария',
            accreditationExpiryDate: '2030-01-01',
            nmoPoints: 100,
            totalRequiredNmoPoints: 250
        };
        const alert = StaffAccreditationWatchdogService.checkStatus(staff);
        assert.ok(alert);
        assert.strictEqual(alert.type, 'NMO_POINTS_LOW');
        assert.strictEqual(alert.severity, 'warning');
    });
});
