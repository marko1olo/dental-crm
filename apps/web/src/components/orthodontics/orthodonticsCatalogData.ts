/**
 * @dental/web/components/orthodontics/orthodonticsCatalogData.ts
 *
 * Канонический единый SSOT ортодонтического каталога, цефалометрии ТРГ (Штейнер/Твид),
 * дуг, эластиков и 1-клик протокола активации брекетов/элайнеров у кресла (Мандаты 8b, 8e, 8x, 8am).
 *
 * Sweet Spot: 250–350 строк.
 */

export type ArchwireAlloy = "niti" | "cuniti" | "ss" | "tma";
export type ArchwireSection = "0.012" | "0.014" | "0.016" | "0.018" | "16x22" | "17x25" | "19x25";
export type ArchwireShape = "round" | "rectangular";
export type JawTarget = "upper" | "lower";

export interface ArchwireAlloyDef {
	key: ArchwireAlloy;
	label: string;
	shortRu: string;
	description: string;
	colorToken: string;
}

export const ARCHWIRE_ALLOYS_SSOT: ArchwireAlloyDef[] = [
	{
		key: "niti", label: "NiTi Термоактивный", shortRu: "NiTi",
		description: "Никель-титан с памятью формы для первичного нивелирования и деротации", colorToken: "var(--teal)",
	},
	{
		key: "cuniti", label: "CuNiTi (Медь-Никель-Титан)", shortRu: "CuNiTi",
		description: "Сплав с добавлением меди, выражает торк при температуре полости рта", colorToken: "var(--accent-glow, #38bdf8)",
	},
	{
		key: "ss", label: "Сталь SS (Stainless Steel)", shortRu: "Сталь SS",
		description: "Жесткая медицинская сталь для закрытия экстракционных промежутков и тяг", colorToken: "var(--ink-muted, #94a3b8)",
	},
	{
		key: "tma", label: "ТМА (Титан-Молибден)", shortRu: "ТМА",
		description: "Бета-титановый сплав для ювелирной детализации и индивидуальных изгибов", colorToken: "var(--warning-ink, #f59e0b)",
	},
];

export interface ArchwireSectionDef {
	section: ArchwireSection;
	shape: ArchwireShape;
	dimensionRu: string;
	clinicalStageRu: string;
}

export const ARCHWIRE_SECTIONS_SSOT: ArchwireSectionDef[] = [
	{ section: "0.012", shape: "round", dimensionRu: "0.012 круг", clinicalStageRu: "Раннее нивелирование" },
	{ section: "0.014", shape: "round", dimensionRu: "0.014 круг", clinicalStageRu: "Нивелирование скученности" },
	{ section: "0.016", shape: "round", dimensionRu: "0.016 круг", clinicalStageRu: "Завершение 1 этапа" },
	{ section: "0.018", shape: "round", dimensionRu: "0.018 круг", clinicalStageRu: "Подготовка к прямоугольным" },
	{ section: "16x22", shape: "rectangular", dimensionRu: "16×22 прям.", clinicalStageRu: "Ранний контроль торка" },
	{ section: "17x25", shape: "rectangular", dimensionRu: "17×25 прям.", clinicalStageRu: "Рабочий контроль торка" },
	{ section: "19x25", shape: "rectangular", dimensionRu: "19×25 прям.", clinicalStageRu: "Жесткий паз .022" },
];

export type ElasticClass = "class_2" | "class_3" | "oblique" | "triangular" | "box";
export type ElasticForce = "light" | "medium" | "heavy";

export interface ElasticDef {
	id: string;
	classType: ElasticClass;
	classNameRu: string;
	force: ElasticForce;
	forceNameRu: string;
	forceOz: string;
	sizeInch: string;
	animalName: string;
	hookSchemeRu: string;
}

