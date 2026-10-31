/**
 * @dental/web/components/orthodontics/orthodonticsCatalogData.ts
 *
 * Канонический единый SSOT ортодонтического каталога, классификатора прикуса по Энглю,
 * дуг, эластиков, аппаратуры и 1-клик протокола активации у кресла (Мандаты 8b, 8e, 8x, 8am).
 *
 * Sweet Spot: 300–350 строк.
 */

export type ApplianceCategory = "brackets" | "aligners" | "plate";
export type ArchwireAlloy = "niti" | "cuniti" | "ss" | "tma";
export type ArchwireSection = "0.012" | "0.014" | "0.016" | "0.018" | "16x22" | "17x25" | "19x25";
export type ArchwireShape = "round" | "rectangular";
export type AngleClass = "class_1" | "class_2_1" | "class_2_2" | "class_3";
export type VerticalBite = "normal" | "deep" | "open" | "cross";

export interface ApplianceDef {
	id: string;
	category: ApplianceCategory;
	name: string;
	description: string;
}

export const APPLIANCES_CATALOG: ApplianceDef[] = [
	{ id: "damon_q2", category: "brackets", name: "Damon Q2 (Металл, .022)", description: "Самолигирующая металлическая брекет-система Ormco с пассивным пазом" },
	{ id: "damon_clear", category: "brackets", name: "Damon Clear 2 (Керамика)", description: "Эстетические сапфирово-керамические самолигирующие замки" },
	{ id: "clarity_adv", category: "brackets", name: "3M Clarity Advanced", description: "Ультраэстетичные поликристаллические керамические брекеты" },
	{ id: "incognito", category: "brackets", name: "Incognito (Лингвальные)", description: "Индивидуализированная золотая невидимая язычная система" },
	{ id: "flexiligner", category: "aligners", name: "FlexiLigner (Элайнеры)", description: "Прозрачные биосовместимые полимерные флексы для коррекции окклюзии" },
	{ id: "starsmile", category: "aligners", name: "Star Smile (Элайнеры)", description: "Серия поликарбонатных ортодонтических кап с шагом перемещения 0.25 мм" },
	{ id: "marco_rosa", category: "plate", name: "Аппарат Марко Роса (ВЧ)", description: "Несъемный аппарат для раннего форсированного расширения небного шва" },
	{ id: "bertoni_plate", category: "plate", name: "Пластинка с винтом Бертони", description: "Съемный пластиночный аппарат трехмерного расширения челюсти" },
];

export interface AngleClassificationDef {
	key: AngleClass;
	titleRu: string;
	descriptionRu: string;
}

export const ANGLE_CLASSES_CATALOG: AngleClassificationDef[] = [
	{ key: "class_1", titleRu: "I Класс по Энглю (Нейтральный)", descriptionRu: "Мезиально-щечный бугор 16/26 смыкается с межбугорковой фиссурой 36/46. Аномалии положения отдельных зубов" },
	{ key: "class_2_1", titleRu: "II Класс, 1 подкласс (Дистальный, протрузия)", descriptionRu: "Дистальное положение нижних моляров относительно верхних. Веерообразная протрузия резцов верхней челюсти" },
	{ key: "class_2_2", titleRu: "II Класс, 2 подкласс (Дистальный, ретрузия)", descriptionRu: "Дистальное смыкание моляров с небным наклоном верхних центральных резцов и глубоким перекрытием" },
	{ key: "class_3", titleRu: "III Класс по Энглю (Мезиальный)", descriptionRu: "Мезиальное положение нижних моляров, мезиально-щечный бугор 16/26 позади межбугорковой фиссуры 36/46, обратное перекрытие" },
];

export interface ArchwireAlloyDef {
	key: ArchwireAlloy;
	label: string;
	shortRu: string;
	description: string;
	colorToken: string;
}

