/**
 * OrthodonticAlignerTrackerService.ts — Сервис трекинга элайнеров и ортодонтического лечения.
 * 
 * КЛИНИЧЕСКИЕ СТАНДАРТЫ:
 * 1. Прогресс капп: отслеживание текущего этапа (шага) относительно плана (всего шагов).
 * 2. Сепарация зубов (IPR): контроль планируемого объема (мм) и фактически выполненного.
 * 3. Комплаентность: контроль ношения (> 22 часов/сутки).
 */

export type OrthodonticArch = "maxilla" | "mandible";

export type ComplianceStatus = "compliant" | "at_risk" | "relapse_warning";

export interface AlignerProgress {
    readonly currentStep: number;
    readonly totalSteps: number;
    readonly lastStepDate: Date;
}

export interface IPRRecord {
    readonly toothFrom: number;
    readonly toothTo: number;
    readonly plannedMm: number;
    readonly actualMm: number;
    readonly performedAt?: Date;
}

export interface ComplianceStats {
    readonly hoursPerDay: number;
    readonly status: ComplianceStatus;
}

export interface AlignerTrackerRecord {
    readonly id: string;
    readonly arch: OrthodonticArch;
    readonly progress: AlignerProgress;
    readonly iprRecords: IPRRecord[];
    readonly currentCompliance: ComplianceStats;
}

export class OrthodonticAlignerTrackerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OrthodonticAlignerTrackerError";
    }
}

export class OrthodonticAlignerTrackerService {
    public static readonly MIN_COMPLIANT_HOURS = 22;
    public static readonly RELAPSE_WARNING_HOURS = 18;

    /**
     * Оценка комплаентности ношения капп.
     */
    public static evaluateCompliance(hoursPerDay: number): ComplianceStats {
        if (hoursPerDay < 0 || hoursPerDay > 24) {
            throw new OrthodonticAlignerTrackerError("Количество часов ношения должно быть от 0 до 24.");
        }

        let status: ComplianceStatus = "compliant";
        if (hoursPerDay < this.RELAPSE_WARNING_HOURS) {
            status = "relapse_warning";
        } else if (hoursPerDay < this.MIN_COMPLIANT_HOURS) {
            status = "at_risk";
        }

        return { hoursPerDay, status };
    }

    /**
     * Валидация прогресса элайнеров.
     */
    public static validateProgress(current: number, total: number): AlignerProgress {
        if (total <= 0) throw new OrthodonticAlignerTrackerError("Общее количество шагов должно быть > 0.");
        if (current < 0 || current > total) throw new OrthodonticAlignerTrackerError("Некорректный текущий шаг.");
        
        return { currentStep: current, totalSteps: total, lastStepDate: new Date() };
    }

    /**
     * Расчет выполнения IPR.
     */
    public static calculateIprCompletion(planned: number, actual: number): number {
        if (planned <= 0) return 100;
        return Math.round((actual / planned) * 100);
    }
}
