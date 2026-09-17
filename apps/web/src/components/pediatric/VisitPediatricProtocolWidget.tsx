/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VISIT PEDIATRIC PROTOCOL WIDGET (CHAIRSIDE 30-SECOND PEDIATRIC WORKSPACE)
 * Fast 1-Click Form 043/u & Order 804n Pediatric Dental Logging
 * Zero Emojis | Touch Targets >= 48px | Frankl Scale Express Selector | Dual-Dispatch SOAP Sync
 * Mandates 8d, 8e, 8i, 8k, 8n | Anti-Matryoshka Depth = 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	Activity,
	Baby,
	Check,
	ChevronDown,
	ChevronUp,
	Coins,
	Droplets,
	FileText,
	Frown,
	Meh,
	Printer,
	Scissors,
	ShieldCheck,
	Smile,
	Sparkles,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import type { FranklRating } from "../odontogram/pediatricDentitionEngine";
import { PediatricParentMemoModal } from "./PediatricParentMemoModal";

// ─────────────────────────────────────────────────────────────────────────────
// 1-CLICK PHYSIOLOGICAL NORM (MANDATE 8e: DECIDUOUS DENTITION NORM)
// ─────────────────────────────────────────────────────────────────────────────

export const PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION = {
	titleRu: "Временный прикус интактен (физиологическая норма)",
	statusLocalisRu:
		"Временный прикус интактен. Зубные ряды правильной формы, симметричны. Все временные зубы интактны, кариозных полостей и пятен деминерализации не выявлено (индекс кп=0). Физиологическая стираемость бугров временных зубов выражена соответственно возрасту. Присутствуют физиологические тремы и диастемы, свидетельствующие о нормальном росте челюстей. Слизистая оболочка полости рта бледно-розовая, влажная. Уздечки губ и языка анатомически правильного прикрепления. Носовое дыхание свободное. Вредные привычки отсутствуют.",
	treatmentRu:
		"Профилактический осмотр и оценка прикуса. Контролируемая гигиена: очищение зубов циркулярной щеточкой с бесфтористой пастой. Аппликация защитного реминерализующего фторлака на зубы. Мотивационная беседа с ребенком в игровой форме («считаем зубки»). Обучение правильной технике чистки зубов.",
	recommendationsRu:
		"1. Контролируемая родителями чистка зубов 2 раза в день фторидной пастой (1000 ppm) до 8–9 лет. 2. Рациональное питание: ограничение сладостей и сладких напитков между приемами пищи. 3. Твердая пища (яблоки, морковь) для стимуляции жевания и роста челюстей. 4. Плановый профосмотр через 3–4 месяца.",
	diagnosisIcd10: "Z01.2",
	diagnosisNameRu:
		"Стоматологическое обследование / физиологическая норма временного прикуса (Z01.2)",
	serviceCode804n: "A01.07.001",
	serviceName804n:
		"Прием (осмотр, консультация) врача-стоматолога детского первичный",
};

// ─────────────────────────────────────────────────────────────────────────────
// FRANKL BEHAVIOR SCALE EXPRESS DEFINITIONS (ZERO EMOJIS — LUCIDE ICONS ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export interface FranklExpressItem {
	readonly rating: FranklRating;
	readonly symbol: "--" | "-" | "+" | "++";
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly clinicalTacticRu: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly activeClass: string;
	readonly badgeClass: string;
}

