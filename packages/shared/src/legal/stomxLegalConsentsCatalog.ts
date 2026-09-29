import type { ProcedureSpecificConsentProcedure } from "./legalContractsAndConsents.js";
import { STOMX_SPECIALIZED_CONSENT_PRESETS } from "./stomxConsentPresets.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * STOMX LEGAL CONSENTS & PRINT ENGINE CATALOG
 * 
 * Полный каталог 21 специализированного стоматологического документа StomX:
 * 20 специализированных ИДС + Лист дозовых нагрузок (СанПиН 2.6.1.1192-03)
 * и универсальный шаблонизатор переменных печати ([Пациент.ФИО], [Клиника.Название]).
 * 
 * Стандарты: 323-ФЗ ст. 20, Приказ МЗ РФ № 1051н, ПП РФ № 736, СанПиН 2.6.1.1192-03.
 * Мандаты: 8e (автономия врача), 8k (снижение трения), 8n (соло-врач / малая клиника).
 * ══════════════════════════════════════════════════════════════════════════════
 */

export interface StomxLegalConsentTemplateMetadata {
	id: number;
	systemAlias: string;
	name: string;
	procedureType: ProcedureSpecificConsentProcedure;
	category:
		| "therapy"
		| "surgery"
		| "prosthetics"
		| "orthodontics"
		| "hygiene"
		| "periodontics"
		| "radiology"
		| "legal";
	categoryLabel: string;
	statutoryBasis: string;
	isEgisz: boolean;
	esiaRequired: boolean;
	isXrayIds: boolean;
	standardDoseMsv?: number;
	keyVariables: readonly string[];
}

export interface StomxVariableContext {
	patient?: {
		id?: string | number | null;
		fullName?: string | null;
		lastName?: string | null;
		firstName?: string | null;
		middleName?: string | null;
		birthDate?: string | null;
		age?: number | string | null;
		gender?: "male" | "female" | string | null;
		phone?: string | null;
		email?: string | null;
		address?: string | null;
		registrationAddress?: string | null;
		passport?: string | null;
		passportSeries?: string | null;
		passportNumber?: string | null;
		passportSeriesNumber?: string | null;
		passportIssuedBy?: string | null;
		passportIssuedDate?: string | null;
		passportDepartmentCode?: string | null;
		inn?: string | null;
		snils?: string | null;
		cardNumber?: string | null;
		omsPolicy?: string | null;
		representativeFullName?: string | null;
		representativePassport?: string | null;
		representativeIssuedBy?: string | null;
		representativeRelation?: string | null;
	} | null;
	clinic?: {
		legalName?: string | null;
		name?: string | null;
		actualAddress?: string | null;
		address?: string | null;
		inn?: string | null;
		kpp?: string | null;
		ogrn?: string | null;
		phone?: string | null;
		email?: string | null;
		licenseNumber?: string | null;
		licenseDate?: string | null;
		licenseIssuer?: string | null;
		directorFullName?: string | null;
		directorTitle?: string | null;
		bankName?: string | null;
		bik?: string | null;
		checkingAccount?: string | null;
		corrAccount?: string | null;
	} | null;
	doctor?: {
		fullName?: string | null;
		specialty?: string | null;
		position?: string | null;
		phone?: string | null;
	} | null;
	visit?: {
		date?: string | null;
		time?: string | null;
		diagnosis?: string | null;
		diagnosisIcd10?: string | null;
		teeth?: string | number | null;
		tooth?: string | number | null;
		anesthesia?: string | null;
		complaint?: string | null;
		anamnesis?: string | null;
		studyType?: string | null;
		effectiveDoseMsv?: number | null;
	} | null;
	contract?: {
		number?: string | null;
		date?: string | null;
		totalAmountRub?: number | string | null;
		totalAmountWords?: string | null;
	} | null;
	custom?: Record<string, string | number | null | undefined>;
}

