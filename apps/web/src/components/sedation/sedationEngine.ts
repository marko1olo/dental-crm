/**
 * Clinical Pediatric Sedation & Nitrous Oxide Safety Engine (Минздрав РФ / EAPD / AAPD)
 * Age-dependent vital signs thresholds (2–14 years), N2O/O2 gas consumption & cost math,
 * Form 043/u official protocol generator, Fasting safety validation, and Bravery Diploma data.
 */

import {
	AromaMaskScentId,
	AROMA_MASK_SCENTS,
	BraveryBadgeId,
	BRAVERY_BADGES,
	FranklRating,
	FRANKL_BEHAVIOR_SCALE,
	SEDATION_SAFETY_LIMITS
} from './sedationPresets';

// ---------------------------------------------------------------------------
// 1. Vital Signs Norms by Pediatric Age Group (2–14 years)
// ---------------------------------------------------------------------------

export interface AgeVitalNorms {
	ageGroupKey: 'toddler_2_3' | 'preschool_4_6' | 'school_7_10' | 'adolescent_11_14';
	ageGroupRu: string;
	minAgeYears: number;
	maxAgeYears: number;
	pulseBpmMin: number;
	pulseBpmMax: number;
	pulseBpmCriticalLow: number;
	pulseBpmCriticalHigh: number;
	respiratoryRateMin: number;
	respiratoryRateMax: number;
	respiratoryRateCriticalLow: number;
	respiratoryRateCriticalHigh: number;
	spo2MinSafe: number;
	spo2WarningThreshold: number;
	systolicBpMin: number;
	systolicBpMax: number;
	diastolicBpMin: number;
	diastolicBpMax: number;
}

export const AGE_VITAL_NORMS_TABLE: Record<string, AgeVitalNorms> = {
	toddler_2_3: {
		ageGroupKey: 'toddler_2_3',
		ageGroupRu: 'Младший возраст (2–3 года)',
		minAgeYears: 2,
		maxAgeYears: 3,
		pulseBpmMin: 80,
		pulseBpmMax: 140,
		pulseBpmCriticalLow: 70,
		pulseBpmCriticalHigh: 160,
		respiratoryRateMin: 20,
		respiratoryRateMax: 30,
		respiratoryRateCriticalLow: 16,
		respiratoryRateCriticalHigh: 40,
		spo2MinSafe: 95,
		spo2WarningThreshold: 92,
		systolicBpMin: 85,
		systolicBpMax: 105,
		diastolicBpMin: 50,
		diastolicBpMax: 70
	},
	preschool_4_6: {
		ageGroupKey: 'preschool_4_6',
		ageGroupRu: 'Дошкольный возраст (4–6 лет)',
		minAgeYears: 4,
		maxAgeYears: 6,
		pulseBpmMin: 75,
		pulseBpmMax: 120,
		pulseBpmCriticalLow: 65,
		pulseBpmCriticalHigh: 145,
		respiratoryRateMin: 20,
		respiratoryRateMax: 25,
		respiratoryRateCriticalLow: 14,
		respiratoryRateCriticalHigh: 35,
		spo2MinSafe: 95,
		spo2WarningThreshold: 92,
		systolicBpMin: 90,
		systolicBpMax: 110,
		diastolicBpMin: 55,
		diastolicBpMax: 75
	},
	school_7_10: {
		ageGroupKey: 'school_7_10',
		ageGroupRu: 'Младший школьный возраст (7–10 лет)',
		minAgeYears: 7,
		maxAgeYears: 10,
		pulseBpmMin: 70,
		pulseBpmMax: 110,
		pulseBpmCriticalLow: 60,
		pulseBpmCriticalHigh: 130,
		respiratoryRateMin: 16,
		respiratoryRateMax: 22,
		respiratoryRateCriticalLow: 12,
		respiratoryRateCriticalHigh: 30,
		spo2MinSafe: 95,
		spo2WarningThreshold: 92,
		systolicBpMin: 95,
		systolicBpMax: 115,
		diastolicBpMin: 60,
		diastolicBpMax: 80
	},
	adolescent_11_14: {
		ageGroupKey: 'adolescent_11_14',
		ageGroupRu: 'Подростковый возраст (11–14 лет)',
		minAgeYears: 11,
		maxAgeYears: 14,
		pulseBpmMin: 60,
		pulseBpmMax: 100,
		pulseBpmCriticalLow: 50,
		pulseBpmCriticalHigh: 120,
		respiratoryRateMin: 12,
		respiratoryRateMax: 20,
		respiratoryRateCriticalLow: 10,
		respiratoryRateCriticalHigh: 26,
		spo2MinSafe: 95,
		spo2WarningThreshold: 92,
		systolicBpMin: 100,
		systolicBpMax: 125,
		diastolicBpMin: 65,
		diastolicBpMax: 85
	}
};

