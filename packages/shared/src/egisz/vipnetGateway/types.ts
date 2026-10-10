/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH VIPNET EGISZ INTEGRATION GATEWAY TYPES & DTO CONTRACTS
 * (ПРИКАЗ МИНЗДРАВА РФ 911Н / 555-ПП / ГОСТ Р 34.10-2012 / VIPNET ENCRYPTION)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

// ─── 1. Конфигурация шлюза N3.Health ViPNet ─────────────────────────────────

export const n3HealthVipnetConfigSchema = z.object({
	authGuid: z.string().min(1, "GUID токен авторизации N3 обязателен"),
	idLpu: z.string().min(1, "Идентификатор ЛПУ (idLpu) в N3 обязателен"),
	clinicOid: z.string().min(5, "OID клиники в ФРМО обязателен"),
	emkServiceUrl: z
		.string()
		.url()
		.default("http://b2b.n3health.ru/emk/EMKService.svc"),
	pixServiceUrl: z
		.string()
		.url()
		.default("http://b2b.n3health.ru/emk/PixService.svc"),
	nsiFhirUrl: z
		.string()
		.url()
		.default("http://b2b.n3health.ru/nsi/fhir/term/"),
	eventLogApiUrl: z
		.string()
		.url()
		.default("https://api.n3health.ru/eventlog/"),
	eventLogToken: z
		.string()
		.min(1, "Токен EventLog обязателен (формат: N3 <token>)"),
	isVipnetChannelActive: z.boolean().default(false),
	timeoutMs: z.number().int().positive().default(15000),
});

export type N3HealthVipnetConfig = z.infer<typeof n3HealthVipnetConfigSchema>;

// ─── 2. Типы полезной нагрузки EMKService (ИЭМК) ─────────────────────────────

export interface N3DoctorAuthorInfo {
	snils: string;
	familyName: string;
	givenName: string;
	middleName?: string | undefined;
	positionCode?: string | undefined;
	specialtyCode?: string | undefined;
}

export interface N3PatientShortInfo {
	idPatientMis: string;
	snils: string;
	familyName: string;
	givenName: string;
	middleName?: string | undefined;
	birthDate: string; // YYYY-MM-DD
	gender: "1" | "2"; // 1 - Мужской, 2 - Женский (ОИД 1.2.643.5.1.13.13.11.1040)
}

export interface N3DocumentSignature {
	signatureType: "Doctor" | "Clinic";
	signatureBase64: string;
	signerSnils?: string | undefined;
}

export interface EmkAddDocumentPayload {
	idDocumentMis: string;
	idCaseMis?: string | undefined;
	documentType: string; // Код по номенклатуре Минздрава РФ (например "108" - Форма 043/у)
	documentName: string;
	documentDate: string; // ISO 8601
	cdaXmlContent: string;
	patient: N3PatientShortInfo;
	doctor: N3DoctorAuthorInfo;
	signatures?: N3DocumentSignature[] | undefined;
}

export interface EmkSendDocumentPayload {
	idDocumentMis: string;
	idCaseMis?: string | undefined;
	targetSystem?: "REMD" | "IEMK" | "ALL" | undefined;
}

export interface EmkCloseCasePayload {
	idCaseMis: string;
	closeDate: string; // YYYY-MM-DD или ISO 8601
	resultCode?: string | undefined; // 301 - Выздоровление, 302 - Улучшение
	outcomeCode?: string | undefined;
}

// ─── 3. Типы полезной нагрузки PixService (PIX / Пациенты) ───────────────────

export interface PixPatientPayload {
	idPatientMis: string;
	familyName: string;
	givenName: string;
	middleName?: string | undefined;
	birthDate: string; // YYYY-MM-DD
	gender: "1" | "2";
	snils: string;
	omsPolicy?: {
		number: string;
		type?: string | undefined;
		issuer?: string | undefined;
	} | undefined;
	document?: {
		docType: string; // Код типа документа (14 - Паспорт гражданина РФ)
		series?: string | undefined;
		number: string;
		issueDate?: string | undefined;
		issuer?: string | undefined;
	} | undefined;
	phone?: string | undefined;
}

export interface PixFindPatientsCriteria {
	idPatientMis?: string | undefined;
	snils?: string | undefined;
	familyName?: string | undefined;
	givenName?: string | undefined;
	middleName?: string | undefined;
	birthDate?: string | undefined;
	omsNumber?: string | undefined;
}

// ─── 4. SOAP Ответы и парсеры ───────────────────────────────────────────────

export interface SoapResponseResult {
	success: boolean;
	httpStatusCode: number;
	idDocumentGlobal?: string | undefined;
	idPatientGlobal?: string | undefined;
	faultString?: string | undefined;
	errorCode?: string | undefined;
	rawResponseBody: string;
}

// ─── 5. REST Клиент EventLog API ───────────────────────────────────────────

export interface EventLogQueryFilter {
	dateBegin?: string | undefined; // YYYY-MM-DD
	dateEnd?: string | undefined;
	idCaseMis?: string | undefined;
	idDocumentMis?: string | undefined;
	status?: string | undefined; // Registered, Rejected, Processing, Error
	page?: number | undefined;
	pageSize?: number | undefined;
}

export interface EventLogDocumentStatusRecord {
	idDocumentMis: string;
	idCaseMis?: string | undefined;
	status: "REGISTERED" | "REJECTED" | "PROCESSING" | "QUEUED" | "ERROR" | "UNKNOWN";
	remdRegistrationNumber?: string | undefined;
	registeredAt?: string | undefined;
	errorMessage?: string | undefined;
	errorDetails?: string | undefined;
	lastCheckedAt: string;
}

export interface EventLogQueueStats {
	iemkQueueCount: number;
	remdQueueCount: number;
	errorCount: number;
	updatedAt: string;
}

// ─── 6. FHIR Клиент терминологии NSI (НСИ Минздрава РФ) ─────────────────────

export interface FhirCodeSystemConcept {
	code: string;
	display: string;
	definition?: string | undefined;
}

export interface FhirTerminologyResponse {
	resourceType: "CodeSystem" | "ValueSet" | "OperationOutcome";
	id?: string | undefined;
	url?: string | undefined;
	version?: string | undefined;
	name?: string | undefined;
	title?: string | undefined;
	status?: string | undefined;
	concept?: FhirCodeSystemConcept[] | undefined;
	expansion?: {
		contains?: Array<{
			system?: string | undefined;
			code: string;
			display: string;
		}> | undefined;
	} | undefined;
}
