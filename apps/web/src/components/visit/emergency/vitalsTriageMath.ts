/**
 * vitalsTriageMath.ts — Mathematical Triage Engine for Intraoperative Patient Vitals
 * Standards: Минздрав РФ / ФАР (Федерация анестезиологов и реаниматологов) / СтАР
 *
 * Parameters evaluated:
 *  - Blood Pressure (АД систолическое / диастолическое, мм рт.ст.)
 *  - Heart Rate (ЧСС / Пульс, уд/мин)
 *  - Oxygen Saturation (SpO2, %)
 *  - Blood Glucose (Глюкоза крови, ммоль/л)
 *  - Respiratory Rate (ЧДД, вдохов/мин)
 *  - Body Temperature (Температура тела, °C)
 *  - Mean Arterial Pressure (СрАД / MAP, мм рт.ст.)
 *  - Shock Index (Индекс Альговера = ЧСС / САД)
 *  - Epinephrine Gateway (Блокировка адреналина при кризе >180/110)
 */

export type VitalsTriageLevel = 'normal' | 'attention' | 'crisis' | 'emergency';

export type TriageBadgeVariant = 'green' | 'yellow' | 'orange' | 'red';

export interface VitalsInput {
	/** Систолическое АД (мм рт.ст.) */
	bpSystolic: number;
	/** Диастолическое АД (мм рт.ст.) */
	bpDiastolic: number;
	/** Частота сердечных сокращений (уд/мин) */
	heartRate: number;
	/** Сатурация кислорода крови (%) */
	spO2: number;
	/** Глюкоза капиллярной крови (ммоль/л, опционально) */
	bloodGlucose?: number | null | undefined;
	/** Частота дыхательных движений (вдохов/мин, опционально) */
	respiratoryRate?: number | null | undefined;
	/** Температура тела (°C, опционально) */
	temperatureC?: number | null | undefined;
}

export interface ParameterTriageResult {
	value: number | string;
	unit: string;
	level: VitalsTriageLevel;
	statusLabelRu: string;
	badgeVariant: TriageBadgeVariant;
	clinicalInterpretationRu: string;
	isAdrenalineContraindicated?: boolean;
	isCritical?: boolean;
}

export interface BloodPressureTriageResult extends ParameterTriageResult {
	systolic: number;
	diastolic: number;
	pulsePressure: number; // САД - ДАД
	meanArterialPressure: number; // СрАД = ДАД + (САД - ДАД) / 3
	isHypertensiveCrisis: boolean;
	isStage2Hypertension: boolean;
	isStage1Hypertension: boolean;
	isHypotensionCollapse: boolean;
	isAdrenalineBlocked: boolean;
}

export interface HeartRateTriageResult extends ParameterTriageResult {
	bpm: number;
	isSevereBradycardia: boolean;
	isModerateBradycardia: boolean;
	isModerateTachycardia: boolean;
	isSevereTachycardia: boolean;
	isCardiacArrest: boolean;
}

export interface SpO2TriageResult extends ParameterTriageResult {
	percentage: number;
	isHypoxiaModerate: boolean;
	isHypoxiaCritical: boolean;
	isRespiratoryFailure: boolean;
}

export interface GlucoseTriageResult extends ParameterTriageResult {
	glucoseMmolL: number | null;
	isHypoglycemiaSevere: boolean;
	isHypoglycemiaModerate: boolean;
	isHyperglycemiaModerate: boolean;
	isHyperglycemiaSevere: boolean;
}

export interface ShockIndexResult {
	shockIndex: number;
	level: VitalsTriageLevel;
	labelRu: string;
	interpretationRu: string;
	isShockThreat: boolean;
	isDecompensatedShock: boolean;
}

export interface VitalsTriageReport {
	input: VitalsInput;
	overallLevel: VitalsTriageLevel;
	overallStatusRu: string;
	overallBadgeVariant: TriageBadgeVariant;
	bloodPressure: BloodPressureTriageResult;
	heartRate: HeartRateTriageResult;
	spO2: SpO2TriageResult;
	glucose?: GlucoseTriageResult | undefined;
	respiratoryRate?: ParameterTriageResult | undefined;
	temperature?: ParameterTriageResult | undefined;
	shockIndex: ShockIndexResult;
	meanArterialPressure: number;
	isAdrenalineBlocked: boolean;
	isHypertensiveCrisis: boolean;
	isHypotensionCollapse: boolean;
	isCriticalHypoxia: boolean;
	isSevereHypoglycemia: boolean;
	isCardiacArrest: boolean;
	isEmergencyRescueRecommended: boolean;
	suggestedScenarioId?: 'anaphylactic_shock' | 'syncope_collapse' | 'hypertensive_crisis' | 'hypoglycemia' | 'cardiac_arrest' | undefined;
	urgentActionGuidelinesRu: string[];
	timestampIso: string;
}