export const ARCHWIRE_ALLOYS_SSOT: ArchwireAlloyDef[] = [
	{ key: "niti", label: "NiTi Термоактивный", shortRu: "NiTi", description: "Никель-титан с памятью формы для первичного нивелирования и деротации", colorToken: "var(--teal)" },
	{ key: "cuniti", label: "CuNiTi (Медь-Никель-Титан)", shortRu: "CuNiTi", description: "Сплав с добавлением меди, выражает торк при температуре полости рта", colorToken: "var(--accent-glow, #38bdf8)" },
	{ key: "ss", label: "Сталь SS (Stainless Steel)", shortRu: "Сталь SS", description: "Жесткая медицинская сталь для закрытия экстракционных промежутков и тяг", colorToken: "var(--ink-muted, #94a3b8)" },
	{ key: "tma", label: "ТМА (Титан-Молибден)", shortRu: "ТМА", description: "Бета-титановый сплав для ювелирной детализации и индивидуальных изгибов", colorToken: "var(--warning-ink, #f59e0b)" },
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
	{ id: "c2_fox", classType: "class_2", classNameRu: "Класс II (Дистальный)", force: "medium", forceNameRu: "Средняя", forceOz: "3.5 oz (100 г)", sizeInch: "1/4\"", animalName: "Fox (Лиса)", hookSchemeRu: "Верхний клык (13/23) -> Нижний первый моляр (36/46)" },
	{ id: "c2_bear", classType: "class_2", classNameRu: "Класс II Усиленный", force: "heavy", forceNameRu: "Сильная", forceOz: "4.5 oz (130 г)", sizeInch: "1/4\"", animalName: "Bear (Медведь)", hookSchemeRu: "Верхний клык (13/23) -> Нижний второй моляр (37/47)" },
	{ id: "c3_rabbit", classType: "class_3", classNameRu: "Класс III (Мезиальный)", force: "medium", forceNameRu: "Средняя", forceOz: "3.5 oz (100 г)", sizeInch: "3/16\"", animalName: "Rabbit (Кролик)", hookSchemeRu: "Нижний клык (33/43) -> Верхний первый моляр (16/26)" },
	{ id: "tri_quail", classType: "triangular", classNameRu: "Треугольная тяга", force: "light", forceNameRu: "Легкая", forceOz: "2.5 oz (70 г)", sizeInch: "1/8\"", animalName: "Quail (Перепел)", hookSchemeRu: "Верхний клык -> Нижний клык и премоляр для смыкания" },
	{ id: "oblique_cross", classType: "oblique", classNameRu: "Косая перекрестная", force: "medium", forceNameRu: "Средняя", forceOz: "3.5 oz (100 г)", sizeInch: "5/16\"", animalName: "Penguin (Пингвин)", hookSchemeRu: "Вестибулярно ВЧ -> Орально НЧ для исправления перекреста" },
	{ id: "box_vertical", classType: "box", classNameRu: "Коробчатая (Box)", force: "medium", forceNameRu: "Средняя", forceOz: "3.5 oz (100 г)", sizeInch: "1/4\"", animalName: "Zebra (Зебра)", hookSchemeRu: "Закрытие передней вертикальной щели (12-22 к 32-42)" },
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
	{ key: "sna", name: "Положение верхней челюсти", symbol: "SNA", normDeg: 82, toleranceDeg: 2, unit: "deg", author: "Steiner", interpretationRu: "Угол SN-A. Прогнатия ВЧ при >84°, ретрогнатия при <80°." },
	{ key: "snb", name: "Положение нижней челюсти", symbol: "SNB", normDeg: 80, toleranceDeg: 2, unit: "deg", author: "Steiner", interpretationRu: "Угол SN-B. Прогнатия НЧ при >82°, ретрогнатия при <78°." },
	{ key: "anb", name: "Сагиттальное соотношение челюстей", symbol: "ANB", normDeg: 2, toleranceDeg: 2, unit: "deg", author: "Steiner", interpretationRu: "Разность SNA - SNB. Норма 0°..4° (Класс I). >4.5° — Класс II, <0° — Класс III." },
	{ key: "u1_na", name: "Наклон верхнего резца", symbol: "1-NA", normDeg: 22, toleranceDeg: 2, unit: "deg", author: "Steiner", interpretationRu: "Угол оси верхнего резца к линии N-A. Протрузия при >24°." },
	{ key: "l1_nb", name: "Наклон нижнего резца", symbol: "1-NB", normDeg: 25, toleranceDeg: 2, unit: "deg", author: "Steiner", interpretationRu: "Угол оси нижнего резца к линии N-B. Протрузия при >27°." },
	{ key: "fma", name: "Угол плоскости нижней челюсти", symbol: "FMA", normDeg: 25, toleranceDeg: 3, unit: "deg", author: "Tweed", interpretationRu: "Франкфуртская горизонталь к мандибулярной линии Go-Me. Тип роста." },
];

export interface ChairsideActionItem {
	id: string;
	label: string;
	category: "setup" | "archwire" | "elastics" | "aligners" | "retention";
}

