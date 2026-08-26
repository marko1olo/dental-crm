/**
 * ============================================================================
 * SANPIN 3.3686-21 & GOST ISO 11140-1 CHEMICAL INTEGRATORS CATALOG
 * Справочник химических индикаторов классов 4 (многопараметрические),
 * 5 (интегрирующие) и 6 (имитаторы / эмуляторы) для паровых автоклавов и сухожаров.
 * ============================================================================
 */

import { type SterilizationRegimeId } from "./kraftBagSanpinMath";

export type ChemicalIndicatorClassType = "class_4" | "class_5" | "class_6";

export interface ChemicalIntegratorDefinition {
	readonly id: string;
	readonly code: string;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly brandRu: string;
	readonly manufacturerRu: string;
	readonly classType: ChemicalIndicatorClassType;
	readonly classLabelRu: string;
	readonly classDescriptionRu: string;
	readonly regimeId: SterilizationRegimeId;
	readonly regimeLabelRu: string;
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly initialColorHex: string;
	readonly initialColorNameRu: string;
	readonly targetColorHex: string;
	readonly targetColorNameRu: string;
	readonly failColorHex?: string;
	readonly failColorNameRu?: string;
	readonly placementLocationRu: string;
	readonly interpretationRuleRu: string;
	readonly sanpinNormClauseRu: string;
	readonly gostStandardRu: string;
	readonly isCriticalSurgeryRecommended: boolean;
}

