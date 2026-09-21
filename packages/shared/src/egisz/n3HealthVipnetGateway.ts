/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH VIPNET EGISZ INTEGRATION GATEWAY (ИЭМК + PIX + NSI FHIR + EVENTLOG)
 * (ПРИКАЗ МИНЗДРАВА РФ 911Н / 555-ПП / ГОСТ Р 34.10-2012 / VIPNET ENCRYPTION)
 *
 * Официальный транспортный шлюз платформы N3.Health (ЭлНетМед / Нетрика-Медицина)
 * для передачи медицинских данных амбулаторной стоматологии в ЕГИСЗ Минздрава РФ:
 * 1. EMKService (SOAP 1.1/1.2 WCF): AddDocument, SendDocument, CloseCase
 * 2. PixService (SOAP 1.1/1.2 WCF): AddPatient, UpdatePatient, FindPatients
 * 3. EventLog API (REST): Мониторинг статусов СЭМД, очереди РЭМД/ИЭМК, перевыгрузка
 * 4. NSI FHIR API: Терминологические классификаторы и справочники Минздрава РФ
 *
 * ⚠️ БЕЗОПАСНОСТЬ: Данные клиники и учетные токены строго параметризуются
 * через Zod-схему, переменные окружения и тенант-конфигурацию. Ноль хардкода.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { escapeXml } from "../cda/c14n.js";

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

/**
 * Нормализация заголовка авторизации EventLog API:
 * N3.Health ожидает заголовок вида: `Authorization: N3 <guid-token>`
 */
export function formatEventLogAuthHeader(rawToken: string): string {
	const trimmed = rawToken.trim();
	if (trimmed.startsWith("N3 ")) {
		return trimmed;
	}
	return `N3 ${trimmed}`;
}

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

// ─── 4. Генератор SOAP XML для EMKService ────────────────────────────────────

/**
 * Формирует SOAP 1.1 / 1.2 XML-конверт для вызова AddDocument в EMKService.svc.
 * Включает стандартный для N3.Health блок авторизации AuthToken:
 * `<AuthToken><Guid>{authGuid}</Guid><IdLpu>{idLpu}</IdLpu></AuthToken>`.
 */