export const CHAIRSIDE_ACTIONS_CATALOG: ChairsideActionItem[] = [
	{ id: "bracket_setup", label: "Установка брекет-системы", category: "setup" },
	{ id: "archwire_replace", label: "Замена ортодонтической дуги", category: "archwire" },
	{ id: "aligner_dispense", label: "Выдача кап элайнеров №1–4", category: "aligners" },
	{ id: "attachments_bonding", label: "Фиксация композитных аттачментов", category: "aligners" },
	{ id: "elastics_prescription", label: "Назначение межчелюстных эластиков", category: "elastics" },
	{ id: "change_ligatures", label: "Замена эластических лигатур", category: "archwire" },
	{ id: "power_chain", label: "Установка эластической цепочки", category: "elastics" },
	{ id: "cinch_back", label: "Загиб дистальных концов дуги", category: "archwire" },
	{ id: "ipr_stripping", label: "Сепарация эмали (IPR стриппинг)", category: "aligners" },
	{ id: "occlusal_stops", label: "Разобщающие окклюзионные накладки", category: "setup" },
	{ id: "debonding_retainer", label: "Снятие аппаратуры и несъемный ретейнер", category: "retention" },
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
		id: "leveling_primary", title: "1. Нивелирование", stageName: "Первичное нивелирование и деротация",
		upperAlloy: "niti", upperSection: "0.014", lowerAlloy: "niti", lowerSection: "0.014",
		elasticId: null, actionIds: ["archwire_replace", "change_ligatures", "cinch_back"], nextVisitWeeks: 6,
	},
	{
		id: "transitional_torque", title: "2. Торк и форма", stageName: "Переходный этап выражения торка",
		upperAlloy: "cuniti", upperSection: "17x25", lowerAlloy: "cuniti", lowerSection: "17x25",
		elasticId: "c2_fox", actionIds: ["archwire_replace", "elastics_prescription"], nextVisitWeeks: 4,
	},
	{
		id: "working_space_closure", title: "3. Закрытие щелей", stageName: "Рабочий этап закрытия промежутков",
		upperAlloy: "ss", upperSection: "19x25", lowerAlloy: "ss", lowerSection: "19x25",
		elasticId: "c2_bear", actionIds: ["power_chain", "cinch_back"], nextVisitWeeks: 4,
	},
	{
		id: "detailing_tma", title: "4. Детализация", stageName: "Юстировка и индивидуальные изгибы",
		upperAlloy: "tma", upperSection: "19x25", lowerAlloy: "tma", lowerSection: "19x25",
		elasticId: "tri_quail", actionIds: ["change_ligatures"], nextVisitWeeks: 3,
	},
	{
		id: "aligners_activation", title: "5. Элайнеры", stageName: "Контроль трекинга кап и аттачментов",
		upperAlloy: "niti", upperSection: "0.014", lowerAlloy: "niti", lowerSection: "0.014",
		elasticId: null, actionIds: ["aligner_dispense", "attachments_bonding", "ipr_stripping"], nextVisitWeeks: 4,
	},
	{
		id: "debonding_stage", title: "6. Снятие и ретенция", stageName: "Фиксация несъемного ретейнера",
		upperAlloy: "ss", upperSection: "19x25", lowerAlloy: "ss", lowerSection: "19x25",
		elasticId: null, actionIds: ["debonding_retainer"], nextVisitWeeks: 8,
	},
];

export interface OrthoPatientMemoSection {
	id: string;
	titleRu: string;
	textRu: string;
}

export const ORTHO_PATIENT_MEMO_SECTIONS: OrthoPatientMemoSection[] = [
	{
		id: "hygiene", titleRu: "Гигиена полости рта при ортодонтическом лечении",
		textRu: "Чистить зубы после каждого приема пищи в течение 3–4 минут. Обязательно использовать ортодонтическую щетку с V-образным углублением, монопучковую щетку для очистки вокруг каждого брекета и межзубные ершики. Ирригатор рекомендуется применять ежедневно вечером на минимальной или средней мощности со специализированной ортодонтической насадкой.",
	},
	{
		id: "wax", titleRu: "Использование ортодонтического воска",
		textRu: "В первые 7–10 дней после установки или смены дуги выступающие элементы брекетов могут вызывать дискомфорт слизистой оболочки губ и щек. Оторвите небольшой кусочек воска размером с горошину, разогрейте его чистыми пальцами и плотно прижмите к замку, натирающему слизистую. Перед приемом пищи воск необходимо снять.",
	},
	{
		id: "diet", titleRu: "Ограничения в питании",
		textRu: "Категорически запрещается откусывать передними зубами твердые продукты: яблоки, груши, морковь, мясо и тосты нарезайте тонкими кусочками. Полностью исключите из рациона орехи, сухарики, лед, ириски, леденцы и жевательную резинку. Употребление твердой или вязкой пищи приводит к отклейке замков брекетов и удлинению срока лечения.",
	},
	{
		id: "elastics_aligners", titleRu: "Режим ношения эластиков и кап",
		textRu: "Межчелюстные эластики и элайнеры требуется носить не менее 22 часов в сутки. Снятие допускается строго во время чистки зубов и основного приема пищи. Замена тяг на свежую пару выполняется 2 раза в день (утром и вечером), так как латекс теряет терапевтическую силу за 12 часов. При утере или поломке капы незамедлительно свяжитесь с клиникой.",
	},
];

