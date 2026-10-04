/**
 * visitConsentTypes.ts
 * ============================================================================
 * Типы данных и конфигурации клинических информированных согласий (ИДС).
 * Федеральный закон № 323-ФЗ, Приказ Минздрава РФ № 1051н.
 * ============================================================================
 */

import type { ConsentTemplateKey } from "../../consents/consentTemplates";

export const CONSENT_KEY_TO_DOCUMENT_KIND: Partial<Record<ConsentTemplateKey, string>> = {
	CONSENT_INSPECTION_1051N: "informed_consent",
	CONSENT_ANESTHESIA: "anesthesia_consent_log",
	CONSENT_PERSONAL_DATA: "personal_data_processing_consent",
	CONSENT_THERAPY: "procedure_specific_consent_packet",
	CONSENT_SURGERY_IMPLANT: "procedure_specific_consent_packet",
	CONSENT_ORTHOPEDICS: "procedure_specific_consent_packet",
	CONSENT_ORTHODONTICS: "procedure_specific_consent_packet",
	CONSENT_HYGIENE_BLEACHING: "procedure_specific_consent_packet",
	CONSENT_PEDIATRIC: "procedure_specific_consent_packet",
	CONSENT_TREATMENT_REFUSAL: "medical_intervention_refusal",
	CONSENT_EGISZ_REFUSAL: "procedure_specific_consent_packet",
	CONSENT_WARRANTY_PASSPORT: "warranty_service_memo",
	CONSENT_WARRANTY_POLICY: "warranty_service_memo",
	CONSENT_SEDATION: "anesthesia_consent_log",
	CONSENT_PHOTOPROTOCOL: "photo_video_consent",
	CONSENT_HEALTH_QUESTIONNAIRE: "patient_intake_questionnaire",
};

export const DOCUMENT_KIND_TO_CONSENT_KEY: Record<string, ConsentTemplateKey> = {
	informed_consent: "CONSENT_INSPECTION_1051N",
	anesthesia_consent_log: "CONSENT_ANESTHESIA",
	personal_data_processing_consent: "CONSENT_PERSONAL_DATA",
	medical_intervention_refusal: "CONSENT_TREATMENT_REFUSAL",
	warranty_service_memo: "CONSENT_WARRANTY_PASSPORT",
	photo_video_consent: "CONSENT_PHOTOPROTOCOL",
	patient_intake_questionnaire: "CONSENT_HEALTH_QUESTIONNAIRE",
};

export const PROCEDURE_TYPE_TO_CONSENT_KEY: Record<string, ConsentTemplateKey> = {
	// Therapy & Endo
	therapy_endo_restoration: "CONSENT_THERAPY",
	deep_caries: "CONSENT_THERAPY",
	superficial_medium_caries: "CONSENT_THERAPY",
	pulpitis_endodontics: "CONSENT_THERAPY",
	periodontology: "CONSENT_THERAPY",

	// Surgery & Implantology
	surgery_extraction: "CONSENT_SURGERY_IMPLANT",
	implantation_bone_graft: "CONSENT_SURGERY_IMPLANT",
	implantation: "CONSENT_SURGERY_IMPLANT",
	sinus_lifting: "CONSENT_SURGERY_IMPLANT",

	// Orthopedics & Prosthetics
	prosthetics: "CONSENT_ORTHOPEDICS",
	veneers: "CONSENT_ORTHOPEDICS",
	fixed_prosthetics: "CONSENT_ORTHOPEDICS",
	removable_prosthetics: "CONSENT_ORTHOPEDICS",

	// Orthodontics
	orthodontics: "CONSENT_ORTHODONTICS",

	// Hygiene & Bleaching
	hygiene_whitening: "CONSENT_HYGIENE_BLEACHING",
	professional_hygiene: "CONSENT_HYGIENE_BLEACHING",
	teeth_whitening: "CONSENT_HYGIENE_BLEACHING",

	// Pediatric & Anesthesia & Other
	minor_general: "CONSENT_PEDIATRIC",
	local_anesthesia: "CONSENT_ANESTHESIA",
	sedation: "CONSENT_SEDATION",
	photoprotocol: "CONSENT_PHOTOPROTOCOL",
	egisz_refusal: "CONSENT_EGISZ_REFUSAL",
	medical_intervention_refusal: "CONSENT_TREATMENT_REFUSAL",
	warranty_policy: "CONSENT_WARRANTY_POLICY",
	warranty_passport: "CONSENT_WARRANTY_PASSPORT",
	somatic_health_questionnaire: "CONSENT_HEALTH_QUESTIONNAIRE",
};