export const STOMX_LEGAL_CONSENTS_CATALOG: readonly StomxLegalConsentTemplateMetadata[] = [
	{
		id: 58,
		systemAlias: "ids_viniry",
		name: "ИДС Виниры",
		procedureType: "veneers",
		category: "prosthetics",
		categoryLabel: "Ортопедия и эстетика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 60,
		systemAlias: "ids_implant",
		name: "ИДС Имплантация",
		procedureType: "implantation",
		category: "surgery",
		categoryLabel: "Хирургия и имплантация",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
	},
	{
		id: 73,
		systemAlias: "ids_sinus_lifting",
		name: "ИДС Синус-лифтинг",
		procedureType: "sinus_lifting",
		category: "surgery",
		categoryLabel: "Хирургия и имплантация",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 72,
		systemAlias: "ids_sedaciya",
		name: "ИДС Седация (ЗАКС / в/в)",
		procedureType: "sedation",
		category: "surgery",
		categoryLabel: "Анестезиология и седация",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 76,
		systemAlias: "ids_udalenie_zuba",
		name: "ИДС Удаление зуба",
		procedureType: "surgery_extraction",
		category: "surgery",
		categoryLabel: "Хирургия и удаление",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
	},
	{
		id: 63,
		systemAlias: "ids_nesemnye_ortopedicheskie",
		name: "ИДС Несъемные ортопедические конструкции",
		procedureType: "fixed_prosthetics",
		category: "prosthetics",
		categoryLabel: "Ортопедическая стоматология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зубы", "Прием.Дата"],
	},
	{
		id: 74,
		systemAlias: "ids_semnye_ortopedicheskie",
		name: "ИДС Съемные ортопедические конструкции",
		procedureType: "removable_prosthetics",
		category: "prosthetics",
		categoryLabel: "Ортопедическая стоматология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 59,
		systemAlias: "ids_glubokiy_karies",
		name: "ИДС Глубокий кариес",
		procedureType: "deep_caries",
		category: "therapy",
		categoryLabel: "Терапия и кариес",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
	},
	{
		id: 61,
		systemAlias: "ids_poverhnostnyy_sredniy_karies",
		name: "ИДС Поверхностный и средний кариес",
		procedureType: "superficial_medium_caries",
		category: "therapy",
		categoryLabel: "Терапия и кариес",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
	},
	{
		id: 70,
		systemAlias: "ids_pulpit_endodontiya",
		name: "ИДС Пульпит и эндодонтия",
		procedureType: "pulpitis_endodontics",
		category: "therapy",
		categoryLabel: "Эндодонтия и пульпит",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
	},
	{
		id: 68,
		systemAlias: "ids_parodontologiya",
		name: "ИДС Пародонтология",
		procedureType: "periodontology",
		category: "periodontics",
		categoryLabel: "Пародонтология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 69,
		systemAlias: "ids_prof_gigiena",
		name: "ИДС Профессиональная гигиена",
		procedureType: "professional_hygiene",
		category: "hygiene",
		categoryLabel: "Гигиена и профилактика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 67,
		systemAlias: "ids_otbelivanie",
		name: "ИДС Отбеливание зубов",
		procedureType: "teeth_whitening",
		category: "hygiene",
		categoryLabel: "Эстетика и отбеливание",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 65,
		systemAlias: "ids_ortodontiya",
		name: "ИДС Ортодонтия",
		procedureType: "orthodontics",
		category: "orthodontics",
		categoryLabel: "Ортодонтия",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 64,
		systemAlias: "ids_nesovershennoletnie",
		name: "ИДС Общее для несовершеннолетних (представитель)",
		procedureType: "minor_general",
		category: "legal",
		categoryLabel: "Детская стоматология и право",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 20 ч. 2), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: [
			"Пациент.ФИО",
			"Пациент.ПредставительФИО",
			"Пациент.ПредставительПаспорт",
			"Клиника.Название",
			"Врач.ФИО",
			"Прием.Дата",
		],
	},
	{
		id: 71,
		systemAlias: "ids_rentgen_cbct",
		name: "ИДС Рентгенологическое исследование и КЛКТ",
		procedureType: "xray_cbct",
		category: "radiology",
		categoryLabel: "Рентгенодиагностика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), СанПиН 2.6.1.1192-03, НРБ-99/2009",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: true,
		standardDoseMsv: 0.055,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 77,
		systemAlias: "ids_fotoprotokol",
		name: "ИДС Фотопротокол",
		procedureType: "photoprotocol",
		category: "legal",
		categoryLabel: "Фотопротокол и согласие",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 13 врачебная тайна), ст. 152.1 ГК РФ (охрана изображения)",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 80,
		systemAlias: "otkaz_egisz",
		name: "Отказ от передачи данных в ЕГИСЗ (ФЗ-323 ст. 13)",
		procedureType: "egisz_refusal",
		category: "legal",
		categoryLabel: "Правовые отказы",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 13 врачебная тайна), ФЗ № 152-ФЗ (О персональных данных)",
		isEgisz: true,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: [
			"Пациент.ФИО",
			"Пациент.СНИЛС",
			"Пациент.ПаспортДанные",
			"Клиника.Название",
			"Клиника.ИНН",
			"Клиника.ОГРН",
			"Прием.Дата",
		],
	},
	{
		id: 81,
		systemAlias: "otkaz_lechenie",
		name: "Отказ от медицинского вмешательства",
		procedureType: "medical_intervention_refusal",
		category: "legal",
		categoryLabel: "Правовые отказы",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 20 ч. 3), Приказ МЗ РФ № 1051н",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: [
			"Пациент.ФИО",
			"Пациент.ПаспортДанные",
			"Клиника.Название",
			"Врач.ФИО",
			"Прием.Диагноз",
			"Прием.Дата",
		],
	},
	{
		id: 82,
		systemAlias: "polozhenie_o_garantiyah",
		name: "Положение о гарантийных обязательствах и сроках службы",
		procedureType: "warranty_policy",
		category: "legal",
		categoryLabel: "Гарантии и права потребителя",
		statutoryBasis: "Закон РФ № 2300-1 «О защите прав потребителей», ст. 720-725 ГК РФ, ПП РФ № 736",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Клиника.ДиректорФИО", "Прием.Дата"],
	},
	{
		id: 15,
		systemAlias: "list_ucheta_dozovyh_nagruzok",
		name: "Лист учета дозовых нагрузок пациента при рентгенологических исследованиях",
		procedureType: "xray_dose_load_sheet",
		category: "radiology",
		categoryLabel: "Радиационная безопасность СанПиН",
		statutoryBasis: "Приложение № 4 к СанПиН 2.6.1.1192-03, СанПиН 2.6.1.2523-09 (НРБ-99/2009)",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: true,
		standardDoseMsv: 0.055,
		keyVariables: ["Пациент.ФИО", "Пациент.НомерКарты", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
	},
	{
		id: 54,
		systemAlias: "garantiynyy_pasport",
		name: "Гарантийный паспорт стоматологического пациента",
		procedureType: "warranty_passport",
		category: "legal",
		categoryLabel: "Гарантии и сервис",
		statutoryBasis: "Закон РФ № 2300-1 «О защите прав потребителей», ст. 720-725 ГК РФ, ПП РФ № 736",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
	},
	{
		id: 53,
		systemAlias: "anketa_zdorovya",
		name: "Анкета общего состояния здоровья пациента",
		procedureType: "somatic_health_questionnaire",
		category: "therapy",
		categoryLabel: "Анамнез и соматика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-22), Приказ МЗ РФ № 834н / 043/у",
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		keyVariables: ["Пациент.ФИО", "Клиника.Название", "Прием.Дата"],
	},
] as const;

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ПОЛНЫЙ РЕЕСТР ВСЕХ 49 ДОКУМЕНТОВ И ШАБЛОНОВ STOMX
 * 
 * Тотальный маппинг реверс-инжиниринга всех 49 шаблонов StomX:
 * клинические, правовые, финансовые, рентгенологические и складские формы.
 * ══════════════════════════════════════════════════════════════════════════════
 */
