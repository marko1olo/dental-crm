/**
 * DENTE CRM — Clinical Action Telemetry Helpers
 *
 * Фабричные хелперы для формирования типизированных событий аудита действий медицинского персонала:
 * ЭМК, диагностика, услуги, гарантийные скидки, кассовые смены, оплата, расписание, документы.
 */

import { generateUuidV7 } from "@dental/shared";
import type { RecordStaffActionInput } from "./types.js";

/**
 * Формирование полезной нагрузки для открытия ЭМК / визита
 */
export function buildEmrOpenInput(
	patientIdOrParams:
		| string
		| {
				patientId: string;
				cardId?: string | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
				actorName?: string | null | undefined;
				reason?: string | null | undefined;
		  },
	visitId?: string,
	meta?: Record<string, unknown>,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "emr_open",
			entityType: "emr_card_043",
			entityId: p.cardId || p.patientId,
			patientId: p.patientId,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			actorName: p.actorName,
			reason: p.reason ?? "Открытие амбулаторной карты 043/у",
			details: {
				patientId: p.patientId,
				cardId: p.cardId,
				viewedAt: new Date().toISOString(),
			},
		};
	}

	return {
		actionType: "emr_open",
		entityType: "emr",
		entityId: visitId || patientIdOrParams,
		patientId: patientIdOrParams,
		details: {
			visitId,
			openedAt: new Date().toISOString(),
			...meta,
		},
	};
}

/**
 * Формирование полезной нагрузки для изменения диагноза
 */
export function buildDiagnosisChangeInput(
	patientIdOrParams:
		| string
		| {
				patientId: string;
				recordId?: string | null | undefined;
				oldDiagnosis?: { icdCode?: string | null; name?: string | null } | null | undefined;
				newDiagnosis: { icdCode: string; name?: string | null };
				toothNumber?: number | null | undefined;
				reason?: string | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
				actorName?: string | null | undefined;
		  },
	tooth?: number | string | undefined,
	oldDiagnosis?: string | { icdCode?: string | null; name?: string | null } | null | undefined,
	newDiagnosis?: string | { icdCode: string; name?: string | null },
	reason?: string,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "diagnosis_change",
			entityType: "clinical_diagnosis",
			entityId: p.recordId || p.patientId,
			patientId: p.patientId,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			actorName: p.actorName,
			reason: p.reason ?? "Уточнение клинического диагноза",
			details: {
				oldState: p.oldDiagnosis ?? null,
				newState: p.newDiagnosis,
				toothNumber: p.toothNumber ?? null,
				icdCode: p.newDiagnosis?.icdCode ?? null,
				reason: p.reason ?? null,
			},
		};
	}

	return {
		actionType: "diagnosis_change",
		entityType: "diagnosis",
		entityId: tooth ? `tooth_${tooth}` : "general",
		patientId: patientIdOrParams,
		reason,
		details: {
			tooth: tooth ?? null,
			oldState: typeof oldDiagnosis === "object" ? oldDiagnosis : { diagnosis: oldDiagnosis || "" },
			newState: typeof newDiagnosis === "object" ? newDiagnosis : { diagnosis: newDiagnosis || "" },
			icdCode: typeof newDiagnosis === "string" ? newDiagnosis : newDiagnosis?.icdCode ?? null,
			reason,
		},
	};
}

/**
 * Формирование полезной нагрузки для добавления услуги
 */
export function buildServiceAddInput(
	patientIdOrParams:
		| string
		| {
				patientId: string;
				planId: string;
				serviceCode: string;
				serviceName: string;
				amountKopecks?: number | null | undefined;
				quantity?: number | undefined;
				toothNumber?: number | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	serviceCode?: string,
	serviceName?: string,
	amountKopecks?: number,
	quantity: number = 1,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "service_add",
			entityType: "treatment_plan_item",
			entityId: `${p.planId}:${p.serviceCode}`,
			patientId: p.patientId,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			details: {
				planId: p.planId,
				serviceCode: p.serviceCode,
				serviceName: p.serviceName,
				amountKopecks: p.amountKopecks ?? null,
				quantity: p.quantity ?? 1,
				toothNumber: p.toothNumber ?? null,
			},
		};
	}

	return {
		actionType: "service_add",
		entityType: "service",
		entityId: serviceCode || "unknown_service",
		patientId: patientIdOrParams,
		details: {
			serviceCode,
			serviceName,
			amountKopecks,
			quantity,
		},
	};
}

/**
 * Формирование полезной нагрузки для удаления услуги
 */
