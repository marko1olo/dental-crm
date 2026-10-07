import type React from "react";
import type { CrmToothState } from "@dental/shared";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "../ClassicGostOdontogram";
import {
	isPrimaryTooth,
	getPrimaryToothResorptionVisual,
	type ResorptionVisualProps,
	type DentitionMode,
} from "../pediatricDentitionEngine";
import type { EndoToothClinicalData } from "../../endo/EndoCanalLogModal";
import type {
	CanalObturationMaterial,
	FurcationGrade,
	PeriodontalBoneLossPattern,
	PostCoreType,
	RestorativeMaterialKey,
	RootResorptionStage,
} from "../anatomicalToothGeometries";

export { getNextFocusedTooth, getToothStateFromHotkey };
export type { DentitionMode, RootResorptionStage };

function areSurfacesEqual(
	a?: readonly string[] | string[] | undefined,
	b?: readonly string[] | string[] | undefined,
): boolean {
	if (a === b) return true;
	if (!a || !b) return !a && !b;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
export { areSurfacesEqual };

export type ToothState =
	| CrmToothState
	| "Temporary_Crown"
	| "Veneer"
	| "Inlay"
	| "Primary"
	| "Resection"
	| "Gingivitis"
	| "Periodontitis_Mild"
	| "Periodontitis_Moderate"
	| "Periodontitis_Severe"
	| "Mobility_1"
	| "Mobility_2"
	| "Mobility_3"
	| "Furcation_1"
	| "Furcation_2"
	| "Furcation_3"
	| "Calculus"
	| "Bleeding"
	| "Recession"
	| "Pocket";

/**
 * Русские названия состояний — для доступного имени зуба.
 *
 * Объявлено здесь, рядом с самим типом ToothState: OdontogramModule уже
 * импортирует ToothChart, и обратный импорт замкнул бы цикл. Record без
 * необязательных ключей заставляет компилятор потребовать перевод при
 * добавлении нового состояния.
 */
export const TOOTH_STATE_LABELS: Record<ToothState, string> = {
	Caries: "кариес",
	Pulpitis: "пульпит",
	Periodontitis: "периодонтит",
	Filled: "пломба",
	Crown: "коронка",
	Implant: "имплантат",
	Planned_Implant: "план. имплантат",
	Missing: "отсутствует",
	Healthy: "здоров",
	Retained: "ретинированный",
	Root: "разрушенный корень",
	Temporary_Crown: "временная коронка",
	Veneer: "винир",
	Inlay: "вкладка",
	Primary: "молочный зуб",
	Resection: "резекция верхушки",
	Gingivitis: "гингивит",
	Periodontitis_Mild: "легкий пародонтит",
	Periodontitis_Moderate: "средний пародонтит",
	Periodontitis_Severe: "тяжелый пародонтит",
	Mobility_1: "подвижность I ст.",
	Mobility_2: "подвижность II ст.",
	Mobility_3: "подвижность III ст.",
	Furcation_1: "фуркация I кл.",
	Furcation_2: "фуркация II кл.",
	Furcation_3: "фуркация III кл.",
	Calculus: "зубной камень",
	Bleeding: "кровоточивость",
	Recession: "рецессия десны",
	Pocket: "пародонтальный карман",
};

import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { showToast } from "../../GlobalToast";
import { globalDentalVoiceEngine } from "../../../services/voice";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import {
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	ROOT_RESORPTION_STAGES,
} from "../anatomicalToothGeometries";
export {
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	ROOT_RESORPTION_STAGES,
};
export type {
	CanalObturationMaterial,
	FurcationGrade,
	PeriodontalBoneLossPattern,
	PostCoreType,
	RestorativeMaterialKey,
};
export interface FastToothPreset {
	id: string;
	title: string;
	shortTitle: string;
	description: string;
	badge: string;
	icd10?: string;
	code804n?: string;
}

export const FAST_TOOTH_PRESETS: readonly FastToothPreset[] = [
	{
		id: "intact_dentition",
		title: "Интактный зубной ряд (Все зубы здоровы / норма)",
		shortTitle: "Интактный (Норма)",
		description: "Все 32 зуба отмечаются здоровыми (медосмотр, военкомат, бассейн, санация)",
		badge: "Норма",
		icd10: "Z01.2",
	},
	{
		id: "pro_hygiene_done",
		title: "Профгигиена выполнена (Ультразвук + Air-Flow + полировка)",
		shortTitle: "Профгигиена (УЗ + Air-Flow)",
		description: "Снятие зубных отложений УЗ + Air-Flow + полировка Detartrine + фторирование Bifluorid",
		badge: "В дневник",
		icd10: "Z01.2",
		code804n: "A16.07.051",
	},
	{
		id: "fast_caries_k021",
		title: "Быстрая пломба / кариес дентина (K02.1)",
		shortTitle: "Пломба/Кариес (K02.1)",
		description: "Препарирование кариозной полости, медобработка, адгезивный протокол, пломба светового отверждения",
		badge: "K02.1",
		icd10: "K02.1",
		code804n: "A16.07.002.001",
	},
	{
		id: "wisdom_missing",
		title: "Адентия 8-ок (18, 28, 38, 48)",
		shortTitle: "Без 8-ок",
		description: "Зубы мудрости 18, 28, 38, 48 помечаются отсутствующими / удаленными",
		badge: "K08.1",
		icd10: "K08.1",
	},
	{
		id: "fast_pulpitis_turnkey",
		title: "Пульпит под ключ (K04.0: анестезия + каналы + обтурация + пломба)",
		shortTitle: "Пульпит под ключ (K04.0)",
		description: "Эндодонтическое лечение: анестезия, коффердам, обработка и пломбирование каналов, световая пломба",
		badge: "K04.0",
		icd10: "K04.0",
		code804n: "A16.07.030",
	},
	{
		id: "fast_extraction_turnkey",
		title: "Удаление зуба под ключ (K08.1: анестезия + удаление + гемостаз + шов)",
		shortTitle: "Удаление зуба (K08.1)",
		description: "Хирургический протокол: анестезия, периотомия, атравматичное удаление, ревизия, кюретаж, шов",
		badge: "K08.1",
		icd10: "K08.1",
		code804n: "A16.07.001",
	},
] as const;

/**
 * Протокол быстрой пломбы / кариеса дентина K02.1 для Формы 043/у
 */
export function applyFastCariesK021Protocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): на окклюзионной поверхности глубокая кариозная полость в пределах околопульпарного дентина. Дентин пигментирован, размягчен на дне. Зондирование дна безболезненно, по эмалево-дентинной границе чувствительно. Перкуссия безболезненна. Реакция на холод кратковременная, проходит сразу после устранения раздражителя.`;
	const diagnosis = `K02.1 Кариес дентина (средний/глубокий) зуба ${toothNumber}`;
	const treatment = `Анестезия инфильтрационная Артикаин 1:200000 1.7 мл. Препарирование кариозной полости зуба ${toothNumber}, некрэктомия. Медикаментозная обработка 2% р-ром хлоргексидина. Изоляция операционного поля коффердамом. Адгезивный протокол: протравливание эмали 37% ортофосфорной кислотой 15 сек., нанесение адгезива V поколения, полимеризация 20 сек. Восстановление анатомической формы светоотверждаемым наногибридным композитом послойно. Шлифовка, полировка пастой, финишный блеск.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.002.001",
		serviceName: `Восстановление зуба ${toothNumber} пломбой из фотополимерного композита при среднем/глубоком кариесе (K02.1)`,
		price: 4500,
	};
}

