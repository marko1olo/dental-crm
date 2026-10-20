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

// ─── 1. АЛЛЕРГОЛОГИЧЕСКИЙ КАТАЛОГ СТОМАТОЛОГА (SSOT ИЗ @dental/shared) ──────

import {
	ALLERGY_REACTIONS,
	DENTAL_ALLERGEN_CATALOG,
	DENTAL_SOMATIC_STOP_FACTOR_CATALOG,
	type DentalAllergenDefinition,
	type SomaticStopFactorDefinition,
} from "@dental/shared";

export { ALLERGY_REACTIONS };

export type AllergenItem = DentalAllergenDefinition;

export const DENTAL_ALLERGENS: readonly AllergenItem[] = DENTAL_ALLERGEN_CATALOG;

// ─── 2. КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ И СОМАТИКА (SSOT ИЗ @dental/shared) ────────

export interface SomaticStopFactorItem {
	readonly id: string;
	readonly label: string;
	readonly isCritical: boolean;
	readonly hint: string;
}

export const SOMATIC_STOP_FACTORS: readonly SomaticStopFactorItem[] =
	DENTAL_SOMATIC_STOP_FACTOR_CATALOG.map((item) => ({
		id: item.id,
		label: item.label,
		isCritical: item.isCritical,
		hint: item.hint,
	}));

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
