/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 DATA CONTRACTS & TYPES (МИНЗДРАВ РФ)
 * Statutory electronic document types for SEMD 101, 104, 130 and UKEP CAdES-BES.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type SemdDocKind = "101" | "104" | "130" | "302" | "303" | "043u" | "108";

export interface PersonName {
	first: string;
	last: string;
	middle?: string | undefined;
}

export interface IdentityDocument {
	/** Код вида документа по НСИ 1.2.643.5.1.13.13.11.1011 (1 - Паспорт РФ, 10 - Паспорт иностранца) */
	typeCode: string;
	series?: string | undefined;
	number: string;
	issuedBy?: string | undefined;
	issueDate?: string | undefined;
}

export interface PatientCdaInfo {
	patientId: string;
	name: PersonName;
	/** СНИЛС пациента (11 цифр). Может отсутствовать у иностранных граждан */
	snils?: string | null | undefined;
	birthDate: string | null;
	gender: "male" | "female" | "other" | null;
	polisOms?: string | null | undefined;
	polisDms?: string | null | undefined;
	identityDoc?: IdentityDocument | null | undefined;
	address?: string | null | undefined;
	addressFias?: string | null | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	isForeignCitizen?: boolean | undefined;
}

export interface DoctorCdaInfo {
	name: PersonName;
	/** СНИЛС врача (11 цифр, обязателен по ФРМР) */
	snils?: string | undefined;
	position?: string | undefined;
	/** Код должности по классификатору ФРМР 1.2.643.5.1.13.13.11.1002 */
	positionCode?: string | undefined;
	/** Код специальности по номенклатуре 1.2.643.5.1.13.13.11.1066 */
	specialtyCode?: string | undefined;
	specialtyName?: string | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
}

export interface ClinicCdaInfo {
	name: string;
	/** OID медицинской организации в реестре ФРМО (1.2.643.5.1.13.13.12.2.*) */
	oid?: string | undefined;
	ogrn?: string | null | undefined;
	inn?: string | null | undefined;
	kpp?: string | null | undefined;
	licenseNumber?: string | null | undefined;
	licenseDate?: string | null | undefined;
	address?: string | null | undefined;
	legalAddress?: string | null | undefined;
	addressFias?: string | null | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
}

export interface LegalAuthenticatorCdaInfo {
	name?: PersonName | undefined;
	snils?: string | undefined;
	position?: string | undefined;
	positionCode?: string | undefined;
	time?: Date | undefined;
}

export type DentalToothSurface =
	| "V"
	| "L"
	| "O"
	| "M"
	| "D"
	| "B"
	| "P"
	| "I"
	| "R"
	| "vestibular"
	| "lingual"
	| "palatal"
	| "occlusal"
	| "incisal"
	| "mesial"
	| "distal"
	| "root"
	| "buccal";

export interface DentalStatusItem {
	tooth: string | number;
	surfaces?: string[] | string | undefined;
	condition: string;
	conditionCode?: string | undefined;
	conditionName?: string | undefined;
	description?: string | undefined;
}

export interface DiagnosisItem {
	icd10Code: string;
	diagnosisText: string;
	tooth?: string | number | undefined;
	isPrimary?: boolean | undefined;
}

export interface ServiceRenderedItem {
	/** Код по Номенклатуре медицинских услуг (Приказ 804н) */
	code: string;
	name: string;
	quantity?: number | undefined;
	tooth?: string | number | undefined;
	priceRubKopecks?: number | undefined;
	/** Код услуги для налогового вычета: "1" - обычное лечение, "2" - дорогостоящее лечение */
	serviceCategoryCode?: "1" | "2" | undefined;
	completedAt?: Date | string | undefined;
}

export interface TaxPaymentRecordItem {
	fiscalReceiptNumber: string;
	fiscalReceiptDate: string;
	paymentAmountKopecks: number;
	/** "1" - обычные медуслуги, "2" - дорогостоящее лечение (Постановление Правительства № 458) */
	serviceCategoryCode: "1" | "2";
	contractNumber?: string | undefined;
	contractDate?: string | undefined;
	patientFullName?: string | undefined;
}

export interface TaxpayerInfo {
	fullName: string;
	snils?: string | undefined;
	inn?: string | undefined;
	birthDate?: string | undefined;
	/** Родственная связь с пациентом: "1" - сам налогоплательщик, "2" - супруг(а), "3" - родитель, "4" - ребенок до 18/24 лет */
	relationToPatient: "1" | "2" | "3" | "4";
}

// ─── Параметры для генерации СЭМД 101 / 043/у: Протокол консультации стоматолога ───

export interface CdaSemd101Params {
	docKind: "101" | "043u" | "108";
	documentId: string;
	documentVersion?: number | undefined;
	documentTime?: Date | undefined;
	visitDate: Date;
	encounterId?: string | undefined;
	documentSetId?: string | undefined;
	replacesDocumentId?: string | undefined;

	patient: PatientCdaInfo;
	doctor: DoctorCdaInfo;
	clinic: ClinicCdaInfo;
	legalAuthenticator?: LegalAuthenticatorCdaInfo | undefined;

	// Секция 1: Анамнез и жалобы (LOINC 10164-2)
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	anamnesisVitae?: string | undefined;

	// Секция 2: Стоматологический статус / Одонтограмма (LOINC 29545-1 / 74208-1)
	dentalStatus?: DentalStatusItem[] | undefined;
	objectiveStatus?: string | undefined;

	// Секция 3: Диагноз по МКБ-10 (LOINC 29548-5)
	diagnoses: DiagnosisItem[];

	// Секция 4: Оказанные услуги по Номенклатуре 804н (LOINC 47519-4)
	services?: ServiceRenderedItem[] | undefined;
	treatmentDescription?: string | undefined;

