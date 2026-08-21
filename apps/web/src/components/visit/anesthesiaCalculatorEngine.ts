/**
 * anesthesiaCalculatorEngine.ts — Клинический калькулятор анестезии и дозировок.
 *
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР)
 * и Приказу Минздрава России № 804н.
 *
 * Рассчитывает:
 * 1. Максимально допустимую дозу местного анестетика с учетом массы тела пациента (мг/кг).
 * 2. Количество введенного действующего вещества (мг) и объем (мл / карпулы).
 * 3. Коэффициент токсической безопасности и уровень риска (зеленый / желтый / красный).
 * 4. Формирует юридически и клинически корректную запись для Дневника приёма (форма 043/у).
 */

export type AnesthesiaDrugKey =
	| "ultracain_ds_forte"
	| "ultracain_ds"
	| "septanest_100"
	| "scandonest_3"
	| "lidocaine_2";

export type AnesthesiaMethodKey =
	| "infiltration"
	| "mandibular"
	| "torusal"
	| "tuberal"
	| "incisive"
	| "intraligamentary"
	| "application";

export interface AnesthesiaDrugDefinition {
	readonly key: AnesthesiaDrugKey;
	readonly commercialName: string;
	readonly activeSubstance: string;
	readonly concentrationPct: number;
	readonly vasoconstrictor: string;
	readonly volumeMlPerCarpule: number;
	readonly mgPerCarpule: number;
	readonly maxDoseMgPerKg: number;
	readonly absoluteMaxDoseMg: number;
	readonly isAdrenalineFree: boolean;
	readonly description: string;
}

export const ANESTHESIA_DRUGS: Record<AnesthesiaDrugKey, AnesthesiaDrugDefinition> = {
	ultracain_ds_forte: {
		key: "ultracain_ds_forte",
		commercialName: "Ультракаин Д-С форте",
		activeSubstance: "Артикаин 4% + Эпинефрин 1:100 000",
		concentrationPct: 4,
		vasoconstrictor: "Эпинефрин 1:100 000",
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 68,
		maxDoseMgPerKg: 7.0,
		absoluteMaxDoseMg: 500,
		isAdrenalineFree: false,
		description: "Высокая глубина анестезии. Для травматичных вмешательств, пульпитов, хирургии.",
	},
	ultracain_ds: {
		key: "ultracain_ds",
		commercialName: "Ультракаин Д-С",
		activeSubstance: "Артикаин 4% + Эпинефрин 1:200 000",
		concentrationPct: 4,
		vasoconstrictor: "Эпинефрин 1:200 000",
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 68,
		maxDoseMgPerKg: 7.0,
		absoluteMaxDoseMg: 500,
		isAdrenalineFree: false,
		description: "Стандартная терапия и препарирование. Оптимальная кардиоваскулярная безопасность.",
	},
	septanest_100: {
		key: "septanest_100",
		commercialName: "Септанест с адреналином 1:100 000",
		activeSubstance: "Артикаин 4% + Адреналин 1:100 000",
		concentrationPct: 4,
		vasoconstrictor: "Адреналин 1:100 000",
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 68,
		maxDoseMgPerKg: 7.0,
		absoluteMaxDoseMg: 500,
		isAdrenalineFree: false,
		description: "Французский артикаиновый анестетик быстрого действия.",
	},
	scandonest_3: {
		key: "scandonest_3",
		commercialName: "Скандонест 3% (Мепивакаин)",
		activeSubstance: "Мепивакаин 3%",
		concentrationPct: 3,
		vasoconstrictor: "Без вазоконстриктора",
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 51,
		maxDoseMgPerKg: 4.4,
		absoluteMaxDoseMg: 300,
		isAdrenalineFree: true,
		description: "Без адреналина. Препарат выбора для пациентов с гипертонией, ССЗ, глаукомой, беременных.",
	},
	lidocaine_2: {
		key: "lidocaine_2",
		commercialName: "Лидокаин 2%",
		activeSubstance: "Лидокаин 2%",
		concentrationPct: 2,
		vasoconstrictor: "Без вазоконстриктора",
		volumeMlPerCarpule: 2.0,
		mgPerCarpule: 40,
		maxDoseMgPerKg: 4.4,
		absoluteMaxDoseMg: 300,
		isAdrenalineFree: true,
		description: "Классический амидный анестетик для инфильтрации и проводниковой блокады.",
	},
};