/**
 * Расчет среднего артериального давления (Mean Arterial Pressure - MAP)
 * Формула: СрАД = ДАД + (САД - ДАД) / 3
 */
export function calculateMeanArterialPressure(systolic: number, diastolic: number): number {
	const map = diastolic + (systolic - diastolic) / 3;
	return Math.round(map * 10) / 10;
}

/**
 * Расчет шокового индекса Альговера (Allgower Shock Index)
 * Формула: SI = ЧСС / САД
 * Норма: 0.5 - 0.7
 * Угроза шока: 0.8 - 1.0
 * Шок I-II степени: 1.1 - 1.4
 * Тяжелый/декомпенсированный шок: >= 1.5
 */
export function calculateShockIndex(heartRate: number, systolic: number): ShockIndexResult {
	if (systolic <= 0) {
		return {
			shockIndex: 9.99,
			level: 'emergency',
			labelRu: 'Критический коллапс (САД = 0)',
			interpretationRu: 'Отсутствие определяемого систолического давления! Немедленная реанимация.',
			isShockThreat: true,
			isDecompensatedShock: true,
		};
	}

	const rawIndex = heartRate / systolic;
	const index = Math.round(rawIndex * 100) / 100;

	if (index >= 1.5) {
		return {
			shockIndex: index,
			level: 'emergency',
			labelRu: `Тяжелый декомпенсированный шок (SI ${index})`,
			interpretationRu: 'Критическая гипоперфузия органов (дефицит ОЦК >30-40%). Экстренная инфузия, вызов СМП 103/112.',
			isShockThreat: true,
			isDecompensatedShock: true,
		};
	}

	if (index >= 1.1) {
		return {
			shockIndex: index,
			level: 'crisis',
			labelRu: `Шок средней тяжести (SI ${index})`,
			interpretationRu: 'Выраженная сосудистая недостаточность. Положение Тренделенбурга, венозный доступ, инфузионная терапия.',
			isShockThreat: true,
			isDecompensatedShock: false,
		};
	}

	if (index >= 0.8) {
		return {
			shockIndex: index,
			level: 'attention',
			labelRu: `Угроза шока / Нестабильность (SI ${index})`,
			interpretationRu: 'Тахикардия на фоне снижения давления. Контроль витальных функций, пауза в манипуляциях.',
			isShockThreat: true,
			isDecompensatedShock: false,
		};
	}

	return {
		shockIndex: index,
		level: 'normal',
		labelRu: `Норма гемодинамики (SI ${index})`,
		interpretationRu: 'Индекс Альговера в пределах физиологической нормы (0.5–0.7).',
		isShockThreat: false,
		isDecompensatedShock: false,
	};
}

/**
 * Оценка артериального давления по стандартам Минздрава РФ и кардиологического шлюза адреналина
 */