export const CHEMICAL_INTEGRATORS_CATALOG: readonly ChemicalIntegratorDefinition[] = [
	// ─────────────────────────────────────────────────────────────────────────
	// КЛАСС 4: МНОГОПАРАМЕТРИЧЕСКИЕ ИНДИКАТОРЫ (MULTIVARIABLE)
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: "vinar_steritest_4_134",
		code: "СТ-134-4",
		nameRu: "СтериТЕСТ-В 134/5 (Класс 4)",
		shortLabelRu: "СтериТЕСТ-В 134/5 (Кл. 4, Винар)",
		brandRu: "СтериТЕСТ-В",
		manufacturerRu: "НПФ «Винар», Россия",
		classType: "class_4",
		classLabelRu: "Класс 4 (Многопараметрический)",
		classDescriptionRu: "Контролирует 2 и более критические переменные (температуру 134°C и время выдержки 5 мин).",
		regimeId: "steam_134_5min",
		regimeLabelRu: "Пар 134°C / 5 мин / 2.0 бар",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#fb7185", // Светло-розовый
		initialColorNameRu: "Светло-розовый / бежевый",
		targetColorHex: "#3b1a0e", // Темно-коричневый
		targetColorNameRu: "Темно-коричневый (не светлее эталона)",
		failColorHex: "#fb923c",
		failColorNameRu: "Светло-коричневый / рыжий (недостерилизация)",
		placementLocationRu: "Внутри каждого крафт-пакета и в 5 контрольных точках камеры автоклава (КТ-1..5)",
		interpretationRuleRu: "Цвет конечного состояния индикаторной метки должен быть темно-коричневым или черным, совпадать с эталоном сравнения или быть темнее его.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3638, ГОСТ ISO 11140-1-2011",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 4)",
		isCriticalSurgeryRecommended: false,
	},
	{
		id: "vinar_steritest_4_121",
		code: "СТ-121-4",
		nameRu: "СтериТЕСТ-В 121/20 (Класс 4)",
		shortLabelRu: "СтериТЕСТ-В 121/20 (Кл. 4, Винар)",
		brandRu: "СтериТЕСТ-В",
		manufacturerRu: "НПФ «Винар», Россия",
		classType: "class_4",
		classLabelRu: "Класс 4 (Многопараметрический)",
		classDescriptionRu: "Контроль щадящего режима паровой стерилизации 121°C / 20 мин для термолабильных изделий.",
		regimeId: "steam_121_20min",
		regimeLabelRu: "Пар 121°C / 20 мин / 1.1 бар",
		targetTemperatureCelsius: 121,
		targetPressureBar: 1.15,
		targetExposureMinutes: 20,
		initialColorHex: "#c084fc", // Фиолетовый
		initialColorNameRu: "Фиолетовый",
		targetColorHex: "#14532d", // Темно-зеленый
		targetColorNameRu: "Темно-зеленый / оливково-черный",
		failColorHex: "#a855f7",
		failColorNameRu: "Светло-фиолетовый (брак)",
		placementLocationRu: "Внутри пакетов с термолабильными изделиями (резина, латекс, оптика)",
		interpretationRuleRu: "Переход из фиолетового в темно-зеленый цвет сравнения.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3638",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 4)",
		isCriticalSurgeryRecommended: false,
	},
	{
		id: "medtest_medis_4_134",
		code: "МИС-134-4",
		nameRu: "МедИС-134/5 (Класс 4)",
		shortLabelRu: "МедИС-134/5 (Кл. 4, Медтест)",
		brandRu: "МедИС",
		manufacturerRu: "ООО «Медтест», Россия",
		classType: "class_4",
		classLabelRu: "Класс 4 (Многопараметрический)",
		classDescriptionRu: "Химический многопеременный индикатор для паровой стерилизации 134°C / 5 мин.",
		regimeId: "steam_134_5min",
		regimeLabelRu: "Пар 134°C / 5 мин / 2.0 бар",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#facc15", // Ярко-желтый
		initialColorNameRu: "Желтый",
		targetColorHex: "#542408", // Коричнево-бурый
		targetColorNameRu: "Темно-коричневый",
		failColorHex: "#fde047",
		failColorNameRu: "Неизмененный желтый (брак)",
		placementLocationRu: "Внутри упаковок и контрольных точках стерилизатора",
		interpretationRuleRu: "При неполном переходе цвета в коричневый цикл признается недействительным.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3638",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 4)",
		isCriticalSurgeryRecommended: false,
	},
	{
		id: "medtest_medis_4_180_dry",
		code: "МИС-180-4",
		nameRu: "МедИС-В-180/60 Сухожар (Класс 4)",
		shortLabelRu: "МедИС-В-180/60 (Кл. 4, Сухожар)",
		brandRu: "МедИС",
		manufacturerRu: "ООО «Медтест», Россия",
		classType: "class_4",
		classLabelRu: "Класс 4 (Многопараметрический)",
		classDescriptionRu: "Контроль воздушной стерилизации (сухожар) 180°C / 60 мин.",
		regimeId: "dry_heat_180_60min",
		regimeLabelRu: "Сухожар 180°C / 60 мин",
		targetTemperatureCelsius: 180,
		targetPressureBar: 0,
		targetExposureMinutes: 60,
		initialColorHex: "#38bdf8", // Голубой
		initialColorNameRu: "Светло-голубой",
		targetColorHex: "#451a03", // Темно-коричневый
		targetColorNameRu: "Темно-коричневый",
		failColorHex: "#7dd3fc",
		failColorNameRu: "Светло-коричневый с синевой (недогрев)",
		placementLocationRu: "Внутри крафт-пакетов для сухожара и в 5 точках камеры воздушного стерилизатора",
		interpretationRuleRu: "Полный переход из голубого в темно-коричневый эталонный цвет.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3640",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 4)",
		isCriticalSurgeryRecommended: false,
	},

	// ─────────────────────────────────────────────────────────────────────────
	// КЛАСС 5: ИНТЕГРИРУЮЩИЕ ИНДИКАТОРЫ (INTEGRATORS)
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: "vinar_intetest_5_134",
		code: "ИТ-134-5",
		nameRu: "ИнтеТЕСТ-В Интегратор (Класс 5)",
		shortLabelRu: "ИнтеТЕСТ-В (Кл. 5 Интегратор, Винар)",
		brandRu: "ИнтеТЕСТ-В",
		manufacturerRu: "НПФ «Винар», Россия",
		classType: "class_5",
		classLabelRu: "Класс 5 (Интегрирующий индикатор)",
		classDescriptionRu: "Интегрирует все параметры (температура, пар, время, давление). Эквивалентен биологическому тесту Geobacillus stearothermophilus.",
		regimeId: "steam_134_5min",
		regimeLabelRu: "Пар 134°C / 5 мин (Интегратор SV)",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		targetExposureMinutes: 5,
		initialColorHex: "#cbd5e1", // Светло-серый/бежевый
		initialColorNameRu: "Светло-бежевый / серый",
		targetColorHex: "#0f172a", // Глубокий сине-черный
		targetColorNameRu: "Глубокий сине-черный эталон",
		failColorHex: "#64748b",
		failColorNameRu: "Серый / сиреневый (сбой интеграции)",
		placementLocationRu: "Внутри каждого хирургического и имплантологического пакета, а также в контрольном пакете загрузки",
		interpretationRuleRu: "Срабатывает только при 100% проникновении сухого насыщенного пара и достижении летальной дозы для спор микроорганизмов.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3639, ГОСТ ISO 11140-1 Класс 5",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 5 Интегратор)",
		isCriticalSurgeryRecommended: true,
	},
	{
		id: "medtest_is5_134",
		code: "ИС-134-5",
		nameRu: "ИС-134/5 Интегратор (Класс 5)",
		shortLabelRu: "ИС-134/5 (Кл. 5 Интегратор, Медтест)",
		brandRu: "ИС Интегратор",
		manufacturerRu: "ООО «Медтест», Россия",
		classType: "class_5",
		classLabelRu: "Класс 5 (Интегрирующий индикатор)",
		classDescriptionRu: "Высокоточный паровой интегратор для контроля стоматологических наборов премиум-класса.",
		regimeId: "steam_134_5min",
		regimeLabelRu: "Пар 134°C / 5.5 мин / 2.1 бар",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		targetExposureMinutes: 5.5,
		initialColorHex: "#e2e8f0",
		initialColorNameRu: "Светло-серый",
		targetColorHex: "#020617",
		targetColorNameRu: "Абсолютный черный",
		failColorHex: "#94a3b8",
		failColorNameRu: "Пепельно-серый (не пройден)",
		placementLocationRu: "Внутри критических пакетов (хирургические лотки, импланты, костные скребки)",
		interpretationRuleRu: "Равномерный угольно-черный цвет по всей площади индикаторного элемента.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3639",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 5)",
		isCriticalSurgeryRecommended: true,
	},
	{
		id: "threem_comply_1243a",
		code: "3M-1243A",
		nameRu: "3M Comply 1243A Steam Chemical Integrator (Класс 5)",
		shortLabelRu: "3M Comply 1243A (Кл. 5, 3M USA)",
		brandRu: "3M Comply",
		manufacturerRu: "3M Health Care, USA",
		classType: "class_5",
		classLabelRu: "Класс 5 (Интегратор скользящего фронта)",
		classDescriptionRu: "Интегратор капиллярного продвижения химического вещества в зону «ACCEPT» при летальности спорового уровня.",
		regimeId: "steam_134_5min",
		regimeLabelRu: "Пар 118–138°C (Универсальный)",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		targetExposureMinutes: 5,
		initialColorHex: "#fef08a",
		initialColorNameRu: "Желтый стартовый маркер",
		targetColorHex: "#15803d",
		targetColorNameRu: "Темно-синяя полоса в зеленом окне «ACCEPT»",
		failColorHex: "#dc2626",
		failColorNameRu: "Остановка в красном окне «REJECT»",
		placementLocationRu: "В центре каждой стерилизационной корзины и кассеты",
		interpretationRuleRu: "Темный фронт расплава химического вещества должен войти в зеленую зону «ACCEPT». При попадании в «REJECT» — весь цикл бракуется.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3639, ANSI/AAMI/ISO 11140-1:2014 Type 5",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 5 / Type 5)",
		isCriticalSurgeryRecommended: true,
	},

	// ─────────────────────────────────────────────────────────────────────────
	// КЛАСС 6: ИНДИКАТОРЫ-ИМИТАТОРЫ / ЭМУЛЯТОРЫ (EMULATING INDICATORS)
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: "vinar_emu_6_134",
		code: "ЭМУ-134-6",
		nameRu: "ЭМУ-134/5 Индикатор-имитатор (Класс 6)",
		shortLabelRu: "ЭМУ-134/5 (Кл. 6 Имитатор, Винар)",
		brandRu: "ЭМУ Имитатор",
		manufacturerRu: "НПФ «Винар», Россия",
		classType: "class_6",
		classLabelRu: "Класс 6 (Индикатор-имитатор / Эмулятор)",
		classDescriptionRu: "Высший класс химического контроля. Срабатывает строго при 100% выполнении параметров режима с погрешностью не более ±1°C и ±5% времени.",
		regimeId: "steam_134_5min",
		regimeLabelRu: "Пар 134°C / 5.0 мин (100% эмуляция)",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		targetExposureMinutes: 5,
		initialColorHex: "#e879f9", // Пурпурно-розовый
		initialColorNameRu: "Ярко-пурпурный",
		targetColorHex: "#064e3b", // Темно-зеленый (изумрудно-черный)
		targetColorNameRu: "Темно-зеленый эталон",
		failColorHex: "#d946ef",
		failColorNameRu: "Фиолетовый / недостижение 100% времени (брак)",
		placementLocationRu: "Внутри критических хирургических пакетов и тесте Helix PCD",
		interpretationRuleRu: "Отказ (недостерилизация) даже при 95% времени цикла (при 4.5 мин вместо 5.0 мин цвет не перейдет в темно-зеленый).",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3639, ГОСТ ISO 11140-1 Класс 6",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 6 Эмулятор)",
		isCriticalSurgeryRecommended: true,
	},
	{
		id: "medtest_emu_6_134",
		code: "МИС-ЭМУ-134-6",
		nameRu: "МедИС-ЭМУ-134/5.5 (Класс 6)",
		shortLabelRu: "МедИС-ЭМУ 134/5.5 (Кл. 6, Медтест)",
		brandRu: "МедИС-ЭМУ",
		manufacturerRu: "ООО «Медтест», Россия",
		classType: "class_6",
		classLabelRu: "Класс 6 (Индикатор-имитатор)",
		classDescriptionRu: "Прецизионный эмулятор для строжайшего аудита автоклавов B-класса (Melag, Sirona, Euronda).",
		regimeId: "steam_134_5min",
		regimeLabelRu: "Пар 134°C / 5.5 мин / 2.15 бар",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.15,
		targetExposureMinutes: 5.5,
		initialColorHex: "#fb923c", // Оранжевый
		initialColorNameRu: "Оранжевый",
		targetColorHex: "#171717", // Угольно-черный
		targetColorNameRu: "Угольно-черный",
		failColorHex: "#f97316",
		failColorNameRu: "Оранжево-коричневый (брак)",
		placementLocationRu: "В сложных полостных наконечниках, турбинах и костных наборах",
		interpretationRuleRu: "Полный цветовой переход гарантирует 100% стерильность в самых труднодоступных полостях инструментов.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3639",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 6)",
		isCriticalSurgeryRecommended: true,
	},
	{
		id: "vinar_emu_6_180_dry",
		code: "ЭМУ-180-6",
		nameRu: "ЭМУ-ГП-180/60 Сухожар (Класс 6)",
		shortLabelRu: "ЭМУ-ГП-180/60 (Кл. 6 Сухожар, Винар)",
		brandRu: "ЭМУ-ГП",
		manufacturerRu: "НПФ «Винар», Россия",
		classType: "class_6",
		classLabelRu: "Класс 6 (Индикатор-имитатор сухожара)",
		classDescriptionRu: "Эмулятор воздушного метода стерилизации 180°C / 60 мин с предельной точностью времени выдержки.",
		regimeId: "dry_heat_180_60min",
		regimeLabelRu: "Сухожар 180°C / 60 мин (100% эмуляция)",
		targetTemperatureCelsius: 180,
		targetPressureBar: 0,
		targetExposureMinutes: 60,
		initialColorHex: "#f43f5e", // Малиновый
		initialColorNameRu: "Ярко-малиновый",
		targetColorHex: "#1c1917", // Темно-коричневый / черный
		targetColorNameRu: "Черно-коричневый эталон",
		failColorHex: "#fb7185",
		failColorNameRu: "Малиново-бурый (брак выдержки)",
		placementLocationRu: "Внутри крафт-пакетов и на всех 5 полках сушильного шкафа",
		interpretationRuleRu: "Цвет метки сравнивается с эталоном. Неполный переход указывает на просадку температуры в сухожаре.",
		sanpinNormClauseRu: "СанПиН 3.3686-21 п. 3640",
		gostStandardRu: "ГОСТ ISO 11140-1 (Класс 6)",
		isCriticalSurgeryRecommended: true,
	},
];

