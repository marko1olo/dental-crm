/**
 * planValidationTypes.ts — Структура данных валидации цен и снимка позиций плана лечения.
 */

export interface TreatmentPlanValidationPayloadItem {
	readonly itemId: string;
	readonly toothNumber?: number | undefined;
	readonly code804n?: string | undefined;
	readonly serviceId?: string | undefined;
	readonly serviceTitle: string;
	readonly category: string;
	readonly planUnitPriceRub: number;
	readonly planDiscountRub: number;
	readonly planDiscountPercent: number;
	readonly quantity: number;
	readonly planLineTotalRub: number;
}

export interface TreatmentPlanValidationPayload {
	readonly planId?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly planTitle: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly createdAtIso: string;
	readonly items: readonly TreatmentPlanValidationPayloadItem[];
}
