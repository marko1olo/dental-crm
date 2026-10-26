/**
 * types.ts — Типы данных протокола рентгенодиагностики
 * Mandate 8b: строго <= 120 строк.
 */

export interface ToothUpdate {
	code: string;
	state: string;
	diagnosisOrFinding: string;
}

export interface ClinicalXrayProtocolPanelProps {
	summary: string;
	toothUpdates?: ToothUpdate[] | undefined;
	onPrint?: (() => void) | undefined;
	studyTitle?: string | undefined;
	patientId?: string | null | undefined;
	onApplyToChart?: ((appliedCount: number) => Promise<void> | void) | undefined;
	onInsertToDiary?: ((text: string) => void) | undefined;
}