/**
 * Протокол комплексной профессиональной гигиены для Формы 043/у
 */
export function applyFastProHygieneProtocol(): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const statusLocalis =
		"Полость рта: над- и поддесневой зубной камень преимущественно в области нижних фронтальных зубов (33-43) с оральной поверхности и верхних моляров (16, 26) с вестибулярной поверхности. Мягкий пигментированный налет курильщика/чая. Десневые сосочки умеренно гиперемированы, отечны, кровоточивость при зондировании I-II ст. Индекс гигиены OHI-S = 1.8.";
	const diagnosis = "Z01.2 Стоматологическое обследование / K05.0 Острый гингивит (зубные отложения)";
	const treatment =
		"Проведена профессиональная гигиена полости рта в полном объеме: ультразвуковой скейлинг над- и поддесневых минерализованных зубных отложений аппаратом с ирригацией 0.05% хлоргексидином. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком на основе глицина (удаление пигментированного биопленочного налета). Полировка всех поверхностей зубов абразивной пастой и щеточками. Глубокое фторирование эмали и дентина лаком Bifluorid 12. Обучение индивидуальной гигиене, подбор зубной щетки и монопучка.";

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.051",
		serviceName:
			"Профессиональная гигиена полости рта: УЗ-скейлинг + Air-Flow глицин + полировка пастой + фторирование Bifluorid 12",
		price: 5500,
	};
}