export function evaluateBloodPressure(systolic: number, diastolic: number): BloodPressureTriageResult {
	const map = calculateMeanArterialPressure(systolic, diastolic);
	const pulsePressure = systolic - diastolic;

	// 1. Критические состояния снижения АД (Коллапс / Шок)
	if (systolic <= 70 || diastolic <= 40) {
		return {
			value: `${systolic}/${diastolic}`,
			unit: 'мм рт.ст.',
			level: 'emergency',
			statusLabelRu: 'Коллапс / Тяжелый сосудистый шок',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'КРИТИЧЕСКОЕ ПАДЕНИЕ АД: Опасность ишемии мозга/миокарда. Положение Тренделенбурга, прекращение вмешательства, вызов СМП 103.',
			isAdrenalineContraindicated: false,
			isCritical: true,
			systolic,
			diastolic,
			pulsePressure,
			meanArterialPressure: map,
			isHypertensiveCrisis: false,
			isStage2Hypertension: false,
			isStage1Hypertension: false,
			isHypotensionCollapse: true,
			isAdrenalineBlocked: false,
		};
	}

	// 2. Гипертонический криз (САД >= 180 или ДАД >= 110)
	if (systolic >= 180 || diastolic >= 110) {
		return {
			value: `${systolic}/${diastolic}`,
			unit: 'мм рт.ст.',
			level: 'crisis',
			statusLabelRu: 'Гипертонический криз (III ст / осложненный)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'ОПАСНОСТЬ: КРИЗ! Экстренная БЛОКИРОВКА АДРЕНАЛИНА. Прекратить анестезию с вазоконстрикторами. Моксонидин 0.2-0.4 мг под язык / Каптоприл 25 мг.',
			isAdrenalineContraindicated: true,
			isCritical: true,
			systolic,
			diastolic,
			pulsePressure,
			meanArterialPressure: map,
			isHypertensiveCrisis: true,
			isStage2Hypertension: true,
			isStage1Hypertension: true,
			isHypotensionCollapse: false,
			isAdrenalineBlocked: true,
		};
	}

	// 3. Артериальная гипертензия II степени (160-179 / 100-109)
	if (systolic >= 160 || diastolic >= 100) {
		return {
			value: `${systolic}/${diastolic}`,
			unit: 'мм рт.ст.',
			level: 'crisis',
			statusLabelRu: 'Артериальная гипертензия II степени',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Выраженная гипертензия: Блокировка высоких доз адреналина (1:100k запрещен, только без адреналина или макс 1 карпула 1:200k). Гипотензивная терапия.',
			isAdrenalineContraindicated: true,
			isCritical: false,
			systolic,
			diastolic,
			pulsePressure,
			meanArterialPressure: map,
			isHypertensiveCrisis: false,
			isStage2Hypertension: true,
			isStage1Hypertension: true,
			isHypotensionCollapse: false,
			isAdrenalineBlocked: true,
		};
	}

	// 4. Артериальная гипертензия I степени (140-159 / 90-99)
	if (systolic >= 140 || diastolic >= 90) {
		return {
			value: `${systolic}/${diastolic}`,
			unit: 'мм рт.ст.',
			level: 'attention',
			statusLabelRu: 'Артериальная гипертензия I степени',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Умеренная гипертензия: кардиологический лимит адреналина (0.04 мг / макс 2 карпулы 1:100k или Скандонест 3%).',
			isAdrenalineContraindicated: false,
			isCritical: false,
			systolic,
			diastolic,
			pulsePressure,
			meanArterialPressure: map,
			isHypertensiveCrisis: false,
			isStage2Hypertension: false,
			isStage1Hypertension: true,
			isHypotensionCollapse: false,
			isAdrenalineBlocked: false,
		};
	}

	// 5. Умеренная гипотензия (САД < 90 или ДАД < 60)
	if (systolic < 90 || diastolic < 60) {
		return {
			value: `${systolic}/${diastolic}`,
			unit: 'мм рт.ст.',
			level: 'attention',
			statusLabelRu: 'Артериальная гипотензия',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'Сниженное АД: риск вазовагального обморока. Горизонтальное положение кресла, контроль сознания.',
			isAdrenalineContraindicated: false,
			isCritical: false,
			systolic,
			diastolic,
			pulsePressure,
			meanArterialPressure: map,
			isHypertensiveCrisis: false,
			isStage2Hypertension: false,
			isStage1Hypertension: false,
			isHypotensionCollapse: false,
			isAdrenalineBlocked: false,
		};
	}

	// 6. Высокое нормальное АД (130-139 / 85-89)
	if (systolic >= 130 || diastolic >= 85) {
		return {
			value: `${systolic}/${diastolic}`,
			unit: 'мм рт.ст.',
			level: 'attention',
			statusLabelRu: 'Высокое нормальное АД',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'АД повышено на фоне стоматологического стресса. Контроль переносимости анестезии.',
			isAdrenalineContraindicated: false,
			isCritical: false,
			systolic,
			diastolic,
			pulsePressure,
			meanArterialPressure: map,
			isHypertensiveCrisis: false,
			isStage2Hypertension: false,
			isStage1Hypertension: false,
			isHypotensionCollapse: false,
			isAdrenalineBlocked: false,
		};
	}

	// 7. Оптимальное / Нормальное АД (100-129 / 60-84)
	return {
		value: `${systolic}/${diastolic}`,
		unit: 'мм рт.ст.',
		level: 'normal',
		statusLabelRu: 'Нормотензия (Норма)',
		badgeVariant: 'green',
		clinicalInterpretationRu: 'АД в пределах физиологической нормы. Ограничений по местной анестезии нет.',
		isAdrenalineContraindicated: false,
		isCritical: false,
		systolic,
		diastolic,
		pulsePressure,
		meanArterialPressure: map,
		isHypertensiveCrisis: false,
		isStage2Hypertension: false,
		isStage1Hypertension: false,
		isHypotensionCollapse: false,
		isAdrenalineBlocked: false,
	};
}