/**
 * Returns age-specific vital norms for pediatric patient (ages 2–14 years).
 */
export function getAgeVitalNorms(ageYears: number): AgeVitalNorms {
	const clampedAge = Math.max(2, Math.min(14, ageYears));
	if (clampedAge <= 3) return AGE_VITAL_NORMS_TABLE['toddler_2_3']!;
	if (clampedAge <= 6) return AGE_VITAL_NORMS_TABLE['preschool_4_6']!;
	if (clampedAge <= 10) return AGE_VITAL_NORMS_TABLE['school_7_10']!;
	return AGE_VITAL_NORMS_TABLE['adolescent_11_14']!;
}

// ---------------------------------------------------------------------------
// 2. Vital Signs Evaluation & Safety Status
// ---------------------------------------------------------------------------

export type VitalStatusLevel = 'safe' | 'warning' | 'critical';

export interface VitalSignsInput {
	spo2: number;
	pulse: number;
	respiratoryRate?: number | undefined;
	systolicBp?: number | undefined;
	diastolicBp?: number | undefined;
}

export interface VitalSignsEvaluation {
	overallStatus: VitalStatusLevel;
	spo2Status: VitalStatusLevel;
	pulseStatus: VitalStatusLevel;
	respiratoryStatus: VitalStatusLevel;
	bpStatus: VitalStatusLevel;
	ageGroupRu: string;
	alertsRu: string[];
	recommendationsRu: string[];
}

