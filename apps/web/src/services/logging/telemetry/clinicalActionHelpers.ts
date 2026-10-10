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

/**
 * Формирование полезной нагрузки для получения оплаты
 */
export function buildPaymentReceiveInput(
	patientIdOrParams:
		| string
		| {
				patientId: string;
				billId: string;
				amountKopecks: number;
				paymentMethod: "cash" | "card" | "sbp" | "deposit" | "split" | string;
				fiscalReceiptNumber?: string | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	amountKopecks?: number,
	method?: string,
	invoiceId?: string,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "payment_receive",
			entityType: "payment_receipt",
			entityId: p.billId,
			patientId: p.patientId,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			details: {
				billId: p.billId,
				amountKopecks: p.amountKopecks,
				paymentMethod: p.paymentMethod,
				fiscalReceiptNumber: p.fiscalReceiptNumber ?? null,
			},
		};
	}

	return {
		actionType: "payment_receive",
		entityType: "payment",
		entityId: invoiceId || generateUuidV7(),
		patientId: patientIdOrParams,
		details: {
			amountKopecks: amountKopecks ?? 0,
			method: method || "cash",
			invoiceId,
		},
	};
}

/**
 * Формирование полезной нагрузки для возврата средств
 */
export function buildPaymentRefundInput(
	patientIdOrParams:
		| string
		| {
				patientId: string;
				billId: string;
				amountKopecks: number;
				paymentMethod: string;
				reason: string;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	billId?: string,
	amountKopecks?: number,
	reason?: string,
	paymentMethod?: string,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "payment_refund",
			entityType: "payment_refund",
			entityId: p.billId,
			patientId: p.patientId,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			reason: p.reason,
			details: {
				billId: p.billId,
				amountKopecks: p.amountKopecks,
				paymentMethod: p.paymentMethod,
				reason: p.reason,
			},
		};
	}

	return {
		actionType: "payment_refund",
		entityType: "payment_refund",
		entityId: billId || generateUuidV7(),
		patientId: patientIdOrParams,
		reason,
		details: {
			billId,
			amountKopecks: amountKopecks ?? 0,
			paymentMethod: paymentMethod || "cash",
			reason,
		},
	};
}

/**
 * Формирование полезной нагрузки для создания записи
 */
export function buildAppointmentCreateInput(params: {
	appointmentId: string;
	patientId?: string | null | undefined;
	scheduledTime?: string | null | undefined;
	doctorUserId?: string | null | undefined;
	reason?: string | null | undefined;
	actorUserId?: string | null | undefined;
	actorRole?: string | null | undefined;
}): RecordStaffActionInput {
	return {
		actionType: "appointment_create",
		entityType: "appointment",
		entityId: params.appointmentId,
		patientId: params.patientId ?? null,
		actorUserId: params.actorUserId,
		actorRole: params.actorRole,
		reason: params.reason ?? "Создание первичной записи в расписании",
		details: {
			appointmentId: params.appointmentId,
			scheduledTime: params.scheduledTime ?? null,
			doctorUserId: params.doctorUserId ?? null,
			reason: params.reason ?? null,
		},
	};
}

/**
 * Формирование полезной нагрузки для переноса записи
 */
export function buildAppointmentRescheduleInput(params: {
	appointmentId: string;
	patientId?: string | null | undefined;
	oldTime?: string | null | undefined;
	newTime?: string | null | undefined;
	reason?: string | null | undefined;
	actorUserId?: string | null | undefined;
	actorRole?: string | null | undefined;
}): RecordStaffActionInput {
	return {
		actionType: "appointment_reschedule",
		entityType: "appointment",
		entityId: params.appointmentId,
		patientId: params.patientId ?? null,
		actorUserId: params.actorUserId,
		actorRole: params.actorRole,
		reason: params.reason ?? "Перенос времени приёма",
		details: {
			appointmentId: params.appointmentId,
			oldTime: params.oldTime ?? null,
			newTime: params.newTime ?? null,
			reason: params.reason ?? null,
		},
	};
}

/**
 * Формирование полезной нагрузки для отмены записи
 */