/**
 * Оценка частоты сердечных сокращений (ЧСС / Пульс)
 */
export function evaluateHeartRate(bpm: number): HeartRateTriageResult {
	if (bpm <= 0) {
		return {
			value: bpm,
			unit: 'уд/мин',
			level: 'emergency',
			statusLabelRu: 'Асистолия / Остановка сердца',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'ОТСУТСТВИЕ ПУЛЬСА: Немедленный вызов реанимации 103/112! СЛР 30:2, дефибриллятор, Адреналин 1 мг в/в.',
			isAdrenalineContraindicated: false,
			isCritical: true,
			bpm,
			isSevereBradycardia: true,
			isModerateBradycardia: true,
			isModerateTachycardia: false,
			isSevereTachycardia: false,
			isCardiacArrest: true,
		};
	}

	if (bpm < 40) {
		return {
			value: bpm,
			unit: 'уд/мин',
			level: 'emergency',
			statusLabelRu: 'Критическая брадикардия (<40)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'УГРОЗА АСИСТОЛИИ: Пульс <40 уд/мин. Положение лежа, оксигенация, подготовка Атропина 0.5-1.0 мг в/в, вызов 103.',
			isAdrenalineContraindicated: false,
			isCritical: true,
			bpm,
			isSevereBradycardia: true,
			isModerateBradycardia: true,
			isModerateTachycardia: false,
			isSevereTachycardia: false,
			isCardiacArrest: false,
		};
	}

	if (bpm < 50) {
		return {
			value: bpm,
			unit: 'уд/мин',
			level: 'crisis',
			statusLabelRu: 'Выраженная брадикардия (<50)',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Брадикардия: контроль ритма, исключить вазовагальный обморок, токсичность анестетика или блокаду проводящих путей.',
			isAdrenalineContraindicated: false,
			isCritical: false,
			bpm,
			isSevereBradycardia: true,
			isModerateBradycardia: true,
			isModerateTachycardia: false,
			isSevereTachycardia: false,
			isCardiacArrest: false,
		};
	}

	if (bpm < 60) {
		return {
			value: bpm,
			unit: 'уд/мин',
			level: 'attention',
			statusLabelRu: 'Умеренная брадикардия (50-59)',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'Сниженный пульс: физиологическая брадикардия спортсменов либо реакция на седацию.',
			isAdrenalineContraindicated: false,
			isCritical: false,
			bpm,
			isSevereBradycardia: false,
			isModerateBradycardia: true,
			isModerateTachycardia: false,
			isSevereTachycardia: false,
			isCardiacArrest: false,
		};
	}

	if (bpm > 140) {
		return {
			value: bpm,
			unit: 'уд/мин',
			level: 'emergency',
			statusLabelRu: 'Пароксизмальная тахикардия (>140)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'КРИТИЧЕСКАЯ ТАХИАРИТМИЯ: Прекратить введение вазоконстрикторов! Риск фибрилляции/ишемии миокарда. ЭКГ, вызов СМП 103.',
			isAdrenalineContraindicated: true,
			isCritical: true,
			bpm,
			isSevereBradycardia: false,
			isModerateBradycardia: false,
			isModerateTachycardia: true,
			isSevereTachycardia: true,
			isCardiacArrest: false,
		};
	}

	if (bpm > 110) {
		return {
			value: bpm,
			unit: 'уд/мин',
			level: 'crisis',
			statusLabelRu: 'Выраженная тахикардия (>110)',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Тахикардия >110 уд/мин: запрет дополнительного адреналина! Оценить болевой синдром, паническую атаку, интоксикацию.',
			isAdrenalineContraindicated: true,
			isCritical: false,
			bpm,
			isSevereBradycardia: false,
			isModerateBradycardia: false,
			isModerateTachycardia: true,
			isSevereTachycardia: true,
			isCardiacArrest: false,
		};
	}

	if (bpm > 90) {
		return {
			value: bpm,
			unit: 'уд/мин',
			level: 'attention',
			statusLabelRu: 'Умеренная тахикардия (91-110)',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'Учащенный пульс: стресс, болевая реакция или первичное действие адреналина из анестетика.',
			isAdrenalineContraindicated: false,
			isCritical: false,
			bpm,
			isSevereBradycardia: false,
			isModerateBradycardia: false,
			isModerateTachycardia: true,
			isSevereTachycardia: false,
			isCardiacArrest: false,
		};
	}

	return {
		value: bpm,
		unit: 'уд/мин',
		level: 'normal',
		statusLabelRu: 'Нормокардия (60-90)',
		badgeVariant: 'green',
		clinicalInterpretationRu: 'Частота сердечных сокращений в норме. Стабильный ритм.',
		isAdrenalineContraindicated: false,
		isCritical: false,
		bpm,
		isSevereBradycardia: false,
		isModerateBradycardia: false,
		isModerateTachycardia: false,
		isSevereTachycardia: false,
		isCardiacArrest: false,
	};
}