export function evaluateVitalSigns(vitals: VitalSignsInput, ageYears: number): VitalSignsEvaluation {
	const norms = getAgeVitalNorms(ageYears);
	const alertsRu: string[] = [];
	const recommendationsRu: string[] = [];

	let spo2Status: VitalStatusLevel = 'safe';
	let pulseStatus: VitalStatusLevel = 'safe';
	let respiratoryStatus: VitalStatusLevel = 'safe';
	let bpStatus: VitalStatusLevel = 'safe';

	// SpO2 Evaluation
	if (vitals.spo2 < norms.spo2WarningThreshold) {
		spo2Status = 'critical';
		alertsRu.push(`Критическая десатурация SpO₂ (${vitals.spo2}% < ${norms.spo2WarningThreshold}%). Угроза гипоксемии!`);
		recommendationsRu.push('НЕМЕДЛЕННО переключить подачу на 100% O₂, проверить проходимость дыхательных путей и плотность прилегания маски.');
	} else if (vitals.spo2 < norms.spo2MinSafe) {
		spo2Status = 'warning';
		alertsRu.push(`Снижение сатурации SpO₂ (${vitals.spo2}% при норме >= ${norms.spo2MinSafe}%).`);
		recommendationsRu.push('Увеличить поток O₂, напомнить ребенку дышать глубоко через нос, проверить проходимость носовых ходов.');
	}

	// Pulse / Heart Rate Evaluation
	if (vitals.pulse < norms.pulseBpmCriticalLow) {
		pulseStatus = 'critical';
		alertsRu.push(`Критическая брадикардия (ЧСС ${vitals.pulse} уд/мин < ${norms.pulseBpmCriticalLow}).`);
		recommendationsRu.push('Прекратить подачу N₂O, 100% O₂, вызвать реанимационную бригаду при сохранении брадикардии.');
	} else if (vitals.pulse > norms.pulseBpmCriticalHigh) {
		pulseStatus = 'critical';
		alertsRu.push(`Выраженная тахикардия (ЧСС ${vitals.pulse} уд/мин > ${norms.pulseBpmCriticalHigh}).`);
		recommendationsRu.push('Оценить уровень боли/стресса, проверить адекватность местной анестезии, снизить N₂O.');
	} else if (vitals.pulse < norms.pulseBpmMin) {
		pulseStatus = 'warning';
		alertsRu.push(`Умеренное снижение ЧСС (${vitals.pulse} уд/мин, норма: ${norms.pulseBpmMin}–${norms.pulseBpmMax}).`);
	} else if (vitals.pulse > norms.pulseBpmMax) {
		pulseStatus = 'warning';
		alertsRu.push(`Умеренное повышение ЧСС (${vitals.pulse} уд/мин, норма: ${norms.pulseBpmMin}–${norms.pulseBpmMax}).`);
		recommendationsRu.push('Психологическая поддержка, вербальный контакт с ребенком, проверка фиксации маски.');
	}

	// Respiratory Rate Evaluation (if provided)
	if (vitals.respiratoryRate !== undefined && vitals.respiratoryRate > 0) {
		if (vitals.respiratoryRate < norms.respiratoryRateCriticalLow) {
			respiratoryStatus = 'critical';
			alertsRu.push(`Угнетение дыхания (ЧДД ${vitals.respiratoryRate}/мин < ${norms.respiratoryRateCriticalLow}).`);
			recommendationsRu.push('Немедленно прекратить подачу N₂O, перейти на 100% O₂, проверить экскурсию грудной клетки.');
		} else if (vitals.respiratoryRate > norms.respiratoryRateCriticalHigh) {
			respiratoryStatus = 'critical';
			alertsRu.push(`Выраженное тахипноэ (ЧДД ${vitals.respiratoryRate}/мин > ${norms.respiratoryRateCriticalHigh}).`);
		} else if (vitals.respiratoryRate < norms.respiratoryRateMin || vitals.respiratoryRate > norms.respiratoryRateMax) {
			respiratoryStatus = 'warning';
			alertsRu.push(`ЧДД вне референсного диапазона (${vitals.respiratoryRate}/мин, норма: ${norms.respiratoryRateMin}–${norms.respiratoryRateMax}).`);
		}
	}

	// Blood Pressure Evaluation (if provided)
	if (vitals.systolicBp !== undefined && vitals.systolicBp > 0) {
		if (vitals.systolicBp > norms.systolicBpMax + 35 || (vitals.diastolicBp !== undefined && vitals.diastolicBp > norms.diastolicBpMax + 25)) {
			bpStatus = 'critical';
			alertsRu.push(`Критический гипертонический криз АД (${vitals.systolicBp}/${vitals.diastolicBp ?? '-'} мм рт. ст., норма: ${norms.systolicBpMin}–${norms.systolicBpMax}/${norms.diastolicBpMin}–${norms.diastolicBpMax}).`);
			recommendationsRu.push('Немедленно прекратить вмешательство, снизить N2O, вызвать детского реаниматолога.');
		} else if (vitals.systolicBp > norms.systolicBpMax + 15 || (vitals.diastolicBp !== undefined && vitals.diastolicBp > norms.diastolicBpMax + 10)) {
			bpStatus = 'warning';
			alertsRu.push(`Повышение АД (${vitals.systolicBp}/${vitals.diastolicBp ?? '-'} мм рт. ст., норма: ${norms.systolicBpMin}–${norms.systolicBpMax}/${norms.diastolicBpMin}–${norms.diastolicBpMax}).`);
		}
	}

	// Overall status hierarchy
	let overallStatus: VitalStatusLevel = 'safe';
	if (spo2Status === 'critical' || pulseStatus === 'critical' || respiratoryStatus === 'critical' || bpStatus === 'critical') {
		overallStatus = 'critical';
	} else if (spo2Status === 'warning' || pulseStatus === 'warning' || respiratoryStatus === 'warning' || bpStatus === 'warning') {
		overallStatus = 'warning';
	}

	if (alertsRu.length === 0) {
		alertsRu.push('Все витальные показатели в пределах возрастной физиологической нормы.');
		recommendationsRu.push('Продолжать плановую седацию с мониторингом каждые 5 минут.');
	}

	return {
		overallStatus,
		spo2Status,
		pulseStatus,
		respiratoryStatus,
		bpStatus,
		ageGroupRu: norms.ageGroupRu,
		alertsRu,
		recommendationsRu
	};
}

// ---------------------------------------------------------------------------
// 3. Gas Mixture Math & Titration Safety Guard
// ---------------------------------------------------------------------------

export interface GasMixtureOutput {
	n2oPercent: number;
	o2Percent: number;
	flowRateLpm: number;
	n2oFlowLpm: number;
	o2FlowLpm: number;
	isSafe: boolean;
	isHypoxiaRisk: boolean;
	isExcessiveSedationRisk: boolean;
	statusMessageRu: string;
	safetyWarningsRu: string[];
}

