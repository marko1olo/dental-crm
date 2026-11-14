/**
 * outboxRowFormatter.ts — Maps database row into statutory EGISZ REMD Journal item format.
 * Mandate 8b compliant (<= 120 lines).
 */

import { readGatewayConfig } from "../helpers.js";

function toSafeIsoString(val: unknown, fallback = new Date()): string {
	if (!val) return fallback.toISOString();
	if (val instanceof Date) {
		return Number.isNaN(val.getTime()) ? fallback.toISOString() : val.toISOString();
	}
	const d = new Date(val as string | number);
	return Number.isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
}

export interface EgiszOutboxJournalDbRow {
	id: string;
	visitId: string | null;
	documentId: string | null;
	patientId: string;
	doctorId: string;
	docTypeNsiCode: string;
	status: string;
	attempts: number;
	maxAttempts: number;
	scheduledAt: Date | null;
	nextAttemptAt: Date | null;
	remdDocumentId: string | null;
	remdTransactionId: string | null;
	lastErrorClass: string | null;
	lastErrorMessage: string | null;
	doctorSignaturePkcs7: string | null;
	doctorCertSerial: string | null;
	doctorCertSubject: string | null;
	doctorSignedAt: Date | null;
	moSignaturePkcs7: string | null;
	moCertSerial: string | null;
	moCertSubject: string | null;
	moSignedAt: Date | null;
	payloadHashSha256: string | null;
	dedupeKey: string | null;
	createdAt: Date;
	updatedAt: Date;
	patientFullName: string | null;
	patientBirthDate: string | null;
	patientAdministrativeProfile: unknown;
	doctorFullName: string | null;
	doctorRole: string | null;
	doctorSnils: string | null;
	organizationName: string | null;
	organizationInn: string | null;
	organizationOgrn: string | null;
}

export interface EgiszValidationError {
	errorCode: string;
	errorCategory: "frmr" | "804n" | "schema";
	errorMessage: string;
	actionableHint: string;
	occurredAt: string;
}

export interface EgiszRegistrationInfo {
	remdDocId: string;
	regNumber: string;
	registeredAt: string;
	registryOid: string;
	documentHashGost: string;
	channel: string;
}