/**
 * Оценка оксигенации (SpO2, %)
 */
export function evaluateSpO2(percentage: number): SpO2TriageResult {
	if (percentage < 70) {
		return {
			value: `${percentage}%`,
			unit: '%',
			level: 'emergency',
			statusLabelRu: 'Остановка дыхания / Тяжелая асфиксия (<70%)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'КРИТИЧЕСКАЯ ГИПОКСИЯ: Немедленная подача 100% O2 через маску 15 л/мин / ИВЛ мешком Амбу, очистка дыхательных путей!',
			isCritical: true,
			percentage,
			isHypoxiaModerate: true,
			isHypoxiaCritical: true,
			isRespiratoryFailure: true,
		};
	}

	if (percentage < 90) {
		return {
			value: `${percentage}%`,
			unit: '%',
			level: 'crisis',
			statusLabelRu: 'Критическая гипоксия (<90%)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'ОПАСНАЯ ГИПОКСИЯ (SpO2 <90%): Прекратить манипуляции! Ингаляция кислорода 10-15 л/мин через маску с резервуаром.',
			isCritical: true,
			percentage,
			isHypoxiaModerate: true,
			isHypoxiaCritical: true,
			isRespiratoryFailure: true,
		};
	}

	if (percentage <= 94) {
		return {
			value: `${percentage}%`,
			unit: '%',
			level: 'attention',
			statusLabelRu: 'Умеренная гипоксия (90-94%)',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Снижение сатурации: расстегнуть воротник, обеспечить приток свежего воздуха / O2 4-6 л/мин через назальные канюли.',
			isCritical: false,
			percentage,
			isHypoxiaModerate: true,
			isHypoxiaCritical: false,
			isRespiratoryFailure: false,
		};
	}

	return {
		value: `${percentage}%`,
		unit: '%',
		level: 'normal',
		statusLabelRu: 'Нормоксия (≥95%)',
		badgeVariant: 'green',
		clinicalInterpretationRu: 'Сатурация кислорода крови в пределах нормы (норма ≥95%).',
		isCritical: false,
		percentage,
		isHypoxiaModerate: false,
		isHypoxiaCritical: false,
		isRespiratoryFailure: false,
	};
}

/**
 * Оценка уровня глюкозы капиллярной крови (ммоль/л)
 */