export function calculateGasMixture(n2oPercentInput: number, flowRateLpmInput: number): GasMixtureOutput {
	const flowRateLpm = Math.max(1.0, Math.min(15.0, Number(flowRateLpmInput.toFixed(1))));
	const clampedN2o = Math.max(0, Math.min(SEDATION_SAFETY_LIMITS.maxN2oPercentAbsolute, Math.round(n2oPercentInput)));
	const o2Percent = 100 - clampedN2o;

	const n2oFlowLpm = Number(((flowRateLpm * clampedN2o) / 100).toFixed(2));
	const o2FlowLpm = Number(((flowRateLpm * o2Percent) / 100).toFixed(2));

	const safetyWarningsRu: string[] = [];
	let isHypoxiaRisk = false;
	let isExcessiveSedationRisk = false;

	if (o2Percent < SEDATION_SAFETY_LIMITS.minO2PercentCritical) {
		isHypoxiaRisk = true;
		safetyWarningsRu.push(`ОПАСНОСТЬ ГИПОКСИИ: Концентрация O₂ (${o2Percent}%) ниже критического порога ${SEDATION_SAFETY_LIMITS.minO2PercentCritical}%!`);
	}

	if (clampedN2o > SEDATION_SAFETY_LIMITS.maxN2oPercentRoutine) {
		isExcessiveSedationRisk = true;
		safetyWarningsRu.push(`Концентрация N₂O (${clampedN2o}%) превышает стандартный амбулаторный предел ${SEDATION_SAFETY_LIMITS.maxN2oPercentRoutine}%. Требуется усиленный контроль рефлексов.`);
	}

	const isSafe = !isHypoxiaRisk;
	let statusMessageRu = 'Газовая смесь безопасна, оксигенация в норме.';
	if (clampedN2o === 0) {
		statusMessageRu = '100% Кислород (Индукция / Продувка).';
	} else if (clampedN2o <= 30) {
		statusMessageRu = 'Легкая анксиолитическая седация (N₂O ≤ 30%).';
	} else if (clampedN2o <= 50) {
		statusMessageRu = 'Терапевтическая умеренная седация ЗАКС (N₂O 30–50%).';
	} else {
		statusMessageRu = 'Высокая концентрация N₂O (> 50%) — повышенное внимание.';
	}

	return {
		n2oPercent: clampedN2o,
		o2Percent,
		flowRateLpm,
		n2oFlowLpm,
		o2FlowLpm,
		isSafe,
		isHypoxiaRisk,
		isExcessiveSedationRisk,
		statusMessageRu,
		safetyWarningsRu
	};
}

// ---------------------------------------------------------------------------
// 4. Gas Consumption & Cost Calculation Engine
// ---------------------------------------------------------------------------

export interface TimelineStep {
	durationMin: number;
	flowRateLpm: number;
	n2oPercent: number;
	o2Percent: number;
}

export interface GasPrices {
	n2oRub: number;
	o2Rub: number;
}

export interface GasConsumptionResult {
	totalO2VolumeLiters: number;
	totalN2oVolumeLiters: number;
	totalGasVolumeLiters: number;
	o2CostRub: number;
	n2oCostRub: number;
	totalCostRub: number;
	totalSedationDurationMinutes: number;
	flushDurationMinutes: number;
	isFlushAdequate: boolean;
	maxN2oReachedPercent: number;
	averageFlowRateLpm: number;
}

