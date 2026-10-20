import { z } from "zod";

/**
 * Статусы выгрузки медицинских документов в РЭМД ЕГИСЗ и ВИМИС «Стоматология».
 */
export type EgiszTransmissionStatus =
	| "Pending"
	| "Enqueued"
	| "Processing"
	| "Registered"
	| "Sent"
	| "Rejected"
	| "Error"
	| "OptedOut";

/**
 * Типы электронных медицинских документов (СЭМД) по номенклатуре Минздрава РФ.
 */
export type SemdDocumentKind =
	| "043/u"
	| "semd-101"
	| "semd-108"
	| "semd-103"
	| "ids"
	| "tax-1151156";

export interface SemdDefinition {
	readonly kind: SemdDocumentKind;
	readonly nsiCode: string;
	readonly officialTitle: string;
	readonly description: string;
	readonly requiresDoctorSignature: boolean;
	readonly requiresMoSignature: boolean;
}

export const STATUTORY_SEMD_CATALOG: readonly SemdDefinition[] = [
	{
		kind: "043/u",
		nsiCode: "108",
		officialTitle: "Медицинская карта стоматологического больного (043/у)",
		description: "Анамнез, зубная формула, дневник приёма и план лечения",
		requiresDoctorSignature: true,
		requiresMoSignature: true,
	},
	{
		kind: "semd-101",
		nsiCode: "101",
		officialTitle: "Протокол консультации и осмотра",
		description: "Первичный и повторный осмотр врача-стоматолога",
		requiresDoctorSignature: true,
		requiresMoSignature: false,
	},
	{
		kind: "semd-108",
		nsiCode: "108",
		officialTitle: "Протокол стоматологического лечения",
		description: "Детальный протокол терапевтического/хирургического лечения",
		requiresDoctorSignature: true,
		requiresMoSignature: true,
	},
	{
		kind: "semd-103",
		nsiCode: "103",
		officialTitle: "Протокол КЛКТ 3D и рентген-снимков",
		description: "Описание КЛКТ 3D, панорамных и прицельных снимков",
		requiresDoctorSignature: true,
		requiresMoSignature: false,
	},
	{
		kind: "ids",
		nsiCode: "991",
		officialTitle: "Информированное добровольное согласие (ИДС)",
		description: "Согласие пациента на стоматологическое вмешательство (323-ФЗ)",
		requiresDoctorSignature: false,
		requiresMoSignature: false,
	},
	{
		kind: "tax-1151156",
		nsiCode: "992",
		officialTitle: "Справка об оплате медицинских услуг для налогового вычета",
		description: "Данные об оплаченных услугах для оформления вычета (КНД 1151156)",
		requiresDoctorSignature: false,
		requiresMoSignature: true,
	},
] as const;

/**
 * Номенклатура медицинских услуг Минздрава РФ (Приказ № 804н).
 */
export interface Nomenclature804nService {
	readonly code: string;
	readonly title: string;
	readonly section: "терапия" | "хирургия" | "ортопедия" | "ортодонтия" | "диагностика" | "профилактика";
}

export const DENTAL_NOMENCLATURE_804N: readonly Nomenclature804nService[] = [
	{
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
		section: "диагностика",
	},
	{
		code: "B01.065.002",
		title: "Прием (осмотр, консультация) врача-стоматолога-терапевта повторный",
		section: "диагностика",
	},
	{
		code: "A16.07.002",
		title: "Восстановление зуба пломбой с нарушением формы зуба",
		section: "терапия",
	},
	{
		code: "A16.07.025",
		title: "Избирательное пришлифовывание твердых тканей зуба",
		section: "терапия",
	},
	{
		code: "A16.07.030",
		title: "Инструментальная и медикаментозная обработка корневого канала",
		section: "терапия",
	},
	{
		code: "A16.07.008",
		title: "Пломбирование корневого канала зуба пастой/гуттаперчей",
		section: "терапия",
	},
	{
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и удаление зубных отложений ультразвуком",
		section: "профилактика",
	},
	{
		code: "A16.07.001",
		title: "Удаление постоянного зуба простое",
		section: "хирургия",
	},
	{
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области",
		section: "хирургия",
	},
	{
		code: "A16.07.054",
		title: "Установка внутрикостного дентального имплантата",
		section: "хирургия",
	},
	{
		code: "A16.07.004",
		title: "Восстановление зуба коронкой металлокерамической / циркониевой",
		section: "ортопедия",
	},
	{
		code: "A16.07.048",
		title: "Фиксация ортодонтического аппарата (брекет-системы)",
		section: "ортодонтия",
	},
] as const;

/**
 * Структура пакета ВИМИС «Стоматология».
 */
export interface VimisDentalCaseMessage {
	caseId: string;
	clinicOid: string;
	doctorSnils: string;
	patientSnils: string;
	patientFullName: string;
	birthDate: string;
	gender: "male" | "female";
	icd10Code: string;
	icd10Title: string;
	servicesRendered: readonly {
		code804n: string;
		title: string;
		toothNumber?: number;
		quantity: number;
	}[];
	dentalFormulaSummary?: Record<string, string>;
	signedXmlPayload: string;
	doctorSignatureBase64: string;
	moSignatureBase64?: string;
}

export interface VimisReceipt {
	success: boolean;
	regNumber: string;
	transactionId: string;
	timestamp: string;
	status: EgiszTransmissionStatus;
	flkValidationErrors?: readonly string[];
}

/**
 * Zod-схемы валидации API ЕГИСЗ.
 */
export const validateDoctorSnilsBodySchema = z.object({
	snils: z.unknown().optional(),
});

export const egiszLogsParamsSchema = z.object({
	patientId: z.string().uuid(),
});

export const egiszSendBodySchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid(),
});

export const egiszBlankPermissionsPatchSchema = z.object({
	isExportAllowed: z.boolean().optional(),
	patientOptOutRespect: z.boolean().optional(),
});

export const egiszMultipleDiagnosesQuerySchema = z.object({
	patientId: z.string().uuid("patientId обязателен и должен быть корректным UUID"),
});