export function evaluateBloodGlucose(glucose: number | null | undefined): GlucoseTriageResult | undefined {
	if (glucose === null || glucose === undefined || Number.isNaN(glucose)) {
		return undefined;
	}

	if (glucose < 2.8) {
		return {
			value: glucose.toFixed(1),
			unit: 'ммоль/л',
			level: 'emergency',
			statusLabelRu: 'Тяжелая гипогликемическая кома (<2.8)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'УГРОЗА ГИПОГЛИКЕМИЧЕСКОЙ КОМЫ: 40% раствор глюкозы 40-60 мл в/в струйно (или Глюкагон 1 мг в/м). Вызов 103.',
			isCritical: true,
			glucoseMmolL: glucose,
			isHypoglycemiaSevere: true,
			isHypoglycemiaModerate: true,
			isHyperglycemiaModerate: false,
			isHyperglycemiaSevere: false,
		};
	}

	if (glucose < 3.3) {
		return {
			value: glucose.toFixed(1),
			unit: 'ммоль/л',
			level: 'crisis',
			statusLabelRu: 'Выраженная гипогликемия (<3.3)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'Опасная гипогликемия: 15-20 г быстрых углеводов (сок, сахар, декстроза) при сохранном сознании. Прекратить лечение.',
			isCritical: true,
			glucoseMmolL: glucose,
			isHypoglycemiaSevere: false,
			isHypoglycemiaModerate: true,
			isHyperglycemiaModerate: false,
			isHyperglycemiaSevere: false,
		};
	}

	if (glucose < 3.9) {
		return {
			value: glucose.toFixed(1),
			unit: 'ммоль/л',
			level: 'attention',
			statusLabelRu: 'Легкая гипогликемия (3.3-3.8)',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'Пограничный уровень сахара: сладкий чай/сок перед продолжением инъекций.',
			isCritical: false,
			glucoseMmolL: glucose,
			isHypoglycemiaSevere: false,
			isHypoglycemiaModerate: true,
			isHyperglycemiaModerate: false,
			isHyperglycemiaSevere: false,
		};
	}

	if (glucose > 13.0) {
		return {
			value: glucose.toFixed(1),
			unit: 'ммоль/л',
			level: 'crisis',
			statusLabelRu: 'Тяжелая гипергликемия (>13.0)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'Выраженная гипергликемия: риск диабетического кетоацидоза. Плановое лечение перенести, консультация эндокринолога.',
			isCritical: true,
			glucoseMmolL: glucose,
			isHypoglycemiaSevere: false,
			isHypoglycemiaModerate: false,
			isHyperglycemiaModerate: true,
			isHyperglycemiaSevere: true,
		};
	}

	if (glucose > 11.0) {
		return {
			value: glucose.toFixed(1),
			unit: 'ммоль/л',
			level: 'attention',
			statusLabelRu: 'Гипергликемия (>11.0)',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Повышенный уровень сахара крови (>11.0 ммоль/л). Минимизировать хирургическую травму, контроль заживления.',
			isCritical: false,
			glucoseMmolL: glucose,
			isHypoglycemiaSevere: false,
			isHypoglycemiaModerate: false,
			isHyperglycemiaModerate: true,
			isHyperglycemiaSevere: false,
		};
	}

	if (glucose > 6.1) {
		return {
			value: glucose.toFixed(1),
			unit: 'ммоль/л',
			level: 'normal',
			statusLabelRu: 'Постпрандиальная норма (6.2-11.0)',
			badgeVariant: 'green',
			clinicalInterpretationRu: 'Допустимый уровень после приема пищи (в норме до 7.8-11.0 ммоль/л).',
			isCritical: false,
			glucoseMmolL: glucose,
			isHypoglycemiaSevere: false,
			isHypoglycemiaModerate: false,
			isHyperglycemiaModerate: false,
			isHyperglycemiaSevere: false,
		};
	}

	return {
		value: glucose.toFixed(1),
		unit: 'ммоль/л',
		level: 'normal',
		statusLabelRu: 'Нормогликемия (3.9-6.1)',
		badgeVariant: 'green',
		clinicalInterpretationRu: 'Уровень глюкозы крови натощак в пределах физиологической нормы.',
		isCritical: false,
		glucoseMmolL: glucose,
		isHypoglycemiaSevere: false,
		isHypoglycemiaModerate: false,
		isHyperglycemiaModerate: false,
		isHyperglycemiaSevere: false,
	};
}

/**
 * Оценка частоты дыхательных движений (ЧДД, вдохов/мин)
 */
export function evaluateRespiratoryRate(rr: number | null | undefined): ParameterTriageResult | undefined {
	if (rr === null || rr === undefined || Number.isNaN(rr)) {
		return undefined;
	}

	if (rr === 0) {
		return {
			value: 0,
			unit: 'вдохов/мин',
			level: 'emergency',
			statusLabelRu: 'Апноэ / Остановка дыхания',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'ОТСУТСТВИЕ ДЫХАНИЯ: Немедленная ИВЛ мешком Амбу с кислородом 100%, проверка пульса на сонной артерии!',
			isCritical: true,
		};
	}

	if (rr < 10) {
		return {
			value: rr,
			unit: 'вдохов/мин',
			level: 'crisis',
			statusLabelRu: 'Брадипноэ (<10/мин)',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Угнетение дыхания: исключить передозировку седативных средств или острую гипоксию ствола мозга.',
			isCritical: true,
		};
	}

	if (rr > 30) {
		return {
			value: rr,
			unit: 'вдохов/мин',
			level: 'crisis',
			statusLabelRu: 'Выраженное тахипноэ (>30/мин)',
			badgeVariant: 'red',
			clinicalInterpretationRu: 'Острая одышка / тахипноэ: бронхоспазм, отек гортани, паническая гипервентиляция. Оксигенация 10-15 л/мин.',
			isCritical: true,
		};
	}

	if (rr > 20) {
		return {
			value: rr,
			unit: 'вдохов/мин',
			level: 'attention',
			statusLabelRu: 'Умеренное тахипноэ (21-30/мин)',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'Учащенное дыхание: эмоциональное напряжение, тревога или болевой синдром.',
			isCritical: false,
		};
	}

	return {
		value: rr,
		unit: 'вдохов/мин',
		level: 'normal',
		statusLabelRu: 'Нормопноэ (12-20/мин)',
		badgeVariant: 'green',
		clinicalInterpretationRu: 'Частота дыхания в пределах нормы (12–20 вдохов в минуту).',
		isCritical: false,
	};
}