export const ANESTHESIA_METHODS: Record<
	AnesthesiaMethodKey,
	{ nameRu: string; defaultNeedleSize: string; typicalOnsetMinutes: number }
> = {
	infiltration: {
		nameRu: "Инфильтрационная",
		defaultNeedleSize: "30G (0.3 x 21 мм)",
		typicalOnsetMinutes: 2,
	},
	mandibular: {
		nameRu: "Проводниковая мандибулярная",
		defaultNeedleSize: "27G (0.4 x 35 мм)",
		typicalOnsetMinutes: 5,
	},
	torusal: {
		nameRu: "Проводниковая торусальная (по Вейсбрему)",
		defaultNeedleSize: "27G (0.4 x 35 мм)",
		typicalOnsetMinutes: 4,
	},
	tuberal: {
		nameRu: "Проводниковая туберальная",
		defaultNeedleSize: "27G (0.4 x 30 мм)",
		typicalOnsetMinutes: 3,
	},
	incisive: {
		nameRu: "Проводниковая резцовая (назопалатинальная)",
		defaultNeedleSize: "30G (0.3 x 16 мм)",
		typicalOnsetMinutes: 2,
	},
	intraligamentary: {
		nameRu: "Интралигаментарная (внутрисвязочная)",
		defaultNeedleSize: "30G (0.3 x 12 мм)",
		typicalOnsetMinutes: 1,
	},
	application: {
		nameRu: "Аппликационная (поверхностная)",
		defaultNeedleSize: "Ватный шарик / аппликатор",
		typicalOnsetMinutes: 1,
	},
};

export type AnesthesiaSafetyLevel = "safe" | "caution" | "warning" | "danger";

export interface AnesthesiaCalculationResult {
	readonly drug: AnesthesiaDrugDefinition;
	readonly patientWeightKg: number;
	readonly carpulesCount: number;
	readonly totalVolumeMl: number;
	readonly totalDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeCarpules: number;
	readonly safetyRatio: number; // 0.0 to 1.0+
	readonly safetyLevel: AnesthesiaSafetyLevel;
	readonly safetyPercentage: number;
	readonly warningMessage: string | null;
}

/**
 * Рассчитывает безопасность дозы анестетика.
 */
