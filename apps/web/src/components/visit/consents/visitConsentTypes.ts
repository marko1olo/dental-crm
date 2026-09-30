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
};

export const DOCUMENT_KIND_TO_CONSENT_KEY: Record<string, ConsentTemplateKey> = {
	informed_consent: "CONSENT_INSPECTION_1051N",
	anesthesia_consent_log: "CONSENT_ANESTHESIA",
	personal_data_processing_consent: "CONSENT_PERSONAL_DATA",
};

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
		category: "Персональные данные и ЕГИСЗ",
		statutoryBasis: "Защищенный контур медкарты и обмен данными",
		summary: "Сбор, хранение, передача сведений в защищенный контур ЕГИСЗ (РЭМД) и обработка данных медицинской карты пациента в строгом соответствии с 152-ФЗ.",
		defaultRequiredKeywords: ["пдн", "персональн", "егисз", "рэмд", "регистрац", "оформлен"],
	},
];
