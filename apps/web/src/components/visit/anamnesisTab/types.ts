/**
 * apps/web/src/components/visit/anamnesisTab/types.ts
 *
 * Layer 0: Доменные типы, интерфейсы и клинические каталоги вкладки анамнеза приёма.
 * Соответствует Приказу Минздрава РФ № 834н, Форме 043/у и стандартам СтАР.
 *
 * data-testid="visit-anamnesis-tab"
 */

export interface VisitAnamnesisTabProps {
	readonly onAppendAnamnesis?: ((text: string) => void) | undefined;
	readonly onAppendComorbidities?: ((text: string) => void) | undefined;
	readonly activeTooth?: number | null | undefined;
	readonly onOpenStomxTemplates?: (() => void) | undefined;
}

// ─── 1. АЛЛЕРГОЛОГИЧЕСКИЙ КАТАЛОГ СТОМАТОЛОГА ─────────────────────────────

export interface AllergenItem {
	readonly id: string;
	readonly name: string;
	readonly category: "anesthetics" | "antibiotics" | "materials";
	readonly isCritical: boolean;
	readonly tradeNamesHint?: string;
}

export const DENTAL_ALLERGENS: readonly AllergenItem[] = [
	{
		id: "articaine",
		name: "Артикаин",
		category: "anesthetics",
		isCritical: true,
		tradeNamesHint: "Ультракаин, Убистезин, Септанест",
	},
	{
		id: "mepivacaine",
		name: "Мепивакаин",
		category: "anesthetics",
		isCritical: false,
		tradeNamesHint: "Скандонест, Мепивастезин",
	},
	{
		id: "lidocaine",
		name: "Лидокаин",
		category: "anesthetics",
		isCritical: true,
		tradeNamesHint: "Ксилокаин, спреи, инфильтрация",
	},
	{
		id: "novocaine",
		name: "Новокаин / Прокаин",
		category: "anesthetics",
		isCritical: false,
		tradeNamesHint: "Эфирные анестетики",
	},
	{
		id: "penicillin",
		name: "Пенициллиновый ряд",
		category: "antibiotics",
		isCritical: true,
		tradeNamesHint: "Амоксиклав, Аугментин, Флемоксин",
	},
	{
		id: "macrolides",
		name: "Макролиды",
		category: "antibiotics",
		isCritical: false,
		tradeNamesHint: "Кларитромицин, Азитромицин",
	},
	{
		id: "lincosamides",
		name: "Линкозамиды",
		category: "antibiotics",
		isCritical: false,
		tradeNamesHint: "Клиндамицин, Линкомицин",
	},
	{
		id: "latex",
		name: "Латекс",
		category: "materials",
		isCritical: false,
		tradeNamesHint: "Коффердам, перчатки — нитриловый протокол",
	},
	{
		id: "metals",
		name: "Металлы / Никель",
		category: "materials",
		isCritical: false,
		tradeNamesHint: "КХС, НХС, коронки, брекеты",
	},
	{
		id: "iodine",
		name: "Йод / Йодоформ",
		category: "materials",
		isCritical: false,
		tradeNamesHint: "Альвожил, Метапекс, Бетадин",
	},
	{
		id: "nsaid",
		name: "НПВП / Аспирин",
		category: "materials",
		isCritical: true,
		tradeNamesHint: "Аспириновая триада, Кеторол, Ибупрофен",
	},
] as const;

export const ALLERGY_REACTIONS = [
	"Крапивница / кожный зуд",
	"Отёк Квинке",
	"Анафилактический шок",
	"Бронхоспазм / удушье",
	"Местная гиперемия",
] as const;

// ─── 2. КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ И СОМАТИКА ─────────────────────────────

export interface SomaticStopFactorItem {
	readonly id: string;
	readonly label: string;
	readonly isCritical: boolean;
	readonly hint: string;
}