export interface OrthoProtocolState {
	applianceCategory: ApplianceCategory;
	applianceId: string;
	applianceName: string;
	angleClass: AngleClass;
	verticalBite: VerticalBite;
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

export function createDefaultOrthoProtocolState(): OrthoProtocolState {
	return {
		applianceCategory: "brackets",
		applianceId: "damon_q2",
		applianceName: "Damon Q2 (Металл, .022)",
		angleClass: "class_1",
		verticalBite: "normal",
		currentMonth: 6,
		totalMonths: 18,
		nextVisitWeeks: 4,
		upperAlloy: "cuniti",
		upperSection: "17x25",
		lowerAlloy: "cuniti",
		lowerSection: "17x25",
		selectedElasticId: "c2_fox",
		selectedActionIds: ["archwire_replace", "change_ligatures", "cinch_back"],
		trgValues: { sna: 82.2, snb: 80.1, anb: 2.1, u1_na: 22.5, l1_nb: 25.1, fma: 24.8 },
		clinicalNotes: "Плановая активация брекет-системы. Динамика смыкания по I классу Энгля положительная. Рекомендовано ношение эластиков Fox 3.5 oz 22 ч/сут.",
	};
}

export function calculateSkeletalClassFromAnb(anbDeg: number): {
	skeletalClass: "I" | "II" | "III";
	labelRu: string;
	description: string;
} {
	if (anbDeg > 4.5) {
		return {
			skeletalClass: "II",
			labelRu: "II Скелетный класс (Дистальный)",
			description: "Ретрогнатия нижней челюсти или прогнатия верхней челюсти. Назначена тяга Class II.",
		};
	}
	if (anbDeg < 0.0) {
		return {
			skeletalClass: "III",
			labelRu: "III Скелетный класс (Мезиальный)",
			description: "Прогнатия нижней челюсти или мезиальное соотношение. Назначена тяга Class III.",
		};
	}
	return {
		skeletalClass: "I",
		labelRu: "I Скелетный класс (Норма)",
		description: "Нейтральное сагиттальное соотношение апикальных базисов челюстей.",
	};
}

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

export function formatOrthoProtocolSoapEntry(state: OrthoProtocolState): string {
	const upperAlloyObj = ARCHWIRE_ALLOYS_SSOT.find((a) => a.key === state.upperAlloy)?.shortRu || state.upperAlloy;
	const lowerAlloyObj = ARCHWIRE_ALLOYS_SSOT.find((a) => a.key === state.lowerAlloy)?.shortRu || state.lowerAlloy;
	const elastic = ELASTICS_CATALOG.find((e) => e.id === state.selectedElasticId);
	const angleObj = ANGLE_CLASSES_CATALOG.find((ac) => ac.key === state.angleClass);
	const actionLabels = state.selectedActionIds
		.map((id) => CHAIRSIDE_ACTIONS_CATALOG.find((a) => a.id === id)?.label)
		.filter(Boolean);

	const parts: string[] = [
		`[ПРОТОКОЛ ПРИЁМА ОРТОДОНТА — ${state.applianceName}]`,
		`Диагноз окклюзии: ${angleObj?.titleRu || "I класс по Энглю"}.`,
		`Этап ортодонтического лечения: месяц ${state.currentMonth} из ${state.totalMonths}.`,
		`Дуга на верхней челюсти: ${state.upperSection} ${upperAlloyObj}; Дуга на нижней челюсти: ${state.lowerSection} ${lowerAlloyObj}.`,
	];
	if (elastic) parts.push(`Межчелюстная тяга: ${elastic.classNameRu} (${elastic.animalName}, сила ${elastic.forceOz}), схема фиксации: ${elastic.hookSchemeRu}.`);
	if (actionLabels.length > 0) parts.push(`Манипуляции у кресла: ${actionLabels.join("; ")}.`);
	if (state.clinicalNotes) parts.push(`Клинические заметки: ${state.clinicalNotes}`);
	parts.push(`Назначен следующий визит активации через ${state.nextVisitWeeks} нед.`);
	return parts.join("\n");
}

export function getOrthoPatientMemoText(): string {
	return ORTHO_PATIENT_MEMO_SECTIONS.map((sec) => `${sec.titleRu.toUpperCase()}\n${sec.textRu}`).join("\n\n");
}
