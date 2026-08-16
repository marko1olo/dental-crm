/**
 * StaffAccreditationWatchdogService.ts
 * Мониторинг периодической аккредитации врачей и баллов НМО (Приказ МЗ РФ № 709н).
 */

export type AccreditationStatus = 'valid' | 'expiring_90d' | 'expiring_30d' | 'expired_suspended';

export interface AccreditationInfo {
    userId: string;
    fullName: string;
    accreditationExpiryDate: string; // ISO 8601
    nmoPoints: number; // Набранные баллы
    totalRequiredNmoPoints: number; // Обычно 250 за 5 лет
}

export interface AccreditationAlert {
    type: 'EXPIRY_WARNING' | 'EXPIRY_BLOCK' | 'NMO_POINTS_LOW';
    status: AccreditationStatus;
    message: string;
    severity: 'warning' | 'critical';
}

export class StaffAccreditationWatchdogService {
    public static readonly REQUIRED_NMO_POINTS_PER_CYCLE = 250;

    public static checkStatus(staff: AccreditationInfo): AccreditationAlert | null {
        const now = new Date();
        const expiry = new Date(staff.accreditationExpiryDate);
        
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(now.getDate() + 90);

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        // Check expiry
        if (expiry < now) {
            return {
                type: 'EXPIRY_BLOCK',
                status: 'expired_suspended',
                message: `Аккредитация сотрудника ${staff.fullName} истекла ${staff.accreditationExpiryDate}! Прием запрещен.`,
                severity: 'critical'
            };
        }
        
        if (expiry <= thirtyDaysFromNow) {
            return {
                type: 'EXPIRY_WARNING',
                status: 'expiring_30d',
                message: `Срок аккредитации ${staff.fullName} истекает через 30 дней (${staff.accreditationExpiryDate})`,
                severity: 'critical'
            };
        }

        if (expiry <= ninetyDaysFromNow) {
            return {
                type: 'EXPIRY_WARNING',
                status: 'expiring_90d',
                message: `Срок аккредитации ${staff.fullName} истекает через 90 дней (${staff.accreditationExpiryDate})`,
                severity: 'warning'
            };
        }

        // Check NMO points
        if (staff.nmoPoints < staff.totalRequiredNmoPoints) {
            return {
                type: 'NMO_POINTS_LOW',
                status: 'valid',
                message: `Недостаточно баллов НМО у ${staff.fullName}: ${staff.nmoPoints}/${staff.totalRequiredNmoPoints}`,
                severity: 'warning'
            };
        }

        return null; // All good
    }
}