export const ALL_CONSENT_TEMPLATE_KEYS = new Set<ConsentTemplateKey>([
	"CONSENT_THERAPY",
	"CONSENT_SURGERY_IMPLANT",
	"CONSENT_ORTHODONTICS",
	"CONSENT_ORTHOPEDICS",
	"CONSENT_HYGIENE_BLEACHING",
	"CONSENT_ANESTHESIA",
	"CONSENT_PERSONAL_DATA",
	"CONSENT_INSPECTION_1051N",
	"CONSENT_PEDIATRIC",
	"CONSENT_EGISZ_REFUSAL",
	"CONSENT_TREATMENT_REFUSAL",
	"CONSENT_WARRANTY_PASSPORT",
	"CONSENT_WARRANTY_POLICY",
	"CONSENT_SEDATION",
	"CONSENT_PHOTOPROTOCOL",
	"CONSENT_HEALTH_QUESTIONNAIRE",
]);

export function isConsentTemplateKey(val: unknown): val is ConsentTemplateKey {
	return typeof val === "string" && ALL_CONSENT_TEMPLATE_KEYS.has(val as ConsentTemplateKey);
}

export function resolveConsentKeyFromDocument(doc: {
	kind?: string | undefined;
	payload?: Record<string, unknown> | null | undefined;
}): ConsentTemplateKey | null {
	// 1. Direct consent key in payload
	const payloadConsentKey = doc.payload?.consentKey;
	if (isConsentTemplateKey(payloadConsentKey)) {
		return payloadConsentKey;
	}

	// 2. Procedure type mapping for procedure-specific consents
	const procType =
		(doc.payload?.procedureType as string | undefined) ||
		((doc.payload?.procedureSpecificConsent as Record<string, unknown> | undefined)?.procedureType as string | undefined) ||
		((doc.payload?.procedureSpecific as Record<string, unknown> | undefined)?.procedureType as string | undefined);

	if (typeof procType === "string" && procType in PROCEDURE_TYPE_TO_CONSENT_KEY) {
		return PROCEDURE_TYPE_TO_CONSENT_KEY[procType] ?? null;
	}

	// 3. Document kind mapping
	if (doc.kind && doc.kind in DOCUMENT_KIND_TO_CONSENT_KEY) {
		return DOCUMENT_KIND_TO_CONSENT_KEY[doc.kind] ?? null;
	}

	return null;
}

