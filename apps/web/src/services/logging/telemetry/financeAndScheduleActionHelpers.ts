/**
 * DENTE CRM — Finance, Schedule & Document Action Telemetry Helpers
 *
 * Фабричные хелперы для формирования типизированных событий аудита:
 * оплата, возвраты, записи в расписании, печать и экспорт документов, ревизии ЭМК.
 */

import { generateUuidV7 } from "@dental/shared";
import type { RecordStaffActionInput } from "./types.js";

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
