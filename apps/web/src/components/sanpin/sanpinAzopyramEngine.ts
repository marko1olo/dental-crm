/**
 * ============================================================================
 * SANPIN 3.3686-21 & MU 287-113 AZOPYRAM & PHENOLPHTHALEIN CONTROL ENGINE
 * Высокоточный клинический движок контроля предстерилизационной очистки (ПСО)
 * и регламентных проб на скрытую кровь и остатки щелочных моющих средств.
 * Форма № 366/у и Форма № 257/у для проверок Роспотребнадзора.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATUTORY REGULATORY CONSTANTS & NORMS
// ─────────────────────────────────────────────────────────────────────────────

export const SANPIN_AZOPYRAM_NORMS = {
	standardNameRu: "СанПиН 3.3686-21",
	standardSectionRu: "Раздел IV. Профилактика инфекционных болезней при оказании медицинской помощи",
	guidelineDocRu: "Методические указания МУ 287-113 от 30.12.1998 г.",
	form366TitleRu: "Форма № 366/у — Журнал учета качества предстерилизационной обработки",
	form257TitleRu: "Форма № 257/у — Журнал работы стерилизаторов (автоклавов и воздушных)",

	/**
	 * Срок годности рабочего раствора азопирама при комнатной температуре (18–23°C).
	 * По СанПиН и инструкции производителя: строго не более 2 часов (120 минут).
	 * По истечении 2 часов раствор спонтанно окисляется и дает ложные результаты.
	 */
	workingSolutionLifespanMinutes: 120,

	/**
	 * Время наблюдения реакции азопирамовой пробы: не более 1 минуты (60 секунд).
	 * Окрашивание, наступившее позже 1 минуты, во внимание не принимается.
	 */
	reactionObservationSeconds: 60,

	/**
	 * Норма отбора изделий на контроль ПСО:
	 * 1% от одновременно обработанной партии каждого наименования,
	 * но не менее 3–5 штук каждого наименования изделий.
	 */
	statutorySamplingPercent: 1.0,
	minimumSampleFloorStandard: 3,
	minimumSampleFloorSurgical: 5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 2. DENTAL INSTRUMENTS FOR SANPIN SHIFT LOGS
// ─────────────────────────────────────────────────────────────────────────────

export interface DentalInstrumentCategory {
	readonly id: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly isSurgicalOrCritical: boolean;
	readonly typicalItems: readonly string[];
	readonly criticalInspectionZonesRu: string;
}