/**
 * Протокол лечения пульпита K04.0 под ключ для Формы 043/у
 */
export function applyFastPulpitisProtocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование устья корневых каналов резко болезненно, пульпа кровоточит. Термическая проба (холод) вызывает интенсивную приступообразную боль с длительным последействием. Перкуссия слабочувствительна. Слизистая оболочка в области верхушки корня без видимых воспалительных изменений.`;
	const diagnosis = `K04.0 Пульпит (острый очаговый/диффузный) зуба ${toothNumber}`;
	const treatment = `Инфильтрационная/проводниковая анестезия Артикаин 1:100000 1.7 мл. Изоляция коффердамом. Препарирование кариозной полости зуба ${toothNumber}, раскрытие полости зуба, экстирпация пульпы. Инструментальная обработка каналов Ni-Ti вращающимися файлами до апикального уступа. Ирригация 3% раствором NaOCl с ультразвуковой активацией, промывание 17% ЭДТА, дистиллированной водой. Высушивание стерильными бумажными штифтами. Обтурация корневых каналов методом латеральной конденсации гуттаперчевыми штифтами с эпоксидным силером AH-Plus. Рентген-контроль обтурации: каналы запломбированы до физиологического апекса. Герметичная изолирующая прокладка, восстановление анатомической формы зуба нанокомпозитом светового отверждения. Шлифовка, полировка.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.030",
		serviceName: `Эндодонтическое лечение пульпита зуба ${toothNumber} под ключ (анестезия + обработка каналов + обтурация + пломба)`,
		price: 12500,
	};
}

/**
 * Протокол атравматичного удаления зуба K08.1 под ключ для Формы 043/у
 */
export function applyFastExtractionProtocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): коронковая часть зуба разрушена твердыми тканями ниже уровня десны более чем на 2/3. Корень устойчив, зондирование разрушенных тканей безболезненно. Перкуссия безболезненна. Переходная складка интактна, без отека и гиперемии. Зуб не подлежит терапевтическому, эндодонтическому или ортопедическому восстановлению.`;
	const diagnosis = `K08.1 Потеря зубов вследствие удаления / разрушение корня зуба ${toothNumber}`;
	const treatment = `Проводниковая/инфильтрационная анестезия Артикаин 1:100000 1.7 мл. Круговая связка зуба ${toothNumber} отсепарирована периотомом. Наложение хирургических щипцов/элеватора. Люксация и тракция зуба атравматично с сохранением кортикальных пластинок альвеолы. Ревизия лунки, кюретаж грануляций. Гемостаз гемостатической губкой Alveostim. Сближение краев лунки, наложение направляющего гемостатического шва шовным материалом Vicryl 4-0. Контроль гемостаза: кровотечение остановлено, стабильный сгусток. Рекомендации после удаления выданы на руки.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.001",
		serviceName: `Атравматичное удаление зуба ${toothNumber} под ключ (анестезия + периотомия + удаление + кюретаж + гемостаз + шов)`,
		price: 4500,
	};
}

export interface ToothData {
	toothNumber: number;
	state: ToothState;
	surfaces?: string[] | undefined;
	material?: RestorativeMaterialKey;
	canalObturation?: CanalObturationMaterial;
	hasPost?: boolean;
	postType?: PostCoreType;
	boneLossLevel?: number;
	boneLossType?: PeriodontalBoneLossPattern;
	furcationGrade?: FurcationGrade;
	furcation?: FurcationGrade;
	rootResorptionStage?: RootResorptionStage;
	rootResorption?: RootResorptionStage;
	mobility?: 0 | 1 | 2 | 3;
	gingivalRecession?: number;
	bopSites?: string[];
	suppurationSites?: string[];
	periapicalLesion?: boolean;
	pocketDepth?: number;
	pocketDepthMm?: number;
	maxPocketDepth?: number;
	canalCount?: number;
	notes?: string;
	clinicalData?: EndoToothClinicalData | Record<string, unknown>;
	bridgeRole?: "pillar" | "pontic" | null;
	canalObturationLevel?: "full" | "two_thirds" | "half";
	periapicalLesionSize?: "small" | "medium" | "large" | 6 | 10 | 16;
	hasFracture?: boolean;
	hasApicoectomy?: boolean;
	updatedAt?: string;
}

export type OdontogramQuadrantId =
	| "all"
	| "Q1"
	| "Q2"
	| "Q3"
	| "Q4"
	| "Q5"
	| "Q6"
	| "Q7"
	| "Q8";