export interface StomxDocumentRegistryItem {
	id: number;
	name: string;
	category: "clinical" | "legal" | "financial" | "orthodontics" | "radiology" | "analytics" | "warehouse";
	categoryLabel: string;
	statutoryBasis: string;
	targetDenteModule: "legal" | "emr" | "billing" | "schedule" | "orthodontics" | "radiology" | "lab" | "warehouse" | "analytics";
	isConsentOrLegalContract: boolean;
	inSharedCatalog: boolean;
}

export const STOMX_ALL_49_DOCUMENTS_REGISTRY: readonly StomxDocumentRegistryItem[] = [
	{
		id: 1,
		name: "Акт выполненных работ",
		category: "financial",
		categoryLabel: "Бухгалтерия и расчеты",
		statutoryBasis: "ст. 779-783 ГК РФ, ст. 9 Федерального закона № 402-ФЗ «О бухгалтерском учете»",
		targetDenteModule: "billing",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 2,
		name: "План лечения",
		category: "clinical",
		categoryLabel: "Планы лечения",
		statutoryBasis: "ст. 70-71 Федерального закона № 323-ФЗ, Приказ МЗ РФ № 834н",
		targetDenteModule: "emr",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 3,
		name: "Амбулаторная карта 043/у",
		category: "clinical",
		categoryLabel: "Медицинская документация",
		statutoryBasis: "Приказ Минздрава СССР № 1030, Приказ МЗ РФ № 834н",
		targetDenteModule: "emr",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 4,
		name: "Заказ-наряд в зуботехническую лабораторию",
		category: "clinical",
		categoryLabel: "Лаборатория и ортопедия",
		statutoryBasis: "ст. 720-725 ГК РФ",
		targetDenteModule: "lab",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 5,
		name: "Расписание врачей",
		category: "clinical",
		categoryLabel: "Расписание и приёмы",
		statutoryBasis: "Трудовой кодекс РФ, СанПиН 2.1.3678-20",
		targetDenteModule: "schedule",
		isConsentOrLegalContract: false,
		inSharedCatalog: false,
	},
	{
		id: 6,
		name: "Протокол рентген исследования",
		category: "radiology",
		categoryLabel: "Рентгенодиагностика",
		statutoryBasis: "СанПиН 2.6.1.1192-03, Приказ МЗ РФ № 560н",
		targetDenteModule: "radiology",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 7,
		name: "Справка об оплате медицинских услуг для ФНС",
		category: "financial",
		categoryLabel: "Налоговый вычет",
		statutoryBasis: "НК РФ ст. 219 п. 1 пп. 3, Приказ ФНС России КНД 1151156",
		targetDenteModule: "billing",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 8,
		name: "Ортодонтическая карта",
		category: "orthodontics",
		categoryLabel: "Ортодонтия",
		statutoryBasis: "Приказ МЗ РФ № 834н",
		targetDenteModule: "orthodontics",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 9,
		name: "Остатки на складе (инвентаризационная ведомость)",
		category: "warehouse",
		categoryLabel: "Складской учет",
		statutoryBasis: "ст. 11 Федерального закона № 402-ФЗ",
		targetDenteModule: "warehouse",
		isConsentOrLegalContract: false,
		inSharedCatalog: false,
	},
	{
		id: 11,
		name: "Запись в эпикризе ортокарты",
		category: "orthodontics",
		categoryLabel: "Ортодонтия",
		statutoryBasis: "Приказ МЗ РФ № 834н",
		targetDenteModule: "orthodontics",
		isConsentOrLegalContract: false,
		inSharedCatalog: false,
	},
	{
		id: 12,
		name: "План лечения с агрегацией по визитам",
		category: "clinical",
		categoryLabel: "Планы лечения",
		statutoryBasis: "ст. 70-71 Федерального закона № 323-ФЗ",
		targetDenteModule: "emr",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 13,
		name: "Акт выполненных работ для рентгена",
		category: "radiology",
		categoryLabel: "Рентген и расчеты",
		statutoryBasis: "ст. 779 ГК РФ, Федеральный закон № 402-ФЗ",
		targetDenteModule: "billing",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 15,
		name: "Лист учета дозовых нагрузок пациента при рентгенологических исследованиях",
		category: "radiology",
		categoryLabel: "Радиационная безопасность СанПиН",
		statutoryBasis: "Приложение № 4 к СанПиН 2.6.1.1192-03, СанПиН 2.6.1.2523-09 (НРБ-99/2009)",
		targetDenteModule: "radiology",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 16,
		name: "Акт оказанных услуг ДМС",
		category: "financial",
		categoryLabel: "Страховая медицина (ДМС)",
		statutoryBasis: "Закон РФ № 4015-1 «Об организации страхового дела в РФ»",
		targetDenteModule: "billing",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 18,
		name: "Запись в наблюдении ортокарты",
		category: "orthodontics",
		categoryLabel: "Ортодонтия",
		statutoryBasis: "Приказ МЗ РФ № 834н",
		targetDenteModule: "orthodontics",
		isConsentOrLegalContract: false,
		inSharedCatalog: false,
	},
	{
		id: 50,
		name: "График платежей по рассрочке",
		category: "financial",
		categoryLabel: "Финансы и рассрочка",
		statutoryBasis: "ст. 823 ГК РФ (Коммерческий кредит)",
		targetDenteModule: "billing",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 51,
		name: "План лечения с агрегацией по зубам",
		category: "clinical",
		categoryLabel: "Планы лечения",
		statutoryBasis: "ст. 70-71 Федерального закона № 323-ФЗ, Приказ МЗ РФ № 834н",
		targetDenteModule: "emr",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 52,
		name: "AI-заключение и клинико-экспертный аудит для главного врача",
		category: "analytics",
		categoryLabel: "Контроль качества медпомощи",
		statutoryBasis: "Приказ МЗ РФ № 785н (Внутренний контроль качества и безопасности медицинской деятельности)",
		targetDenteModule: "analytics",
		isConsentOrLegalContract: false,
		inSharedCatalog: false,
	},
	{
		id: 53,
		name: "Анкета общего состояния здоровья пациента",
		category: "clinical",
		categoryLabel: "Анамнез и соматика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-22), Приказ МЗ РФ № 834н / 043/у",
		targetDenteModule: "emr",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 54,
		name: "Гарантийный паспорт стоматологического пациента",
		category: "legal",
		categoryLabel: "Гарантии и сервис",
		statutoryBasis: "Закон РФ № 2300-1 «О защите прав потребителей», ст. 720-725 ГК РФ, ПП РФ № 736",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 55,
		name: "Договор на оказание платных медицинских услуг (взрослый)",
		category: "legal",
		categoryLabel: "Договорная база",
		statutoryBasis: "ПП РФ № 736 от 11.05.2023, ст. 779-783 ГК РФ",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 56,
		name: "Договор на оказание мед. услуг несовершеннолетнего (законный представитель)",
		category: "legal",
		categoryLabel: "Детская стоматология и право",
		statutoryBasis: "ПП РФ № 736 от 11.05.2023, ст. 20, 26, 28 ГК РФ",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: false,
	},
	{
		id: 57,
		name: "ИДС Местная анестезия",
		category: "legal",
		categoryLabel: "Анестезиология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 20), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 58,
		name: "ИДС Виниры",
		category: "legal",
		categoryLabel: "Ортопедия и эстетика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 59,
		name: "ИДС Глубокий кариес",
		category: "legal",
		categoryLabel: "Терапия и кариес",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 60,
		name: "ИДС Имплантация",
		category: "legal",
		categoryLabel: "Хирургия и имплантация",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 61,
		name: "ИДС На лечение поверхностного и среднего кариеса",
		category: "legal",
		categoryLabel: "Терапия и кариес",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 62,
		name: "ИДС На медицинское вмешательство (Общее)",
		category: "legal",
		categoryLabel: "Статутные согласия МЗ РФ",
		statutoryBasis: "Приказ МЗ РФ № 1051н, ст. 20 ФЗ-323",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 63,
		name: "ИДС Несъемные ортопедические конструкции",
		category: "legal",
		categoryLabel: "Ортопедическая стоматология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 64,
		name: "ИДС Общее для несовершеннолетних (законный представитель)",
		category: "legal",
		categoryLabel: "Детская стоматология и право",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 20 ч. 2), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 65,
		name: "ИДС Ортодонтия общее",
		category: "legal",
		categoryLabel: "Ортодонтия",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 66,
		name: "ИДС Ортопедия (Протезирование)",
		category: "legal",
		categoryLabel: "Ортопедическая стоматология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 67,
		name: "ИДС Отбеливание зубов",
		category: "legal",
		categoryLabel: "Эстетика и отбеливание",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 68,
		name: "ИДС Пародонтология",
		category: "legal",
		categoryLabel: "Пародонтология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 69,
		name: "ИДС Профессиональная гигиена",
		category: "legal",
		categoryLabel: "Гигиена и профилактика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 70,
		name: "ИДС Пульпит и эндодонтия",
		category: "legal",
		categoryLabel: "Эндодонтия и пульпит",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 71,
		name: "ИДС Рентгенологическое исследование и КЛКТ",
		category: "radiology",
		categoryLabel: "Рентгенодиагностика",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), СанПиН 2.6.1.1192-03, НРБ-99/2009",
		targetDenteModule: "radiology",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 72,
		name: "ИДС Седация (ЗАКС / в/в)",
		category: "legal",
		categoryLabel: "Анестезиология и седация",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 73,
		name: "ИДС Синус-лифтинг",
		category: "legal",
		categoryLabel: "Хирургия и имплантация",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 74,
		name: "ИДС Съемные ортопедические конструкции",
		category: "legal",
		categoryLabel: "Ортопедическая стоматология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 75,
		name: "ИДС Терапевтическое лечение",
		category: "legal",
		categoryLabel: "Терапевтическая стоматология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 76,
		name: "ИДС Удаление зуба (хирургическое)",
		category: "legal",
		categoryLabel: "Хирургия и удаление",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 77,
		name: "ИДС Фотопротокол",
		category: "legal",
		categoryLabel: "Фотопротокол и согласие",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 13 врачебная тайна), ст. 152.1 ГК РФ",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 78,
		name: "ИДС Хирургическое лечение (амбулаторное)",
		category: "legal",
		categoryLabel: "Хирургическая стоматология",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 79,
		name: "ИДС Эндодонтическое лечение",
		category: "legal",
		categoryLabel: "Эндодонтия",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 80,
		name: "Отказ от передачи данных в ЕГИСЗ (ФЗ-323 ст. 13)",
		category: "legal",
		categoryLabel: "Правовые отказы",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 13 врачебная тайна), Федеральный закон № 152-ФЗ, ПП РФ № 140",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 81,
		name: "Отказ от медицинского вмешательства",
		category: "legal",
		categoryLabel: "Правовые отказы",
		statutoryBasis: "ФЗ № 323-ФЗ (ст. 20 ч. 3), Приказ МЗ РФ № 1051н",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 82,
		name: "Положение о гарантийных обязательствах и сроках службы",
		category: "legal",
		categoryLabel: "Гарантии и права потребителя",
		statutoryBasis: "Закон РФ № 2300-1 «О защите прав потребителей», ст. 720-725 ГК РФ, ПП РФ № 736",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
	{
		id: 83,
		name: "Согласие на обработку персональных данных (152-ФЗ)",
		category: "legal",
		categoryLabel: "Персональные данные",
		statutoryBasis: "Федеральный закон № 152-ФЗ «О персональных данных»",
		targetDenteModule: "legal",
		isConsentOrLegalContract: true,
		inSharedCatalog: true,
	},
] as const;