export const DENTAL_PSO_INSTRUMENT_CATEGORIES: readonly DentalInstrumentCategory[] = [
	{
		id: "mirrors_probes_tweezers",
		nameRu: "Стоматологические смотровые наборы (зеркала, зонды, пинцеты)",
		descriptionRu: "Родиевые фронтальные зеркала, угловые зонды, анатомические стоматологические пинцеты",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Зеркало стоматологическое с ручкой",
			"Зонд стоматологический угловой остроконечный",
			"Пинцет анатомический стоматологический с насечкой",
		],
		criticalInspectionZonesRu: "Резьбовое соединение зеркала с ручкой, насечки на браншах пинцета, острие зонда",
	},
	{
		id: "burs_rotary_cutters",
		nameRu: "Стоматологические боры и фрезы (алмазные и твердосплавные)",
		descriptionRu: "Турбинные алмазные боры, микромоторные твердосплавные боры, финиры, полиры",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Боры алмазные турбинные (шаровидные, конусные, пламевидные)",
			"Боры твердосплавные угловые для препарирования дентина",
			"Твердосплавные финиры и полировочные головки",
		],
		criticalInspectionZonesRu: "Межзубчатые пространства твердосплавных насечек, алмазная крошка головки бора",
	},
	{
		id: "handpieces_turbine_motor",
		nameRu: "Турбинные и угловые наконечники (KaVo, NSK, W&H, Bien-Air)",
		descriptionRu: "Турбинные наконечники со спреем, угловые микромоторные наконечники, прямые хирургические",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Наконечник турбинный со световодом",
			"Наконечник угловой микромоторный 1:1",
			"Наконечник повышающий 1:5 для препарирования",
		],
		criticalInspectionZonesRu: "Внутренний охлаждающий спрей-канал, зажим цанги, головка роторной группы",
	},
	{
		id: "surgical_forceps_elevators",
		nameRu: "Хирургический инструментарий (щипцы, элеваторы, распаторы)",
		descriptionRu: "Экстракционные щипцы всех типов, элеваторы Бейна, кюреты Лукаса, распаторы, ножницы",
		isSurgicalOrCritical: true,
		typicalItems: [
			"Щипцы экстракционные верхние и нижние",
			"Элеватор прямой стоматологический Бейна",
			"Кюрета хирургическая костная двухсторонняя Лукаса",
			"Костный распатор стоматологический",
			"Иглодержатель сосудистый микрохирургический",
		],
		criticalInspectionZonesRu: "Замковые соединения щипцов и ножниц, кремальера иглодержателя, рифленая поверхность ручек",
	},
	{
		id: "endodontic_files_reamers",
		nameRu: "Эндодонтический инструментарий (NiTi файлы, римеры, плаггеры)",
		descriptionRu: "Машинные и ручные файлы ProTaper/WaveOne, K-файлы, римеры, спредеры, плаггеры",
		isSurgicalOrCritical: false,
		typicalItems: [
			"NiTi файлы машинные ротационные ProTaper Gold",
			"K-файлы ручные эндодонтические ассорти №15–40",
			"Плаггеры вертикальной конденсации гуттаперчи",
			"Эндодонтическая калибровочная линейка",
		],
		criticalInspectionZonesRu: "Спиралевидные витки рабочих лезвий файлов, каучуковые стопперы, основание ручки",
	},
	{
		id: "restorative_carvers_pluggers",
		nameRu: "Терапевтический инструментарий (гладилки, штопферы, экскаваторы)",
		descriptionRu: "Двухсторонние гладилки, шаровидные штопферы, экскаваторы №1–3, шпатели для замешивания",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Гладилка двухсторонняя серповидная",
			"Штопфер шаровидный / цилиндрический полировочный",
			"Экскаватор стоматологический острый №2",
			"Металлический шпатель для цементов",
		],
		criticalInspectionZonesRu: "Рабочая кромка экскаватора, переход рабочей части гладилки в шейку инструмента",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. REAGENTS CATALOG & LOT TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export interface ChemicalReagentLotInfo {
	readonly reagentNameRu: string;
	readonly tradeBrandRu: string;
	readonly lotNumber: string;
	readonly manufacturerRu: string;
	readonly expiryDate: string; // YYYY-MM-DD
	readonly isControlPassed: boolean; // положительный контроль с каплей крови
}