export function buildEmkAddDocumentSoapXml(
	config: N3HealthVipnetConfig,
	payload: EmkAddDocumentPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanPatientSnils = payload.patient.snils.replace(/\D/g, "");
	const cleanDoctorSnils = payload.doctor.snils.replace(/\D/g, "");
	const base64Cda = Buffer.from(payload.cdaXmlContent, "utf8").toString("base64");

	const signaturesXml = payload.signatures && payload.signatures.length > 0
		? `<tem:Signatures>
${payload.signatures.map((sig) => `            <tem:SignatureData>
              <tem:SignatureType>${escapeXml(sig.signatureType)}</tem:SignatureType>
              <tem:Data>${escapeXml(sig.signatureBase64)}</tem:Data>
              ${sig.signerSnils ? `<tem:SignerSnils>${escapeXml(sig.signerSnils.replace(/\D/g, ""))}</tem:SignerSnils>` : ""}
            </tem:SignatureData>`).join("\n")}
          </tem:Signatures>`
		: "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:AddDocument>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:ClinicOid>${escapeXml(config.clinicOid)}</tem:ClinicOid>
        <tem:Document>
          <tem:IdDocumentMis>${escapeXml(payload.idDocumentMis)}</tem:IdDocumentMis>
          ${payload.idCaseMis ? `<tem:IdCaseMis>${escapeXml(payload.idCaseMis)}</tem:IdCaseMis>` : ""}
          <tem:DocumentType>${escapeXml(payload.documentType)}</tem:DocumentType>
          <tem:DocumentName>${escapeXml(payload.documentName)}</tem:DocumentName>
          <tem:DocumentDate>${escapeXml(payload.documentDate)}</tem:DocumentDate>
          <tem:MimeType>text/xml</tem:MimeType>
          <tem:DocumentData>${base64Cda}</tem:DocumentData>
          ${signaturesXml}
        </tem:Document>
        <tem:Patient>
          <tem:IdPatientMis>${escapeXml(payload.patient.idPatientMis)}</tem:IdPatientMis>
          <tem:Snils>${escapeXml(cleanPatientSnils)}</tem:Snils>
          <tem:FamilyName>${escapeXml(payload.patient.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.patient.givenName)}</tem:GivenName>
          ${payload.patient.middleName ? `<tem:MiddleName>${escapeXml(payload.patient.middleName)}</tem:MiddleName>` : ""}
          <tem:BirthDate>${escapeXml(payload.patient.birthDate)}</tem:BirthDate>
          <tem:Gender>${escapeXml(payload.patient.gender)}</tem:Gender>
        </tem:Patient>
        <tem:Doctor>
          <tem:Snils>${escapeXml(cleanDoctorSnils)}</tem:Snils>
          <tem:FamilyName>${escapeXml(payload.doctor.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.doctor.givenName)}</tem:GivenName>
          ${payload.doctor.middleName ? `<tem:MiddleName>${escapeXml(payload.doctor.middleName)}</tem:MiddleName>` : ""}
          ${payload.doctor.positionCode ? `<tem:PositionCode>${escapeXml(payload.doctor.positionCode)}</tem:PositionCode>` : ""}
          ${payload.doctor.specialtyCode ? `<tem:SpecialtyCode>${escapeXml(payload.doctor.specialtyCode)}</tem:SpecialtyCode>` : ""}
        </tem:Doctor>
      </tem:request>
    </tem:AddDocument>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для вызова SendDocument в EMKService.svc.
 */
export function buildEmkSendDocumentSoapXml(
	config: N3HealthVipnetConfig,
	payload: EmkSendDocumentPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:SendDocument>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:IdDocumentMis>${escapeXml(payload.idDocumentMis)}</tem:IdDocumentMis>
        ${payload.idCaseMis ? `<tem:IdCaseMis>${escapeXml(payload.idCaseMis)}</tem:IdCaseMis>` : ""}
        <tem:TargetSystem>${escapeXml(payload.targetSystem ?? "REMD")}</tem:TargetSystem>
      </tem:request>
    </tem:SendDocument>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для закрытия случая обслуживания (CloseCase) в EMKService.svc.
 */
export function buildEmkCloseCaseSoapXml(
	config: N3HealthVipnetConfig,
	payload: EmkCloseCasePayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:CloseCase>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:IdCaseMis>${escapeXml(payload.idCaseMis)}</tem:IdCaseMis>
        <tem:CloseDate>${escapeXml(payload.closeDate)}</tem:CloseDate>
        ${payload.resultCode ? `<tem:ResultCode>${escapeXml(payload.resultCode)}</tem:ResultCode>` : ""}
        ${payload.outcomeCode ? `<tem:OutcomeCode>${escapeXml(payload.outcomeCode)}</tem:OutcomeCode>` : ""}
      </tem:request>
    </tem:CloseCase>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ─── 5. Генератор SOAP XML для PixService ────────────────────────────────────

/**
 * Формирует SOAP XML-конверт для вызова AddPatient в PixService.svc.
 */
export function buildPixAddPatientSoapXml(
	config: N3HealthVipnetConfig,
	payload: PixPatientPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanSnils = payload.snils.replace(/\D/g, "");

	const omsXml = payload.omsPolicy
		? `        <tem:OmsPolicy>
          <tem:Number>${escapeXml(payload.omsPolicy.number)}</tem:Number>
          ${payload.omsPolicy.type ? `<tem:Type>${escapeXml(payload.omsPolicy.type)}</tem:Type>` : ""}
          ${payload.omsPolicy.issuer ? `<tem:Issuer>${escapeXml(payload.omsPolicy.issuer)}</tem:Issuer>` : ""}
        </tem:OmsPolicy>`
		: "";

	const docXml = payload.document
		? `        <tem:Document>
          <tem:DocType>${escapeXml(payload.document.docType)}</tem:DocType>
          ${payload.document.series ? `<tem:Series>${escapeXml(payload.document.series)}</tem:Series>` : ""}
          <tem:Number>${escapeXml(payload.document.number)}</tem:Number>
          ${payload.document.issueDate ? `<tem:IssueDate>${escapeXml(payload.document.issueDate)}</tem:IssueDate>` : ""}
          ${payload.document.issuer ? `<tem:Issuer>${escapeXml(payload.document.issuer)}</tem:Issuer>` : ""}
        </tem:Document>`
		: "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:AddPatient>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:Patient>
          <tem:IdPatientMis>${escapeXml(payload.idPatientMis)}</tem:IdPatientMis>
          <tem:FamilyName>${escapeXml(payload.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.givenName)}</tem:GivenName>
          ${payload.middleName ? `<tem:MiddleName>${escapeXml(payload.middleName)}</tem:MiddleName>` : ""}
          <tem:BirthDate>${escapeXml(payload.birthDate)}</tem:BirthDate>
          <tem:Gender>${escapeXml(payload.gender)}</tem:Gender>
          <tem:Snils>${escapeXml(cleanSnils)}</tem:Snils>
${omsXml}
${docXml}
          ${payload.phone ? `<tem:Phone>${escapeXml(payload.phone)}</tem:Phone>` : ""}
        </tem:Patient>
      </tem:request>
    </tem:AddPatient>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для вызова UpdatePatient в PixService.svc.
 */
export function buildPixUpdatePatientSoapXml(
	config: N3HealthVipnetConfig,
	payload: PixPatientPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanSnils = payload.snils.replace(/\D/g, "");

	const omsXml = payload.omsPolicy
		? `        <tem:OmsPolicy>
          <tem:Number>${escapeXml(payload.omsPolicy.number)}</tem:Number>
          ${payload.omsPolicy.type ? `<tem:Type>${escapeXml(payload.omsPolicy.type)}</tem:Type>` : ""}
          ${payload.omsPolicy.issuer ? `<tem:Issuer>${escapeXml(payload.omsPolicy.issuer)}</tem:Issuer>` : ""}
        </tem:OmsPolicy>`
		: "";

	const docXml = payload.document
		? `        <tem:Document>
          <tem:DocType>${escapeXml(payload.document.docType)}</tem:DocType>
          ${payload.document.series ? `<tem:Series>${escapeXml(payload.document.series)}</tem:Series>` : ""}
          <tem:Number>${escapeXml(payload.document.number)}</tem:Number>
          ${payload.document.issueDate ? `<tem:IssueDate>${escapeXml(payload.document.issueDate)}</tem:IssueDate>` : ""}
          ${payload.document.issuer ? `<tem:Issuer>${escapeXml(payload.document.issuer)}</tem:Issuer>` : ""}
        </tem:Document>`
		: "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:UpdatePatient>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:Patient>
          <tem:IdPatientMis>${escapeXml(payload.idPatientMis)}</tem:IdPatientMis>
          <tem:FamilyName>${escapeXml(payload.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.givenName)}</tem:GivenName>
          ${payload.middleName ? `<tem:MiddleName>${escapeXml(payload.middleName)}</tem:MiddleName>` : ""}
          <tem:BirthDate>${escapeXml(payload.birthDate)}</tem:BirthDate>
          <tem:Gender>${escapeXml(payload.gender)}</tem:Gender>
          <tem:Snils>${escapeXml(cleanSnils)}</tem:Snils>
${omsXml}
${docXml}
          ${payload.phone ? `<tem:Phone>${escapeXml(payload.phone)}</tem:Phone>` : ""}
        </tem:Patient>
      </tem:request>
    </tem:UpdatePatient>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для поиска пациентов FindPatients в PixService.svc.
 */
export function buildPixFindPatientsSoapXml(
	config: N3HealthVipnetConfig,
	criteria: PixFindPatientsCriteria,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanSnils = criteria.snils ? criteria.snils.replace(/\D/g, "") : "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:FindPatients>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:Criteria>
          ${criteria.idPatientMis ? `<tem:IdPatientMis>${escapeXml(criteria.idPatientMis)}</tem:IdPatientMis>` : ""}
          ${cleanSnils ? `<tem:Snils>${escapeXml(cleanSnils)}</tem:Snils>` : ""}
          ${criteria.familyName ? `<tem:FamilyName>${escapeXml(criteria.familyName)}</tem:FamilyName>` : ""}
          ${criteria.givenName ? `<tem:GivenName>${escapeXml(criteria.givenName)}</tem:GivenName>` : ""}
          ${criteria.middleName ? `<tem:MiddleName>${escapeXml(criteria.middleName)}</tem:MiddleName>` : ""}
          ${criteria.birthDate ? `<tem:BirthDate>${escapeXml(criteria.birthDate)}</tem:BirthDate>` : ""}
          ${criteria.omsNumber ? `<tem:OmsNumber>${escapeXml(criteria.omsNumber)}</tem:OmsNumber>` : ""}
        </tem:Criteria>
      </tem:request>
    </tem:FindPatients>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ─── 6. SOAP Ответы и парсеры ───────────────────────────────────────────────

export interface SoapResponseResult {
	success: boolean;
	httpStatusCode: number;
	idDocumentGlobal?: string | undefined;
	idPatientGlobal?: string | undefined;
	faultString?: string | undefined;
	errorCode?: string | undefined;
	rawResponseBody: string;
}

/**
 * Парсер ответа WCF SOAP сервисов N3.Health (без тяжелых внешних XML библиотек).
 */
export function parseN3SoapResponse(
	rawXml: string,
	httpStatus: number,
): SoapResponseResult {
	if (httpStatus >= 400) {
		const faultMatch = rawXml.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
		const faultString = faultMatch ? faultMatch[1]?.trim() : `HTTP Error ${httpStatus}`;
		return {
			success: false,
			httpStatusCode: httpStatus,
			faultString,
			rawResponseBody: rawXml,
		};
	}

	// Проверка на SOAP Fault внутри 200 OK
	if (rawXml.includes(":Fault>") || rawXml.includes("<Fault>")) {
		const faultMatch = rawXml.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
		const codeMatch = rawXml.match(/<faultcode[^>]*>([^<]+)<\/faultcode>/i);
		return {
			success: false,
			httpStatusCode: httpStatus,
			faultString: faultMatch ? faultMatch[1]?.trim() : "SOAP Fault returned by service",
			errorCode: codeMatch ? codeMatch[1]?.trim() : undefined,
			rawResponseBody: rawXml,
		};
	}

	// Извлечение глобальных идентификаторов
	const docGlobalMatch = rawXml.match(/<(?:tem:)?IdDocumentGlobal[^>]*>([^<]+)<\/(?:tem:)?IdDocumentGlobal>/i);
	const patientGlobalMatch = rawXml.match(/<(?:tem:)?IdPatientGlobal[^>]*>([^<]+)<\/(?:tem:)?IdPatientGlobal>/i);

	// Проверка флага успеха в теле ответа
	const successFlagMatch = rawXml.match(/<(?:tem:)?Success[^>]*>([^<]+)<\/(?:tem:)?Success>/i);
	const isSuccessFlag = successFlagMatch ? successFlagMatch[1]?.toLowerCase() === "true" : true;

	return {
		success: isSuccessFlag,
		httpStatusCode: httpStatus,
		idDocumentGlobal: docGlobalMatch ? docGlobalMatch[1]?.trim() : undefined,
		idPatientGlobal: patientGlobalMatch ? patientGlobalMatch[1]?.trim() : undefined,
		rawResponseBody: rawXml,
	};
}

// ─── 7. REST Клиент EventLog API ───────────────────────────────────────────

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

/**
 * REST Клиент EventLog API платформы N3.Health.
 * Заголовок: `Authorization: N3 <token>`
 */
export class N3EventLogClient {
	private readonly config: N3HealthVipnetConfig;
	private readonly fetchImpl: typeof fetch;

	constructor(config: N3HealthVipnetConfig, customFetch?: typeof fetch) {
		this.config = n3HealthVipnetConfigSchema.parse(config);
		this.fetchImpl = customFetch ?? globalThis.fetch;
	}

	public getHeaders(): Record<string, string> {
		return {
			Authorization: formatEventLogAuthHeader(this.config.eventLogToken),
			"Content-Type": "application/json",
			Accept: "application/json",
		};
	}

	/**
	 * Получить статус документа в EventLog по idDocumentMis.
	 */
	public async getDocumentStatus(
		idDocumentMis: string,
	): Promise<EventLogDocumentStatusRecord> {
		const baseUrl = this.config.eventLogApiUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/api/v1/documents?idDocumentMis=${encodeURIComponent(idDocumentMis)}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) {
				return {
					idDocumentMis,
					status: "ERROR",
					errorMessage: `EventLog API вернул HTTP ${res.status}: ${res.statusText}`,
					lastCheckedAt: new Date().toISOString(),
				};
			}

			const json = (await res.json()) as {
				items?: Array<{
					idDocumentMis?: string;
					status?: string;
					remdNumber?: string;
					registeredDate?: string;
					error?: string;
				}>;
				status?: string;
				remdRegistrationNumber?: string;
				registeredAt?: string;
				errorMessage?: string;
			};

			const item = json.items?.[0] ?? json;
			const rawStatus = (item.status || "UNKNOWN").toUpperCase();

			let status: EventLogDocumentStatusRecord["status"] = "UNKNOWN";
			if (rawStatus.includes("REGISTER") || rawStatus === "SUCCESS") {
				status = "REGISTERED";
			} else if (rawStatus.includes("REJECT") || rawStatus === "FAILED") {
				status = "REJECTED";
			} else if (rawStatus.includes("PROCESS")) {
				status = "PROCESSING";
			} else if (rawStatus.includes("QUEUE")) {
				status = "QUEUED";
			} else if (rawStatus.includes("ERR")) {
				status = "ERROR";
			}

			return {
				idDocumentMis,
				status,
				remdRegistrationNumber: item.remdRegistrationNumber || item.remdNumber,
				registeredAt: item.registeredAt || item.registeredDate,
				errorMessage: item.errorMessage || item.error,
				lastCheckedAt: new Date().toISOString(),
			};
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				idDocumentMis,
				status: "ERROR",
				errorMessage: `Сетевая ошибка EventLog API: ${message}`,
				lastCheckedAt: new Date().toISOString(),
			};
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Поставить документ в очередь на повторную выгрузку (Reexport).
	 */
	public async queueForReexport(
		idDocumentMis: string,
		queue: "REMD" | "IEMK" = "REMD",
	): Promise<{ success: boolean; message: string }> {
		const baseUrl = this.config.eventLogApiUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/api/v1/documents/reexport`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "POST",
				headers: this.getHeaders(),
				body: JSON.stringify({
					idDocumentMis,
					queue,
					requestedAt: new Date().toISOString(),
				}),
				signal: controller.signal,
			});

			if (!res.ok) {
				return {
					success: false,
					message: `Ошибка постановки в очередь: HTTP ${res.status}`,
				};
			}

			return {
				success: true,
				message: `Документ ${idDocumentMis} успешно поставлен в очередь ${queue}`,
			};
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				message: `Сбой вызова reexport: ${message}`,
			};
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Получить сводную статистику очередей выгрузки EventLog.
	 */
	public async getQueueStats(): Promise<EventLogQueueStats> {
		const baseUrl = this.config.eventLogApiUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/api/v1/queues/stats`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) {
				return {
					iemkQueueCount: 0,
					remdQueueCount: 0,
					errorCount: 0,
					updatedAt: new Date().toISOString(),
				};
			}

			const json = (await res.json()) as {
				iemkQueueCount?: number;
				remdQueueCount?: number;
				errorCount?: number;
			};

			return {
				iemkQueueCount: json.iemkQueueCount ?? 0,
				remdQueueCount: json.remdQueueCount ?? 0,
				errorCount: json.errorCount ?? 0,
				updatedAt: new Date().toISOString(),
			};
		} catch {
			return {
				iemkQueueCount: 0,
				remdQueueCount: 0,
				errorCount: 0,
				updatedAt: new Date().toISOString(),
			};
		} finally {
			clearTimeout(timer);
		}
	}
}

// ─── 8. FHIR Клиент терминологии NSI (НСИ Минздрава РФ) ─────────────────────

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

/**
 * HL7 FHIR Terminology клиент к серверу НСИ N3.Health:
 * `http://b2b.n3health.ru/nsi/fhir/term/`
 */
export class N3FhirTerminologyClient {
	private readonly config: N3HealthVipnetConfig;
	private readonly fetchImpl: typeof fetch;

	constructor(config: N3HealthVipnetConfig, customFetch?: typeof fetch) {
		this.config = n3HealthVipnetConfigSchema.parse(config);
		this.fetchImpl = customFetch ?? globalThis.fetch;
	}

	public getHeaders(): Record<string, string> {
		return {
			Accept: "application/fhir+json, application/json",
		};
	}

	/**
	 * Получить CodeSystem по OID справочника НСИ (например `1.2.643.5.1.13.13.11.1040` - пол).
	 */
	public async getCodeSystem(
		oidOrId: string,
	): Promise<FhirTerminologyResponse | null> {
		const baseUrl = this.config.nsiFhirUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/CodeSystem?_id=${encodeURIComponent(oidOrId)}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) return null;
			return (await res.json()) as FhirTerminologyResponse;
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Раскрыть ValueSet ($expand) с фильтром по подстроке.
	 */
	public async expandValueSet(
		valueSetUrl: string,
		filter?: string,
	): Promise<FhirTerminologyResponse | null> {
		const baseUrl = this.config.nsiFhirUrl.replace(/\/+$/, "");
		const filterQuery = filter ? `&filter=${encodeURIComponent(filter)}` : "";
		const url = `${baseUrl}/ValueSet/$expand?url=${encodeURIComponent(valueSetUrl)}${filterQuery}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) return null;
			return (await res.json()) as FhirTerminologyResponse;
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
	}
}

// ─── 9. Единый фасад шлюза N3HealthVipnetGateway ────────────────────────────

export class N3HealthVipnetGateway {
	public readonly config: N3HealthVipnetConfig;
	public readonly eventLog: N3EventLogClient;
	public readonly fhir: N3FhirTerminologyClient;
	private readonly fetchImpl: typeof fetch;

	constructor(config: N3HealthVipnetConfig, customFetch?: typeof fetch) {
		this.config = n3HealthVipnetConfigSchema.parse(config);
		this.fetchImpl = customFetch ?? globalThis.fetch;
		this.eventLog = new N3EventLogClient(this.config, this.fetchImpl);
		this.fhir = new N3FhirTerminologyClient(this.config, this.fetchImpl);
	}

	/**
	 * Отправка документа в EMKService (AddDocument) через ViPNet SOAP шлюз.
	 */
	public async emkAddDocument(
		payload: EmkAddDocumentPayload,
	): Promise<SoapResponseResult> {
		const xml = buildEmkAddDocumentSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.emkServiceUrl,
			"http://tempuri.org/IEMKService/AddDocument",
			xml,
		);
	}

	/**
	 * Отправка команды выгрузки документа в РЭМД (SendDocument).
	 */
	public async emkSendDocument(
		payload: EmkSendDocumentPayload,
	): Promise<SoapResponseResult> {
		const xml = buildEmkSendDocumentSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.emkServiceUrl,
			"http://tempuri.org/IEMKService/SendDocument",
			xml,
		);
	}

	/**
	 * Закрытие случая обслуживания (CloseCase) в ИЭМК.
	 */
	public async emkCloseCase(
		payload: EmkCloseCasePayload,
	): Promise<SoapResponseResult> {
		const xml = buildEmkCloseCaseSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.emkServiceUrl,
			"http://tempuri.org/IEMKService/CloseCase",
			xml,
		);
	}

	/**
	 * Регистрация пациента в PIX (AddPatient).
	 */
	public async pixAddPatient(
		payload: PixPatientPayload,
	): Promise<SoapResponseResult> {
		const xml = buildPixAddPatientSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.pixServiceUrl,
			"http://tempuri.org/IPixService/AddPatient",
			xml,
		);
	}

	/**
	 * Обновление данных пациента в PIX (UpdatePatient).
	 */
	public async pixUpdatePatient(
		payload: PixPatientPayload,
	): Promise<SoapResponseResult> {
		const xml = buildPixUpdatePatientSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.pixServiceUrl,
			"http://tempuri.org/IPixService/UpdatePatient",
			xml,
		);
	}

	/**
	 * Поиск пациентов в PIX (FindPatients).
	 */
	public async pixFindPatients(
		criteria: PixFindPatientsCriteria,
	): Promise<SoapResponseResult> {
		const xml = buildPixFindPatientsSoapXml(this.config, criteria);
		return this.executeSoapRequest(
			this.config.pixServiceUrl,
			"http://tempuri.org/IPixService/FindPatients",
			xml,
		);
	}

	/**
	 * Выполняет SOAP POST HTTP-запрос к ViPNet WCF сервису с заголовком SOAPAction.
	 */
	private async executeSoapRequest(
		endpointUrl: string,
		soapAction: string,
		bodyXml: string,
	): Promise<SoapResponseResult> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(endpointUrl, {
				method: "POST",
				headers: {
					"Content-Type": "text/xml; charset=utf-8",
					SOAPAction: `"${soapAction}"`,
				},
				body: bodyXml,
				signal: controller.signal,
			});

			const responseText = await res.text();
			return parseN3SoapResponse(responseText, res.status);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				httpStatusCode: 0,
				faultString: `Сетевой сбой при обращении к ViPNet сервису: ${message}`,
				rawResponseBody: "",
			};
		} finally {
			clearTimeout(timer);
		}
	}
}
