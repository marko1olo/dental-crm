/**
 * ErgonomicShiftBreakWatchdogService.ts
 * Контроль эргономики и микропауз врача (работа под микроскопом >90 мин без перерыва -> предупреждение и разминка).
 */

export interface ProcedureSession {
    procedureType: 'endodontics' | 'microscope_surgery' | 'general';
    startTime: string; // ISO 8601
    durationMinutes: number;
}

export interface ErgonomicStatus {
    sessions: ProcedureSession[];
    currentSessionStartTime?: string;
    totalDailyMicroscopeMinutes: number;
}

export interface ErgonomicAlert {
    type: 'break_recommended' | 'daily_ergonomic_limit_exceeded';
    message: string;
    severity: 'warning' | 'critical';
}

export class ErgonomicShiftBreakWatchdogService {
    private static readonly MICRO_BREAK_THRESHOLD_MINUTES = 90;
    private static readonly DAILY_LIMIT_MINUTES = 360; // 6 hours

    public static checkStatus(status: ErgonomicStatus, now: Date = new Date()): ErgonomicAlert[] {
        const alerts: ErgonomicAlert[] = [];

        // 1. Check current session for break
        if (status.currentSessionStartTime) {
            const start = new Date(status.currentSessionStartTime);
            const elapsedMinutes = (now.getTime() - start.getTime()) / (1000 * 60);

            if (elapsedMinutes >= this.MICRO_BREAK_THRESHOLD_MINUTES) {
                alerts.push({
                    type: 'break_recommended',
                    message: `Вы работаете непрерывно ${Math.floor(elapsedMinutes)} минут. Рекомендуется 5-минутная гимнастика для шеи и глаз.`,
                    severity: 'warning'
                });
            }
        }

        // 2. Check total daily limit
        if (status.totalDailyMicroscopeMinutes > this.DAILY_LIMIT_MINUTES) {
            alerts.push({
                type: 'daily_ergonomic_limit_exceeded',
                message: `Превышен дневной лимит работы под микроскопом: ${status.totalDailyMicroscopeMinutes} минут (норма 360).`,
                severity: 'critical'
            });
        }

        return alerts;
    }
}