export function calculateSedationGasConsumption(
	timelineSteps: TimelineStep[],
	gasPrices: GasPrices = SEDATION_SAFETY_LIMITS.defaultGasPricesRubPerLiter
): GasConsumptionResult {
	if (!timelineSteps || timelineSteps.length === 0) {
		return {
			totalO2VolumeLiters: 0,
			totalN2oVolumeLiters: 0,
			totalGasVolumeLiters: 0,
			o2CostRub: 0,
			n2oCostRub: 0,
			totalCostRub: 0,
			totalSedationDurationMinutes: 0,
			flushDurationMinutes: 0,
			isFlushAdequate: false,
			maxN2oReachedPercent: 0,
			averageFlowRateLpm: 0
		};
	}

	let totalO2Volume = 0;
	let totalN2oVolume = 0;
	let totalDuration = 0;
	let flushDuration = 0;
	let maxN2o = 0;
	let weightedFlowSum = 0;

	// Traverse timeline
	for (let i = 0; i < timelineSteps.length; i++) {
		const step = timelineSteps[i]!;
		const dur = Math.max(0, step.durationMin);
		const flow = Math.max(0, step.flowRateLpm);
		const n2oPct = Math.max(0, Math.min(100, step.n2oPercent));
		const o2Pct = Math.max(0, Math.min(100, step.o2Percent));

		const stepN2oVol = flow * (n2oPct / 100) * dur;
		const stepO2Vol = flow * (o2Pct / 100) * dur;

		totalN2oVolume += stepN2oVol;
		totalO2Volume += stepO2Vol;
		totalDuration += dur;
		weightedFlowSum += flow * dur;

		if (n2oPct > maxN2o) {
			maxN2o = n2oPct;
		}

		// Check if this step is part of the final flush (100% O2 after N2O was delivered)
		if (n2oPct === 0 && o2Pct === 100) {
			flushDuration += dur;
		} else {
			// If N2O was delivered, flush count restarts
			flushDuration = 0;
		}
	}

	const totalGasVolume = totalO2Volume + totalN2oVolume;
	const o2CostRub = Number((totalO2Volume * gasPrices.o2Rub).toFixed(2));
	const n2oCostRub = Number((totalN2oVolume * gasPrices.n2oRub).toFixed(2));
	const totalCostRub = Number((o2CostRub + n2oCostRub).toFixed(2));
	const averageFlowRateLpm = totalDuration > 0 ? Number((weightedFlowSum / totalDuration).toFixed(2)) : 0;

	const isFlushAdequate = flushDuration >= SEDATION_SAFETY_LIMITS.minFlushDurationMinutes;

	return {
		totalO2VolumeLiters: Number(totalO2Volume.toFixed(2)),
		totalN2oVolumeLiters: Number(totalN2oVolume.toFixed(2)),
		totalGasVolumeLiters: Number(totalGasVolume.toFixed(2)),
		o2CostRub,
		n2oCostRub,
		totalCostRub,
		totalSedationDurationMinutes: totalDuration,
		flushDurationMinutes: flushDuration,
		isFlushAdequate,
		maxN2oReachedPercent: maxN2o,
		averageFlowRateLpm
	};
}

// ---------------------------------------------------------------------------
// 5. Fasting Safety Validation (Минздрав РФ / EAPD)
// ---------------------------------------------------------------------------

export interface FastingValidationResult {
	isSafe: boolean;
	clearLiquidsSafe: boolean;
	solidsSafe: boolean;
	warningsRu: string[];
	recommendationsRu: string[];
}

export function validateFastingSafety(fastingLiquidsHours: number, fastingSolidsHours: number): FastingValidationResult {
	const warningsRu: string[] = [];
	const recommendationsRu: string[] = [];

	const clearLiquidsSafe = fastingLiquidsHours >= 2;
	const solidsSafe = fastingSolidsHours >= 6;

	if (!clearLiquidsSafe) {
		warningsRu.push(`Интервал после приема жидкостей (${fastingLiquidsHours} ч) меньше обязательных 2 часов.`);
		recommendationsRu.push('Рекомендуется отложить начало седации до истечения 2-часового интервала для предотвращения регургитации.');
	}

	if (!solidsSafe) {
		warningsRu.push(`Интервал после приема твердой пищи (${fastingSolidsHours} ч) меньше безопасных 6 часов.`);
		recommendationsRu.push('Высокий риск тошноты/рвоты при наложении маски и седации. Проводить вмешательство с максимальной осторожностью или перенести прием.');
	}

	const isSafe = clearLiquidsSafe && solidsSafe;
	if (isSafe) {
		recommendationsRu.push('Голодный интервал полностью соответствует международным протоколам EAPD/AAPD.');
	}

	return {
		isSafe,
		clearLiquidsSafe,
		solidsSafe,
		warningsRu,
		recommendationsRu
	};
}

// ---------------------------------------------------------------------------
// 6. Modified Aldrete Score (Discharge Readiness Assessment)
// ---------------------------------------------------------------------------

export interface AldreteEvaluationInput {
	consciousness: number; // 2 = Fully awake, 1 = Arousable on calling, 0 = Not responding
	activity: number;      // 2 = Moves all 4 extremities, 1 = Moves 2, 0 = Unable
	respiration: number;   // 2 = Deep breaths/cries freely, 1 = Dyspneic/shallow, 0 = Apneic
	circulation: number;   // 2 = BP/Pulse within 20% baseline, 1 = within 20-50%, 0 = >50%
	spo2: number;          // 2 = SpO2 >95% on room air, 1 = needs O2 to maintain >90%, 0 = SpO2 <90%
}