export function buildAppointmentCancelInput(params: {
	appointmentId: string;
	patientId?: string | null | undefined;
	reason: string;
	scheduledTime?: string | null | undefined;
	actorUserId?: string | null | undefined;
	actorRole?: string | null | undefined;
}): RecordStaffActionInput {
	return {
		actionType: "appointment_cancel",
		entityType: "appointment",
		entityId: params.appointmentId,
		patientId: params.patientId ?? null,
		actorUserId: params.actorUserId,
		actorRole: params.actorRole,
		reason: params.reason,
		details: {
			appointmentId: params.appointmentId,
			scheduledTime: params.scheduledTime ?? null,
			reason: params.reason,
		},
	};
}

/**
 * Формирование полезной нагрузки для печати документа
 */
export function buildDocumentPrintInput(
	docTypeOrParams:
		| string
		| {
				patientId?: string | null | undefined;
				documentType: string;
				documentId?: string | null | undefined;
				title?: string | null | undefined;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	documentId?: string,
	patientId?: string,
): RecordStaffActionInput {
	if (typeof docTypeOrParams === "object" && docTypeOrParams !== null) {
		const p = docTypeOrParams;
		return {
			actionType: "document_print",
			entityType: "printed_document",
			entityId: p.documentId || generateUuidV7(),
			patientId: p.patientId ?? null,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			details: {
				documentType: p.documentType,
				documentId: p.documentId ?? null,
				title: p.title ?? null,
			},
		};
	}

	return {
		actionType: "document_print",
		entityType: "document",
		entityId: documentId || generateUuidV7(),
		patientId,
		details: {
			documentType: docTypeOrParams,
			documentId,
			printedAt: new Date().toISOString(),
		},
	};
}

/**
 * Формирование полезной нагрузки для экспорта отчета
 */
export function buildDocumentExportInput(
	docTypeOrParams:
		| string
		| {
				exportType: string;
				recordCount: number;
				format: "csv" | "excel" | "json" | "pdf" | string;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
				reason?: string | null | undefined;
		  },
	recordCountOrDocId?: number | string,
	formatOrPatientId?: string,
): RecordStaffActionInput {
	if (typeof docTypeOrParams === "object" && docTypeOrParams !== null) {
		const p = docTypeOrParams;
		return {
			actionType: "document_export",
			entityType: "system_export",
			entityId: generateUuidV7(),
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			reason: p.reason ?? "Экспорт операционных отчетов клиники",
			details: {
				documentType: p.exportType,
				recordCount: p.recordCount,
				format: p.format,
				reason: p.reason ?? null,
			},
		};
	}

	return {
		actionType: "document_export",
		entityType: "document",
		entityId: typeof recordCountOrDocId === "string" ? recordCountOrDocId : generateUuidV7(),
		patientId: typeof formatOrPatientId === "string" ? formatOrPatientId : null,
		details: {
			documentType: docTypeOrParams,
			recordCount: typeof recordCountOrDocId === "number" ? recordCountOrDocId : null,
			exportedAt: new Date().toISOString(),
		},
	};
}

/**
 * Формирование полезной нагрузки для сохранения ревизии
 */
export function buildRevisionSavedInput(
	patientIdOrParams:
		| string
		| {
				patientId: string;
				visitId: string;
				revisionReason: string;
				actorUserId?: string | null | undefined;
				actorRole?: string | null | undefined;
		  },
	visitId?: string,
	revisionReason?: string,
): RecordStaffActionInput {
	if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
		const p = patientIdOrParams;
		return {
			actionType: "diary_revision",
			entityType: "diary_revision",
			entityId: p.visitId,
			patientId: p.patientId,
			actorUserId: p.actorUserId,
			actorRole: p.actorRole,
			reason: p.revisionReason,
			details: {
				visitId: p.visitId,
				revisionReason: p.revisionReason,
				protocol: "Исправленному верить",
				savedAt: new Date().toISOString(),
			},
		};
	}

	return {
		actionType: "custom_action",
		entityType: "diary_revision",
		entityId: visitId || "unknown_visit",
		patientId: patientIdOrParams,
		reason: revisionReason,
		details: {
			visitId,
			revisionReason,
			protocol: "Исправленному верить",
			savedAt: new Date().toISOString(),
		},
	};
}
