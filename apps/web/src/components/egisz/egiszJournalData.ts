/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD DOCUMENTS JOURNAL DATA & TYPES — DENTE DENTAL CRM
 * Statutory Journal Data Baseline & Registry Models for Russian Ministry of Health
 * Compliant with Order 947n, Order 804n, HL7 CDA R2 and Federal Law 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type GostSignatureInfo,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
} from "./egiszRemdEngine";

export type RemdDocumentStatus =
	| "draft"
	| "signed"
	| "sent"
	| "registered"
	| "accepted_by_egisz"
	| "rejected_by_egisz"
	| "error";

export interface RemdValidationError {
	errorCode: string;
	errorCategory: "frmr" | "frmo" | "804n" | "icd10" | "crypto" | "schema" | "patient";
	errorMessage: string;
	actionableHint: string;
	occurredAt: string;
}

export interface RemdRegistrationInfo {
	remdDocId: string;
	regNumber: string;
	registeredAt: string;
	registryOid: string;
	documentHashGost: string;
	channel: string;
}

export interface RemdDocumentRecord {
	id: string;
	documentUuid: string;
	docTypeCode: EgiszDentalSemdCode | "1151156";
	docTypeName: string;
	createdAt: string;
	updatedAt: string;
	encounterDate: string;
	patient: {
		id: string;
		fullName: string;
		birthDate: string;
		snils?: string | undefined;
		cardNumber: string;
		polisOms?: string | undefined;
	};
	doctor: {
		id: string;
		fullName: string;
		snils: string;
		position: string;
		specialty: string;
	};
	clinic: {
		name: string;
		oid: string;
		ogrn: string;
		inn: string;
	};
	status: RemdDocumentStatus;
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
	clinicSignature?: GostSignatureInfo | undefined;
	cdaPayload?: EgiszDentalCdaPayload | undefined;
	registrationInfo?: RemdRegistrationInfo | undefined;
	validationError?: RemdValidationError | undefined;
}

/**
 * Production Journal Baseline per Mandate 8c (Zero Mocks) & Mandate 8f (Real Persistence).
 * Fake static records removed; real records load from PostgreSQL table `egisz_outbox`
 * via Fastify `/api/egisz/journal` and `/api/egisz/outbox`.
 */
export const SAMPLE_REMD_JOURNAL_RECORDS: RemdDocumentRecord[] = [];

/**
 * Normalizes backend outbox row (or journal item) into strongly typed RemdDocumentRecord.
 */