	// Секция 5: Рекомендации и план ведения (LOINC 18776-5)
	recommendations?: string | string[] | undefined;

	// Дополнительные клинические атрибуты
	complications?: string | undefined;
	comorbidities?: string | undefined;
	instrumentTrayBarcode?: string | undefined;
}

// ─── Параметры для генерации СЭМД 104: Эпикриз стоматологический ────────────

export interface CdaSemd104Params {
	docKind: "104";
	documentId: string;
	documentVersion?: number | undefined;
	documentTime?: Date | undefined;
	visitDate: Date;
	admissionDate?: Date | undefined;
	dischargeDate?: Date | undefined;
	encounterId?: string | undefined;
	documentSetId?: string | undefined;
	replacesDocumentId?: string | undefined;

	patient: PatientCdaInfo;
	doctor: DoctorCdaInfo;
	clinic: ClinicCdaInfo;
	legalAuthenticator?: LegalAuthenticatorCdaInfo | undefined;

	// Секция 1: Диагноз при поступлении и выписке (LOINC 29548-5)
	admissionDiagnoses?: DiagnosisItem[] | undefined;
	dischargeDiagnoses: DiagnosisItem[];

	// Секция 2: Анамнез и клиническое течение (LOINC 10164-2)
	anamnesis?: string | undefined;
	clinicalCourse?: string | undefined;

	// Секция 3: Стоматологический статус до и после лечения (LOINC 29545-1)
	initialDentalStatus?: DentalStatusItem[] | undefined;
	finalDentalStatus?: DentalStatusItem[] | undefined;
	objectiveStatus?: string | undefined;

	// Секция 4: Объем выполненного лечения (LOINC 47519-4)
	servicesRendered: ServiceRenderedItem[];
	surgeryProtocol?: string | undefined;
	anesthesiaProtocol?: string | undefined;

	// Секция 5: Данные лучевой и функциональной диагностики (LOINC 30954-2)
	radiologyStudiesSummary?: string | undefined;

	// Секция 6: Исход заболевания и эпикриз (LOINC 42344-2)
	epicrisisText: string;
	outcomeCode?: "recovery" | "improvement" | "unchanged" | undefined;
	outcomeName?: string | undefined;
	recommendations: string | string[];
	nextFollowupDate?: string | Date | undefined;
}

// ─── Параметры для генерации СЭМД 130: Справка об оплате медицинских услуг ──

export interface CdaSemd130Params {
	docKind: "130";
	documentId: string;
	documentVersion?: number | undefined;
	documentTime?: Date | undefined;
	issueDate: Date;
	taxYear: number;
	certificateNumber: string;

	patient: PatientCdaInfo;
	taxpayer: TaxpayerInfo;
	doctor: DoctorCdaInfo;
	clinic: ClinicCdaInfo;
	legalAuthenticator?: LegalAuthenticatorCdaInfo | undefined;

	// Секция: Договор на оказание медицинских услуг (LOINC 48768-6)
	contractNumber: string;
	contractDate: string;

	// Секция: Реестр оплат и чеков
	paymentRecords: TaxPaymentRecordItem[];

	// Итоговые суммы в копейках
	totalOrdinaryTreatmentKopecks: number; // Код 1
	totalExpensiveTreatmentKopecks: number; // Код 2
	totalSumKopecks: number;
}

export type CdaSemd043uParams = CdaSemd101Params;
export type CdaSemd108Params = CdaSemd101Params;

export type CdaDocumentParams =
	| CdaSemd101Params
	| CdaSemd104Params
	| CdaSemd130Params;

// ─── Отсоединенная электронная подпись УКЭП (ГОСТ Р 34.10-2012 / CAdES-BES) ─

export interface DetachedSignature {
	/** Подпись в формате Base64 (PKCS#7 / CMS / CAdES-BES) */
	signatureBase64: string;
	/** Серийный номер сертификата открытого ключа */
	certificateSerialNumber: string;
	/** Владелец сертификата (CN, SNILS, O, C) */
	certificateSubject: string;
	/** Издатель сертификата (УЦ) */
	certificateIssuer?: string | undefined;
	validFrom?: string | undefined;
	validTo?: string | undefined;
	/** Метка времени подписания (ISO 8601) */
	signedAt: string;
	/** OID алгоритма подписи (ГОСТ 34.10-2012: 1.2.643.7.1.1.1.1 или 1.2.643.7.1.1.1.2) */
	algorithmOid: string;
	/** OID алгоритма хэширования (ГОСТ 34.11-2012: 1.2.643.7.1.1.2.2 или 1.2.643.7.1.1.2.3) */
	digestAlgorithmOid?: string | undefined;
	signatureValueHex?: string | undefined;
}

export interface EgiszRemdPackage {
	documentId: string;
	documentVersion: number;
	docTypeNsiCode: string;
	xmlCanonicalPayload: string;
	doctorSignature: DetachedSignature;
	moSignature?: DetachedSignature | undefined;
	metadata: {
		patientSnils?: string | undefined;
		clinicOid: string;
		clinicOgrn?: string | undefined;
		docTypeNsiCode: string;
	};
}

// ─── Результат валидации ───────────────────────────────────────────────────

export interface CdaValidationIssue {
	path: string;
	field: string;
	message: string;
	severity: "error" | "warning";
	oid?: string | undefined;
}

export interface CdaValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	issues: CdaValidationIssue[];
}

export type CdaGenerationResult =
	| { success: true; xml: string; canonicalXml: string; docType: SemdDocKind }
	| { success: false; errors: string[]; issues?: CdaValidationIssue[] };