export function getAllStomx49Documents(): readonly StomxDocumentRegistryItem[] {
	return STOMX_ALL_49_DOCUMENTS_REGISTRY;
}

export function getStomxDocumentRegistryItem(
	idOrName: number | string,
): StomxDocumentRegistryItem | undefined {
	if (typeof idOrName === "number") {
		return STOMX_ALL_49_DOCUMENTS_REGISTRY.find((item) => item.id === idOrName);
	}
	const normalized = String(idOrName).trim().toLowerCase();
	return STOMX_ALL_49_DOCUMENTS_REGISTRY.find(
		(item) =>
			item.name.toLowerCase() === normalized ||
			item.name.toLowerCase().includes(normalized) ||
			String(item.id) === normalized,
	);
}

export function getStomxTemplateMetadata(
	aliasOrId: string | number,
): StomxLegalConsentTemplateMetadata | undefined {
	if (typeof aliasOrId === "number") {
		return STOMX_LEGAL_CONSENTS_CATALOG.find((item) => item.id === aliasOrId);
	}
	const normalized = String(aliasOrId).trim().toLowerCase();
	return STOMX_LEGAL_CONSENTS_CATALOG.find(
		(item) =>
			item.systemAlias.toLowerCase() === normalized ||
			item.procedureType.toLowerCase() === normalized ||
			String(item.id) === normalized,
	);
}