export const STATUTORY_PSO_REAGENTS = {
	azopyram: {
		nameRu: "Азопирам-Комплект",
		activeSubstanceRu: "Амидопирин 10% + Анилин солянокислый 0.15% в изопропиловом / этиловом спирте",
		standardLotNumber: "АЗО-2026/08-114",
		manufacturerRu: "ООО «Винар» / ЗАО «Экрос», Россия",
		standardExpiryDate: "2027-06-30",
	},
	hydrogenPeroxide: {
		nameRu: "Перекись водорода 3% медицинская (стабилизированная)",
		activeSubstanceRu: "Водорода пероксид 3.0% стабилизированный натрия бензоатом",
		standardLotNumber: "H2O2-2026/07-55",
		manufacturerRu: "ОАО «Флора Кавказа» / ОАО «Татхимфармпрепараты»",
		standardExpiryDate: "2027-04-15",
	},
	phenolphthalein: {
		nameRu: "Фенолфталеин 1% спиртовой раствор",
		activeSubstanceRu: "Фенолфталеин 10 г/л в спирте этиловом 95%",
		standardLotNumber: "ФЕН-2026/05-22",
		manufacturerRu: "ООО «Реахим» / ОАО «Медхимпром»",
		standardExpiryDate: "2028-01-20",
	},
	detergents: [
		{ id: "biolot_05", nameRu: "Биолот 0.5% (ферментный препарат)", phValueRu: "нейтральный / слабощелочной (pH 7.5–8.5)" },
		{ id: "alaminol_10", nameRu: "Аламинол 1.0% (алкилдиметилбензиламмоний хлорид + глиоксаль)", phValueRu: "слабокислый / нейтральный (pH 6.5–7.2)" },
		{ id: "septolit_plus", nameRu: "Септолит-Плюс 0.5% (ЧАС + третичный амин)", phValueRu: "умеренно щелочной (pH 8.5–9.5)" },
		{ id: "multisteril_20", nameRu: "Мультистерил 2.0% (энзимный концентрат для УЗ-моек)", phValueRu: "нейтральный (pH 7.0–7.4)" },
	],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4. TYPES & EVALUATION DATA CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export type AzopyramColorReaction =
	| "none_negative" // Норма: окрашивания нет (скрытая кровь отсутствует)
	| "violet_blue_blood" // Брак: сине-фиолетовое окрашивание (обнаружен гемоглобин / кровь)
	| "brown_rust" // Окислы железа / ржавчина (бурое окрашивание)
	| "pink_smear"; // Следы хлорсодержащих окислителей

export type PhenolphthaleinColorReaction =
	| "none_negative" // Норма: окрашивания нет (щелочные моющие средства смыты)
	| "pink_magenta_alkali"; // Брак: розовое / малиновое окрашивание (остаточная щелочность)

export interface PsoEvaluationInput {
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly categoryId?: string;
	readonly isSurgicalOrCritical?: boolean;
	readonly itemsTypesCount?: number;

	// Азопирам
	readonly isAzopyramNegative: boolean;
	readonly azopyramColor?: AzopyramColorReaction;
	readonly azopyramSolutionPreparedAt: string; // ISO 8601 string
	readonly azopyramReagentLot?: string;

	// Фенолфталеин
	readonly isPhenolphthaleinNegative: boolean;
	readonly phenolphthaleinColor?: PhenolphthaleinColorReaction;

	// Моющее средство
	readonly detergentBrand?: string;
}

export interface PsoEvaluationResult {
	readonly isBatchApproved: boolean;
	readonly isBatchBlocked: boolean;
	readonly minSampleRequired: number;
	readonly isSamplingSufficient: boolean;

	// Проверка 2-часового срока годности рабочего раствора
	readonly solutionAgeMinutes: number;
	readonly isSolutionExpired: boolean;
	readonly solutionExpiresAtIso: string;
	readonly solutionTimeRemainingMinutes: number;

	// Клинические протоколы
	readonly rejectionReasons: readonly string[];
	readonly clinicalActionProtocolRu: string;
	readonly regulatoryClauseRu: string;
	readonly statusBadgeText: string;
	readonly statusBadgeClass: "badge-success" | "badge-danger" | "badge-warning";
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CORE COMPUTATION ALGORITHMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет минимального объема выборки инструментов для контроля ПСО по СанПиН 3.3686-21:
 * Не менее 1% партии каждого наименования, но не менее 3-5 штук каждого наименования.
 */
export function calculateStatutorySampling(
	batchCount: number,
	isSurgicalOrCritical = false,
	itemsTypesCount = 1,
): {
	readonly minSampleRequired: number;
	readonly statutoryPercent: number;
	readonly floorPerType: number;
	readonly explanationRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const typesCount = Math.max(1, Math.floor(Number(itemsTypesCount) || 1));
	const floorPerType = isSurgicalOrCritical
		? SANPIN_AZOPYRAM_NORMS.minimumSampleFloorSurgical
		: SANPIN_AZOPYRAM_NORMS.minimumSampleFloorStandard;

	const percentCount = Math.ceil((count * SANPIN_AZOPYRAM_NORMS.statutorySamplingPercent) / 100);
	const minSampleRequired = Math.max(floorPerType * typesCount, percentCount);

	const explanationRu = `СанПиН 3.3686-21: выборка 1% от ${count} шт. (округление ${percentCount} шт.), но не менее ${floorPerType} шт./наим. × ${typesCount} наим. = ${minSampleRequired} шт.`;

	return {
		minSampleRequired,
		statutoryPercent: SANPIN_AZOPYRAM_NORMS.statutorySamplingPercent,
		floorPerType,
		explanationRu,
	};
}

/**
 * Проверка свежести рабочего раствора азопирама:
 * Раствор годен строго 2 часа (120 минут) с момента приготовления.
 */
export function checkAzopyramSolutionFreshness(
	preparedAtIso: string,
	currentReferenceDate = new Date(),
): {
	readonly ageMinutes: number;
	readonly isExpired: boolean;
	readonly expiresAtIso: string;
	readonly remainingMinutes: number;
	readonly warningRu: string | null;
} {
	const preparedTime = new Date(preparedAtIso).getTime();
	const now = currentReferenceDate.getTime();
	const diffMs = Math.max(0, now - preparedTime);
	const ageMinutes = Math.floor(diffMs / (60 * 1000));
	const remainingMinutes = Math.max(0, SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes - ageMinutes);
	const isExpired = ageMinutes > SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes;

	const expiresAtDate = new Date(preparedTime + SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes * 60 * 1000);
	const expiresAtIso = expiresAtDate.toISOString();

	let warningRu: string | null = null;
	if (isExpired) {
		warningRu = `КРИТИЧЕСКИЙ БРАК: Рабочий раствор азопирама приготовлен ${ageMinutes} мин. назад (срок годности истек!). Максимальный регламентный срок хранения — 2 часа (120 мин.). Проба НЕДЕЙСТВИТЕЛЬНА. Немедленно утилизировать раствор и приготовить свежую порцию 1:1 с 3% H2O2.`;
	} else if (remainingMinutes <= 15) {
		warningRu = `ВНИМАНИЕ: Срок годности рабочего раствора азопирама истекает через ${remainingMinutes} мин. Приготовьте новую порцию для следующих партий.`;
	}

	return {
		ageMinutes,
		isExpired,
		expiresAtIso,
		remainingMinutes,
		warningRu,
	};
}

/**
 * Полная клиническая экспертиза результатов контроля ПСО:
 * Проверка выборки, свежести раствора азопирама, отсутствия гемоглобина и щелочи.
 */
export function evaluatePsoCleaningBatch(input: PsoEvaluationInput): PsoEvaluationResult {
	const {
		batchItemCount,
		testedSampleCount,
		isSurgicalOrCritical = false,
		itemsTypesCount = 1,
		isAzopyramNegative,
		isPhenolphthaleinNegative,
		azopyramSolutionPreparedAt,
	} = input;

	const reasons: string[] = [];
	const { minSampleRequired } = calculateStatutorySampling(batchItemCount, isSurgicalOrCritical, itemsTypesCount);
	const isSamplingSufficient = testedSampleCount >= minSampleRequired;

	if (!isSamplingSufficient) {
		reasons.push(
			`Недостаточный объем выборки: проверено ${testedSampleCount} шт. из регламентных ${minSampleRequired} шт. (СанПиН 3.3686-21: не менее 1% партии и не менее ${isSurgicalOrCritical ? 5 : 3} шт. каждого наименования).`,
		);
	}

	const freshness = checkAzopyramSolutionFreshness(azopyramSolutionPreparedAt);
	if (freshness.isExpired) {
		reasons.push(
			`Истек 2-часовой срок годности рабочего раствора азопирама (прошло ${freshness.ageMinutes} мин. с момента приготовления). Проба не имеет юридической и клинической силы.`,
		);
	}

	if (!isAzopyramNegative) {
		reasons.push(
			"ПОЛОЖИТЕЛЬНАЯ АЗОПИРАМОВАЯ ПРОБА: обнаружен скрытый гемоглобин / кровь (сине-фиолетовое окрашивание реактива в течение 1 мин.).",
		);
	}

	if (!isPhenolphthaleinNegative) {
		reasons.push(
			"ПОЛОЖИТЕЛЬНАЯ ФЕНОЛФТАЛЕИНОВАЯ ПРОБА: обнаружены остатки щелочных компонентов моющих средств (розово-малиновое окрашивание).",
		);
	}

	const isBatchApproved = reasons.length === 0;
	const isBatchBlocked = !isBatchApproved;

	let clinicalActionProtocolRu = "";
	if (isBatchApproved) {
		clinicalActionProtocolRu =
			"Партия инструментов полностью очищена, следы крови и моющих средств отсутствуют. Выборка достаточна. Партия допущена к упаковке в крафт-пакеты и стерилизации (СанПиН 3.3686-21).";
	} else if (!isAzopyramNegative) {
		clinicalActionProtocolRu =
			"СТРОГИЙ КЛИНИЧЕСКИЙ РЕГЛАМЕНТ (ПРИ ОБНАРУЖЕНИИ КРОВИ):\n" +
			"1. Вся партия изделий (100%), из которой отбирались образцы, признается НЕСТЕРИЛЬНОЙ И ОПАСНОЙ и подлежит немедленной изоляции.\n" +
			"2. Вся партия направляется на повторный полный цикл дезинфекции и предстерилизационной очистки (замачивание в моющем растворе, механическая чистка каналов и замковых частей).\n" +
			"3. После повторной очистки и промывки проводится повторный контроль качества азопирамовой пробой в удвоенном объеме выборки.";
	} else if (!isPhenolphthaleinNegative) {
		clinicalActionProtocolRu =
			"СТРОГИЙ КЛИНИЧЕСКИЙ РЕГЛАМЕНТ (ПРИ ОБНАРУЖЕНИИ ЩЕЛОЧИ):\n" +
			"1. Вся партия изделий (100%) признается недостаточно отмытой от щелочных ПАВ.\n" +
			"2. Вся партия подлежит повторному обильному ополаскиванию проточной водой не менее 5 минут, затем обессоленной / дистиллированной водой до нейтральной реакции (pH 6.5–7.5).\n" +
			"3. Повторная фенолфталеиновая проба до полного отсутствия розового окрашивания.";
	} else if (freshness.isExpired) {
		clinicalActionProtocolRu =
			"РЕГЛАМЕНТ ПРИ ПРОСРОЧКЕ РАСТВОРА:\n" +
			"Немедленно вылить старый раствор азопирама. Смешать свежий раствор азопирама с 3% перекисью водорода 1:1, проверить активность на контрольной марле и повторить пробу на тех же образцах.";
	} else {
		clinicalActionProtocolRu = `Необходимо отобрать дополнительно ${minSampleRequired - testedSampleCount} шт. инструментов и провести контрольные пробы в полном нормативном объеме.`;
	}

	return {
		isBatchApproved,
		isBatchBlocked,
		minSampleRequired,
		isSamplingSufficient,
		solutionAgeMinutes: freshness.ageMinutes,
		isSolutionExpired: freshness.isExpired,
		solutionExpiresAtIso: freshness.expiresAtIso,
		solutionTimeRemainingMinutes: freshness.remainingMinutes,
		rejectionReasons: reasons,
		clinicalActionProtocolRu,
		regulatoryClauseRu: "СанПиН 3.3686-21 п. 3618-3622 / МУ 287-113",
		statusBadgeText: isBatchApproved
			? "ДОПУЩЕНО К СТЕРИЛИЗАЦИИ"
			: !isAzopyramNegative
				? "БРАК: ОБНАРУЖЕНА КРОВЬ"
				: !isPhenolphthaleinNegative
					? "БРАК: ОСТАТКИ ЩЕЛОЧИ"
					: freshness.isExpired
						? "БРАК: РАСТВОР ПРОСРОЧЕН (>2 Ч)"
						: "БРАК: МАЛАЯ ВЫБОРКА",
		statusBadgeClass: isBatchApproved ? "badge-success" : "badge-danger",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PRINT TEMPLATE GENERATOR FOR ROSPOTREBNADZOR (FORM № 366/U)
// ─────────────────────────────────────────────────────────────────────────────

export interface PsoPrintRecordItem {
	readonly id: string;
	readonly timestamp: string;
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly reagentLot: string;
	readonly solutionTimeRu: string;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly electronicStampVerified: boolean;
	readonly notes?: string | undefined;
}

export interface PsoPrintDocumentParams {
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly licenseInfo: string;
	readonly chiefDoctorFullName: string;
	readonly headNurseFullName: string;
	readonly dateRangeTextRu: string;
	readonly records: readonly PsoPrintRecordItem[];
}

/**
 * Чистая регламентная верстка официального журнала Формы № 366/у на А4 альбомной ориентации.
 * Без серых пятен при печати, с точными графами МУ 287-113 и СанПиН 3.3686-21.
 */
export function generateStatutoryPsoForm366PrintHtml(params: PsoPrintDocumentParams): string {
	const {
		clinicName,
		clinicAddress,
		ogrn,
		inn,
		licenseInfo,
		chiefDoctorFullName,
		headNurseFullName,
		dateRangeTextRu,
		records,
	} = params;

	const rowsHtml = records
		.map((r, i) => {
			const dt = new Date(r.timestamp);
			const dateStr = dt.toLocaleDateString("ru-RU");
			const timeStr = dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

			const azoLabel = r.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ. (Кровь)";
			const phenolLabel = r.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ. (Щелочь)";
			const verdictLabel = r.isBatchApproved ? "Допущено" : "БРАК (Повторная очистка)";
			const verdictColor = r.isBatchApproved ? "#000000" : "#b91c1c";

			return `<tr>
				<td style="border: 1px solid #000; text-align: center; padding: 4px;">${i + 1}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; white-space: nowrap;">
					${dateStr}<br/><span style="font-size: 7.5pt; color: #333;">${timeStr}</span>
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: 600;">
					${r.instrumentName}
				</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px;">${r.batchItemCount}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: 600;">${r.testedSampleCount}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 7.5pt;">
					${r.reagentLot}<br/><span style="color: #444;">${r.solutionTimeRu}</span>
				</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: ${r.isAzopyramNegative ? "normal" : "bold"}; color: ${r.isAzopyramNegative ? "#000" : "#b91c1c"};">
					${azoLabel}
				</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: ${r.isPhenolphthaleinNegative ? "normal" : "bold"}; color: ${r.isPhenolphthaleinNegative ? "#000" : "#b91c1c"};">
					${phenolLabel}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.detergentBrand || "—"}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: bold; color: ${verdictColor};">
					${verdictLabel}
					${r.rejectionReason ? `<br/><span style="font-size: 7pt; font-weight: normal; color: #b91c1c;">${r.rejectionReason}</span>` : ""}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 7.5pt;">
					${r.operatorStaffFullName}<br/>
					<span style="font-size: 7pt; color: #444;">${r.operatorStaffPosition}</span>
					${r.electronicStampVerified ? `<br/><strong style="font-size: 6.5pt; color: #000;">[ЭЦП ВАЛИДНА]</strong>` : ""}
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал учета качества предстерилизационной очистки (Форма № 366/у)</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 8mm 10mm;
		}
		@media print {
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
			.no-print { display: none !important; }
		}
		* { box-sizing: border-box; }
		body {
			font-family: 'Times New Roman', Times, serif;
			font-size: 8.5pt;
			line-height: 1.15;
			color: #000000;
			background: #ffffff;
			margin: 0;
			padding: 0;
		}
		.doc-header {
			text-align: center;
			margin-bottom: 8px;
		}
		.clinic-title {
			font-size: 11pt;
			font-weight: bold;
			text-transform: uppercase;
		}
		.clinic-sub {
			font-size: 7.5pt;
			color: #222222;
			margin-top: 1px;
		}
		.doc-name {
			font-size: 11.5pt;
			font-weight: bold;
			text-transform: uppercase;
			margin-top: 5px;
			letter-spacing: 0.5px;
		}
		.doc-meta {
			font-size: 7.5pt;
			margin-top: 2px;
			color: #333333;
		}
		.doc-period {
			font-size: 8.5pt;
			font-weight: bold;
			margin-top: 3px;
		}
		table.journal-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 6px;
			font-size: 8pt;
		}
		table.journal-table th {
			border: 1px solid #000000;
			padding: 4px 2px;
			font-size: 7.5pt;
			font-weight: bold;
			text-align: center;
			background-color: #f8fafc;
		}
		table.journal-table td {
			vertical-align: middle;
		}
		.signatures-block {
			display: flex;
			justify-content: space-between;
			margin-top: 18px;
			font-size: 8.5pt;
		}
		.sign-col {
			width: 48%;
		}
		.regulatory-footnote {
			margin-top: 10px;
			font-size: 6.8pt;
			color: #444444;
			border-top: 0.5px solid #666666;
			padding-top: 3px;
		}
	</style>
</head>
<body>
	<div class="doc-header">
		<div class="clinic-title">${clinicName}</div>
		<div class="clinic-sub">${clinicAddress} | ИНН: ${inn} | ОГРН: ${ogrn} | Лицензия: ${licenseInfo}</div>
		<div class="doc-name">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div class="doc-meta">В соответствии с требованиями СанПиН 3.3686-21 (Раздел IV) и Методических указаний МУ 287-113</div>
		<div class="doc-period">${dateRangeTextRu}</div>
	</div>

	<table class="journal-table">
		<thead>
			<tr>
				<th style="width: 24px;">№ п/п</th>
				<th style="width: 70px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 48px;">Объем партии (шт)</th>
				<th style="width: 48px;">Проверено (1%, min 3-5)</th>
				<th style="width: 105px;">Серия реактива / Время раствора</th>
				<th style="width: 75px;">Азопирам (кровь)</th>
				<th style="width: 75px;">Фенолфталеин (щелочь)</th>
				<th style="width: 110px;">Моющее средство</th>
				<th style="width: 85px;">Результат контроля</th>
				<th style="width: 115px;">Подпись лица, проводившего пробу</th>
			</tr>
			<tr style="font-size: 6.5pt; text-align: center; background: #ffffff;">
				<th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 18px; border: 1px solid #000;">Записи в журнале ПСО за указанный период отсутствуют. Честный Zero-Mock учет.</td></tr>'}
		</tbody>
	</table>

	<div class="signatures-block">
		<div class="sign-col">
			Ответственный за ПСО (медсестра ЦСО): ____________________ / ${headNurseFullName} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач медицинской организации: ____________________ / ${chiefDoctorFullName} /
		</div>
	</div>

	<div class="regulatory-footnote">
		* Примечание: Рабочий раствор азопирама годен не более 2 часов при комнатной температуре. При положительной пробе (сине-фиолетовое окрашивание на кровь или розовое на щелочь) вся партия изделий подлежит повторной предстерилизационной очистке до получения отрицательного результата.
	</div>
</body>
</html>`;
}
