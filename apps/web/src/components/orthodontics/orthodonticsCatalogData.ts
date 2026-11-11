/**
 * @dental/web/components/orthodontics/orthodonticsCatalogData.ts
 *
 * Канонический SSOT ортодонтического каталога, классификатора Энгля,
 * дуг, эластиков, аппаратуры, фотопротокола и элайнеров (Мандаты 8b, 8e, 8x, 8am).
 *
 * Sweet Spot: 300–350 строк (Мандат 8b/8zi).
 */

import type { ArchwireMaterial } from "@dental/shared/orthodontics/types.js";

export type ApplianceCategory = "brackets" | "aligners" | "plate";
export type ArchwireAlloy = "niti" | "cuniti" | "ss" | "tma" | ArchwireMaterial;
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

export interface OrthoPhotoSlotDef {
	id: "frontal_rest" | "frontal_smile" | "profile" | "occlusion_right" | "occlusion_center" | "occlusion_left";
	titleRu: string;
	category: "portrait" | "intraoral";
	descriptionRu: string;
}

export const ORTHO_PHOTO_SLOTS_SSOT: OrthoPhotoSlotDef[] = [
	{ id: "frontal_rest", titleRu: "Анфас в покое", category: "portrait", descriptionRu: "Симметрия лица, пропорции третей, смыкание губ" },
	{ id: "frontal_smile", titleRu: "Анфас с улыбкой", category: "portrait", descriptionRu: "Линия улыбки, экспозиция резцов, щечные коридоры" },
	{ id: "profile", titleRu: "Профиль лица", category: "portrait", descriptionRu: "Носогубный угол, профиль по Риккетсу, положение губ" },
	{ id: "occlusion_right", titleRu: "Окклюзия справа", category: "intraoral", descriptionRu: "Класс смыкания по молярам и клыкам (16-46, 13-43)" },
	{ id: "occlusion_center", titleRu: "Окклюзия по центру", category: "intraoral", descriptionRu: "Совпадение центральных линий, перекрытие резцов" },
	{ id: "occlusion_left", titleRu: "Окклюзия слева", category: "intraoral", descriptionRu: "Класс смыкания по молярам и клыкам (26-36, 23-33)" },
];

export interface AlignerTrackingState {
	currentStep: number;
	totalSteps: number;
	wearDaysPerStep: number;
	issuedSetsCount: number;
	nextPlannedDate: string;
	iprCompleted: boolean;
	attachmentsVerified: boolean;
}

export interface ChairsideActionItem {
	id: string;
	label: string;
	category: "setup" | "archwire" | "elastics" | "aligners" | "retention";
}