export const ELASTICS_CATALOG: ElasticDef[] = [
	{
		id: "c2_fox", classType: "class_2", classNameRu: "Класс II (Дистальный)",
		force: "medium", forceNameRu: "Средняя (Medium)", forceOz: "3.5 oz (100 г)",
		sizeInch: "1/4\"", animalName: "Fox (Лиса)", hookSchemeRu: "Верхний клык (13/23) ➔ Нижний моляр (36/46)",
	},
	{
		id: "c2_bear", classType: "class_2", classNameRu: "Класс II Усиленный",
		force: "heavy", forceNameRu: "Сильная (Heavy)", forceOz: "4.5 oz (130 г)",
		sizeInch: "1/4\"", animalName: "Bear (Медведь)", hookSchemeRu: "Верхний клык (13/23) ➔ Нижний второй моляр (37/47)",
	},
	{
		id: "c3_rabbit", classType: "class_3", classNameRu: "Класс III (Мезиальный)",
		force: "medium", forceNameRu: "Средняя (Medium)", forceOz: "3.5 oz (100 г)",
		sizeInch: "3/16\"", animalName: "Rabbit (Кролик)", hookSchemeRu: "Нижний клык (33/43) ➔ Верхний моляр (16/26)",
	},
	{
		id: "tri_quail", classType: "triangular", classNameRu: "Треугольная тяга",
		force: "light", forceNameRu: "Легкая (Light)", forceOz: "2.5 oz (70 г)",
		sizeInch: "1/8\"", animalName: "Quail (Перепел)", hookSchemeRu: "Верхний клык ➔ Нижний клык и премоляр",
	},
	{
		id: "oblique_cross", classType: "oblique", classNameRu: "Косая перекрестная",
		force: "medium", forceNameRu: "Средняя (Medium)", forceOz: "3.5 oz (100 г)",
		sizeInch: "5/16\"", animalName: "Penguin (Пингвин)", hookSchemeRu: "Вестибулярно ВЧ ➔ Орально НЧ для исправления перекреста",
	},
	{
		id: "box_vertical", classType: "box", classNameRu: "Коробчатая (Box)",
		force: "medium", forceNameRu: "Средняя (Medium)", forceOz: "3.5 oz (100 г)",
		sizeInch: "1/4\"", animalName: "Zebra (Зебра)", hookSchemeRu: "Закрытие передней вертикальной дизокклюзии (12-22 к 32-42)",
	},
];

export interface TrgAngleNorm {
	key: "sna" | "snb" | "anb" | "u1_na" | "l1_nb" | "fma";
	name: string;
	symbol: string;
	normDeg: number;
	toleranceDeg: number;
	unit: "deg" | "mm";
	author: "Steiner" | "Tweed";
	interpretationRu: string;
}

export const TRG_ANGLES_NORMS_SSOT: TrgAngleNorm[] = [
	{
		key: "sna", name: "Положение верхней челюсти", symbol: "SNA", normDeg: 82, toleranceDeg: 2, unit: "deg",
		author: "Steiner", interpretationRu: "Угол SN-A. Прогнатия ВЧ при >84°, ретрогнатия при <80°.",
	},
	{
		key: "snb", name: "Положение нижней челюсти", symbol: "SNB", normDeg: 80, toleranceDeg: 2, unit: "deg",
		author: "Steiner", interpretationRu: "Угол SN-B. Прогнатия НЧ при >82°, ретрогнатия при <78°.",
	},
	{
		key: "anb", name: "Сагиттальное соотношение челюстей", symbol: "ANB", normDeg: 2, toleranceDeg: 2, unit: "deg",
		author: "Steiner", interpretationRu: "Разность SNA - SNB. Норма 0°..4° (Класс I). >4.5° — Класс II, <0° — Класс III.",
	},
	{
		key: "u1_na", name: "Наклон верхнего резца", symbol: "1-NA", normDeg: 22, toleranceDeg: 2, unit: "deg",
		author: "Steiner", interpretationRu: "Угол наклона оси верхнего резца к линии N-A. Протрузия при >24°.",
	},
	{
		key: "l1_nb", name: "Наклон нижнего резца", symbol: "1-NB", normDeg: 25, toleranceDeg: 2, unit: "deg",
		author: "Steiner", interpretationRu: "Угол наклона оси нижнего резца к линии N-B. Протрузия при >27°.",
	},
	{
		key: "fma", name: "Угол плоскости нижней челюсти", symbol: "FMA", normDeg: 25, toleranceDeg: 3, unit: "deg",
		author: "Tweed", interpretationRu: "Франкфуртская горизонталь к телу нижней челюсти (Go-Me). Тип роста.",
	},
];