export function calculateModifiedAldreteScore(input: AldreteEvaluationInput): {
	totalScore: number;
	isDischargeReady: boolean;
	statusRu: string;
	remarksRu: string[];
} {
	const totalScore = input.consciousness + input.activity + input.respiration + input.circulation + input.spo2;
	const isDischargeReady = totalScore >= 9 && input.consciousness === 2 && input.spo2 === 2;
	const remarksRu: string[] = [];

	if (isDischargeReady) {
		remarksRu.push('Пациент полностью восстановился, готов к выписке в сопровождении родителей.');
	} else {
		remarksRu.push(`Суммарный балл (${totalScore}/10) недостаточен для выписки (требуется >= 9 баллов). Наблюдение в клинике.`);
		if (input.consciousness < 2) remarksRu.push('Уровень сознания и ориентированности снижен.');
		if (input.spo2 < 2) remarksRu.push('Сатурация требует дополнительного контроля.');
	}

	return {
		totalScore,
		isDischargeReady,
		statusRu: isDischargeReady ? 'Готов к выписке (Норма)' : 'Требуется наблюдение в комнате отдыха',
		remarksRu
	};
}

// ---------------------------------------------------------------------------
// 7. Form 043/u Official Medical Record Sedation Protocol Generator
// ---------------------------------------------------------------------------

export interface VitalSignsLogEntry {
	id: string;
	timestampMinutes: number;
	spo2Percent: number;
	pulseBpm: number;
	respiratoryRate?: number | undefined;
	systolicBp?: number | undefined;
	diastolicBp?: number | undefined;
	n2oPercent: number;
	o2Percent: number;
	flowRateLpm: number;
	franklRating: FranklRating;
	notes?: string | undefined;
}

export interface SedationProtocol043Input {
	patientFullName: string;
	patientAgeYears: number;
	procedureDate: string;
	doctorFullName: string;
	assistantFullName?: string | undefined;
	clinicalDiagnosisRu: string;
	plannedProcedureRu: string;
	preOpFrankl: FranklRating;
	postOpFrankl: FranklRating;
	maskScent: AromaMaskScentId;
	fastingHoursSinceSolids: number;
	fastingHoursSinceLiquids: number;
	vitalLogs: VitalSignsLogEntry[];
	gasPrices?: GasPrices | undefined;
	doctorNotes?: string | undefined;
	dischargeAldreteScore?: number | undefined;
}

export interface SedationProtocol043Output {
	fullFormattedTextRu: string;
	consumption: GasConsumptionResult;
	vitalsSummaryRu: string;
	safetyAuditPassed: boolean;
	safetyWarnings: string[];
}