export const CHAIRSIDE_ACTIONS_CATALOG: ChairsideActionItem[] = [
	{ id: "bracket_setup", label: "Установка брекет-системы", category: "setup" },
	{ id: "archwire_replace", label: "Замена ортодонтической дуги", category: "archwire" },
	{ id: "aligner_dispense", label: "Выдача комплекта элайнеров", category: "aligners" },
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
		id: "class_1_norm", title: "✓ Класс I (Норма ANB 2°)", stageName: "Скелетный класс I (нейтральное соотношение челюстей, ANB 2°)",
		upperAlloy: "cuniti", upperSection: "17x25", lowerAlloy: "cuniti", lowerSection: "17x25",
		elasticId: null, actionIds: ["archwire_replace", "change_ligatures"], nextVisitWeeks: 4,
	},
	{
		id: "wire_niti_014", title: "✓ Активация дуги (NiTi 0.014)", stageName: "Первичное нивелирование и деротация дугой NiTi .014",
		upperAlloy: "niti", upperSection: "0.014", lowerAlloy: "niti", lowerSection: "0.014",
		elasticId: null, actionIds: ["archwire_replace", "change_ligatures", "cinch_back"], nextVisitWeeks: 6,
	},
	{
		id: "aligners_28d", title: "✓ Выдача кап (2 шт. на 28 дн.)", stageName: "Выдача следующего комплекта элайнеров (2 шага по 14 дней)",
		upperAlloy: "niti", upperSection: "0.014", lowerAlloy: "niti", lowerSection: "0.014",
		elasticId: null, actionIds: ["aligner_dispense", "attachments_bonding"], nextVisitWeeks: 4,
	},
	{
		id: "working_space_closure", title: "Закрытие щелей (SS)", stageName: "Рабочий этап закрытия промежутков на стальных дугах",
		upperAlloy: "ss", upperSection: "19x25", lowerAlloy: "ss", lowerSection: "19x25",
		elasticId: "c2_bear", actionIds: ["power_chain", "cinch_back"], nextVisitWeeks: 4,
	},
	{
		id: "detailing_tma", title: "Детализация (ТМА)", stageName: "Юстировка и индивидуальные изгибы на дугах ТМА",
		upperAlloy: "tma", upperSection: "19x25", lowerAlloy: "tma", lowerSection: "19x25",
		elasticId: "tri_quail", actionIds: ["change_ligatures"], nextVisitWeeks: 3,
	},
	{
		id: "debonding_stage", title: "Снятие и ретенция", stageName: "Фиксация несъемного ретейнера",
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
		textRu: "Чистить зубы после каждого приема пищи в течение 3–4 минут ортодонтической щеткой с V-образным пазом, монопучком и ершиками. Ирригатор рекомендуется применять ежедневно вечером со специализированной насадкой.",
	},
	{
		id: "wax", titleRu: "Использование ортодонтического воска",
		textRu: "В первые 7–10 дней после смены дуги выступающие замки могут натирать слизистую щек или губ. Оторвите шарик воска с горошину, согрейте чистыми пальцами и прижмите к замку. Перед приемом пищи воск необходимо снять.",
	},
	{
		id: "diet", titleRu: "Ограничения в питании",
		textRu: "Запрещается откусывать передними зубами жесткие продукты: яблоки, груши, морковь и тосты нарезайте тонкими кусочками. Исключите орехи, сухарики, ириски и жевательную резинку во избежание отклейки замков брекетов.",
	},
	{
		id: "elastics_aligners", titleRu: "Режим ношения эластиков и кап",
		textRu: "Межчелюстные эластики и элайнеры требуется носить не менее 22 часов в сутки. Снятие допускается строго во время еды и чистки зубов. Замена тяг выполняется дважды в день. При поломке капы немедленно свяжитесь с клиникой.",
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
	currentStageIndex?: number;
	nextVisitWeeks: number;
	upperAlloy: ArchwireAlloy;
	upperSection: ArchwireSection;
	lowerAlloy: ArchwireAlloy;
	lowerSection: ArchwireSection;
	selectedElasticId: string | null;
	selectedActionIds: string[];
	trgValues: Record<string, number> | null;
	alignerTracking: AlignerTrackingState;
	photoStatuses: Record<string, boolean>;
	clinicalNotes: string;
	notes?: string;
	savedAt?: string;
}

export function createDefaultOrthoProtocolState(): OrthoProtocolState {
	return {
		applianceCategory: "brackets",
		applianceId: "damon_q2",
		applianceName: "Damon Q2 (Металл, .022)",
		angleClass: "class_1",
		verticalBite: "normal",
		currentMonth: 0,
		totalMonths: 18,
		currentStageIndex: 0,
		nextVisitWeeks: 4,
		upperAlloy: "niti",
		upperSection: "0.014",
		lowerAlloy: "niti",
		lowerSection: "0.014",
		selectedElasticId: null,
		selectedActionIds: [],
		trgValues: null,
		alignerTracking: {
			currentStep: 0,
			totalSteps: 24,
			wearDaysPerStep: 14,
			issuedSetsCount: 0,
			nextPlannedDate: "",
			iprCompleted: false,
			attachmentsVerified: false,
		},
		photoStatuses: {},
		clinicalNotes: "",
		notes: "",
	};
}