/**
 * Оценка температуры тела (°C)
 */
export function evaluateBodyTemperature(temp: number | null | undefined): ParameterTriageResult | undefined {
	if (temp === null || temp === undefined || Number.isNaN(temp)) {
		return undefined;
	}

	if (temp >= 38.5) {
		return {
			value: `${temp.toFixed(1)}°C`,
			unit: '°C',
			level: 'crisis',
			statusLabelRu: 'Фебрильная лихорадка (≥38.5°C)',
			badgeVariant: 'orange',
			clinicalInterpretationRu: 'Высокая температура: острый воспалительный процесс, периостит, флегмона. Снижение эффективности местных анестетиков.',
			isCritical: false,
		};
	}

	if (temp >= 37.3) {
		return {
			value: `${temp.toFixed(1)}°C`,
			unit: '°C',
			level: 'attention',
			statusLabelRu: 'Субфебрилитет (37.3-38.4°C)',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'Умеренно повышенная температура: воспалительная реакция.',
			isCritical: false,
		};
	}

	if (temp < 35.5) {
		return {
			value: `${temp.toFixed(1)}°C`,
			unit: '°C',
			level: 'attention',
			statusLabelRu: 'Гипотермия (<35.5°C)',
			badgeVariant: 'yellow',
			clinicalInterpretationRu: 'Сниженная температура: сосудистый спазм, шоковое состояние. Согревание пациента.',
			isCritical: false,
		};
	}

	return {
		value: `${temp.toFixed(1)}°C`,
		unit: '°C',
		level: 'normal',
		statusLabelRu: 'Нормотермия (36.0-37.2°C)',
		badgeVariant: 'green',
		clinicalInterpretationRu: 'Температура тела в пределах нормы.',
		isCritical: false,
	};
}

/**
 * КОМПЛЕКСНЫЙ ТРИАЖ ВИТАЛЬНЫХ ФУНКЦИЙ (MASTER ENGINE)
 * Вычисляет суммарный статус триажа, клинические предупреждения и блокировку адреналина
 */