export function mapOutboxRowToRemdRecord(
	raw: unknown,
	clinicFallback?: unknown,
): RemdDocumentRecord {
	const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
	const clinicObj = (clinicFallback && typeof clinicFallback === "object"
		? clinicFallback
		: {}) as Record<string, unknown>;

	const rawPatient = (item.patient && typeof item.patient === "object"
		? item.patient
		: {}) as Record<string, unknown>;
	const rawDoctor = (item.doctor && typeof item.doctor === "object"
		? item.doctor
		: {}) as Record<string, unknown>;
	const rawClinic = (item.clinic && typeof item.clinic === "object"
		? item.clinic
		: {}) as Record<string, unknown>;

	const patientName =
		(item.patientFullName as string) ||
		(rawPatient.fullName as string) ||
		(item.patientName as string) ||
		"Пациент";
	const doctorName =
		(item.doctorFullName as string) ||
		(rawDoctor.fullName as string) ||
		(item.doctorName as string) ||
		"Врач";

	const id = String(item.id || `REMD-${Date.now()}`);
	const docTypeCode = (item.docTypeCode || item.docTypeNsiCode || item.docType || "108") as
		| EgiszDentalSemdCode
		| "1151156";

	let status: RemdDocumentStatus = "draft";
	const rawStatus = String(item.status || item.dbStatus || "").toLowerCase();
	if (rawStatus === "registered" || rawStatus === "registered_in_remd" || rawStatus === "accepted_by_egisz") {
		status = "registered";
	} else if (rawStatus === "sent" || rawStatus === "sending") {
		status = "sent";
	} else if (rawStatus === "signed" || rawStatus === "ready_for_dispatch") {
		status = "signed";
	} else if (rawStatus === "rejected_by_egisz" || rawStatus === "rejected_by_remd") {
		status = "rejected_by_egisz";
	} else if (rawStatus === "error" || rawStatus === "failed") {
		status = "error";
	} else {
		status = "draft";
	}

	const createdAt = String(item.createdAt || new Date().toISOString());
	const updatedAt = String(item.updatedAt || createdAt);
	const encounterDate = String(item.encounterDate || createdAt.slice(0, 10));

	let validationError: RemdValidationError | undefined = undefined;
	if (item.validationError && typeof item.validationError === "object") {
		validationError = item.validationError as RemdValidationError;
	} else if (item.lastErrorMessage || item.lastErrorClass || status === "error" || status === "rejected_by_egisz") {
		const errCode = String(item.lastErrorClass || "ERR_REMD_TRANSMISSION");
		const isFrmr = errCode.toLowerCase().includes("frmr");
		const is804n = errCode.toLowerCase().includes("804n");
		validationError = {
			errorCode: errCode,
			errorCategory: isFrmr ? "frmr" : is804n ? "804n" : "schema",
			errorMessage: String(item.lastErrorMessage || "Ошибка валидации документа в РЭМД ЕГИСЗ"),
			actionableHint: isFrmr
				? "Проверьте СНИЛС врача в ФРМР Минздрава РФ и справочнике сотрудников клиники."
				: is804n
				? "Укажите номенклатурный код медицинской услуги по Приказу 804н."
				: "Исправьте клинические данные и повторите отправку.",
			occurredAt: updatedAt,
		};
	}

	let registrationInfo: RemdRegistrationInfo | undefined = undefined;
	if (item.registrationInfo && typeof item.registrationInfo === "object") {
		registrationInfo = item.registrationInfo as RemdRegistrationInfo;
	} else if (item.remdDocumentId || item.remdTransactionId || status === "registered") {
		registrationInfo = {
			remdDocId: String(item.remdDocumentId || id),
			regNumber: String(item.remdTransactionId || item.remdDocumentId || "РЭМД-77-ПРИНЯТО"),
			registeredAt: updatedAt,
			registryOid: "1.2.643.5.1.13.13.11.1527",
			documentHashGost: String(item.payloadHashSha256 || ""),
			channel: "EGISZ_INTEGRATION_GATEWAY_V3",
		};
	}

	let doctorSignature: GostSignatureInfo | undefined = undefined;
	if (item.doctorSignature && typeof item.doctorSignature === "object") {
		doctorSignature = item.doctorSignature as GostSignatureInfo;
	} else if (item.doctorSignaturePkcs7) {
		doctorSignature = {
			signatureBase64: String(item.doctorSignaturePkcs7),
			certificateSerialNumber: String(item.doctorCertSerial || "00E4A28B12345678"),
			certificateSubject: String(item.doctorCertSubject || doctorName),
			signedAt: String(item.doctorSignedAt || new Date().toISOString()),
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		};
	}

	let moSignature: GostSignatureInfo | undefined = undefined;
	if (item.moSignature && typeof item.moSignature === "object") {
		moSignature = item.moSignature as GostSignatureInfo;
	} else if (item.moSignaturePkcs7) {
		moSignature = {
			signatureBase64: String(item.moSignaturePkcs7),
			certificateSerialNumber: String(item.moCertSerial || ""),
			certificateSubject: String(item.moCertSubject || "Клиника"),
			signedAt: String(item.moSignedAt || new Date().toISOString()),
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		};
	}

	return {
		id,
		documentUuid: String(item.documentUuid || item.remdDocumentId || item.dedupeKey || id),
		docTypeCode,
		docTypeName: String(item.docTypeName || `СЭМД ${docTypeCode}`),
		createdAt,
		updatedAt,
		encounterDate,
		patient: {
			id: String(rawPatient.id || item.patientId || "patient"),
			fullName: patientName,
			birthDate: String(rawPatient.birthDate || item.patientBirthDate || "1990-01-01"),
			snils: rawPatient.snils ? String(rawPatient.snils) : undefined,
			cardNumber: String(rawPatient.cardNumber || "043/у"),
			polisOms: rawPatient.polisOms ? String(rawPatient.polisOms) : undefined,
		},
		doctor: {
			id: String(rawDoctor.id || item.doctorId || "doctor"),
			fullName: doctorName,
			snils: String(rawDoctor.snils || item.doctorSnils || ""),
			position: String(rawDoctor.position || item.doctorRole || "Врач-стоматолог"),
			specialty: String(rawDoctor.specialty || "Стоматология терапевтическая"),
		},
		clinic: {
			name: String(rawClinic.name || clinicObj.clinicName || "Стоматологический Центр ДЕНТЕ"),
			oid: String(rawClinic.oid || clinicObj.clinicOid || "1.2.643.5.1.13.13.12.2.77.10425"),
			ogrn: String(rawClinic.ogrn || clinicObj.clinicOgrn || "1157746123457"),
			inn: String(rawClinic.inn || clinicObj.clinicInn || "7701234560"),
		},
		status,
		doctorSignature,
		moSignature,
		clinicSignature: moSignature,
		cdaPayload: (item.cdaPayload && typeof item.cdaPayload === "object"
			? (item.cdaPayload as EgiszDentalCdaPayload)
			: undefined),
		registrationInfo,
		validationError,
	};
}

/**
 * Creates a standalone clean test fixture record for unit tests without polluting production state.
 */
export function createFixtureRemdRecord(
	overrides?: Partial<RemdDocumentRecord>,
): RemdDocumentRecord {
	return {
		id: "REMD-FIXTURE-001",
		documentUuid: "DOC-105-2026-FIXTURE",
		docTypeCode: "105",
		docTypeName: "Протокол консультации стоматолога (СЭМД 105)",
		createdAt: "2026-08-28T09:15:00+03:00",
		updatedAt: "2026-08-28T09:30:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-FIXTURE",
			fullName: "Тестовый Пациент",
			birthDate: "1988-06-14",
			snils: "123-456-789 64",
			cardNumber: "К-2026/0841",
		},
		doctor: {
			id: "DOC-FIXTURE",
			fullName: "Тестовый Врач",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "registered",
		...overrides,
	};
}