export function calculateSkeletalClassFromAnb(anbDeg: number): {
	skeletalClass: "I" | "II" | "III";
	labelRu: string;
	description: string;
} {
	if (anbDeg > 4.5) {
		return { skeletalClass: "II", labelRu: "II Скелетный класс (Дистальный)", description: "Ретрогнатия нижней челюсти или прогнатия верхней челюсти. Назначена тяга Class II." };
	}
	if (anbDeg < 0.0) {
		return { skeletalClass: "III", labelRu: "III Скелетный класс (Мезиальный)", description: "Прогнатия нижней челюсти или мезиальное соотношение. Назначена тяга Class III." };
	}
	return { skeletalClass: "I", labelRu: "I Скелетный класс (Норма)", description: "Нейтральное сагиттальное соотношение апикальных базисов челюстей." };
}

export function evaluateTrgAngleStatus(key: string, value: number): {
	status: "normal" | "deviation_high" | "deviation_low";
	diff: number;
	badgeLabelRu: string;
} {
	const norm = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === key);
	if (!norm) return { status: "normal", diff: 0, badgeLabelRu: "Норма" };
	const diff = Math.round((value - norm.normDeg) * 10) / 10;
	if (Math.abs(diff) <= norm.toleranceDeg) return { status: "normal", diff, badgeLabelRu: "В норме" };
	if (diff > norm.toleranceDeg) return { status: "deviation_high", diff, badgeLabelRu: `+${diff}° выше нормы` };
	return { status: "deviation_low", diff, badgeLabelRu: `${diff}° ниже нормы` };
}

export function formatOrthoProtocolSoapEntry(state: OrthoProtocolState): string {
	const upperAlloyObj = ARCHWIRE_ALLOYS_SSOT.find((a) => a.key === state.upperAlloy)?.shortRu || state.upperAlloy;
	const lowerAlloyObj = ARCHWIRE_ALLOYS_SSOT.find((a) => a.key === state.lowerAlloy)?.shortRu || state.lowerAlloy;
	const elastic = ELASTICS_CATALOG.find((e) => e.id === state.selectedElasticId);
	const angleObj = ANGLE_CLASSES_CATALOG.find((ac) => ac.key === state.angleClass);
	const actionLabels = state.selectedActionIds.map((id) => CHAIRSIDE_ACTIONS_CATALOG.find((a) => a.id === id)?.label).filter(Boolean);

	const parts: string[] = [
		`[ПРОТОКОЛ ПРИЁМА ОРТОДОНТА — ${state.applianceName}]`,
		`Диагноз окклюзии: ${angleObj?.titleRu || "I класс по Энглю"}.`,
		state.currentMonth > 0
			? `Этап ортодонтического лечения: месяц ${state.currentMonth} из ${state.totalMonths}.`
			: `Этап ортодонтического лечения: первичный этап (подготовка и фиксация).`,
	];
	if (state.applianceCategory === "aligners") {
		parts.push(`Элайнеры: шаг ${state.alignerTracking.currentStep} из ${state.alignerTracking.totalSteps} (смена каждые ${state.alignerTracking.wearDaysPerStep} дн.). Выдано: ${state.alignerTracking.issuedSetsCount} компл.${state.alignerTracking.nextPlannedDate ? ` Плановый переход: ${state.alignerTracking.nextPlannedDate}.` : ""}`);
	} else {
		parts.push(`Дуга на верхней челюсти: ${state.upperSection} ${upperAlloyObj}; Дуга на нижней челюсти: ${state.lowerSection} ${lowerAlloyObj}.`);
	}
	if (elastic) parts.push(`Межчелюстная тяга: ${elastic.classNameRu} (${elastic.animalName}, сила ${elastic.forceOz}), схема фиксации: ${elastic.hookSchemeRu}.`);
	if (actionLabels.length > 0) parts.push(`Манипуляции у кресла: ${actionLabels.join("; ")}.`);
	if (state.clinicalNotes || state.notes) parts.push(`Клинические заметки: ${state.clinicalNotes || state.notes}`);
	parts.push(`Назначен следующий визит активации через ${state.nextVisitWeeks} нед.`);
	return parts.join("\n");
}

export function getOrthoPatientMemoText(): string {
	return ORTHO_PATIENT_MEMO_SECTIONS.map((sec) => `${sec.titleRu.toUpperCase()}\n${sec.textRu}`).join("\n\n");
}