export const FRANKL_EXPRESS_ITEMS: readonly FranklExpressItem[] = [
	{
		rating: 1,
		symbol: "--",
		titleRu: "1 (--) Определенно негативное",
		shortLabelRu: "1 (--) Категорически негативное",
		descriptionRu:
			"Плач, отказ от контакта, физическое сопротивление или страх",
		clinicalTacticRu:
			"Tell-Show-Do, ознакомительный визит без бормашины, седация N2O при острой боли",
		icon: Frown,
		activeClass:
			"border-rose-500 bg-rose-50/90 text-rose-950 shadow-sm ring-2 ring-rose-500/30 dark:border-rose-400 dark:bg-rose-950/60 dark:text-rose-100",
		badgeClass:
			"bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-700",
	},
	{
		rating: 2,
		symbol: "-",
		titleRu: "2 (-) Негативное",
		shortLabelRu: "2 (-) Негативное / насторожен",
		descriptionRu:
			"Неохотно, плаксив, скован, но садится в кресло и дает осмотреть",
		clinicalTacticRu:
			"Tell-Show-Do, мультфильмы, позитивное подкрепление, договоренность о знаке «стоп»",
		icon: Meh,
		activeClass:
			"border-amber-500 bg-amber-50/90 text-amber-950 shadow-sm ring-2 ring-amber-500/30 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100",
		badgeClass:
			"bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700",
	},
	{
		rating: 3,
		symbol: "+",
		titleRu: "3 (+) Позитивное",
		shortLabelRu: "3 (+) Позитивное / контактен",
		descriptionRu: "Контактен, сотрудничает, спокойно выполняет указания врача",
		clinicalTacticRu:
			"Похвала, демонстрация чистого зубика в зеркало, игровая форма, подарок за смелость",
		icon: Smile,
		activeClass:
			"border-sky-500 bg-sky-50/90 text-sky-950 shadow-sm ring-2 ring-sky-500/30 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-100",
		badgeClass:
			"bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-200 dark:border-sky-700",
	},
	{
		rating: 4,
		symbol: "++",
		titleRu: "4 (++) Определенно позитивное",
		shortLabelRu: "4 (++) Полное партнерство",
		descriptionRu: "Восторжен, искренний интерес, улыбка, абсолютное доверие",
		clinicalTacticRu:
			"Партнерство, обучение самостоятельной чистке зубов, диплом храброго пациента",
		icon: Sparkles,
		activeClass:
			"border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm ring-2 ring-emerald-500/30 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-100",
		badgeClass:
			"bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 5 CANONICAL CLINICAL 1-CLICK PROTOCOLS (ORDER 804n & FORM 043/u COMPLIANT)
// ─────────────────────────────────────────────────────────────────────────────

export type PediatricProtocolId =
	| "caries_primary"
	| "pulpotomy_primary"
	| "silvering_deep_fluoridation"
	| "fissure_sealing"
	| "extraction_primary_exfoliation"
	| "standard_crown";

export interface PediatricServiceItem {
	readonly code: string;
	readonly nameRu: string;
}

export interface PediatricProtocolDefinition {
	readonly id: PediatricProtocolId;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly subtitleRu: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisNameRu: string;
	readonly serviceCode804n: string;
	readonly serviceName804n: string;
	readonly defaultSurfaces: readonly string[];
	readonly allowsSurfaces: boolean;
	readonly materials: readonly string[];
	readonly defaultMaterial: string;
	readonly defaultToothFindingState:
		| "Filled"
		| "EndoTreated"
		| "Watch"
		| "Healthy"
		| "Extracted"
		| "Crown";
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly colorTheme: string;
}

export const PEDIATRIC_PROTOCOL_PRESETS: readonly PediatricProtocolDefinition[] =
	[
		{
			id: "caries_primary",
			titleRu: "Кариес временного зуба",
			shortLabelRu: "Кариес (СИЦ / SDR)",
			subtitleRu:
				"Препарирование, СИЦ Fuji IX / SDR / Twinky Star, Bifluorid 12",
			diagnosisIcd10: "K02.1",
			diagnosisNameRu: "Кариес дентина временного зуба (K02.1)",
			serviceCode804n: "A16.07.002.001",
			serviceName804n:
				"Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров / СИЦ",
			defaultSurfaces: ["O"],
			allowsSurfaces: true,
			materials: [
				"СИЦ Fuji IX (GC)",
				"Twinky Star (цветной компомер VOCO)",
				"SDR Flow + Filtek Ultimate",
				"Ketac Molar Easymix (3M)",
			],
			defaultMaterial: "СИЦ Fuji IX (GC)",
			defaultToothFindingState: "Filled",
			icon: Sparkles,
			colorTheme:
				"border-teal-500 bg-teal-50/90 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100",
		},
		{
			id: "pulpotomy_primary",
			titleRu: "Витальная пульпотомия временного зуба",
			shortLabelRu: "Пульпотомия (Pulpotec)",
			subtitleRu: "Ампутация пульпы, гемостаз H2O2, Pulpotec / Biodentine, ЦОЭ",
			diagnosisIcd10: "K04.0",
			diagnosisNameRu: "Пульпит временного зуба обратимый (K04.0)",
			serviceCode804n: "A16.07.030.001",
			serviceName804n:
				"Пульпотомия (ампутация коронковой пульпы временного зуба)",
			defaultSurfaces: ["O"],
			allowsSurfaces: true,
			materials: [
				"Pulpotec (Septodont)",
				"Biodentine (Septodont)",
				"MTA ProRoot (Dentsply)",
			],
			defaultMaterial: "Pulpotec (Septodont)",
			defaultToothFindingState: "EndoTreated",
			icon: Activity,
			colorTheme:
				"border-rose-500 bg-rose-50/90 text-rose-950 dark:border-rose-400 dark:bg-rose-950/60 dark:text-rose-100",
		},
		{
			id: "silvering_deep_fluoridation",
			titleRu: "Серебрение / глубокое фторирование",
			shortLabelRu: "Серебрение / Фтор",
			subtitleRu: "Сафорайд 38% / Gluftored / Tiefenfluorid, микробраш, сушка",
			diagnosisIcd10: "K02.0",
			diagnosisNameRu: "Кариес эмали / стадия пятна (K02.0)",
			serviceCode804n: "A11.07.012",
			serviceName804n:
				"Глубокое фторирование твердых тканей зубов / серебрение временных зубов",
			defaultSurfaces: ["V"],
			allowsSurfaces: false,
			materials: [
				"Сафорайд 38% (Saforide)",
				"Глуфторед (Gluftored)",
				"Тифенфлюорид (Tiefenfluorid)",
				"Аргенат 30%",
			],
			defaultMaterial: "Сафорайд 38% (Saforide)",
			defaultToothFindingState: "Watch",
			icon: Droplets,
			colorTheme:
				"border-purple-500 bg-purple-50/90 text-purple-950 dark:border-purple-400 dark:bg-purple-950/60 dark:text-purple-100",
		},
		{
			id: "fissure_sealing",
			titleRu: "Герметизация фиссур молочных/постоянных моляров",
			shortLabelRu: "Герметизация (Fissurit)",
			subtitleRu:
				"Неинвазивная Fissurit FX / Helioseal, протравливание, полимеризация",
			diagnosisIcd10: "K02.0",
			diagnosisNameRu: "Профилактика кариеса ямок и фиссур (K02.0 / Z29.8)",
			serviceCode804n: "A16.07.057",
			serviceName804n:
				"Запечатывание фиссуры зуба герметиком (Fissurit FX / Helioseal)",
			defaultSurfaces: ["O"],
			allowsSurfaces: false,
			materials: [
				"Fissurit FX (VOCO)",
				"Helioseal F (Ivoclar)",
				"Clinpro Sealant (3M)",
			],
			defaultMaterial: "Fissurit FX (VOCO)",
			defaultToothFindingState: "Healthy",
			icon: ShieldCheck,
			colorTheme:
				"border-sky-500 bg-sky-50/90 text-sky-950 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-100",
		},
		{
			id: "extraction_primary_exfoliation",
			titleRu: "Удаление молочного зуба при физиологической смене",
			shortLabelRu: "Удаление (смена корней)",
			subtitleRu: "Аппликационный гель (вишня), детские щипцы, марлевый тампон",
			diagnosisIcd10: "K08.8",
			diagnosisNameRu:
				"Физиологическая резорбция корней временного зуба (K08.8)",
			serviceCode804n: "A16.07.001.001",
			serviceName804n: "Удаление временного зуба при физиологической смене",
			defaultSurfaces: [],
			allowsSurfaces: false,
			materials: [
				"Аппликационный гель Дисилан / Лидоксор (вишня)",
				"Инфильтрация Артикаин 1:200 000 (по показаниям)",
			],
			defaultMaterial: "Аппликационный гель Дисилан / Лидоксор (вишня)",
			defaultToothFindingState: "Extracted",
			icon: Scissors,
			colorTheme:
				"border-indigo-500 bg-indigo-50/90 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-100",
		},
		{
			id: "standard_crown",
			titleRu: "Восстановление стандартной защитной коронкой",
			shortLabelRu: "Коронка (Hall / SSC)",
			subtitleRu: "Металл / Цирконий, методика Hall, СИЦ Fuji Plus / Ketac Cem",
			diagnosisIcd10: "K02.1",
			diagnosisNameRu:
				"Кариес дентина / разрушение коронки временного моляра (K02.1 / K04.0)",
			serviceCode804n: "A16.07.004.001",
			serviceName804n:
				"Восстановление зуба стандартной защитной коронкой (металл / цирконий, методика Hall)",
			defaultSurfaces: ["O"],
			allowsSurfaces: false,
			materials: [
				"Стандартная стальная коронка SSC (3M ESPE)",
				"Циркониевая коронка NuSmile ZR",
				"Коронка Kids-e-Crown",
				"СИЦ Fuji Plus (GC фиксация)",
				"Ketac Cem Easymix (3M)",
			],
			defaultMaterial: "Стандартная стальная коронка SSC (3M ESPE)",
			defaultToothFindingState: "Crown",
			icon: ShieldCheck,
			colorTheme:
				"border-amber-500 bg-amber-50/90 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100",
		},
	];

// ─────────────────────────────────────────────────────────────────────────────
// ANATOMICAL FDI NAMES & FAST PRESET COMBINATIONS
// ─────────────────────────────────────────────────────────────────────────────

const PEDIATRIC_TEETH_NAMES: Readonly<Record<number, string>> = {
	51: "Верхний правый центральный резец",
	52: "Верхний правый боковой резец",
	53: "Верхний правый клык",
	54: "Верхний правый первый моляр",
	55: "Верхний правый второй моляр",
	61: "Верхний левый центральный резец",
	62: "Верхний левый боковой резец",
	63: "Верхний левый клык",
	64: "Верхний левый первый моляр",
	65: "Верхний левый второй моляр",
	71: "Нижний левый центральный резец",
	72: "Нижний левый боковой резец",
	73: "Нижний левый клык",
	74: "Нижний левый первый моляр",
	75: "Нижний левый второй моляр",
	81: "Нижний правый центральный резец",
	82: "Нижний правый боковой резец",
	83: "Нижний правый клык",
	84: "Нижний правый первый моляр",
	85: "Нижний правый второй моляр",
	16: "Верхний правый первый постоянный моляр",
	26: "Верхний левый первый постоянный моляр",
	36: "Нижний левый первый постоянный моляр",
	46: "Нижний правый первый постоянный моляр",
};

export const PEDIATRIC_SURFACE_PRESETS = [
	{
		id: "mod",
		labelRu: "MOD",
		surfaces: ["M", "O", "D"],
		descriptionRu: "Медиально-окклюзионно-дистальная",
	},
	{
		id: "mo",
		labelRu: "MO",
		surfaces: ["M", "O"],
		descriptionRu: "Медиально-окклюзионная",
	},
	{
		id: "od",
		labelRu: "OD",
		surfaces: ["O", "D"],
		descriptionRu: "Окклюзионно-дистальная",
	},
	{ id: "o", labelRu: "O", surfaces: ["O"], descriptionRu: "Окклюзионная" },
	{
		id: "v",
		labelRu: "V",
		surfaces: ["V"],
		descriptionRu: "Вестибулярная / пришеечная",
	},
	{
		id: "lp",
		labelRu: "L/P",
		surfaces: ["L"],
		descriptionRu: "Оральная (язычная/небная)",
	},
] as const;

export const QUICK_PEDIATRIC_TEETH = [
	54, 55, 64, 65, 74, 75, 84, 85, 51, 61, 16, 26, 36, 46,
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// PROPS & COMPONENT IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

export interface VisitPediatricProtocolWidgetProps {
	/** Активный номер зуба по FDI (по умолчанию 54) */
	readonly activeTooth?: number | null;
	/** Выбранные поверхности зуба */
	readonly activeSurfaces?: readonly string[] | undefined;
	/** Обработчик смены поверхностей */
	readonly onSelectSurfaces?: (surfaces: readonly string[]) => void;
	/** Обработчик прямой вставки текста протокола в дневник визита */
	readonly onApplyProtocolText?: (text: string) => void;
	/** Обработчик добавления услуг в смету/наряд */
	readonly onAddToInvoice?: (services: readonly PediatricServiceItem[]) => void;
	/** Начальный рейтинг по шкале Франкла (по умолчанию 3) */
	readonly initialFranklRating?: FranklRating | undefined;
	/** Обработчик смены рейтинга Франкла */
	readonly onFranklChange?: (rating: FranklRating) => void;
	/** Имя юного пациента */
	readonly patientName?: string | undefined;
	/** Телефон пациента / представителя для отправки памятки */
	readonly patientPhone?: string | undefined;
	/** Возраст пациента в годах */
	readonly patientAgeYears?: number | undefined;
	/** ФИО врача */
	readonly doctorName?: string | undefined;
	/** Название клиники */
	readonly clinicName?: string | undefined;
	/** Дополнительный CSS-класс контейнера */
	readonly className?: string;
}

export const VisitPediatricProtocolWidget: React.FC<
	VisitPediatricProtocolWidgetProps
> = ({
	activeTooth = 54,
	activeSurfaces,
	onSelectSurfaces,
	onApplyProtocolText,
	onAddToInvoice,
	initialFranklRating = 3,
	onFranklChange,
	patientName = "Юный пациент",
	patientPhone,
	patientAgeYears = 6,
	doctorName = "Детский врач-стоматолог",
	clinicName = "Детское отделение DENTE",
	className = "",
}) => {
	// 1. Санитизация активного зуба (по умолчанию 54)
	const effectiveTooth = useMemo<number>(() => {
		if (activeTooth && activeTooth >= 11 && activeTooth <= 85)
			return activeTooth;
		return 54;
	}, [activeTooth]);

	const anatomicalToothName = useMemo<string>(() => {
		return PEDIATRIC_TEETH_NAMES[effectiveTooth] ?? `Зуб ${effectiveTooth}`;
	}, [effectiveTooth]);

	// 2. Локальное состояние активного зуба для быстрого переключения в виджете
	const [currentTooth, setCurrentTooth] = useState<number>(effectiveTooth);

	useEffect(() => {
		setCurrentTooth(effectiveTooth);
	}, [effectiveTooth]);

	// 3. Активный пресет клинического протокола
	const [activePresetId, setActivePresetId] =
		useState<PediatricProtocolId>("caries_primary");

	const activePreset = useMemo<PediatricProtocolDefinition>(() => {
		return (
			PEDIATRIC_PROTOCOL_PRESETS.find((p) => p.id === activePresetId) ??
			(PEDIATRIC_PROTOCOL_PRESETS[0] as PediatricProtocolDefinition)
		);
	}, [activePresetId]);

	// 4. Шкала Франкла
	const [franklRating, setFranklRating] =
		useState<FranklRating>(initialFranklRating);

	const activeFrankl = useMemo<FranklExpressItem>(() => {
		return (
			FRANKL_EXPRESS_ITEMS.find((f) => f.rating === franklRating) ??
			(FRANKL_EXPRESS_ITEMS[2] as FranklExpressItem)
		);
	}, [franklRating]);

	const handleSelectFrankl = useCallback(
		(rating: FranklRating) => {
			setFranklRating(rating);
			onFranklChange?.(rating);
			const item = FRANKL_EXPRESS_ITEMS.find((f) => f.rating === rating);
			if (item) {
				showToast(`Шкала Франкла: ${item.titleRu}`, "info", 2000);
			}
		},
		[onFranklChange],
	);

	// 5. Выбранные поверхности зуба
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() => {
		if (activeSurfaces && activeSurfaces.length > 0) return [...activeSurfaces];
		return ["O"];
	});

	// Синхронизация поверхностей при внешнем обновлении
	useEffect(() => {
		if (activeSurfaces && activeSurfaces.length > 0) {
			setSelectedSurfaces([...activeSurfaces]);
		}
	}, [activeSurfaces]);

	const toggleSurface = useCallback(
		(surf: string) => {
			setSelectedSurfaces((prev) => {
				const next = prev.includes(surf)
					? prev.filter((s) => s !== surf)
					: [...prev, surf];
				const sanitized = next.length > 0 ? next : ["O"];
				onSelectSurfaces?.(sanitized);
				return sanitized;
			});
		},
		[onSelectSurfaces],
	);

	const handleApplySurfacePreset = useCallback(
		(surfs: readonly string[]) => {
			const next = [...surfs];
			setSelectedSurfaces(next);
			onSelectSurfaces?.(next);
		},
		[onSelectSurfaces],
	);

	// 6. Выбранный материал
	const [selectedMaterial, setSelectedMaterial] = useState<string>(
		activePreset.defaultMaterial,
	);

	const handleSelectPreset = useCallback(
		(preset: PediatricProtocolDefinition) => {
			setActivePresetId(preset.id);
			setSelectedMaterial(preset.defaultMaterial);
			if (preset.defaultSurfaces.length > 0) {
				setSelectedSurfaces([...preset.defaultSurfaces]);
				onSelectSurfaces?.([...preset.defaultSurfaces]);
			}
			showToast(`1-клик протокол: «${preset.titleRu}»`, "info", 2000);
		},
		[onSelectSurfaces],
	);

	// 7. Детали и спойлер параметров
	const [showDetailsAccordion, setShowDetailsAccordion] =
		useState<boolean>(false);
	const [isMemoModalOpen, setIsMemoModalOpen] = useState<boolean>(false);

	// 8b. Ортодонтический статус первичного осмотра (норма по умолчанию согласно Мандату 8e)
	const [orthoFrenulumNormal, setOrthoFrenulumNormal] = useState<boolean>(true);
	const [orthoNasalBreathing, setOrthoNasalBreathing] = useState<boolean>(true);
	const [orthoNoHarmfulHabits, setOrthoNoHarmfulHabits] = useState<boolean>(true);

	// 9. Формирование полного текста протокола по Форме 043/у и Номенклатуре 804н
	const clinicalCalculation = useMemo(() => {
		const surfacesStr = selectedSurfaces.join(", ") || "O";
		const diagnosisIcd10 = activePreset.diagnosisIcd10;
		const diagnosisNameRu = activePreset.diagnosisNameRu;
		let statusLocalis = "";
		let treatmentDescription = "";
		let recommendations = "";
		const services: PediatricServiceItem[] = [
			{
				code: activePreset.serviceCode804n,
				nameRu: activePreset.serviceName804n,
			},
		];

		switch (activePresetId) {
			case "caries_primary": {
				statusLocalis = `Временный зуб ${currentTooth}: на поверхностях (${surfacesStr}) обнаружена кариозная полость средней глубины в пределах дентина, выполненная размягченным пигментированным дентином. Зондирование стенок и дна полости слабо чувствительно по эмалево-дентинной границе, реакция на холод безболезненная, перкуссия отрицательная. Слизистая десны в области зуба бледно-розовая, без признаков воспаления.`;
				treatmentDescription = `Очищение окклюзионных и контактных поверхностей зуба ${currentTooth} щеточкой с бесфтористой пастой. Изоляция рабочего поля ватными валиками. Препарирование кариозной полости, бережная некрэктомия в пределах здорового дентина. Антисептическая обработка 0.05% раствором хлоргексидина. Кондиционирование дентина. Пломбирование кариозной полости материалом: ${selectedMaterial}. Моделирование анатомической формы коронки зуба, фотополимеризация. Шлифовка и финишная полировка. Защитное покрытие препаратом Bifluorid 12.`;
				recommendations = `Не принимать пищу в течение 1 часа после постановки пломбы. Контролируемая чистка зубов 2 раза в день под наблюдением родителей мягкой детской щеткой с пастой (1000 ppm F-). Профилактический осмотр через 4 месяца.`;
				services.push({
					code: "A11.07.012",
					nameRu:
						"Глубокое фторирование эмали / покрытие защитным лаком Bifluorid 12",
				});
				break;
			}
			case "pulpotomy_primary": {
				statusLocalis = `Временный зуб ${currentTooth}: глубокая кариозная полость, точечное сообщение со сводом полости зуба. Зондирование устьев корневых каналов слабо болезненно, пульпа ярко-красного цвета, умеренно кровоточит. Перкуссия зуба безболезненная. Рентгенологически: физиологическая резорбция корней не превышает 1/3 длины, периодонтальная щель не изменена.`;
				treatmentDescription = `Аппликационная анестезия гелем со вкусом вишни. Инфильтрационная анестезия раствором Артикаин 4% 1:200 000 (0.6 мл с контролем предельно допустимой дозы на вес ребенка). Изоляция рабочего поля. Препарирование кариозной полости зуба ${currentTooth}, полное раскрытие свода. Ампутация коронковой пульпы стерильным шаровидным бором на низкой скорости до устьев корневых каналов. Гемостаз стерильным ватным тампоном с 3% раствором H2O2 / физраствором в течение 1.5–2 минут до полной остановки кровотечения. На устья каналов нанесена лечебная паста ${selectedMaterial}. Наложена изолирующая подкладка из цинк-оксид-эвгенольного цемента. Герметичная реставрация коронковой части зуба.`;
				recommendations = `КРИТИЧЕСКИ ВАЖНО: Контролировать ребенка в течение 2–3 часов до окончания онемения (риск тяжелого прикусывания губы, щеки или языка!). Исключить твердую и горячую пищу сегодня. При возникновении болевых ощущений — детская суспензия Ибупрофен 10 мг/кг. Контрольный рентгеновский снимок через 6 месяцев.`;
				services.push({
					code: "A16.07.002.001",
					nameRu:
						"Восстановление зуба пломбой после эндодонтического лечения (СИЦ)",
				});
				services.push({
					code: "B01.003.004.004",
					nameRu:
						"Анестезиологическое пособие (аппликационная + инфильтрационная анестезия)",
				});
				break;
			}
			case "silvering_deep_fluoridation": {
				statusLocalis = `Временный зуб ${currentTooth}: в пришеечной области определяются очаги деминерализации эмали в виде меловидных и светло-коричневых шероховатых пятен. Поверхность шероховата при зондировании, зондирование безболезненное, реакция на холод отсутствует, перкуссия отрицательна.`;
				treatmentDescription = `Механическая очистка зуба ${currentTooth} циркулярной щеточкой без фтора. Тщательная изоляция операционного поля ватными валиками, высушивание струей теплого воздуха. Точечное нанесение раствора препарата ${selectedMaterial} микробрашем на кариозные участки эмали, экспозиция 2 минуты. Удаление излишков сухим тампоном, контрольная сушка. Родители предупреждены о стойком темном окрашивании очагов деминерализации.`;
				recommendations = `Не кормить и не поить ребенка в течение 60 минут после процедуры. Родители предупреждены о стабилизации кариеса и темном окрашивании очагов поражения. Продолжать домашнюю гигиену пастой с фтором 1000 ppm. Повторный курс аппликации через 4–6 месяцев.`;
				break;
			}
			case "fissure_sealing": {
				statusLocalis = `Зуб ${currentTooth}: окклюзионные фиссуры и слепые ямки анатомически глубокие, интактные, без признаков деминерализации и кариозного распада. Зондирование безболезненное, зонд в фиссурах не задерживается, перкуссия отрицательна.`;
				treatmentDescription = `Профессиональная очистка окклюзионных поверхностей зуба ${currentTooth} циркулярной щеточкой с бесфтористой пастой. Тщательная изоляция ватными валиками и слюноотсосом, высушивание воздухом. Кислотное протравливание эмали 37% ортофосфорной кислотой в течение 25 секунд. Смывание струей воды, бережное высушивание до матовой белизны. Внесение светоотверждаемого герметика ${selectedMaterial} зондом в фиссуры и слепые ямки. Фотополимеризация 20 секунд. Контроль окклюзии артикуляционной бумагой, пришлифовка контактов, финишная полировка.`;
				recommendations = `Исключить употребление жестких орехов, леденцов и тягучих ирисок на 2 часа. Соблюдать гигиену окклюзионных поверхностей. Контрольный осмотр сохранности герметика через 6 месяцев.`;
				break;
			}
			case "extraction_primary_exfoliation": {
				const isMolar = [54, 55, 64, 65, 74, 75, 84, 85].includes(currentTooth);
				statusLocalis = `Временный зуб ${currentTooth}: подвижность II–III степени во всех направлениях вследствие физиологической резорбции корня более 3/4 длины. Коронка устойчиво удерживается лишь на десневой манжетке. Рентгенологически: зачаток постоянного зуба расположен непосредственно под временным, кортикальная пластинка зачатка сохранена. Десна вокруг шейки умеренно гиперемирована.`;
				treatmentDescription = `Оценка степени подвижности зуба ${currentTooth}. Аппликационная анестезия слизистой оболочки десны с вестибулярной и оральной сторон гелем со вкусом вишни (${selectedMaterial}). Наложение детских щипцов на коронку временного зуба, аккуратная люксация и плавная тракция без давления на зачаток постоянного зуба. Экстракция зуба. Кюретаж лунки не проводился для защиты зачатка. Гемостаз марлевым стерильным тампоном с прикусыванием на 15 минут. Кровотечение полностью остановлено, сформирован состоятельный кровяной сгусток. Удаленный зубик вручен ребенку в контейнере для Зубной Феи.`;
				const orthoRecommendation = isMolar
					? " Консультация ортодонта: Рекомендовано изготовление несъемного держателя места (кольцо-петля, A16.07.047) во избежание мезиального смещения зачатка моляра."
					: "";
				recommendations = `Держать марлевый тампон 15–20 минут, затем бережно выплюнуть. Категорически запрещено полоскать рот и травмировать лунку пальцами или языком. Не принимать горячую пищу и напитки 2 часа. При ноющем дискомфорте — детская суспензия Парацетамол/Ибупрофен по возрасту.${orthoRecommendation}`;
				services.push({
					code: "B01.003.004.004",
					nameRu: "Аппликационная анестезия слизистой оболочки десны (вишня)",
				});
				if (isMolar) {
					services.push({
						code: "A16.07.047",
						nameRu:
							"Ортодонтическая коррекция с применением несъемного держателя места (кольцо-петля)",
					});
				}
				break;
			}
			case "standard_crown": {
				statusLocalis = `Временный моляр ${currentTooth}: обширный дефект твердых тканей коронки зуба, разрушение окклюзионной и контактных поверхностей более 1/2 объема (после эндодонтического лечения / декомпенсированный кариес дентина). Тонкие истонченные стенки, риск скола коронки. Перкуссия зуба безболезненная, десна в области зуба бледно-розовая.`;
				treatmentDescription = `Подбор стандартной защитной коронки (${selectedMaterial}) соответствующего типоразмера по мезио-дистальному диаметру зуба ${currentTooth}. Сепарация контактных поверхностей алмазным бором (при необходимости) / фиксация по методике Hall без инвазивного сошлифовывания и местной анестезии. Антисептическая обработка зуба 0.05% раствором хлоргексидина, высушивание. Замешивание фиксирующего стеклоиономерного цемента. Заполнение коронки цементом на 2/3 объема, точное позиционирование на зубе ${currentTooth}, припасовка с накусыванием ватного валика ребенком. Удаление излишков цемента гладилкой и флоссом из межзубных промежутков после застывания. Контроль окклюзионных взаимоотношений.`;
				recommendations = `Не жевать твердую пищу (орехи, сухарики, ириски) и не употреблять пищу в течение 1 часа до окончательной кристаллизации цемента. Тщательная домашняя гигиена в пришеечной области коронки. Контрольный осмотр через 6 месяцев.`;
				break;
			}
		}

		const fullProtocolText043 = [
			"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)",
			"────────────────────────────────────────────────────────────",
			`1. Психоэмоциональный статус (Шкала Франкла): Рейтинг ${activeFrankl.rating} (${activeFrankl.symbol}) — ${activeFrankl.titleRu}`,
			`   Поведение: ${activeFrankl.descriptionRu}`,
			`   Тактика адаптации: ${activeFrankl.clinicalTacticRu}`,
			"",
			"2. Первичный осмотр и ортодонтический скрининг:",
			`   • Уздечки губ и языка: ${orthoFrenulumNormal ? "норма (анатомически правильное прикрепление)" : "патология прикрепления (требуется консультация ортодонта/хирурга)"}`,
			`   • Носовое дыхание: ${orthoNasalBreathing ? "сохранено (свободное через нос)" : "нарушено (ротовое дыхание)"}`,
			`   • Вредные привычки: ${orthoNoHarmfulHabits ? "отсутствуют" : "выявлены (сосание пальца/губы/предметов, инфантильное глотание)"}`,
			"",
			`3. Объект вмешательства: Зуб #${currentTooth} (${PEDIATRIC_TEETH_NAMES[currentTooth] ?? `Зуб ${currentTooth}`})`,
			`   Диагноз (МКБ-10): ${diagnosisIcd10} — ${diagnosisNameRu}`,
			`   Услуги (Номенклатура 804н): ${services.map((s) => `${s.code} ${s.nameRu}`).join("; ")}`,
			"",
			"4. Status localis:",
			`   ${statusLocalis}`,
			"",
			"5. Протокол вмешательства и манипуляции:",
			`   ${treatmentDescription}`,
			"",
			"6. Назначения и рекомендации родителям:",
			`   ${recommendations}`,
			"────────────────────────────────────────────────────────────",
			"Документ оформлен в соответствии с Приказами МЗ РФ №804н и №834н.",
		].join("\n");

		return {
			diagnosisIcd10,
			diagnosisNameRu,
			statusLocalis,
			treatmentDescription,
			recommendations,
			services804n: services,
			fullProtocolText043,
			toothFindingState: activePreset.defaultToothFindingState,
		};
	}, [
		activePreset,
		activePresetId,
		currentTooth,
		selectedSurfaces,
		selectedMaterial,
		activeFrankl,
		orthoFrenulumNormal,
		orthoNasalBreathing,
		orthoNoHarmfulHabits,
	]);

	// 10. Внесение в Форму 043/у (Двойной диспатч: useVisitStore + CustomEvent dente-apply-soap-protocol)
	const handleInsertToForm043 = useCallback(() => {
		const textToApply = clinicalCalculation.fullProtocolText043;

		// 1. Прямой коллбек родителя
		onApplyProtocolText?.(textToApply);

		// 2. Хранилище useVisitStore
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing
						? `${existing}\n\n${textToApply}`
						: textToApply,
				};
			});
		} catch (err) {
			console.warn("useVisitStore update fallback:", err);
		}

		// 3. Глобальный CustomEvent dente-apply-soap-protocol
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: clinicalCalculation.diagnosisIcd10,
							treatmentDescription: clinicalCalculation.treatmentDescription,
							statusLocalis: clinicalCalculation.statusLocalis,
							recommendations: clinicalCalculation.recommendations,
						},
						finding: {
							toothNumber: currentTooth,
							state: clinicalCalculation.toothFindingState,
							surfaces: [...selectedSurfaces],
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-apply-soap-protocol dispatch fallback:", err);
		}

		showToast(
			`Детский протокол зуба ${currentTooth} внесен в Форму 043/у`,
			"success",
			3000,
		);
	}, [
		clinicalCalculation,
		currentTooth,
		selectedSurfaces,
		onApplyProtocolText,
	]);

	// 11. Добавление услуг в смету (CustomEvent dente-add-services-to-invoice)
	const handleAddServicesToInvoice = useCallback(() => {
		onAddToInvoice?.(clinicalCalculation.services804n);

		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: currentTooth,
						services: clinicalCalculation.services804n,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch fallback:", err);
		}

		const codes = clinicalCalculation.services804n
			.map((s) => s.code)
			.join(", ");
		showToast(
			`Услуги по коду 804н добавлены в смету (${codes})`,
			"success",
			2500,
		);
	}, [clinicalCalculation, currentTooth, onAddToInvoice]);

	// 12. 1-Клик физиологическая норма временного прикуса (Мандат 8e)
	const handleApplyPhysiologicalNorm = useCallback(() => {
		setFranklRating(4);
		onFranklChange?.(4);
		setOrthoFrenulumNormal(true);
		setOrthoNasalBreathing(true);
		setOrthoNoHarmfulHabits(true);

		const fullText = [
			"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)",
			"────────────────────────────────────────────────────────────",
			"1. Психоэмоциональный статус (Шкала Франкла): Рейтинг 4 (++) — 4 (++) Определенно позитивное",
			"   Поведение: Восторжен, искренний интерес, улыбка, абсолютное доверие",
			"   Тактика адаптации: Партнерство, обучение самостоятельной чистке зубов, диплом храброго пациента",
			"",
			"2. Первичный осмотр и ортодонтический скрининг:",
			"   • Уздечки губ и языка: норма (анатомически правильное прикрепление)",
			"   • Носовое дыхание: сохранено (свободное через нос)",
			"   • Вредные привычки: отсутствуют",
			"",
			"3. Объект осмотра: Временный прикус (зубы 51..85)",
			`   Диагноз (МКБ-10): ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.diagnosisIcd10} — ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.diagnosisNameRu}`,
			`   Услуги (Номенклатура 804н): ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.serviceCode804n} ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.serviceName804n}`,
			"",
			"4. Status localis:",
			`   ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.statusLocalisRu}`,
			"",
			"5. Протокол профилактического приема:",
			`   ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.treatmentRu}`,
			"",
			"6. Назначения и рекомендации родителям:",
			`   ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.recommendationsRu}`,
			"────────────────────────────────────────────────────────────",
			"Документ оформлен в соответствии с Приказами МЗ РФ №804н и №834н.",
		].join("\n");

		onApplyProtocolText?.(fullText);

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${fullText}` : fullText,
				};
			});
		} catch (err) {
			console.warn("useVisitStore update fallback:", err);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.diagnosisIcd10,
							treatmentDescription: PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.treatmentRu,
							statusLocalis: PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.statusLocalisRu,
							recommendations: PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.recommendationsRu,
						},
						finding: {
							toothNumber: currentTooth,
							state: "Healthy",
							surfaces: [],
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-apply-soap-protocol dispatch fallback:", err);
		}

		showToast(
			"1-клик: Физиологическая норма временного прикуса (интактен, тремы, диастемы) внесена в 043/у!",
			"success",
			3500,
		);
	}, [currentTooth, onApplyProtocolText, onFranklChange]);

	// 12b. 1-Клик адаптационный визит без сверления (Мандаты 8e, 8k)
	const handleApplyAdaptationVisit = useCallback(() => {
		setFranklRating(3);
		onFranklChange?.(3);
		setOrthoFrenulumNormal(true);
		setOrthoNasalBreathing(true);
		setOrthoNoHarmfulHabits(true);

		const fullText = [
			"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)",
			"────────────────────────────────────────────────────────────",
			"1. Психоэмоциональный статус (Шкала Франкла): Рейтинг 3 (+) — 3 (+) Позитивное / контактен",
			"   Поведение: Контактен, сотрудничает, спокойно выполняет указания врача",
			"   Тактика адаптации: Tell-Show-Do, ознакомление в игровой форме («считаем зубки»), похвала",
			"",
			"2. Первичный осмотр и ортодонтический скрининг:",
			"   • Уздечки губ и языка: норма (анатомически правильное прикрепление)",
			"   • Носовое дыхание: сохранено (свободное через нос)",
			"   • Вредные привычки: отсутствуют",
			"",
			"3. Объект осмотра: Адаптационный приём без препарирования (зубы 51..85)",
			"   Диагноз (МКБ-10): Z01.2 — Стоматологическое обследование / адаптация к стоматологическому приему (Z01.2)",
			"   Услуги (Номенклатура 804н): A01.07.001 Прием (осмотр, консультация) врача-стоматолога детского первичный; A14.07.003 Обучение гигиене полости рта",
			"",
			"4. Status localis:",
			"   Временный прикус. Слизистая оболочка полости рта бледно-розовая, чистая, влажная. Состояние зубов удовлетворительное. Зубные ряды правильной формы. Окклюзионные взаимоотношения гармоничны.",
			"",
			"5. Протокол адаптационного приема (без сверления):",
			"   Психологическая адаптация по методике Tell-Show-Do («Расскажи-Покажи-Сделай»). Знакомство с кабинетом, игра «катание на волшебном кресле», демонстрация зеркала и пустера («ветерок»). Осмотр зубов в игровой форме («считаем зубки»). Щеточкой с бесфтористой пастой мягко очищены окклюзионные поверхности, проведена аппликация реминерализующего геля. Ребенок спокоен, контакт установлен, позитивное подкрепление (вручен диплом храброго пациента и подарок). Страх перед стоматологом отсутствует.",
			"",
			"6. Назначения и рекомендации родителям:",
			"   1. Поддерживать позитивное отношение к стоматологу дома (без пугающих фраз). 2. Чистка зубов 2 раза в день фторидной пастой (1000 ppm) под контролем родителей. 3. Повторный визит через 3–4 недели для планового осмотра / лечения.",
			"────────────────────────────────────────────────────────────",
			"Документ оформлен в соответствии с Приказами МЗ РФ №804н и №834н.",
		].join("\n");

		onApplyProtocolText?.(fullText);

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${fullText}` : fullText,
				};
			});
		} catch (err) {
			console.warn("useVisitStore update fallback:", err);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: "Z01.2",
							treatmentDescription:
								"Психологическая адаптация по методике Tell-Show-Do. Осмотр зубов в игровой форме («считаем зубки»). Очищение щеточкой с пастой, аппликация фторгеля. Ребенок спокоен, вручен подарок.",
							statusLocalis:
								"Временный прикус. Слизистая бледно-розовая, влажная. Осмотр в игровой форме.",
							recommendations:
								"Позитивное подкрепление. Домашняя гигиена с пастой 1000 ppm под контролем родителей. Повторный визит через 3-4 недели.",
						},
						finding: {
							toothNumber: currentTooth,
							state: "Healthy",
							surfaces: [],
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-apply-soap-protocol dispatch fallback:", err);
		}

		showToast(
			"1-клик: Адаптационный визит (Tell-Show-Do, игра, подарок, без сверления) внесен в 043/у!",
			"success",
			3500,
		);
	}, [currentTooth, onApplyProtocolText, onFranklChange]);

	return (
		<section
			aria-label="Канонический протокол детского приема 043/у"
			className={`pediatric-protocol-widget rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3.5 sm:p-5 shadow-xs transition ${className}`.trim()}
			data-testid="pediatric-protocol-widget"
		>
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ВЕРХНЯЯ ШАПКА: АКТИВНЫЙ ЗУБ + 1-КЛИК НОРМА + 1-КЛИК АДАПТАЦИЯ + ТАКТИКА ФРАНКЛА + КНОПКА ПАРАМЕТРОВ */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5 min-h-[36px]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
						<Baby className="h-4 w-4" />
					</div>
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted,#64748b)] hidden sm:inline shrink-0">
							Детский приём у кресла:
						</span>
						<span className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 dark:text-teal-300 shrink-0">
							Зуб {currentTooth}
						</span>
						<h2 className="text-xs sm:text-base font-extrabold text-[var(--ink,#0f172a)] truncate">
							{anatomicalToothName}
						</h2>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{/* 1-Клик физиологическая норма временного прикуса (Мандат 8e) */}
					<button
						type="button"
						onClick={handleApplyPhysiologicalNorm}
						className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0 touch-manipulation"
						title="1-клик: Временный прикус интактен / физиологическая стираемость / тремы и диастемы"
						data-testid="pediatric-one-click-norm-btn"
					>
						<Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="hidden sm:inline">1-клик Норма прикуса</span>
						<span className="sm:hidden">Норма</span>
					</button>

					{/* 1-Клик адаптационный визит без сверления (Мандаты 8e, 8k) */}
					<button
						type="button"
						onClick={handleApplyAdaptationVisit}
						className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200 hover:bg-sky-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0 touch-manipulation"
						title="1-клик: Адаптационный визит без сверления (Tell-Show-Do, игра, подарок)"
						data-testid="pediatric-one-click-adaptation-btn"
					>
						<Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
						<span className="hidden sm:inline">1-клик Адаптация</span>
						<span className="sm:hidden">Адаптация</span>
					</button>

					{/* Индикатор выбранного поведения по Франклу (1-клик смена) */}
					<button
						type="button"
						onClick={() => handleSelectFrankl(franklRating >= 4 ? 1 : ((franklRating + 1) as FranklRating))}
						className={`inline-flex min-h-[48px] sm:min-h-0 sm:h-8 items-center gap-1 rounded-lg border px-2 text-xs font-bold ${activeFrankl.badgeClass} shrink-0 cursor-pointer transition active:scale-95`}
						title={`Шкала Франкла: ${activeFrankl.titleRu}. Нажмите для быстрой смены`}
						data-testid="frankl-status-indicator"
					>
						<activeFrankl.icon className="h-3.5 w-3.5 shrink-0" />
						<span className="font-mono">Франкл {activeFrankl.symbol}</span>
					</button>

					{/* Кнопка спойлера расширенных параметров */}
					<button
						type="button"
						onClick={() => setShowDetailsAccordion((prev) => !prev)}
						className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] text-xs font-semibold transition flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation"
						title="Показать / скрыть подробности протокола"
						data-testid="pediatric-details-accordion-btn"
					>
						<span className="hidden md:inline">Параметры</span>
						{showDetailsAccordion ? (
							<ChevronUp className="h-3.5 w-3.5" />
						) : (
							<ChevronDown className="h-3.5 w-3.5" />
						)}
					</button>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ЭКСПРЕСС-СЕЛЕКТОР ШКАЛЫ ФРАНКЛА (1..4) (ЗАКОН ХИКА: 1 СТРОКА ТУЛБАРА 32–36px) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-4">
				<div className="mb-2 flex items-center justify-between gap-2 min-w-0">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] shrink-0">
						Шкала поведения Франкла (экспресс-выбор в 1 клик):
					</span>
					<span className="text-xs font-medium text-[var(--muted,#64748b)] truncate min-w-0">
						{activeFrankl.clinicalTacticRu}
					</span>
				</div>
				<div
					className="grid grid-cols-2 gap-2 sm:grid-cols-4"
					data-testid="frankl-express-grid"
				>
					{FRANKL_EXPRESS_ITEMS.map((item) => {
						const isCurrent = franklRating === item.rating;
						const ItemIcon = item.icon;
						return (
							<button
								key={item.rating}
								type="button"
								onClick={() => handleSelectFrankl(item.rating)}
								className={`flex min-h-[52px] sm:min-h-[36px] sm:h-9 max-h-none sm:max-h-9 items-center justify-between rounded-xl border px-2.5 py-1 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
									isCurrent
										? item.activeClass
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								title={`${item.titleRu}: ${item.descriptionRu}`}
								data-testid={`frankl-express-btn-${item.rating}`}
							>
								<div className="flex items-center gap-2 min-w-0">
									<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] shrink-0">
										<ItemIcon className="h-3.5 w-3.5" />
									</div>
									<div className="min-w-0">
										<div className="text-xs font-extrabold truncate font-mono">
											Рейтинг {item.symbol}
										</div>
										<div className="text-[10px] text-[var(--muted,#64748b)] truncate hidden sm:block">
											{item.rating === 1
												? "Негативное (--)"
												: item.rating === 2
													? "Насторожен (-)"
													: item.rating === 3
														? "Позитивное (+)"
														: "Партнерство (++)"}
										</div>
									</div>
								</div>
								{isCurrent && (
									<Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 ml-1" />
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* 6 КАНОНИЧЕСКИХ 1-КЛИК ПРОТОКОЛОВ (ФОРМА 043/у + НОМЕНКЛАТУРА 804н) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-4">
				<div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					1-Клик клинические протоколы у кресла:
				</div>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					{PEDIATRIC_PROTOCOL_PRESETS.map((preset) => {
						const isCurrent = activePresetId === preset.id;
						const PresetIcon = preset.icon;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleSelectPreset(preset)}
								className={`flex min-h-[52px] flex-col justify-center rounded-xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
									isCurrent
										? `${preset.colorTheme} shadow-sm ring-2 ring-teal-500/20`
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`pediatric-preset-btn-${preset.id}`}
								title={`${preset.titleRu} • ${preset.serviceCode804n}`}
							>
								<div className="flex items-center gap-1.5 font-bold text-xs">
									<PresetIcon className="h-4 w-4 shrink-0" />
									<span className="truncate">{preset.shortLabelRu}</span>
								</div>
								<div className="mt-0.5 text-[11px] text-[var(--muted,#64748b)] truncate">
									{preset.subtitleRu}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ПЕРВИЧНЫЙ ОСМОТР: ЧЕКБОКСЫ ОРТОДОНТИЧЕСКОЙ НОРМЫ (НОРМА В 1 КЛИК, ТАЧ-ТАРГЕТЫ >= 48px) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)]">
						Первичный осмотр — ортодонтическая норма (СтАР):
					</span>
					<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
						{orthoFrenulumNormal && orthoNasalBreathing && orthoNoHarmfulHabits
							? "Физиологическая норма (100%)"
							: "Выявлены отклонения / требуется консультация ортодонта"}
					</span>
				</div>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="pediatric-ortho-norm-grid">
					<button
						type="button"
						onClick={() => setOrthoFrenulumNormal((prev) => !prev)}
						className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
							orthoFrenulumNormal
								? "border-teal-500 bg-teal-50/80 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-1 ring-teal-500/20"
								: "border-amber-400 bg-amber-50/80 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100 ring-1 ring-amber-500/20"
						}`}
						title="Анатомическое прикрепление уздечек губ и языка"
						data-testid="pediatric-ortho-frenulum-toggle"
					>
						<div className="min-w-0 pr-1">
							<div className="text-xs font-bold truncate">Уздечки губ и языка</div>
							<div className="text-[11px] opacity-80 truncate">
								{orthoFrenulumNormal ? "Норма прикрепления" : "Патология / укорочение"}
							</div>
						</div>
						{orthoFrenulumNormal ? (
							<Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
						) : (
							<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
								Аномалия
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setOrthoNasalBreathing((prev) => !prev)}
						className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
							orthoNasalBreathing
								? "border-teal-500 bg-teal-50/80 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-1 ring-teal-500/20"
								: "border-amber-400 bg-amber-50/80 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100 ring-1 ring-amber-500/20"
						}`}
						title="Тип дыхания ребенка (носовое / ротовое)"
						data-testid="pediatric-ortho-breathing-toggle"
					>
						<div className="min-w-0 pr-1">
							<div className="text-xs font-bold truncate">Носовое дыхание</div>
							<div className="text-[11px] opacity-80 truncate">
								{orthoNasalBreathing ? "Свободное через нос" : "Ротовое дыхание"}
							</div>
						</div>
						{orthoNasalBreathing ? (
							<Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
						) : (
							<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
								Нарушено
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setOrthoNoHarmfulHabits((prev) => !prev)}
						className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
							orthoNoHarmfulHabits
								? "border-teal-500 bg-teal-50/80 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-1 ring-teal-500/20"
								: "border-amber-400 bg-amber-50/80 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100 ring-1 ring-amber-500/20"
						}`}
						title="Вредные привычки: сосание пальца, соски, посторонних предметов"
						data-testid="pediatric-ortho-habits-toggle"
					>
						<div className="min-w-0 pr-1">
							<div className="text-xs font-bold truncate">Вредные привычки</div>
							<div className="text-[11px] opacity-80 truncate">
								{orthoNoHarmfulHabits ? "Отсутствуют (норма)" : "Выявлены (палец/соска)"}
							</div>
						</div>
						{orthoNoHarmfulHabits ? (
							<Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
						) : (
							<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
								Выявлены
							</span>
						)}
					</button>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ПОВЕРХНОСТИ ЗУБА (ДЛЯ КАРИЕСА И ПУЛЬПОТОМИИ, ТАЧ-ТАРГЕТЫ >= 48px) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{activePreset.allowsSurfaces && (
				<div className="mb-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Поверхности зуба в 1 клик:
						</span>
						<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
							[{selectedSurfaces.join(", ") || "O"}]
						</span>
					</div>

					{/* Быстрые комбинации */}
					<div className="mb-2 flex flex-wrap gap-1.5">
						{PEDIATRIC_SURFACE_PRESETS.map((preset) => {
							const isMatch =
								preset.surfaces.length === selectedSurfaces.length &&
								preset.surfaces.every((s) => selectedSurfaces.includes(s));
							return (
								<button
									key={preset.id}
									type="button"
									onClick={() => handleApplySurfacePreset(preset.surfaces)}
									className={`min-h-[48px] px-3 rounded-xl text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
										isMatch
											? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									title={preset.descriptionRu}
									data-testid={`pediatric-surf-preset-${preset.id}`}
								>
									[{preset.labelRu}]
								</button>
							);
						})}
					</div>

					{/* По отдельности */}
					<div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line,#e2e8f0)] pt-2">
						<span className="text-[11px] text-[var(--muted,#64748b)] mr-1">
							По отдельности:
						</span>
						{(["O", "V", "L", "M", "D"] as const).map((surf) => {
							const isActive = selectedSurfaces.includes(surf);
							return (
								<button
									key={surf}
									type="button"
									onClick={() => toggleSurface(surf)}
									className={`min-h-[48px] min-w-[48px] px-2.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
										isActive
											? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									title={`Поверхность ${surf}`}
									data-testid={`pediatric-surf-btn-${surf}`}
								>
									{surf}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ВЫБОР ПРЕПАРАТА / МАТЕРИАЛА ПРОТОКОЛА (ТАЧ-ТАРГЕТЫ >= 48px) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-4">
				<div className="mb-1.5 flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Препарат / Материал протокола:
					</span>
					<span className="text-xs font-semibold text-[var(--muted,#64748b)] truncate">
						{selectedMaterial}
					</span>
				</div>
				<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
					{activePreset.materials.map((mat) => {
						const isSelected = selectedMaterial === mat;
						return (
							<button
								key={mat}
								type="button"
								onClick={() => setSelectedMaterial(mat)}
								className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-medium border text-left transition truncate cursor-pointer flex items-center justify-between gap-2 ${
									isSelected
										? "border-teal-600 bg-teal-50 font-bold text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-200 ring-1 ring-teal-500/20"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`pediatric-material-btn-${mat.replace(/\s+/g, "_")}`}
							>
								<span className="truncate">{mat}</span>
								{isSelected && (
									<Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* СПОЙЛЕР ДЕТАЛЕЙ (БЫСТРЫЙ ВЫБОР ЗУБА, ПРЕВЬЮ 043/у) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{showDetailsAccordion && (
				<div
					className="mb-4 space-y-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3.5"
					data-testid="pediatric-details-accordion-content"
				>
					{/* Быстрый выбор зуба */}
					<div>
						<div className="mb-1.5 block text-xs font-bold text-[var(--ink,#0f172a)]">
							Быстро сменить зуб FDI (молочные моляры / резцы / постоянные 16,
							26, 36, 46):
						</div>
						<div className="flex flex-wrap gap-1.5">
							{QUICK_PEDIATRIC_TEETH.map((t) => {
								const isSelected = currentTooth === t;
								return (
									<button
										key={t}
										type="button"
										onClick={() => {
											setCurrentTooth(t);
											showToast(
												`Выбран зуб #${t} (${PEDIATRIC_TEETH_NAMES[t] ?? t})`,
												"info",
												1500,
											);
										}}
										className={`min-h-[48px] min-w-[48px] px-2.5 rounded-xl font-mono text-xs font-bold border transition cursor-pointer select-none flex items-center justify-center ${
											isSelected
												? "bg-amber-600 text-white border-amber-600 shadow-xs scale-105"
												: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
										}`}
										data-testid={`pediatric-tooth-chip-${t}`}
									>
										{t}
									</button>
								);
							})}
						</div>
					</div>

					{/* Превью протокола Формы 043/у */}
					<div>
						<div className="mb-1 text-xs font-bold text-[var(--ink,#0f172a)]">
							Превью готовой записи Формы 043/у (автогенерация):
						</div>
						<pre className="max-h-48 overflow-y-auto rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 text-[11px] leading-relaxed text-[var(--ink,#0f172a)] font-mono whitespace-pre-wrap">
							{clinicalCalculation.fullProtocolText043}
						</pre>
					</div>
				</div>
			)}

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* НИЖНИЙ ПЛАНШЕТ ДЕЙСТВИЙ: 1-КЛИК В КАРТУ, В СМЕТУ, ПАМЯТКА РОДИТЕЛЯМ */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					{/* Кнопка 1-клик в 043/у */}
					<button
						type="button"
						onClick={handleInsertToForm043}
						className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-700 active:scale-95 cursor-pointer touch-manipulation"
						data-testid="pediatric-btn-apply-043"
					>
						<FileText className="h-4 w-4 shrink-0" />
						<span>Внести в 043/у</span>
					</button>

					{/* Кнопка 1-клик в смету */}
					<button
						type="button"
						onClick={handleAddServicesToInvoice}
						className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs sm:text-sm font-extrabold text-teal-800 transition hover:bg-teal-100 active:scale-95 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 cursor-pointer touch-manipulation"
						data-testid="pediatric-btn-add-invoice"
					>
						<Coins className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>В смету ({clinicalCalculation.services804n.length})</span>
					</button>

					{/* Кнопка «Памятка родителям после приёма» (Анти-Матрёшка: глубина 1) */}
					<button
						type="button"
						onClick={() => setIsMemoModalOpen(true)}
						className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2 text-xs sm:text-sm font-extrabold text-purple-900 transition hover:bg-purple-100 active:scale-95 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/60 cursor-pointer touch-manipulation"
						data-testid="pediatric-btn-open-memo"
					>
						<Printer className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
						<span>Памятка родителям</span>
					</button>
				</div>

				<div className="text-right min-w-0">
					<div className="text-xs font-mono font-bold text-[var(--ink,#0f172a)] truncate">
						{clinicalCalculation.diagnosisIcd10}
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] truncate max-w-[260px]">
						{clinicalCalculation.services804n[0]?.code} •{" "}
						{clinicalCalculation.services804n[0]?.nameRu}
					</div>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* МОДАЛКА ПАМЯТКИ РОДИТЕЛЯМ (АНТИ-МАТРЁШКА: ГЛУБИНА СТРОГО 1 ЧЕРЕЗ ПОРТАЛ) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{isMemoModalOpen && (
				<PediatricParentMemoModal
					isOpen={isMemoModalOpen}
					onClose={() => setIsMemoModalOpen(false)}
					patientName={patientName}
					patientPhone={patientPhone}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
					initialFrankl={franklRating}
					initialPulpotomy={
						activePresetId === "pulpotomy_primary"
							? { toothNumber: currentTooth }
							: undefined
					}
					initialSilvering={
						activePresetId === "silvering_deep_fluoridation"
							? { teethNumbers: [currentTooth] }
							: undefined
					}
					initialFissureSealing={
						activePresetId === "fissure_sealing"
							? { teethNumbers: [currentTooth] }
							: undefined
					}
					onApplyFrankl={(rating) => setFranklRating(rating)}
				/>
			)}
		</section>
	);
};

export default VisitPediatricProtocolWidget;
