/**
 * types.ts — Layer 0: Типы, интерфейсы, константы и чистые предикаты фильтрации
 * для рентгенологического поиска снимков и исследований пациента.
 */

import React from "react";
import { FileText, Layers } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";

export type TactileModalityMode =
	| "all"
	| "opg"
	| "ceph"
	| "cbct"
	| "periapical"
	| "camera"
	| "other";

export type TactileDatePreset =
	| "all"
	| "today"
	| "yesterday"
	| "3days"
	| "last_week"
	| "last_month"
	| "custom";

export interface RadiologyTactileFilterState {
	readonly mode: TactileModalityMode;
	readonly datePreset: TactileDatePreset;
	readonly customDateFrom?: string;
	readonly customDateTo?: string;
	readonly query?: string;
}

export const DEFAULT_TACTILE_FILTERS: RadiologyTactileFilterState = {
	mode: "all",
	datePreset: "all",
	customDateFrom: "",
	customDateTo: "",
	query: "",
};

export interface ModeButtonConfig {
	readonly id: TactileModalityMode;
	readonly label: string;
	readonly subtitle: string;
	readonly icon: React.ComponentType<{ className?: string }>;
}

export interface DateButtonConfig {
	readonly id: TactileDatePreset;
	readonly label: string;
	readonly subtitle: string;
}

/**
 * 4 основных таба фильтрации по времени в соответствии с клиническим протоколом
 */
export const DATE_FILTER_TABS: readonly DateButtonConfig[] = [
	{ id: "all", label: "Все снимки", subtitle: "Вся история пациента" },
	{ id: "today", label: "Сегодня / Приём", subtitle: "Снимки текущей смены" },
	{ id: "last_month", label: "30 дней", subtitle: "За последний месяц" },
	{ id: "custom", label: "Период", subtitle: "Выбрать диапазон дат" },
] as const;

/**
 * Полный список пресетов дат для совместимости с интерфейсами и фильтрацией
 */
export const TACTILE_DATES: readonly DateButtonConfig[] = [
	{ id: "all", label: "Все снимки", subtitle: "Вся история архива" },
	{ id: "today", label: "Сегодня / Текущий приём", subtitle: "Текущая смена" },
	{ id: "yesterday", label: "Вчера", subtitle: "Предыдущий день" },
	{ id: "3days", label: "3 дня", subtitle: "Последние 72 часа" },
	{ id: "last_week", label: "Прошлая неделя", subtitle: "За 7 дней" },
	{ id: "last_month", label: "Последние 30 дней", subtitle: "За 30 дней" },
	{ id: "custom", label: "Выбрать дату / период", subtitle: "Выбрать диапазон дат" },
] as const;

/**
 * Каталог режимов для совместимости фильтрации
 */
export const TACTILE_MODES: readonly ModeButtonConfig[] = [
	{ id: "all", label: "Все режимы", subtitle: "Любые типы снимков", icon: Layers },
	{ id: "periapical", label: "IO-сенсор", subtitle: "Внутриротовой визиограф RVG", icon: Layers },
	{ id: "opg", label: "Панорама", subtitle: "ОПТГ панорамные", icon: Layers },
	{ id: "ceph", label: "Цефалостат", subtitle: "ТРГ телерентгенограммы", icon: Layers },
	{ id: "cbct", label: "КТ", subtitle: "КЛКТ 3D томограммы", icon: Layers },
	{ id: "camera", label: "IO-камера", subtitle: "Внутриротовая камера", icon: Layers },
	{ id: "other", label: "Другое", subtitle: "Фотографии, сканы", icon: FileText },
] as const;

export function matchesDatePreset(
	studyDateStr: string | null | undefined,
	preset: TactileDatePreset,
	customFrom?: string,
	customTo?: string,
	referenceDate: Date = new Date(),
): boolean {
	if (!studyDateStr || preset === "all") return true;

	let d: Date;
	// Russian DD.MM.YYYY format
	const ruMatch = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(studyDateStr);
	if (ruMatch) {
		const [, day, month, year] = ruMatch;
		d = new Date(Number(year), Number(month) - 1, Number(day));
	} else {
		d = new Date(studyDateStr);
	}

	if (Number.isNaN(d.getTime())) return true;

	const toMidnightMs = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

	const studyDay = toMidnightMs(d);
	const today = toMidnightMs(referenceDate);
	const oneDayMs = 24 * 60 * 60 * 1000;

	switch (preset) {
		case "today":
			return studyDay === today;
		case "yesterday":
			return studyDay === today - oneDayMs;
		case "3days":
			return studyDay >= today - 2 * oneDayMs && studyDay <= today;
		case "last_week":
			return studyDay >= today - 7 * oneDayMs && studyDay <= today;
		case "last_month":
			return studyDay >= today - 30 * oneDayMs && studyDay <= today;
		case "custom": {
			if (!customFrom && !customTo) return true;
			const fromMs = customFrom ? toMidnightMs(new Date(customFrom)) : -Infinity;
			const toMs = customTo ? toMidnightMs(new Date(customTo)) + oneDayMs - 1 : Infinity;
			return studyDay >= fromMs && studyDay <= toMs;
		}
		default:
			return true;
	}
}