/**
 * Получить список всех химических индикаторов
 */
export function getAllChemicalIntegrators(): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG;
}

/**
 * Получить индикатор по ID
 */
export function getChemicalIntegratorById(id: string): ChemicalIntegratorDefinition | undefined {
	return CHEMICAL_INTEGRATORS_CATALOG.find((item) => item.id === id);
}

/**
 * Получить индикаторы для указанного режима стерилизации
 */
export function getChemicalIntegratorsByRegime(regimeId: SterilizationRegimeId): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG.filter((item) => item.regimeId === regimeId);
}

/**
 * Получить индикаторы по классу (4, 5, 6)
 */
export function getChemicalIntegratorsByClass(classType: ChemicalIndicatorClassType): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG.filter((item) => item.classType === classType);
}

export type VisualIndicatorMatchState =
	| "match_reference"
	| "darker_than_reference"
	| "lighter_than_reference"
	| "unchanged_initial";

export interface IntegratorEvaluationResult {
	readonly isValid: boolean;
	readonly integrator: ChemicalIntegratorDefinition;
	readonly matchState: VisualIndicatorMatchState;
	readonly verdictRu: string;
	readonly statusColorHex: string;
	readonly allowsClinicalUse: boolean;
	readonly protocolNoteRu: string;
}

/**
 * Оценка визуального совпадения цвета химического индикатора с эталоном
 */