export interface QuadrantDefinition {
	id: OdontogramQuadrantId;
	label: string;
	shortLabel: string;
	rangeText: string;
	jaw: "upper" | "lower";
	side: "right" | "left";
	teeth: number[];
}

export const ADULT_QUADRANTS: readonly QuadrantDefinition[] = [
	{
		id: "Q1",
		label: "Q1: Верхняя челюсть (Правый)",
		shortLabel: "Q1 18–11",
		rangeText: "18–11 (Правый)",
		jaw: "upper",
		side: "right",
		teeth: [18, 17, 16, 15, 14, 13, 12, 11],
	},
	{
		id: "Q2",
		label: "Q2: Верхняя челюсть (Левый)",
		shortLabel: "Q2 21–28",
		rangeText: "21–28 (Левый)",
		jaw: "upper",
		side: "left",
		teeth: [21, 22, 23, 24, 25, 26, 27, 28],
	},
	{
		id: "Q4",
		label: "Q4: Нижняя челюсть (Правый)",
		shortLabel: "Q4 48–41",
		rangeText: "48–41 (Правый)",
		jaw: "lower",
		side: "right",
		teeth: [48, 47, 46, 45, 44, 43, 42, 41],
	},
	{
		id: "Q3",
		label: "Q3: Нижняя челюсть (Левый)",
		shortLabel: "Q3 31–38",
		rangeText: "31–38 (Левый)",
		jaw: "lower",
		side: "left",
		teeth: [31, 32, 33, 34, 35, 36, 37, 38],
	},
];

export const PEDIATRIC_QUADRANTS: readonly QuadrantDefinition[] = [
	{
		id: "Q5",
		label: "Q5: Верхняя челюсть (Правый)",
		shortLabel: "Q5 55–51",
		rangeText: "55–51 (Правый)",
		jaw: "upper",
		side: "right",
		teeth: [55, 54, 53, 52, 51],
	},
	{
		id: "Q6",
		label: "Q6: Верхняя челюсть (Левый)",
		shortLabel: "Q6 61–65",
		rangeText: "61–65 (Левый)",
		jaw: "upper",
		side: "left",
		teeth: [61, 62, 63, 64, 65],
	},
	{
		id: "Q8",
		label: "Q8: Нижняя челюсть (Правый)",
		shortLabel: "Q8 85–81",
		rangeText: "85–81 (Правый)",
		jaw: "lower",
		side: "right",
		teeth: [85, 84, 83, 82, 81],
	},
	{
		id: "Q7",
		label: "Q7: Нижняя челюсть (Левый)",
		shortLabel: "Q7 71–75",
		rangeText: "71–75 (Левый)",
		jaw: "lower",
		side: "left",
		teeth: [71, 72, 73, 74, 75],
	},
];

export function getQuadrantForTooth(
	toothNumber: number,
	pediatricMode?: boolean,
): OdontogramQuadrantId {
	const q = Math.floor(toothNumber / 10);
	switch (q) {
		case 1:
			return "Q1";
		case 2:
			return "Q2";
		case 3:
			return "Q3";
		case 4:
			return "Q4";
		case 5:
			return "Q5";
		case 6:
			return "Q6";
		case 7:
			return "Q7";
		case 8:
			return "Q8";
		default:
			return pediatricMode ? "Q5" : "Q1";
	}
}

export function getAdjacentQuadrant(
	current: OdontogramQuadrantId,
	direction: "next" | "prev",
	pediatricMode?: boolean,
): OdontogramQuadrantId {
	const adultOrder: OdontogramQuadrantId[] = ["Q1", "Q2", "Q3", "Q4"];
	const pedOrder: OdontogramQuadrantId[] = ["Q5", "Q6", "Q7", "Q8"];
	const order = pediatricMode ? pedOrder : adultOrder;
	const idx = order.indexOf(current);
	if (idx === -1) return order[0]!;
	if (direction === "next") {
		return order[(idx + 1) % order.length]!;
	}
	return order[(idx - 1 + order.length) % order.length]!;
}

export function isQuadrantTop(quadrant: OdontogramQuadrantId): boolean {
	return quadrant === "Q1" || quadrant === "Q2" || quadrant === "Q5" || quadrant === "Q6";
}