export function matchesTactileModality(
	kindOrModality: string | null | undefined,
	targetMode: TactileModalityMode,
): boolean {
	if (!targetMode || targetMode === "all") return true;
	const norm = (kindOrModality || "").toLowerCase();

	switch (targetMode) {
		case "opg":
			return norm.includes("opg") || norm.includes("pan") || norm.includes("панорам");
		case "ceph":
			return (
				norm.includes("ceph") ||
				norm.includes("trg") ||
				norm.includes("цефало") ||
				norm.includes("трг")
			);
		case "cbct":
			return (
				norm.includes("cbct") ||
				norm.includes("ct") ||
				norm.includes("3d") ||
				norm.includes("кт")
			);
		case "periapical":
			return (
				norm.includes("periapical") ||
				norm.includes("bitewing") ||
				norm.includes("rvg") ||
				norm.includes("io") ||
				norm.includes("sensor") ||
				norm.includes("сенсор") ||
				norm.includes("прицельн")
			);
		case "camera":
			return (
				norm.includes("camera") ||
				norm.includes("камер") ||
				norm.includes("video") ||
				norm.includes("intraoral")
			);
		case "other":
			return (
				norm.includes("other") ||
				norm.includes("photo") ||
				norm.includes("twain") ||
				norm.includes("фото") ||
				norm.includes("документ")
			);
		default:
			return true;
	}
}

export interface ClinicalVisiographyVisit {
	readonly id: string;
	readonly dateStr: string;
	readonly displayDate: string;
	readonly relativeLabel: string;
	readonly doctorName: string;
	readonly specialty: string;
	readonly teeth: readonly string[];
	readonly shotCount: number;
	readonly clinicalNote: string;
	readonly previewThumbnails?: readonly string[];
}

/**
 * Реалистичные клинические визиты со снимками визиографа (дефолтный набор)
 */
export const DEFAULT_VISIOGRAPHY_VISITS: readonly ClinicalVisiographyVisit[] = [
	{
		id: "visit-rvg-today",
		dateStr: "2026-10-03",
		displayDate: "03.10.2026",
		relativeLabel: "Сегодня (Текущий приём)",
		doctorName: "Д-р Иванов А.С.",
		specialty: "Терапевт-эндодонтист",
		teeth: ["16", "15"],
		shotCount: 2,
		clinicalNote: "Контроль эндодонтического лечения, обтурация корневых каналов зуба 16",
		previewThumbnails: ["/radiology/sample_rvg_tooth16.jpg"],
	},
	{
		id: "visit-rvg-prev-week",
		dateStr: "2026-09-25",
		displayDate: "25.09.2026",
		relativeLabel: "8 дней назад",
		doctorName: "Д-р Петрова М.В.",
		specialty: "Стоматолог-ортопед",
		teeth: ["26"],
		shotCount: 2,
		clinicalNote: "Диагностика перед протезированием, оценка состояния периапикальных тканей",
		previewThumbnails: ["/radiology/sample_rvg_tooth16.jpg"],
	},
	{
		id: "visit-rvg-month-ago",
		dateStr: "2026-08-14",
		displayDate: "14.08.2026",
		relativeLabel: "50 дней назад",
		doctorName: "Д-р Сидоров Д.Н.",
		specialty: "Хирург-имплантолог",
		teeth: ["46"],
		shotCount: 1,
		clinicalNote: "Контроль остеоинтеграции дентального имплантата в области 46 зуба",
		previewThumbnails: ["/radiology/sample_rvg_tooth16.jpg"],
	},
	{
		id: "visit-rvg-spring",
		dateStr: "2026-05-12",
		displayDate: "12.05.2026",
		relativeLabel: "Архив",
		doctorName: "Д-р Смирнова Е.К.",
		specialty: "Стоматолог-терапевт",
		teeth: ["36", "37"],
		shotCount: 3,
		clinicalNote: "Первичный диагностический снимок при обращении с острым пульпитом",
		previewThumbnails: ["/radiology/sample_rvg_tooth16.jpg"],
	},
] as const;

export interface RadiologyPatientSearchModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialFilters?: Partial<RadiologyTactileFilterState> | undefined;
	readonly onApply: (filters: RadiologyTactileFilterState) => void;
	readonly onReset?: (() => void) | undefined;
	readonly totalStudiesCount?: number | undefined;
	readonly matchedCount?: number | undefined;
	readonly studies?: readonly ImagingStudy[] | undefined;
	readonly onSelectStudy?: ((studyId: string) => void) | undefined;
}