export interface ChairsideActionItem {
	id: string;
	label: string;
	category: "ligatures" | "archwire" | "elastics" | "brackets" | "hygiene_ipr";
}

export const CHAIRSIDE_ACTIONS_CATALOG: ChairsideActionItem[] = [
	{ id: "change_ligatures", label: "Замена эластических лигатур", category: "ligatures" },
	{ id: "power_chain", label: "Установка эластической цепочки (Power Chain)", category: "elastics" },
	{ id: "rebond_bracket", label: "Фиксация/подклейка замка брекета", category: "brackets" },
	{ id: "cinch_back", label: "Загиб дистальных концов дуги (Cinch-back)", category: "archwire" },
	{ id: "ipr_stripping", label: "Сепарация эмали (IPR / стриппинг)", category: "hygiene_ipr" },
	{ id: "occlusal_stops", label: "Установка разобщающих окклюзионных накладок", category: "brackets" },
	{ id: "bite_turbos", label: "Коррекция турбо-упоров", category: "brackets" },
];

export interface OrthoActivationPreset {
	id: string;
	title: string;
	stageName: string;
	upperAlloy: ArchwireAlloy;
	upperSection: ArchwireSection;
	lowerAlloy: ArchwireAlloy;
	lowerSection: ArchwireSection;
	elasticId: string | null;
	actionIds: string[];
	nextVisitWeeks: number;
}

export const ORTHO_ACTIVATION_PRESETS: OrthoActivationPreset[] = [
	{
		id: "leveling_primary", title: "1. Первичное нивелирование", stageName: "Нивелирование и деротация",
		upperAlloy: "niti", upperSection: "0.014", lowerAlloy: "niti", lowerSection: "0.014",
		elasticId: null, actionIds: ["change_ligatures", "cinch_back"], nextVisitWeeks: 6,
	},
	{
		id: "transitional_torque", title: "2. Переходный этап (Торк)", stageName: "Выражение торка и ангуляции",
		upperAlloy: "cuniti", upperSection: "17x25", lowerAlloy: "cuniti", lowerSection: "17x25",
		elasticId: "c2_fox", actionIds: ["change_ligatures", "power_chain"], nextVisitWeeks: 4,
	},
	{
		id: "working_space_closure", title: "3. Рабочий этап (Закрытие щелей)", stageName: "Закрытие экстракционных промежутков",
		upperAlloy: "ss", upperSection: "19x25", lowerAlloy: "ss", lowerSection: "19x25",
		elasticId: "c2_bear", actionIds: ["power_chain", "cinch_back"], nextVisitWeeks: 4,
	},
	{
		id: "detailing_tma", title: "4. Юстировка и детализация", stageName: "Индивидуальные изгибы I-II порядка",
		upperAlloy: "tma", upperSection: "19x25", lowerAlloy: "tma", lowerSection: "19x25",
		elasticId: "tri_quail", actionIds: ["change_ligatures"], nextVisitWeeks: 3,
	},
	{
		id: "aligners_activation", title: "5. Активация элайнеров", stageName: "Контроль аттачментов и IPR",
		upperAlloy: "niti", upperSection: "0.014", lowerAlloy: "niti", lowerSection: "0.014",
		elasticId: null, actionIds: ["ipr_stripping"], nextVisitWeeks: 4,
	},
];

export interface OrthoProtocolState {
	applianceType: "brackets" | "aligners";
	applianceName: string;
	currentMonth: number;
	totalMonths: number;
	nextVisitWeeks: number;
	upperAlloy: ArchwireAlloy;
	upperSection: ArchwireSection;
	lowerAlloy: ArchwireAlloy;
	lowerSection: ArchwireSection;
	selectedElasticId: string | null;
	selectedActionIds: string[];
	trgValues: Record<string, number>;
	clinicalNotes: string;
	savedAt?: string;
}

