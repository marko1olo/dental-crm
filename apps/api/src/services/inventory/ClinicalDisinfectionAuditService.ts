export interface LampRecord {
    id: string;
    room: string;
    hoursWorked: number;
    lastMaintenanceDate: Date;
}

export interface DisinfectantRecord {
    id: string;
    name: string;
    concentration: number;
    exposureTimeMinutes: number;
    testStripsUsed: boolean;
    datePrepared: Date;
}

export interface CleaningLog {
    id: string;
    room: string;
    type: 'current' | 'general';
    datePerformed: Date;
    performedBy: string;
}

export class ClinicalDisinfectionAuditService {
    private static readonly MAX_HOURS = 9000;
    private static readonly WARNING_HOURS = 8000;

    public static checkLampStatus(hoursWorked: number): { status: 'ok' | 'warning' | 'blocked'; message?: string } {
        if (hoursWorked >= this.MAX_HOURS) {
            return { status: 'blocked', message: 'Lamp has exceeded maximum operating hours (9000). Replacement required.' };
        }
        if (hoursWorked >= this.WARNING_HOURS) {
            return { status: 'warning', message: 'Lamp approaching service limit (8000+ hours). Schedule maintenance.' };
        }
        return { status: 'ok' };
    }

    public static addLampHours(lamp: LampRecord, hours: number): LampRecord {
        return { ...lamp, hoursWorked: lamp.hoursWorked + hours };
    }

    public static validateDisinfectant(record: DisinfectantRecord): boolean {
        // Basic business logic validation
        return record.concentration > 0 && record.exposureTimeMinutes > 0 && record.testStripsUsed;
    }
}