export function evaluateVitalsTriage(input: VitalsInput): VitalsTriageReport {
	const bp = evaluateBloodPressure(input.bpSystolic, input.bpDiastolic);
	const hr = evaluateHeartRate(input.heartRate);
	const spO2 = evaluateSpO2(input.spO2);
	const glucose = evaluateBloodGlucose(input.bloodGlucose);
	const rr = evaluateRespiratoryRate(input.respiratoryRate);
	const temp = evaluateBodyTemperature(input.temperatureC);
	const shockIndex = calculateShockIndex(input.heartRate, input.bpSystolic);

	const isAdrenalineBlocked = Boolean(bp.isAdrenalineBlocked || hr.isAdrenalineContraindicated);
	const isHypertensiveCrisis = bp.isHypertensiveCrisis;
	const isHypotensionCollapse = bp.isHypotensionCollapse;
	const isCriticalHypoxia = spO2.isHypoxiaCritical;
	const isSevereHypoglycemia = Boolean(glucose?.isHypoglycemiaSevere || glucose?.isHypoglycemiaModerate);
	const isCardiacArrest = hr.isCardiacArrest;

	// Определение наивысшего уровня опасности среди всех параметров
	const levels: VitalsTriageLevel[] = [bp.level, hr.level, spO2.level, shockIndex.level];
	if (glucose) levels.push(glucose.level);
	if (rr) levels.push(rr.level);
	if (temp) levels.push(temp.level);

	let overallLevel: VitalsTriageLevel = 'normal';
	if (levels.includes('emergency')) {
		overallLevel = 'emergency';
	} else if (levels.includes('crisis')) {
		overallLevel = 'crisis';
	} else if (levels.includes('attention')) {
		overallLevel = 'attention';
	}

	let overallStatusRu = 'Витальные функции стабильны (Норма)';
	let overallBadgeVariant: TriageBadgeVariant = 'green';

	if (overallLevel === 'emergency') {
		overallStatusRu = 'КРИТИЧЕСКОЕ СОСТОЯНИЕ / РЕАНИМАЦИЯ';
		overallBadgeVariant = 'red';
	} else if (overallLevel === 'crisis') {
		overallStatusRu = 'КРИЗИС / ТРЕБУЕТСЯ НЕОТЛОЖНАЯ ПОМОЩЬ';
		overallBadgeVariant = 'red';
	} else if (overallLevel === 'attention') {
		overallStatusRu = 'ВНИМАНИЕ: Отклонение витальных показателей';
		overallBadgeVariant = 'yellow';
	}

	// Определение рекомендованного сценария неотложки
	let suggestedScenarioId: VitalsTriageReport['suggestedScenarioId'] = undefined;
	if (isCardiacArrest) {
		suggestedScenarioId = 'cardiac_arrest';
	} else if (isHypertensiveCrisis) {
		suggestedScenarioId = 'hypertensive_crisis';
	} else if (isHypotensionCollapse && hr.isSevereTachycardia && spO2.isHypoxiaCritical) {
		suggestedScenarioId = 'anaphylactic_shock';
	} else if (isHypotensionCollapse && hr.bpm < 60) {
		suggestedScenarioId = 'syncope_collapse';
	} else if (isHypotensionCollapse) {
		suggestedScenarioId = 'syncope_collapse';
	} else if (glucose?.isHypoglycemiaModerate || glucose?.isHypoglycemiaSevere) {
		suggestedScenarioId = 'hypoglycemia';
	}

	// Сбор неотложных рекомендаций
	const urgentActionGuidelinesRu: string[] = [];

	if (isCardiacArrest) {
		urgentActionGuidelinesRu.push('🚨 НЕМЕДЛЕННАЯ СЛР 30:2 — 100-120 компрессий/мин, дефибриллятор, Адреналин 1 мг в/в');
	}

	if (isAdrenalineBlocked) {
		urgentActionGuidelinesRu.push('⛔ БЛОКИРОВКА АДРЕНАЛИНА: запрещено введение растворов с эпинефрином (риск ОНМК/аритмии)');
	}

	if (isHypertensiveCrisis) {
		urgentActionGuidelinesRu.push('💊 ГИПЕРТОНИЧЕСКИЙ КРИЗ: прекратить препарирование, полусидячее положение, Моксонидин 0.2–0.4 мг под язык / Каптоприл 25 мг');
	}

	if (isHypotensionCollapse) {
		urgentActionGuidelinesRu.push('🛌 КОЛЛАПС / ГИПОТОНИЯ: положение Тренделенбурга (ноги выше головы), доступ к вене, инфузия 0.9% NaCl');
	}

	if (isCriticalHypoxia) {
		urgentActionGuidelinesRu.push('💨 ОСТРАЯ ГИПОКСИЯ: ингаляция 100% кислорода 10–15 л/мин через маску с резервуаром');
	}

	if (isSevereHypoglycemia) {
		urgentActionGuidelinesRu.push('🍬 ГИПОГЛИКЕМИЯ: 15–20 г быстрых углеводов (при сознании) или 40% глюкоза 40–60 мл в/в струйно');
	}

	if (shockIndex.isDecompensatedShock) {
		urgentActionGuidelinesRu.push('⚡ ДЕКОМПЕНСИРОВАННЫЙ ШОК (SI ≥ 1.5): экстренный вызов СМП 103/112, противошоковые мероприятия');
	}

	const isEmergencyRescueRecommended = overallLevel === 'emergency' || overallLevel === 'crisis';

	return {
		input,
		overallLevel,
		overallStatusRu,
		overallBadgeVariant,
		bloodPressure: bp,
		heartRate: hr,
		spO2,
		glucose,
		respiratoryRate: rr,
		temperature: temp,
		shockIndex,
		meanArterialPressure: bp.meanArterialPressure,
		isAdrenalineBlocked,
		isHypertensiveCrisis,
		isHypotensionCollapse,
		isCriticalHypoxia,
		isSevereHypoglycemia,
		isCardiacArrest,
		isEmergencyRescueRecommended,
		suggestedScenarioId,
		urgentActionGuidelinesRu,
		timestampIso: new Date().toISOString(),
	};
}