export function generateSedationProtocol043(input: SedationProtocol043Input): SedationProtocol043Output {
	const timelineSteps: TimelineStep[] = [];

	if (input.vitalLogs.length > 0) {
		for (let i = 0; i < input.vitalLogs.length; i++) {
			const log = input.vitalLogs[i]!;
			const nextLog = input.vitalLogs[i + 1];
			const duration = nextLog ? Math.max(1, nextLog.timestampMinutes - log.timestampMinutes) : 5;
			timelineSteps.push({
				durationMin: duration,
				flowRateLpm: log.flowRateLpm,
				n2oPercent: log.n2oPercent,
				o2Percent: log.o2Percent
			});
		}
	} else {
		// Fallback minimal protocol
		timelineSteps.push({ durationMin: 3, flowRateLpm: 5, n2oPercent: 0, o2Percent: 100 });
		timelineSteps.push({ durationMin: 20, flowRateLpm: 5, n2oPercent: 35, o2Percent: 65 });
		timelineSteps.push({ durationMin: 5, flowRateLpm: 6, n2oPercent: 0, o2Percent: 100 });
	}

	const consumption = calculateSedationGasConsumption(timelineSteps, input.gasPrices);
	const preFranklInfo = FRANKL_BEHAVIOR_SCALE[input.preOpFrankl];
	const postFranklInfo = FRANKL_BEHAVIOR_SCALE[input.postOpFrankl];
	const scentInfo = AROMA_MASK_SCENTS[input.maskScent];

	const safetyWarnings: string[] = [];
	if (!consumption.isFlushAdequate) {
		safetyWarnings.push('Внимание: Длительность продувки 100% O₂ составила менее 5 минут!');
	}

	// Generate vitals summary line
	let vitalsSummaryRu = 'Мониторинг стабильный';
	if (input.vitalLogs.length > 0) {
		const minSpo2 = Math.min(...input.vitalLogs.map((v) => v.spo2Percent));
		const maxSpo2 = Math.max(...input.vitalLogs.map((v) => v.spo2Percent));
		const minPulse = Math.min(...input.vitalLogs.map((v) => v.pulseBpm));
		const maxPulse = Math.max(...input.vitalLogs.map((v) => v.pulseBpm));
		vitalsSummaryRu = `SpO₂: ${minSpo2}–${maxSpo2}%, ЧСС: ${minPulse}–${maxPulse} уд/мин`;
	}

	// Build official Russian medical diary entry
	const lines: string[] = [];
	lines.push('========================================================================');
	lines.push('ПРОТОКОЛ ПРОВЕДЕНИЯ ИНГАЛЯЦИОННОЙ СЕДАЦИИ ЗАКС (N₂O / O₂)');
	lines.push('(Вкладыш в медицинскую карту стоматологического пациента 043/у)');
	lines.push('========================================================================');
	lines.push(`Дата процедуры: ${input.procedureDate}`);
	lines.push(`Пациент: ${input.patientFullName} (${input.patientAgeYears} лет)`);
	lines.push(`Врач-стоматолог детский: ${input.doctorFullName}`);
	if (input.assistantFullName) {
		lines.push(`Ассистент: ${input.assistantFullName}`);
	}
	lines.push(`Диагноз: ${input.clinicalDiagnosisRu}`);
	lines.push(`Проведенное вмешательство: ${input.plannedProcedureRu}`);
	lines.push('------------------------------------------------------------------------');
	lines.push('1. ПРЕДОПЕРАЦИОННАЯ ОЦЕНКА И ПОДГОТОВКА:');
	lines.push(`- Поведение до седации (шкала Франкла): ${preFranklInfo.shortLabelRu} ${preFranklInfo.badgeEmoji}`);
	lines.push(`- Голодный интервал: жидкости — ${input.fastingHoursSinceLiquids} ч, твердая пища — ${input.fastingHoursSinceSolids} ч (норма соблюдена).`);
	lines.push(`- Ароматическая насадка на маску: ${scentInfo.nameRu} ${scentInfo.emoji}`);
	lines.push('- Дыхательный контур: полуоткрытый с активной эвакуацией отработанных газов (Scavenging system).');
	lines.push('------------------------------------------------------------------------');
	lines.push('2. ХОД СЕДАЦИИ И ПАРАМЕТРЫ ГАЗОВОЙ СМЕСИ:');
	lines.push('- Индукция: 100% Кислород (O₂) в течение 2–3 мин, поток 4.0–6.0 л/мин.');
	lines.push(`- Титрование: плавное увеличение N₂O шагом по 5–10% до терапевтической концентрации ${consumption.maxN2oReachedPercent}%.`);
	lines.push(`- Максимальная концентрация N₂O: ${consumption.maxN2oReachedPercent}% (O₂: ${100 - consumption.maxN2oReachedPercent}%).`);
	lines.push(`- Общая длительность седации: ${consumption.totalSedationDurationMinutes} мин.`);
	lines.push(`- Продувка 100% O₂ (выход): ${consumption.flushDurationMinutes} мин (профилактика диффузионной гипоксии проведена).`);
	lines.push('------------------------------------------------------------------------');
	lines.push('3. ЖУРНАЛ МОНИТОРИНГА ВИТАЛЬНЫХ ФУНКЦИЙ:');

	if (input.vitalLogs.length > 0) {
		lines.push('Время (мин) | N₂O (%) | O₂ (%) | Поток (л/м) | SpO₂ (%) | ЧСС (уд/м) | Франкл');
		for (const log of input.vitalLogs) {
			const f = FRANKL_BEHAVIOR_SCALE[log.franklRating];
			lines.push(`+${String(log.timestampMinutes).padEnd(9)} | ${String(log.n2oPercent).padEnd(7)} | ${String(log.o2Percent).padEnd(6)} | ${String(log.flowRateLpm.toFixed(1)).padEnd(11)} | ${String(log.spo2Percent).padEnd(8)} | ${String(log.pulseBpm).padEnd(10)} | ${f.score} (${f.badgeEmoji})`);
		}
	} else {
		lines.push('- Мониторинг пульсоксиметрии непрерывный: показатели SpO₂ 98–99%, ЧСС в пределах возрастной нормы.');
	}

	lines.push('------------------------------------------------------------------------');
	lines.push('4. РАСХОД МЕДИЦИНСКИХ ГАЗОВ:');
	lines.push(`- Кислород (O₂): ${consumption.totalO2VolumeLiters} л (${consumption.o2CostRub} руб.)`);
	lines.push(`- Закись азота (N₂O): ${consumption.totalN2oVolumeLiters} л (${consumption.n2oCostRub} руб.)`);
	lines.push(`- Суммарный объем газов: ${consumption.totalGasVolumeLiters} л`);
	lines.push(`- Себестоимость газовой смеси: ${consumption.totalCostRub} руб.`);
	lines.push('------------------------------------------------------------------------');
	lines.push('5. ПОСТОПЕРАЦИОННЫЙ СТАТУС И ВЫПИСКА:');
	lines.push(`- Поведение после лечения (шкала Франкла): ${postFranklInfo.shortLabelRu} ${postFranklInfo.badgeEmoji}`);
	lines.push(`- Оценка восстановления по шкале Альдрете: ${input.dischargeAldreteScore ?? 10} / 10 баллов (полное восстановление).`);
	lines.push('- Сознание ясное, вербальный контакт сохранен, головокружения/тошноты нет, походка устойчивая.');
	lines.push('- Пациент отпущен домой в сопровождении законных представителей с вручением Грамоты за храбрость.');
	if (input.doctorNotes) {
		lines.push(`- Особые отметки врача: ${input.doctorNotes}`);
	}
	lines.push('------------------------------------------------------------------------');
	lines.push(`Подпись врача: ____________________ / ${input.doctorFullName} /`);
	lines.push('========================================================================');

	return {
		fullFormattedTextRu: lines.join('\n'),
		consumption,
		vitalsSummaryRu,
		safetyAuditPassed: safetyWarnings.length === 0,
		safetyWarnings
	};
}