export interface VisitConsentsTabPatient {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	birthDate?: string | null | undefined;
	passport?: string | null | undefined;
	documentNumber?: string | null | undefined;
	phone?: string | null | undefined;
	snils?: string | null | undefined;
	address?: string | null | undefined;
	cardNumber?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	cardOpenedAt?: string | null | undefined;
	allergies?: string | null | undefined;
	somaticNotes?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabDoctor {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	specialty?: string | null | undefined;
	specialtyRu?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabAppointment {
	id?: string | null | undefined;
	status?: string | null | undefined;
	appointmentDate?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabNoteForm {
	diagnosis?: string | null | undefined;
	treatmentPlan?: string | null | undefined;
	complaint?: string | null | undefined;
	anamnesis?: string | null | undefined;
	objectiveStatus?: string | null | undefined;
	status?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabDashboard {
	clinicSettings?: {
		profile?: {
			brandName?: string | undefined;
			legalEntityName?: string | undefined;
			address?: string | undefined;
			ogrn?: string | undefined;
			medicalLicenseNumber?: string | undefined;
			[key: string]: unknown;
		} | undefined;
		[key: string]: unknown;
	} | undefined;
	organization?: {
		name?: string | undefined;
		[key: string]: unknown;
	} | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabProps {
	readonly activePatient?: VisitConsentsTabPatient | null | undefined;
	readonly activeDoctor?: VisitConsentsTabDoctor | null | undefined;
	readonly activeAppointment?: VisitConsentsTabAppointment | null | undefined;
	readonly visitNoteForm?: VisitConsentsTabNoteForm | null | undefined;
	readonly dashboard?: VisitConsentsTabDashboard | null | undefined;
	readonly selectedToothForMenu?: any;
	readonly onOpenInformedConsentModal?: () => void;
	readonly onOpenWarrantyModal?: () => void;
	readonly onFastPrint043u?: () => void;
	readonly onFastPrintInformedConsent?: () => void;
}

export type ConsentStatusType = "signed" | "required_today" | "not_signed";

export interface ConsentRecordState {
	isSigned: boolean;
	signedAt?: string;
	method?: "paper" | "tablet" | "otp";
	integrityHash?: string;
	doctorName?: string;
	notes?: string;
}

export interface ClinicalConsentConfig {
	key: ConsentTemplateKey;
	code: string;
	title: string;
	category: string;
	statutoryBasis: string;
	summary: string;
	defaultRequiredKeywords: readonly string[];
}

export const CLINICAL_CONSENTS_LIST: readonly ClinicalConsentConfig[] = [
	{
		key: "CONSENT_INSPECTION_1051N",
		code: "ИДС-ОСМОТР",
		title: "Общее информированное согласие на первичный осмотр и диагностику",
		category: "Первичный осмотр и диагностика",
		statutoryBasis: "Базовый осмотр и инструментальная диагностика",
		summary: "Клинический осмотр полости рта, зондирование, холодовые пробы, индексная оценка гигиены и цифровая рентген-диагностика (визиография, ОПТГ, КЛКТ).",
		defaultRequiredKeywords: ["осмотр", "консультац", "диагност", "первичн", "кнкт", "оптг", "рентген", "z01"],
	},
	{
		key: "CONSENT_ANESTHESIA",
		code: "ИДС-АНЕСТ",
		title: "Согласие на местную анестезию",
		category: "Местное обезболивание",
		statutoryBasis: "Клинические протоколы обезболивания",
		summary: "Инфильтрационная, проводниковая и интралигаментарная карпульная анестезия современными препаратами (Артикаин, Мепивакаин) с учетом соматического статуса.",
		defaultRequiredKeywords: ["анестез", "карпул", "обезбол", "артикаин", "мепивакаин", "убистезин", "септанест", "скандонест", "удал", "кариес", "пульпит", "пломб", "препар"],
	},
	{
		key: "CONSENT_THERAPY",
		code: "ИДС-ТЕР",
		title: "Согласие на терапевтическое лечение и эндодонтию",
		category: "Терапия и эндодонтия",
		statutoryBasis: "Протоколы терапевтического лечения",
		summary: "Препарирование твердых тканей зуба, наложение коффердама, эндодонтическая обработка и обтурация корневых каналов, адгезивная композитная реставрация.",
		defaultRequiredKeywords: ["кариес", "пульпит", "периодонтит", "пломб", "реставрац", "эндо", "депульп", "канал", "коффердам", "k02", "k04"],
	},
	{
		key: "CONSENT_SURGERY_IMPLANT",
		code: "ИДС-ХИР",
		title: "Согласие на хирургическое вмешательство, удаление и имплантацию",
		category: "Хирургия и имплантация",
		statutoryBasis: "Хирургические стандарты и протоколы имплантации",
		summary: "Простое и сложное удаление зубов, ревизия лунки, альвеолотомия, синус-лифтинг, костная пластика и дентальная имплантация.",
		defaultRequiredKeywords: ["удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц", "перикорон", "дистоп", "ретинир", "k01", "k05.2"],
	},
	{
		key: "CONSENT_ORTHOPEDICS",
		code: "ИДС-ОРТ",
		title: "Согласие на ортопедическое лечение и протезирование",
		category: "Ортопедия и протезирование",
		statutoryBasis: "Стандарты ортопедического лечения и протезирования",
		summary: "Препарирование зубов, снятие оптических или полиэфирных слепков, изготовление и фиксация вкладок, виниров, одиночных коронок и мостовидных протезов.",
		defaultRequiredKeywords: ["коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост", "сканирован", "абатмент", "k08"],
	},
	{
		key: "CONSENT_PERSONAL_DATA",
		code: "ПДН",
		title: "Согласие на обработку персональных данных",
		category: "Персональные данные",
		statutoryBasis: "Защищенный контур медкарты и обмен данными",
		summary: "Сбор, хранение и обработка данных медицинской карты пациента в строгом соответствии с законодательством РФ о персональных данных.",
		defaultRequiredKeywords: ["пдн", "персональн", "егисз", "рэмд", "регистрац", "оформлен"],
	},
];