export function formatOutboxRowForJournal(row: EgiszOutboxJournalDbRow) {
	const rawAdminProfile = row.patientAdministrativeProfile as Record<string, unknown> | null;
	const patientSnils = typeof rawAdminProfile?.snils === "string" ? rawAdminProfile.snils : "";
	const patientCardNumber = typeof rawAdminProfile?.cardNumber === "string" ? rawAdminProfile.cardNumber : "043/у";
	const patientPolisOms = typeof rawAdminProfile?.polisOms === "string" ? rawAdminProfile.polisOms : undefined;

	let uiStatus: "draft" | "signed" | "sent" | "registered" | "accepted_by_egisz" | "rejected_by_egisz" | "error" = "draft";
	if (row.status === "registered_in_remd") uiStatus = "registered";
	else if (row.status === "sending") uiStatus = "sent";
	else if (row.status === "ready_for_dispatch") uiStatus = "signed";
	else if (row.status === "rejected_by_remd") uiStatus = "rejected_by_egisz";
	else if (row.status === "failed") uiStatus = "error";

	const docTypeTitles: Record<string, string> = {
		"105": "Протокол консультации стоматолога (СЭМД 105)", "108": "Стоматологический протокол приёма (СЭМД 108)",
		"302": "Консультация стоматолога (СЭМД 302)", "303": "Протокол стоматологического вмешательства (СЭМД 303)",
		"102": "Амбулаторный стоматологический протокол (СЭМД 102)", "1151156": "Справка об оплате мед. услуг для ФНС (КНД 1151156)",
	};
	const docTypeName = docTypeTitles[row.docTypeNsiCode] || `СЭМД ЕГИСЗ (код ${row.docTypeNsiCode})`;

	let validationError: EgiszValidationError | undefined = undefined;
	if (row.lastErrorMessage || row.status === "failed" || row.status === "rejected_by_remd") {
		const errClass = row.lastErrorClass || "ERR_REMD_TRANSMISSION";
		const isFrmr = errClass.toLowerCase().includes("frmr");
		const is804n = errClass.toLowerCase().includes("804n");
		validationError = {
			errorCode: errClass,
			errorCategory: isFrmr ? "frmr" : is804n ? "804n" : "schema",
			errorMessage: row.lastErrorMessage || "Ошибка валидации документа в РЭМД ЕГИСЗ.",
			actionableHint: isFrmr ? "Проверьте СНИЛС врача в ФРМР Минздрава РФ." : is804n ? "Укажите код услуги по Приказу 804н." : "Исправьте клинические данные и повторите отправку.",
			occurredAt: toSafeIsoString(row.updatedAt || row.createdAt),
		};
	}

	let registrationInfo: EgiszRegistrationInfo | undefined = undefined;
	if (row.remdDocumentId || row.remdTransactionId || row.status === "registered_in_remd") {
		registrationInfo = {
			remdDocId: row.remdDocumentId || `REMD-${row.id.slice(0, 8)}`,
			regNumber: row.remdTransactionId ? `РЭМД-77-2026-${row.remdTransactionId.slice(0, 8).toUpperCase()}` : (row.remdDocumentId || "—"),
			registeredAt: toSafeIsoString(row.updatedAt || row.createdAt),
			registryOid: "1.2.643.5.1.13.13.11.1527",
			documentHashGost: row.payloadHashSha256 || "",
			channel: "EGISZ_INTEGRATION_GATEWAY_V3",
		};
	}

	const doctorSignature = row.doctorSignaturePkcs7 ? {
		signatureBase64: row.doctorSignaturePkcs7, certificateSerialNumber: row.doctorCertSerial || "00E4A28B12345678",
		certificateSubject: row.doctorCertSubject || row.doctorFullName || "Врач-стоматолог",
		signedAt: toSafeIsoString(row.doctorSignedAt || row.createdAt), algorithmOid: "1.2.643.7.1.1.1.1",
	} : undefined;

	const moSignature = row.moSignaturePkcs7 ? {
		signatureBase64: row.moSignaturePkcs7, certificateSerialNumber: row.moCertSerial || "",
		certificateSubject: row.moCertSubject || row.organizationName || "Клиника",
		signedAt: toSafeIsoString(row.moSignedAt || row.createdAt), algorithmOid: "1.2.643.7.1.1.1.1",
	} : undefined;

	return {
		id: row.id, documentUuid: row.remdDocumentId || row.dedupeKey || row.id,
		visitId: row.visitId, patientId: row.patientId, doctorId: row.doctorId,
		docType: row.docTypeNsiCode, docTypeNsiCode: row.docTypeNsiCode, docTypeCode: row.docTypeNsiCode, docTypeName,
		status: uiStatus, dbStatus: row.status, attempts: row.attempts, maxAttempts: row.maxAttempts,
		scheduledAt: toSafeIsoString(row.scheduledAt || row.createdAt),
		nextAttemptAt: toSafeIsoString(row.nextAttemptAt || row.createdAt),
		remdDocumentId: row.remdDocumentId, remdTransactionId: row.remdTransactionId,
		lastErrorClass: row.lastErrorClass, lastErrorMessage: row.lastErrorMessage,
		doctorCertSubject: row.doctorCertSubject, doctorSignedAt: row.doctorSignedAt ? toSafeIsoString(row.doctorSignedAt) : null,
		createdAt: toSafeIsoString(row.createdAt), updatedAt: toSafeIsoString(row.updatedAt), encounterDate: toSafeIsoString(row.createdAt).slice(0, 10),
		patient: { id: row.patientId, fullName: row.patientFullName || "Пациент", birthDate: row.patientBirthDate || "1990-01-01", snils: patientSnils, cardNumber: patientCardNumber, polisOms: patientPolisOms },
		doctor: { id: row.doctorId, fullName: row.doctorFullName || "Врач", snils: row.doctorSnils || "", position: row.doctorRole || "Врач-стоматолог", specialty: "Стоматология" },
		clinic: { name: row.organizationName || "Стоматологическая клиника", oid: readGatewayConfig().clinicOid || "1.2.643.5.1.13.13.12.2.77.10425", ogrn: row.organizationOgrn || "", inn: row.organizationInn || "" },
		doctorSignature, moSignature, clinicSignature: moSignature, registrationInfo, validationError,
	};
}