export function getQuadrantTitle(quadrant: OdontogramQuadrantId, pediatricMode?: boolean): string {
	switch (quadrant) {
		case "Q1":
			return "Верхняя челюсть (Правая) • Зубы 18–11";
		case "Q2":
			return "Верхняя челюсть (Левая) • Зубы 21–28";
		case "Q3":
			return "Нижняя челюсть (Левая) • Зубы 31–38";
		case "Q4":
			return "Нижняя челюсть (Правая) • Зубы 48–41";
		case "Q5":
			return "Верхняя челюсть (Правая) • Зубы 55–51";
		case "Q6":
			return "Верхняя челюсть (Левая) • Зубы 61–65";
		case "Q7":
			return "Нижняя челюсть (Левая) • Зубы 71–75";
		case "Q8":
			return "Нижняя челюсть (Правая) • Зубы 85–81";
		default:
			return pediatricMode ? "Все молочные зубы (55–85)" : "Все взрослые зубы (18–48)";
	}
}

export interface ToothChartProps {
	teethData?: ToothData[] | undefined;
	patientId?: string | undefined;
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	dentitionMode?: DentitionMode | undefined;
	onDentitionModeChange?: ((mode: DentitionMode) => void) | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick?: ((num: number, rect?: DOMRect, surface?: string | undefined) => void) | ((e: React.MouseEvent, num: number) => void) | undefined;
	onToothContextMenu?: ((e: React.MouseEvent, num: number) => void) | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	onSurfacesChange?: ((targets: number[], surfaces: readonly string[]) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	hideDentitionSwitcher?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	onMarkIntactDentition?: (() => void) | undefined;
	onMarkWisdomTeethMissing?: (() => void) | undefined;
	onMarkMolarsMissing?: (() => void) | undefined;
	onMarkFrontIntact?: (() => void) | undefined;
	onMarkProHygieneDone?: ((protocol?: any) => void) | undefined;
	onApplyFastCariesK021?: ((protocol?: any) => void) | undefined;
	hideExpressActions?: boolean | undefined;
	className?: string | undefined;
}

export const TOP_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const BOTTOM_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
export const ALL_ADULT_TEETH_NUMBERS: readonly number[] = [
	...TOP_TEETH,
	...BOTTOM_TEETH,
];

export const ADULT_MOLARS: readonly number[] = [
	18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38,
];
export const ADULT_FIRST_MOLARS: readonly number[] = [
	16, 26, 36, 46,
];
export const ADULT_WISDOM_TEETH: readonly number[] = [
	18, 28, 38, 48,
];
export const ADULT_PREMOLARS: readonly number[] = [
	15, 14, 24, 25, 45, 44, 34, 35,
];
export const ADULT_FRONTAL: readonly number[] = [
	13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33,
];
export const ADULT_FRONT_TEETH: readonly number[] = [
	...ADULT_FRONTAL,
];

export function createDefaultAdultTeethData(): ToothData[] {
	return ALL_ADULT_TEETH_NUMBERS.map((toothNumber) => ({
		toothNumber,
		state: "Healthy" as ToothState,
	}));
}

export const PEDIATRIC_TOP_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PEDIATRIC_BOTTOM_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export const PEDIATRIC_MOLARS: readonly number[] = [55, 54, 64, 65, 85, 84, 74, 75];
export const MIXED_TOP_TEETH = [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26];
export const MIXED_BOTTOM_TEETH = [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];

/**
 * Нижняя граница масштаба. Дуга масштабируется под экран мобильного устройства (360px–414px).
 */
export const MIN_ARCH_SCALE = 0.28; // Adaptive mobile scaling down to 0.28 (MIN_ARCH_SCALE = 0.35 baseline)

/** "56px" × 0.68 → "38.08px". Нечисловое значение возвращается как есть. */
export function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}



/**
 * Splits teeth row into left & right halves at midline for quadrant alignment.
 */
export function splitArchAtMidline(teeth: number[] | null | undefined): { left: number[]; right: number[] } {
	if (!teeth || !Array.isArray(teeth) || typeof (teeth as any).findIndex !== "function" || teeth.length <= 1) {
		return { left: Array.isArray(teeth) ? [...teeth] : [], right: [] };
	}
	let splitIndex = teeth.findIndex((num, i) => {
		if (i === 0) return false;
		const prev = teeth[i - 1];
		if (!prev) return false;
		const prevQ = Math.floor(prev / 10);
		const currQ = Math.floor(num / 10);
		return prevQ !== currQ;
	});
	if (splitIndex <= 0) {
		splitIndex = Math.ceil(teeth.length / 2);
	}
	return {
		left: teeth.slice(0, splitIndex),
		right: teeth.slice(splitIndex),
	};
}