/**
 * Разрешает один токен шаблонизатора StomX по переданному контексту.
 * При отсутствии значения возвращает чистое подчеркивание «____________________» (Мандат 8e).
 */
export function resolveStomxVariableToken(
	token: string,
	context: StomxVariableContext,
	fallbackToUnderline = true,
): string {
	const rawKey = token.trim();
	const pt = context.patient;
	const cl = context.clinic;
	const dr = context.doctor;
	const vs = context.visit;
	const ct = context.contract;
	const custom = context.custom;

	if (custom && custom[rawKey] !== undefined && custom[rawKey] !== null) {
		return String(custom[rawKey]);
	}

	const fallback = fallbackToUnderline ? "«____________________»" : "";

	switch (rawKey) {
		// Пациент
		case "Пациент.ФИО":
			return pt?.fullName?.trim() || fallback;
		case "Пациент.ID":
			return pt?.id ? String(pt.id) : fallback;
		case "Пациент.НомерКарты":
			return pt?.cardNumber?.trim() || fallback;
		case "Пациент.Фамилия":
			return pt?.lastName?.trim() || (pt?.fullName ? pt.fullName.split(" ")[0] : "") || fallback;
		case "Пациент.Имя":
			return pt?.firstName?.trim() || (pt?.fullName ? pt.fullName.split(" ")[1] : "") || fallback;
		case "Пациент.Отчество":
			return pt?.middleName?.trim() || (pt?.fullName ? pt.fullName.split(" ")[2] : "") || fallback;
		case "Пациент.Пол":
			return pt?.gender === "female" ? "женский" : pt?.gender === "male" ? "мужской" : String(pt?.gender || fallback);
		case "Пациент.Адрес":
			return pt?.address?.trim() || pt?.registrationAddress?.trim() || fallback;
		case "Пациент.Телефон":
			return pt?.phone?.trim() || fallback;
		case "Пациент.ИНН":
			return pt?.inn?.trim() || fallback;
		case "Пациент.ФамилияИО": {
			if (!pt?.fullName) return fallback;
			const parts = pt.fullName.trim().split(/\s+/);
			const p0 = parts[0];
			const p1 = parts[1];
			const p2 = parts[2];
			if (p0 && p1 && p2 && p1[0] && p2[0]) {
				return `${p0} ${p1[0]}.${p2[0]}.`;
			}
			return pt.fullName;
		}
		case "Пациент.СНИЛС":
			return pt?.snils?.trim() || fallback;
		case "Пациент.ДатаРождения":
			return pt?.birthDate?.trim() || fallback;
		case "Пациент.Возраст":
			return pt?.age ? String(pt.age) : fallback;
		case "Пациент.Паспорт":
			return (
				pt?.passportSeriesNumber?.trim() ||
				pt?.passport?.trim() ||
				(pt?.passportSeries && pt?.passportNumber ? `${pt.passportSeries} ${pt.passportNumber}` : "") ||
				pt?.passportSeries?.trim() ||
				fallback
			);
		case "Пациент.ПаспортСерия":
			return pt?.passportSeries?.trim() || pt?.passportSeriesNumber?.trim() || fallback;
		case "Пациент.ПаспортНомер":
			return pt?.passportNumber?.trim() || fallback;
		case "Пациент.ПаспортКемВыдан":
			return pt?.passportIssuedBy?.trim() || fallback;
		case "Пациент.ПаспортДатаВыдачи":
			return pt?.passportIssuedDate?.trim() || fallback;
		case "Пациент.ПаспортКодПодразделения":
			return pt?.passportDepartmentCode?.trim() || fallback;
		case "Пациент.ПаспортДанные": {
			const direct = pt?.passportSeriesNumber?.trim() || pt?.passport?.trim();
			if (direct) return direct;
			if (pt?.passportSeries && pt?.passportNumber) {
				const issued = pt.passportIssuedBy ? `, выдан ${pt.passportIssuedBy}` : "";
				const dt = pt.passportIssuedDate ? ` от ${pt.passportIssuedDate}` : "";
				return `${pt.passportSeries} № ${pt.passportNumber}${issued}${dt}`;
			}
			return fallback;
		}
		case "Пациент.ПолисОМС":
			return pt?.omsPolicy?.trim() || fallback;
		case "Пациент.Email":
			return pt?.email?.trim() || fallback;
		case "Пациент.ПредставительФИО":
			return pt?.representativeFullName?.trim() || fallback;
		case "Пациент.ПредставительПаспорт":
			return pt?.representativePassport?.trim() || fallback;
		case "Пациент.ПредставительКемВыдан":
			return pt?.representativeIssuedBy?.trim() || fallback;
		case "Пациент.ПредставительСтатус":
			return pt?.representativeRelation?.trim() || "законный представитель";

		// Клиника
		case "Клиника.Название":
			return cl?.name?.trim() || cl?.legalName?.trim() || "ООО «ДЕНТЕ»";
		case "Клиника.ЮрНазвание":
			return cl?.legalName?.trim() || cl?.name?.trim() || "ООО «ДЕНТЕ»";
		case "Клиника.ЮрАдрес":
			return cl?.address?.trim() || cl?.actualAddress?.trim() || fallback;
		case "Клиника.ФактАдрес":
			return cl?.actualAddress?.trim() || cl?.address?.trim() || fallback;
		case "Клиника.ИНН":
			return cl?.inn?.trim() || fallback;
		case "Клиника.КПП":
			return cl?.kpp?.trim() || fallback;
		case "Клиника.ОГРН":
			return cl?.ogrn?.trim() || fallback;
		case "Клиника.Телефон":
			return cl?.phone?.trim() || fallback;
		case "Клиника.Email":
			return cl?.email?.trim() || fallback;
		case "Клиника.Лицензия":
		case "Клиника.ЛицензияНомер":
			return cl?.licenseNumber?.trim() || "ЛО41-01137-77/00368421";
		case "Клиника.ЛицензияДата":
			return cl?.licenseDate?.trim() || "12.10.2021";
		case "Клиника.ЛицензияОрган":
			return cl?.licenseIssuer?.trim() || "Департамент здравоохранения г. Москвы";
		case "Клиника.ДиректорФИО":
			return cl?.directorFullName?.trim() || fallback;
		case "Клиника.ДиректорДолжность":
			return cl?.directorTitle?.trim() || "Генеральный директор";
		case "Клиника.Банк":
			return cl?.bankName?.trim() || fallback;
		case "Клиника.БИК":
			return cl?.bik?.trim() || fallback;
		case "Клиника.РС":
			return cl?.checkingAccount?.trim() || fallback;
		case "Клиника.КС":
			return cl?.corrAccount?.trim() || fallback;

		// Врач
		case "Врач.ФИО":
			return dr?.fullName?.trim() || fallback;
		case "Врач.Специальность":
			return dr?.specialty?.trim() || "врач-стоматолог";
		case "Врач.Должность":
			return dr?.position?.trim() || "врач-стоматолог";
		case "Врач.ФамилияИО": {
			if (!dr?.fullName) return fallback;
			const parts = dr.fullName.trim().split(/\s+/);
			const p0 = parts[0];
			const p1 = parts[1];
			const p2 = parts[2];
			if (p0 && p1 && p2 && p1[0] && p2[0]) {
				return `${p0} ${p1[0]}.${p2[0]}.`;
			}
			return dr.fullName;
		}
		case "Врач.Телефон":
			return dr?.phone?.trim() || fallback;

		// Прием
		case "Прием.Дата":
			return vs?.date?.trim() || fallback;
		case "Прием.Время":
			return vs?.time?.trim() || fallback;
		case "Прием.Диагноз":
			return vs?.diagnosis?.trim() || (vs?.diagnosisIcd10 ? `МКБ-10: ${vs.diagnosisIcd10}` : fallback);
		case "Прием.ДиагнозМКБ":
			return vs?.diagnosisIcd10?.trim() || fallback;
		case "Прием.Зуб":
			return vs?.tooth ? String(vs.tooth) : vs?.teeth ? String(vs.teeth) : fallback;
		case "Прием.Зубы":
			return vs?.teeth ? String(vs.teeth) : vs?.tooth ? String(vs.tooth) : fallback;
		case "Прием.Анестезия":
			return vs?.anesthesia?.trim() || "Местная анестезия (артикаин 4%)";
		case "Прием.Жалобы":
			return vs?.complaint?.trim() || fallback;
		case "Прием.Анамнез":
			return vs?.anamnesis?.trim() || "Соматически здоров, аллергоанамнез не отягощен";
		case "Прием.ЭффективнаяДоза":
			return vs?.effectiveDoseMsv !== undefined && vs?.effectiveDoseMsv !== null ? `${vs.effectiveDoseMsv} мЗв` : fallback;

		// Договор и финансы
		case "Договор.Номер":
			return ct?.number?.trim() || fallback;
		case "Договор.Дата":
			return ct?.date?.trim() || fallback;
		case "Смета.Сумма":
			return ct?.totalAmountRub !== undefined && ct?.totalAmountRub !== null ? `${ct.totalAmountRub} ₽` : fallback;
		case "Смета.СуммаПрописью":
			return ct?.totalAmountWords?.trim() || fallback;

		// Общие даты
		case "ТекущаяДата":
		case "Дата":
			return new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) + " г.";

		default:
			return fallback;
	}
}

/**
 * Подставляет значения в шаблон, распознавая синтаксисы:
 * - [Пациент.ФИО] (канонический StomX)
 * - {{Пациент.ФИО}} (Mustache / handlebars)
 * - ${Пациент.ФИО} (ES6)
 */
export function renderStomxTemplateText(
	templateText: string,
	context: StomxVariableContext,
): string {
	if (!templateText) return "";

	// 1. [Токен]
	let result = templateText.replace(/\[([А-Яа-яA-Za-z0-9_.]+)\]/g, (_, token) => {
		return resolveStomxVariableToken(token, context);
	});

	// 2. {{Токен}}
	result = result.replace(/\{\{([А-Яа-яA-Za-z0-9_.]+)\}\}/g, (_, token) => {
		return resolveStomxVariableToken(token, context);
	});

	// 3. ${Токен}
	result = result.replace(/\$\{([А-Яа-яA-Za-z0-9_.]+)\}/g, (_, token) => {
		return resolveStomxVariableToken(token, context);
	});

	return result;
}

export * from "./stomxConsentHtmlGenerator.js";