export const SOMATIC_STOP_FACTORS: readonly SomaticStopFactorItem[] = [
	{
		id: "infarction_recent",
		label: "Инфаркт / Инсульт (< 6 мес)",
		isCritical: true,
		hint: "Противопоказание к плановым стоматологическим вмешательствам!",
	},
	{
		id: "pacemaker",
		label: "Кардиостимулятор (ЭКС / ИКД)",
		isCritical: true,
		hint: "Абсолютный запрет УЗ-скейлеров и монополярной электрокоагуляции!",
	},
	{
		id: "anticoagulants",
		label: "Приём антикоагулянтов",
		isCritical: true,
		hint: "Варфарин, Ксарелто, Эликвис — высокий риск кровотечения при удалении",
	},
	{
		id: "bisphosphonates",
		label: "Приём бисфосфонатов",
		isCritical: true,
		hint: "Акласта, Зомета, Пролиа — критический риск остеонекроза челюсти (MRONJ)",
	},
	{
		id: "hypertension",
		label: "Гипертоническая болезнь / ИБС",
		isCritical: false,
		hint: "Лимит адреналина <= 1:200 000, запрет 1:100 000",
	},
	{
		id: "diabetes",
		label: "Сахарный диабет",
		isCritical: false,
		hint: "Риск гипогликемии, контроль гликемии перед операцией",
	},
	{
		id: "pregnancy",
		label: "Беременность / Лактация",
		isCritical: false,
		hint: "Безопасные анестетики без вазоконстриктора, рентген-защита",
	},
	{
		id: "asthma",
		label: "Бронхиальная астма",
		isCritical: false,
		hint: "Запрет сульфитов (E223 консервант эпинефрина), ингалятор у кресла",
	},
	{
		id: "epilepsy",
		label: "Эпилепсия",
		isCritical: false,
		hint: "Риск судорожного приступа на стресс/свет",
	},
	{
		id: "infections",
		label: "Инфекции (Гепатит B/C, ВИЧ) со слов",
		isCritical: false,
		hint: "Повышенный инфекционный контроль",
	},
] as const;

// ─── 3. СТОМАТОЛОГИЧЕСКИЙ АНАМНЕЗ ────────────────────────────────────────

export interface DentalHistoryItem {
	readonly id: string;
	readonly label: string;
	readonly isAlert?: boolean;
}

export const DENTAL_HISTORY_ITEMS: readonly DentalHistoryItem[] = [
	{ id: "anes_good", label: "Опыт анестезии положительный (без осложнений)" },
	{
		id: "anes_bad",
		label: "Осложнения при анестезии (коллапс / реакция)",
		isAlert: true,
	},
	{ id: "anes_weak", label: "Анестезия действует слабо / не наступает" },
	{ id: "sedation", label: "Ранее лечился под седацией / наркозом" },
	{
		id: "bleed_past",
		label: "Длительное кровотечение после удалений",
		isAlert: true,
	},
	{ id: "alveolitis", label: "Альвеолит в анамнезе (воспаление лунки)" },
	{
		id: "dentophobia",
		label: "Дентофобия (страх лечения, панические атаки)",
		isAlert: true,
	},
	{
		id: "bruxism",
		label: "Бруксизм / гипертонус мышц / стираемость",
	},
	{ id: "bleeding_gums", label: "Кровоточивость десен при чистке" },
	{ id: "implants_present", label: "Наличие дентальных имплантатов" },
	{ id: "crowns_present", label: "Наличие коронок / мостовидных протезов" },
	{ id: "ortho_braces", label: "Ортодонтическое лечение (брекеты / элайнеры)" },
	{ id: "removable_denture", label: "Съемные протезы (бюгель / пластинка)" },
] as const;

// ─── 4. ОСНОВНЫЕ ЖАЛОБЫ ПАЦИЕНТА ─────────────────────────────────────────

export const PATIENT_COMPLAINTS_LIST = [
	"Острая самопроизвольная боль",
	"Реакция на холодное и горячее",
	"Выпала пломба",
	"Скол коронки / стенки зуба",
	"Боль при накусывании на зуб",
	"Кровоточивость десен",
	"Застревание пищи в межзубном промежутке",
	"Подвижность зуба",
	"Боли от сладкого и кислого",
	"Эстетический дефект зубного ряда",
	"Неприятный запах изо рта",
	"Плановый осмотр (жалоб нет)",
] as const;

export type PregnancyTrimester =
	| "trimester_1"
	| "trimester_2"
	| "trimester_3"
	| "lactation";

export interface AnamnesisDraftPayload {
	selectedAllergies: Record<string, string>;
	selectedRisks: string[];
	anticoagulantName: string;
	bisphosphonateName: string;
	pregnancyTrimester: PregnancyTrimester;
	selectedHistory: string[];
	selectedComplaints: string[];
	customNotes: string;
	updatedAt: string;
}
