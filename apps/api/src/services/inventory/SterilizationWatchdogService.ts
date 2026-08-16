import { AutoclaveSterilizationService, type SterilizationCycleRecord } from "./AutoclaveSterilizationService.js";

export interface SterilizationStatus {
    barcode: string;
    trayId: string;
    expiresAt: Date;
    daysRemaining: number;
    status: "sterile" | "expiring_soon" | "expired";
}

export class SterilizationWatchdogService {
    /**
     * Monitors sterilization records and classifies their shelf-life status.
     * Complies with SanPiN 3.3686-21 expiration requirements.
     */
    public static monitorInventory(records: SterilizationCycleRecord[], currentDate: Date = new Date()): SterilizationStatus[] {
        return records.map(record => {
            const check = AutoclaveSterilizationService.checkTraySterility(record.expiresAt, currentDate);
            return {
                barcode: record.barcode,
                trayId: record.trayId,
                expiresAt: record.expiresAt,
                daysRemaining: check.daysRemaining,
                status: check.status
            };
        });
    }

    /**
     * Identifies trays that should be quarantined (expired or near expiry).
     * Trays with 'expired' status are forbidden from usage in clinical protocols.
     */
    public static getQuarantineList(records: SterilizationCycleRecord[], currentDate: Date = new Date()): SterilizationCycleRecord[] {
        return records.filter(record => {
            const check = AutoclaveSterilizationService.checkTraySterility(record.expiresAt, currentDate);
            return check.status === "expired";
        });
    }

    /**
     * Generates report for the Head Nurse on items needing re-sterilization (expired or soon expiring).
     */
    public static generateRestilizationReport(records: SterilizationCycleRecord[], currentDate: Date = new Date()) {
        const expiringSoon = records.filter(r => AutoclaveSterilizationService.checkTraySterility(r.expiresAt, currentDate).status === "expiring_soon");
        const expired = records.filter(r => AutoclaveSterilizationService.checkTraySterility(r.expiresAt, currentDate).status === "expired");

        return {
            generatedAt: currentDate,
            needsImmediateAttention: expired.map(r => ({ barcode: r.barcode, trayId: r.trayId, daysOverdue: Math.abs(AutoclaveSterilizationService.checkTraySterility(r.expiresAt, currentDate).daysRemaining) })),
            scheduledForReprocessing: expiringSoon.map(r => ({ barcode: r.barcode, trayId: r.trayId, daysRemaining: AutoclaveSterilizationService.checkTraySterility(r.expiresAt, currentDate).daysRemaining }))
        };
    }
}