export function evaluateChemicalIntegratorColorMatch(
	integratorId: string,
	matchState: VisualIndicatorMatchState,
): IntegratorEvaluationResult {
	const integrator = getChemicalIntegratorById(integratorId) || CHEMICAL_INTEGRATORS_CATALOG[0]!;

	let isValid = false;
	let verdictRu = "";
	let statusColorHex = "#ef4444";
	let allowsClinicalUse = false;
	let protocolNoteRu = "";

	switch (matchState) {
		case "match_reference":
			isValid = true;
			allowsClinicalUse = true;
			statusColorHex = "#10b981";
			verdictRu = `Цвет метки индикатора точно соответствует эталону (${integrator.targetColorNameRu}). Стерилизация подтверждена.`;
			protocolNoteRu = `Хим. контроль (${integrator.shortLabelRu}): СООТВЕТСТВУЕТ ЭТАЛОНУ. Допущен к работе.`;
			break;

		case "darker_than_reference":
			isValid = true;
			allowsClinicalUse = true;
			statusColorHex = "#059669";
			verdictRu = `Цвет метки индикатора темнее эталона (${integrator.targetColorNameRu}). Достигнута избыточная стерилизующая доза.`;
			protocolNoteRu = `Хим. контроль (${integrator.shortLabelRu}): ТЕМНЕЕ ЭТАЛОНА (100%+ доза). Допущен.`;
			break;

		case "lighter_than_reference":
			isValid = false;
			allowsClinicalUse = false;
			statusColorHex = "#f59e0b";
			verdictRu = `БРАК: Цвет метки светлее эталона (${integrator.targetColorNameRu}). Режим выдержки или температура не достигли нормы. Использование запрещено.`;
			protocolNoteRu = `Хим. контроль (${integrator.shortLabelRu}): БРАК (СВЕТЛЕЕ ЭТАЛОНА). Забраковано.`;
			break;

		case "unchanged_initial":
			isValid = false;
			allowsClinicalUse = false;
			statusColorHex = "#ef4444";
			verdictRu = `КРИТИЧЕСКИЙ БРАК: Цвет метки остался исходным (${integrator.initialColorNameRu}). Полный сбой цикла стерилизатора!`;
			protocolNoteRu = `Хим. контроль (${integrator.shortLabelRu}): КРИТИЧЕСКИЙ БРАК (ЦВЕТ НЕ ИЗМЕНИЛСЯ). Аварийный вызов инженера.`;
			break;
	}

	return {
		isValid,
		integrator,
		matchState,
		verdictRu,
		statusColorHex,
		allowsClinicalUse,
		protocolNoteRu,
	};
}

/**
 * Рекомендация подходящего индикатора для партии
 */
export function getRecommendedIntegrator(
	regimeId: SterilizationRegimeId,
	options?: { forCriticalSurgery?: boolean; preferredClass?: ChemicalIndicatorClassType },
): ChemicalIntegratorDefinition {
	const candidates = getChemicalIntegratorsByRegime(regimeId);
	if (candidates.length === 0) return CHEMICAL_INTEGRATORS_CATALOG[0]!;

	if (options?.preferredClass) {
		const byClass = candidates.find((c) => c.classType === options.preferredClass);
		if (byClass) return byClass;
	}

	if (options?.forCriticalSurgery) {
		// Для хирургии рекомендуем Класс 5 или Класс 6
		const class6 = candidates.find((c) => c.classType === "class_6");
		if (class6) return class6;
		const class5 = candidates.find((c) => c.classType === "class_5");
		if (class5) return class5;
	}

	// По умолчанию возвращаем первый подходящий по режиму (например, проверенный Класс 4/5)
	return candidates[0]!;
}
