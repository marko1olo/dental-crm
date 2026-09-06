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
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import type { FranklRating } from "../odontogram/pediatricDentitionEngine";
import { PediatricParentMemoModal } from "./PediatricParentMemoModal";

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
	| "extraction_primary_exfoliation";

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
		| "Extracted";
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

	// 8. Модальное окно памятки родителям (Анти-Матрёшка: глубина 1)
	const [isMemoModalOpen, setIsMemoModalOpen] = useState<boolean>(false);

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
				statusLocalis = `Временный зуб ${currentTooth}: подвижность II–III степени во всех направлениях вследствие физиологической резорбции корня более 3/4 длины. Коронка устойчиво удерживается лишь на десневой манжетке. Рентгенологически: зачаток постоянного зуба расположен непосредственно под временным, кортикальная пластинка зачатка сохранена. Десна вокруг шейки умеренно гиперемирована.`;
				treatmentDescription = `Оценка степени подвижности зуба ${currentTooth}. Аппликационная анестезия слизистой оболочки десны с вестибулярной и оральной сторон гелем со вкусом вишни (${selectedMaterial}). Наложение детских щипцов на коронку временного зуба, аккуратная люксация и плавная тракция без давления на зачаток постоянного зуба. Экстракция зуба. Кюретаж лунки не проводился для защиты зачатка. Гемостаз марлевым стерильным тампоном с прикусыванием на 15 минут. Кровотечение полностью остановлено, сформирован состоятельный кровяной сгусток. Удаленный зубик вручен ребенку в контейнере для Зубной Феи.`;
				recommendations = `Держать марлевый тампон 15–20 минут, затем бережно выплюнуть. Категорически запрещено полоскать рот и травмировать лунку пальцами или языком. Не принимать горячую пищу и напитки 2 часа. При ноющем дискомфорте — детская суспензия Парацетамол/Ибупрофен по возрасту.`;
				services.push({
					code: "B01.003.004.004",
					nameRu: "Аппликационная анестезия слизистой оболочки десны (вишня)",
				});
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
			`2. Объект вмешательства: Зуб #${currentTooth} (${PEDIATRIC_TEETH_NAMES[currentTooth] ?? `Зуб ${currentTooth}`})`,
			`   Диагноз (МКБ-10): ${diagnosisIcd10} — ${diagnosisNameRu}`,
			`   Услуги (Номенклатура 804н): ${services.map((s) => `${s.code} ${s.nameRu}`).join("; ")}`,
			"",
			"3. Status localis:",
			`   ${statusLocalis}`,
			"",
			"4. Протокол вмешательства и манипуляции:",
			`   ${treatmentDescription}`,
			"",
			"5. Назначения и рекомендации родителям:",
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

	return (
		<section
			aria-label="Канонический протокол детского приема 043/у"
			className={`pediatric-protocol-widget rounded-2xl border border-slate-200 bg-[var(--paper,#ffffff)] p-3.5 sm:p-5 shadow-xs transition dark:border-slate-800 dark:bg-slate-900 ${className}`.trim()}
			data-testid="pediatric-protocol-widget"
		>
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ВЕРХНЯЯ ШАПКА: АКТИВНЫЙ ЗУБ + ТАКТИКА ФРАНКЛА + КНОПКА ПАРАМЕТРОВ */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
				<div className="flex items-center gap-2.5">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
						<Baby className="h-5 w-5 shrink-0" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
								Детский приём у кресла (30 сек)
							</span>
							<span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
								Зуб {currentTooth}
							</span>
						</div>
						<h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
							{anatomicalToothName}
						</h2>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Индикатор выбранного поведения по Франклу */}
					<div
						className={`inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${activeFrankl.badgeClass}`}
						title={activeFrankl.descriptionRu}
						data-testid="frankl-status-indicator"
					>
						<activeFrankl.icon className="h-4 w-4 shrink-0" />
						<span>Франкл {activeFrankl.symbol}</span>
					</div>

					{/* Кнопка спойлера расширенных параметров */}
					<button
						type="button"
						onClick={() => setShowDetailsAccordion((prev) => !prev)}
						className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
						title="Показать / скрыть подробности протокола"
						data-testid="pediatric-details-accordion-btn"
					>
						<span>Параметры</span>
						{showDetailsAccordion ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
					</button>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ЭКСПРЕСС-СЕЛЕКТОР ШКАЛЫ ФРАНКЛА (1..4) (ТАЧ-ТАРГЕТЫ >= 48px, НОЛЬ ЭМОДЗИ) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-4">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						Шкала поведения Франкла (экспресс-выбор в 1 клик):
					</span>
					<span className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
								className={`flex min-h-[52px] items-center justify-between rounded-xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
									isCurrent
										? item.activeClass
										: "border-slate-200 bg-[var(--paper,#ffffff)] hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
								}`}
								title={`${item.titleRu}: ${item.descriptionRu}`}
								data-testid={`frankl-express-btn-${item.rating}`}
							>
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700/60 shrink-0">
										<ItemIcon className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<div className="text-xs font-extrabold truncate font-mono">
											Рейтинг {item.symbol}
										</div>
										<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
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
									<Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* 5 КАНОНИЧЕСКИХ 1-КЛИК ПРОТОКОЛОВ (ФОРМА 043/у + НОМЕНКЛАТУРА 804н) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="mb-4">
				<div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					1-Клик клинические протоколы у кресла:
				</div>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
										: "border-slate-200 bg-[var(--paper,#ffffff)] hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
								}`}
								data-testid={`pediatric-preset-btn-${preset.id}`}
							>
								<div className="flex items-center gap-1.5 font-bold text-xs">
									<PresetIcon className="h-4 w-4 shrink-0" />
									<span className="truncate">{preset.shortLabelRu}</span>
								</div>
								<div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
									{preset.subtitleRu}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ПОВЕРХНОСТИ ЗУБА (ДЛЯ КАРИЕСА И ПУЛЬПОТОМИИ, ТАЧ-ТАРГЕТЫ >= 48px) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{activePreset.allowsSurfaces && (
				<div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
											: "bg-[var(--paper,#ffffff)] text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
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
					<div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
						<span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">
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
											: "bg-[var(--paper,#ffffff)] text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
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
					<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
						Препарат / Материал протокола:
					</span>
					<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
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
										: "border-slate-200 bg-[var(--paper,#ffffff)] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
					className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
					data-testid="pediatric-details-accordion-content"
				>
					{/* Быстрый выбор зуба */}
					<div>
						<div className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
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
												: "bg-[var(--paper,#ffffff)] text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
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
						<div className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-300">
							Превью готовой записи Формы 043/у (автогенерация):
						</div>
						<pre className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-[var(--paper,#ffffff)] p-3 text-[11px] leading-relaxed text-slate-800 font-mono whitespace-pre-wrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
							{clinicalCalculation.fullProtocolText043}
						</pre>
					</div>
				</div>
			)}

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* НИЖНИЙ ПЛАНШЕТ ДЕЙСТВИЙ: 1-КЛИК В КАРТУ, В СМЕТУ, ПАМЯТКА РОДИТЕЛЯМ */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
				<div className="flex flex-wrap items-center gap-2">
					{/* Кнопка 1-клик в 043/у */}
					<button
						type="button"
						onClick={handleInsertToForm043}
						className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-700 active:scale-95 cursor-pointer touch-manipulation"
						data-testid="pediatric-btn-apply-043"
					>
						<FileText className="h-4 w-4 shrink-0" />
						<span>Внести в 043/у</span>
					</button>

					{/* Кнопка 1-клик в смету */}
					<button
						type="button"
						onClick={handleAddServicesToInvoice}
						className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-teal-800 transition hover:bg-teal-100 active:scale-95 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 cursor-pointer touch-manipulation"
						data-testid="pediatric-btn-add-invoice"
					>
						<Coins className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>В смету ({clinicalCalculation.services804n.length})</span>
					</button>

					{/* Кнопка «Памятка родителям после приёма» (Анти-Матрёшка: глубина 1) */}
					<button
						type="button"
						onClick={() => setIsMemoModalOpen(true)}
						className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-purple-900 transition hover:bg-purple-100 active:scale-95 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/60 cursor-pointer touch-manipulation"
						data-testid="pediatric-btn-open-memo"
					>
						<Printer className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
						<span>Памятка родителям</span>
					</button>
				</div>

				<div className="text-right">
					<div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
						{clinicalCalculation.diagnosisIcd10}
					</div>
					<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
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