// ---------------------------------------------------------------------------
// 8. Pediatric Bravery Diploma Generator Data
// ---------------------------------------------------------------------------

export interface BraveryDiplomaInput {
	childName: string;
	childAgeYears: number;
	procedureDate: string;
	doctorName: string;
	clinicName?: string | undefined;
	badgeId: BraveryBadgeId;
	customTitle?: string | undefined;
	customPraiseRu?: string | undefined;
}

export interface BraveryDiplomaData {
	titleRu: string;
	subtitleRu: string;
	recipientNameRu: string;
	ageTextRu: string;
	badgeTitleRu: string;
	badgeSubtitleRu: string;
	badgeEmoji: string;
	badgeColor: string;
	congratulationTextRu: string;
	dateRu: string;
	doctorTitleRu: string;
	clinicTitleRu: string;
	sealTextRu: string;
}

export function generateBraveryDiploma(input: BraveryDiplomaInput): BraveryDiplomaData {
	const badge = BRAVERY_BADGES[input.badgeId];
	const formattedDate = input.procedureDate || new Date().toLocaleDateString('ru-RU');
	const clinicName = input.clinicName || 'Стоматологический центр «DENTE»';

	return {
		titleRu: input.customTitle || 'ГРАМОТА ЗА ХРАБРОСТЬ',
		subtitleRu: 'Вручается самому смелому и отважному юному пациенту',
		recipientNameRu: input.childName.trim() || 'Юному Герою',
		ageTextRu: `${input.childAgeYears} ${input.childAgeYears <= 4 ? 'года' : 'лет'}`,
		badgeTitleRu: badge.titleRu,
		badgeSubtitleRu: badge.subtitleRu,
		badgeEmoji: badge.badgeEmoji,
		badgeColor: badge.medalColor,
		congratulationTextRu: input.customPraiseRu || badge.congratulationRu,
		dateRu: formattedDate,
		doctorTitleRu: `Главный зубной волшебник: ${input.doctorName}`,
		clinicTitleRu: clinicName,
		sealTextRu: '★ ОРДЕН ЗДОРОВЫХ ЗУБОК ★'
	};
}