/** Создание начального кресельного состояния для 1-клик сохранения без задержек (Мандат 8e) */
export function createDefaultOrthoProtocolState(): OrthoProtocolState {
	return {
		applianceType: "brackets",
		applianceName: "Damon Q2 (Ormco, слот .022)",
		currentMonth: 6,
		totalMonths: 18,
		nextVisitWeeks: 4,
		upperAlloy: "cuniti",
		upperSection: "17x25",
		lowerAlloy: "cuniti",
		lowerSection: "17x25",
		selectedElasticId: "c2_fox",
		selectedActionIds: ["change_ligatures", "cinch_back"],
		trgValues: { sna: 82.2, snb: 80.1, anb: 2.1, u1_na: 22.5, l1_nb: 25.1, fma: 24.8 },
		clinicalNotes: "Плановая активация брекет-системы. Дуги CuNiTi 17×25 ВЧ/НЧ отработали удовлетворительно. Назначены эластики Класс II Fox 3.5 oz.",
	};
}

/** Оценка статуса скелетного класса по углу ANB (Штейнер) */
export function calculateSkeletalClassFromAnb(anbDeg: number): {
	skeletalClass: "I" | "II" | "III";
	labelRu: string;
	description: string;
} {
	if (anbDeg > 4.5) {
		return {
			skeletalClass: "II",
			labelRu: "II Скелетный класс (Дистальный)",
			description: "Ретрогнатия нижней челюсти или прогнатия верхней челюсти. Тяга Class II.",
		};
	}
	if (anbDeg < 0.0) {
		return {
			skeletalClass: "III",
			labelRu: "III Скелетный класс (Мезиальный)",
			description: "Прогнатия нижней челюсти или обратное перекрытие резцов. Тяга Class III.",
		};
	}
	return {
		skeletalClass: "I",
		labelRu: "I Скелетный класс (Норма)",
		description: "Нейтральное сагиттальное соотношение апикальных базисов челюстей.",
	};
}

/** Оценка угла ТРГ относительно клинической нормы */
export function evaluateTrgAngleStatus(key: string, value: number): {
	status: "normal" | "deviation_high" | "deviation_low";
	diff: number;
	badgeLabelRu: string;
} {
	const norm = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === key);
	if (!norm) return { status: "normal", diff: 0, badgeLabelRu: "Норма" };
	const diff = Math.round((value - norm.normDeg) * 10) / 10;
	if (Math.abs(diff) <= norm.toleranceDeg) {
		return { status: "normal", diff, badgeLabelRu: "В норме" };
	}
	if (diff > norm.toleranceDeg) {
		return { status: "deviation_high", diff, badgeLabelRu: `+${diff}° выше нормы` };
	}
	return { status: "deviation_low", diff, badgeLabelRu: `${diff}° ниже нормы` };
}

/** Форматирование краткого протокола активации для дневника SOAP и формы 043/у */
export function formatOrthoProtocolSoapEntry(state: OrthoProtocolState): string {
	const upperAlloyObj = ARCHWIRE_ALLOYS_SSOT.find((a) => a.key === state.upperAlloy)?.shortRu || state.upperAlloy;
	const lowerAlloyObj = ARCHWIRE_ALLOYS_SSOT.find((a) => a.key === state.lowerAlloy)?.shortRu || state.lowerAlloy;
	const elastic = ELASTICS_CATALOG.find((e) => e.id === state.selectedElasticId);
	const actionLabels = state.selectedActionIds
		.map((id) => CHAIRSIDE_ACTIONS_CATALOG.find((a) => a.id === id)?.label)
		.filter(Boolean);

	const parts: string[] = [
		`[ПРОТОКОЛ АКТИВАЦИИ ОРТОДОНТИИ — ${state.applianceName}]`,
		`Этап: Месяц ${state.currentMonth} из ${state.totalMonths}.`,
		`Дуга ВЧ: ${state.upperSection} ${upperAlloyObj}; Дуга НЧ: ${state.lowerSection} ${lowerAlloyObj}.`,
	];
	if (elastic) parts.push(`Тяги: ${elastic.classNameRu} (${elastic.animalName}, ${elastic.forceOz}), схема: ${elastic.hookSchemeRu}.`);
	if (actionLabels.length > 0) parts.push(`Проведено в кресле: ${actionLabels.join("; ")}.`);
	if (state.clinicalNotes) parts.push(`Рекомендации: ${state.clinicalNotes}`);
	parts.push(`Следующий визит через: ${state.nextVisitWeeks} нед.`);
	return parts.join("\n");
}