export function calculateAnesthesiaSafety(params: {
	drugKey: AnesthesiaDrugKey;
	patientWeightKg: number;
	carpulesCount: number;
	customVolumeMl?: number | undefined;
}): AnesthesiaCalculationResult {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const weight = Math.max(10, Math.min(250, Number.isFinite(params.patientWeightKg) && params.patientWeightKg > 0 ? params.patientWeightKg : 70));
	const carpules = Math.max(0, Number.isFinite(params.carpulesCount) ? params.carpulesCount : 1);

	const totalVolumeMl = params.customVolumeMl !== undefined && Number.isFinite(params.customVolumeMl) && params.customVolumeMl > 0
		? Math.round(params.customVolumeMl * 100) / 100
		: Math.round(carpules * drug.volumeMlPerCarpule * 100) / 100;

	// Рассчитываем введенную дозу: (Объем мл * Концентрация % * 10 мг/мл)
	const totalDoseMg = Math.round(totalVolumeMl * (drug.concentrationPct * 10) * 10) / 10;

	// Предельная доза по весу
	const weightLimitMg = Math.round(weight * drug.maxDoseMgPerKg * 10) / 10;
	const maxSafeDoseMg = Math.min(weightLimitMg, drug.absoluteMaxDoseMg);

	const maxSafeCarpules = drug.mgPerCarpule > 0
		? Math.round((maxSafeDoseMg / drug.mgPerCarpule) * 10) / 10
		: 0;

	const safetyRatio = maxSafeDoseMg > 0 ? totalDoseMg / maxSafeDoseMg : 0;
	const safetyPercentage = Math.round(safetyRatio * 100);

	let safetyLevel: AnesthesiaSafetyLevel = "safe";
	let warningMessage: string | null = null;

	if (safetyRatio >= 1.0) {
		safetyLevel = "danger";
		warningMessage = `ВНИМАНИЕ: Превышена максимально допустимая доза анестетика (${totalDoseMg} мг из макс. ${maxSafeDoseMg} мг)! Риск системной интоксикации.`;
	} else if (safetyRatio >= 0.8) {
		safetyLevel = "warning";
		warningMessage = `Предупреждение: Введено ${safetyPercentage}% от максимально допустимой дозы (${totalDoseMg} мг / ${maxSafeDoseMg} мг). Ограничьте дальнейшее введение.`;
	} else if (safetyRatio >= 0.5) {
		safetyLevel = "caution";
		warningMessage = `Умеренная дозировка: ${safetyPercentage}% от лимита массы тела (${weight} кг).`;
	}

	return {
		drug,
		patientWeightKg: weight,
		carpulesCount: carpules,
		totalVolumeMl,
		totalDoseMg,
		maxSafeDoseMg,
		maxSafeCarpules,
		safetyRatio,
		safetyLevel,
		safetyPercentage,
		warningMessage,
	};
}

export interface AnesthesiaSoapRecordParams {
	methodKey: AnesthesiaMethodKey;
	drugKey: AnesthesiaDrugKey;
	carpulesCount: number;
	customVolumeMl?: number | undefined;
	patientWeightKg?: number | undefined;
	toothNumber?: number | string | undefined;
	aspirationTestPassed?: boolean | undefined;
	reactionNormal?: boolean | undefined;
	anesthesiaStartTime?: string | undefined;
}

/**
 * Генерирует клиническую запись анестезии по стандарту формы 043/у.
 */
export function formatAnesthesiaSoapText(params: AnesthesiaSoapRecordParams): string {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const method = ANESTHESIA_METHODS[params.methodKey] ?? ANESTHESIA_METHODS.infiltration;
	const calc = calculateAnesthesiaSafety({
		drugKey: params.drugKey,
		patientWeightKg: params.patientWeightKg ?? 70,
		carpulesCount: params.carpulesCount,
		...(params.customVolumeMl !== undefined ? { customVolumeMl: params.customVolumeMl } : {}),
	});

	const toothSuffix = params.toothNumber ? ` в области зуба ${params.toothNumber}` : "";
	const aspirationStr = params.aspirationTestPassed !== false
		? "Аспирационная проба отрицательная."
		: "Внимание: при повторной аспирационной пробе кровь не получена.";
	const reactionStr = params.reactionNormal !== false
		? "Аллергических и токсических реакций не наблюдалось, общее самочувствие пациента удовлетворительное."
		: "Пациент под постоянным мониторингом гемодинамики.";

	const timeStr = params.anesthesiaStartTime ? ` Время начала: ${params.anesthesiaStartTime}.` : "";

	return `Обезболивание: ${method.nameRu} анестезия${toothSuffix} препаратом «${drug.commercialName}» (${drug.activeSubstance}) в объеме ${calc.totalVolumeMl} мл (${params.carpulesCount} карп., ${calc.totalDoseMg} мг действующего вещества). ${aspirationStr}${timeStr} Наступление анестезии через ${method.typicalOnsetMinutes} мин. Глубина обезболивания достаточная. ${reactionStr}`;
}