export function buildServiceRemoveInput(
	patientIdOrParams:
		| string
		| {
				patientId: string;
				planId: string;
				serviceCode: string;
				serviceName?: string | null | undefined;
				reason?: string | null | undefined;
				amountKopecks?: number | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	serviceCode?: string,
	serviceName?: string,
	reason?: string,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "service_remove",
			entityType: "treatment_plan_item",
			entityId: `${p.planId}:${p.serviceCode}`,
			patientId: p.patientId,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			reason: p.reason ?? "Исключение позиции из плана лечения",
			details: {
				planId: p.planId,
				serviceCode: p.serviceCode,
				serviceName: p.serviceName ?? null,
				amountKopecks: p.amountKopecks ?? null,
				reason: p.reason ?? null,
			},
		};
	}

	return {
		actionType: "service_remove",
		entityType: "service",
		entityId: serviceCode || "unknown_service",
		patientId: patientIdOrParams,
		reason,
		details: {
			serviceCode,
			serviceName,
			reason,
		},
	};
}

/**
 * Формирование полезной нагрузки для применения скидки
 */
export function buildDiscountApplyInput(
	patientIdOrParams:
		| string
		| {
				patientId?: string | null | undefined;
				billId?: string | null | undefined;
				planId?: string | null | undefined;
				discountPercent?: number | null | undefined;
				discountAmountKopecks?: number | null | undefined;
				originalAmountKopecks?: number | null | undefined;
				finalAmountKopecks?: number | null | undefined;
				reason: string;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	discountPercent?: number,
	reason?: string,
	oldAmountKopecks?: number,
	newAmountKopecks?: number,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "discount_apply",
			entityType: "financial_discount",
			entityId: p.billId || p.planId || generateUuidV7(),
			patientId: p.patientId ?? null,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			reason: p.reason,
			details: {
				discountPercent: p.discountPercent ?? null,
				amountKopecks: p.discountAmountKopecks ?? null,
				originalAmountKopecks: p.originalAmountKopecks ?? null,
				finalAmountKopecks: p.finalAmountKopecks ?? null,
				reason: p.reason,
			},
		};
	}

	return {
		actionType: "discount_apply",
		entityType: "discount",
		entityId: `disc_${discountPercent}pct`,
		patientId: patientIdOrParams,
		reason,
		details: {
			discountPercent,
			reason,
			amountKopecks: oldAmountKopecks ?? null,
			discountedAmountKopecks: newAmountKopecks ?? null,
		},
	};
}

/**
 * Формирование полезной нагрузки для открытия смены
 */
export function buildShiftOpenInput(
	shiftNumberOrParams:
		| string
		| number
		| {
				cashRegisterId: string;
				shiftNumber: string | number;
				openingCashKopecks?: number | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	doctorId?: string,
	doctorName?: string,
): RecordStaffActionInput {
	if (typeof shiftNumberOrParams === "object" && shiftNumberOrParams !== null) {
		const p = shiftNumberOrParams;
		return {
			actionType: "shift_open",
			entityType: "cash_register_shift",
			entityId: `shift:${p.cashRegisterId}:${p.shiftNumber}`,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			details: {
				cashRegisterId: p.cashRegisterId,
				shiftNumber: String(p.shiftNumber),
				amountKopecks: p.openingCashKopecks ?? 0,
			},
		};
	}

	return {
		actionType: "shift_open",
		entityType: "shift",
		entityId: String(shiftNumberOrParams),
		actorUserId: doctorId,
		actorName: doctorName,
		details: {
			shiftNumber: String(shiftNumberOrParams),
			openedAt: new Date().toISOString(),
		},
	};
}

/**
 * Формирование полезной нагрузки для закрытия смены
 */
export function buildShiftCloseInput(
	shiftNumberOrParams:
		| string
		| number
		| {
				cashRegisterId: string;
				shiftNumber: string | number;
				totalRevenueKopecks?: number | null | undefined;
				closingCashKopecks?: number | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	doctorId?: string,
	doctorName?: string,
	stats?: Record<string, unknown>,
): RecordStaffActionInput {
	if (typeof shiftNumberOrParams === "object" && shiftNumberOrParams !== null) {
		const p = shiftNumberOrParams;
		return {
			actionType: "shift_close",
			entityType: "cash_register_shift",
			entityId: `shift:${p.cashRegisterId}:${p.shiftNumber}`,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			details: {
				cashRegisterId: p.cashRegisterId,
				shiftNumber: String(p.shiftNumber),
				totalRevenueKopecks: p.totalRevenueKopecks ?? 0,
				closingCashKopecks: p.closingCashKopecks ?? 0,
			},
		};
	}

	return {
		actionType: "shift_close",
		entityType: "shift",
		entityId: String(shiftNumberOrParams),
		actorUserId: doctorId,
		actorName: doctorName,
		details: {
			shiftNumber: String(shiftNumberOrParams),
			closedAt: new Date().toISOString(),
			stats: stats || {},
		},
	};
}

export {
	buildPaymentReceiveInput,
	buildPaymentRefundInput,
	buildAppointmentCreateInput,
	buildAppointmentRescheduleInput,
	buildAppointmentCancelInput,
	buildDocumentPrintInput,
	buildDocumentExportInput,
	buildRevisionSavedInput,
} from "./financeAndScheduleActionHelpers.js";