export function getQuadrantTeeth(
	quadrant: OdontogramQuadrantId,
	topTeeth?: number[] | null,
	bottomTeeth?: number[] | null,
	pediatricMode?: boolean,
): number[] {
	const safeTopTeeth = Array.isArray(topTeeth) && topTeeth.length > 0
		? topTeeth
		: (pediatricMode ? PEDIATRIC_TOP_TEETH : TOP_TEETH);
	const safeBottomTeeth = Array.isArray(bottomTeeth) && bottomTeeth.length > 0
		? bottomTeeth
		: (pediatricMode ? PEDIATRIC_BOTTOM_TEETH : BOTTOM_TEETH);

	const topSplit = splitArchAtMidline(safeTopTeeth);
	const bottomSplit = splitArchAtMidline(safeBottomTeeth);
	switch (quadrant) {
		case "Q1":
		case "Q5":
			return topSplit.left.length > 0
				? topSplit.left
				: (quadrant === "Q5" ? [55, 54, 53, 52, 51] : [18, 17, 16, 15, 14, 13, 12, 11]);
		case "Q2":
		case "Q6":
			return topSplit.right.length > 0
				? topSplit.right
				: (quadrant === "Q6" ? [61, 62, 63, 64, 65] : [21, 22, 23, 24, 25, 26, 27, 28]);
		case "Q4":
		case "Q8":
			return bottomSplit.left.length > 0
				? bottomSplit.left
				: (quadrant === "Q8" ? [85, 84, 83, 82, 81] : [48, 47, 46, 45, 44, 43, 42, 41]);
		case "Q3":
		case "Q7":
			return bottomSplit.right.length > 0
				? bottomSplit.right
				: (quadrant === "Q7" ? [71, 72, 73, 74, 75] : [31, 32, 33, 34, 35, 36, 37, 38]);
		default:
			return [...safeTopTeeth, ...safeBottomTeeth];
	}
}

export function areToothChartPropsEqual(
	prev: ToothChartProps,
	next: ToothChartProps,
): boolean {
	if (prev.patientId !== next.patientId) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.dentitionMode !== next.dentitionMode) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.hideQuadrantSwitcher !== next.hideQuadrantSwitcher) return false;
	if (prev.hideDentitionSwitcher !== next.hideDentitionSwitcher) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;
	if (prev.activeQuadrant !== next.activeQuadrant) return false;
	if (prev.hideExpressActions !== next.hideExpressActions) return false;
	if (prev.className !== next.className) return false;

	// Compare selectedTeeth array
	if (prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
		}
	}

	// Compare topTeeth & bottomTeeth
	if (prev.topTeeth !== next.topTeeth) {
		const pLen = prev.topTeeth?.length ?? 0;
		const nLen = next.topTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.topTeeth![i] !== next.topTeeth![i]) return false;
		}
	}
	if (prev.bottomTeeth !== next.bottomTeeth) {
		const pLen = prev.bottomTeeth?.length ?? 0;
		const nLen = next.bottomTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.bottomTeeth![i] !== next.bottomTeeth![i]) return false;
		}
	}

	// Compare teethData
	if (prev.teethData !== next.teethData) {
		const pLen = prev.teethData?.length ?? 0;
		const nLen = next.teethData?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			const pt = prev.teethData?.[i];
			const nt = next.teethData?.[i];
			if (!pt || !nt) return false;
			if (pt.toothNumber !== nt.toothNumber) return false;
			if (pt.state !== nt.state) return false;
			if (pt.updatedAt !== nt.updatedAt) return false;
			if (pt.material !== nt.material) return false;
			if (pt.canalObturation !== nt.canalObturation) return false;
			if (pt.hasPost !== nt.hasPost) return false;
			if (pt.postType !== nt.postType) return false;
			if (pt.boneLossLevel !== nt.boneLossLevel) return false;
			if (pt.boneLossType !== nt.boneLossType) return false;
			if ((pt.rootResorptionStage ?? pt.rootResorption) !== (nt.rootResorptionStage ?? nt.rootResorption)) return false;
			if (pt.periapicalLesion !== nt.periapicalLesion) return false;
			const pDepth = pt.pocketDepth ?? pt.pocketDepthMm ?? pt.maxPocketDepth;
			const nDepth = nt.pocketDepth ?? nt.pocketDepthMm ?? nt.maxPocketDepth;
			if (pDepth !== nDepth) return false;
			if (!areSurfacesEqual(pt.surfaces, nt.surfaces)) return false;
		}
	}

	return true;
}


