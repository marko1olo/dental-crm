import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	FRANKL_BEHAVIOR_SCALE,
	SEDATION_PRESETS,
	AROMA_MASK_SCENTS,
	BRAVERY_BADGES,
	SEDATION_SAFETY_LIMITS
} from '../components/sedation/sedationPresets';
import {
	getAgeVitalNorms,
	evaluateVitalSigns,
	calculateGasMixture,
	calculateSedationGasConsumption,
	validateFastingSafety,
	calculateModifiedAldreteScore,
	generateSedationProtocol043,
	generateBraveryDiploma
} from '../components/sedation/sedationEngine';

describe('Pediatric Sedation & Frankl Behavior Engine', () => {
	it('correctly classifies all 4 Frankl Behavior Rating Scale levels', () => {
		const scaleKeys = Object.keys(FRANKL_BEHAVIOR_SCALE);
		assert.equal(scaleKeys.length, 4);

		const f1 = FRANKL_BEHAVIOR_SCALE['frankl_1_definitely_negative'];
		assert.equal(f1.score, 1);
		assert.equal(f1.badgeEmoji, '😡');
		assert.equal(f1.sedationIndicationLevel, 'strongly_recommended');
		assert.ok(f1.clinicalDescriptionRu.includes('Отказ от контакта'));

		const f2 = FRANKL_BEHAVIOR_SCALE['frankl_2_negative'];
		assert.equal(f2.score, 2);
		assert.equal(f2.badgeEmoji, '🙁');
		assert.equal(f2.sedationIndicationLevel, 'recommended');

		const f3 = FRANKL_BEHAVIOR_SCALE['frankl_3_positive'];
		assert.equal(f3.score, 3);
		assert.equal(f3.badgeEmoji, '🙂');
		assert.equal(f3.sedationIndicationLevel, 'optional');

		const f4 = FRANKL_BEHAVIOR_SCALE['frankl_4_definitely_positive'];
		assert.equal(f4.score, 4);
		assert.equal(f4.badgeEmoji, '🌟');
		assert.equal(f4.sedationIndicationLevel, 'minimal');
	});

	it('provides age-specific physiological vital norms across childhood (2–14 years)', () => {
		// Age 2 (Toddler)
		const norms2 = getAgeVitalNorms(2);
		assert.equal(norms2.ageGroupKey, 'toddler_2_3');
		assert.equal(norms2.pulseBpmMin, 80);
		assert.equal(norms2.pulseBpmMax, 140);
		assert.equal(norms2.respiratoryRateMin, 20);
		assert.equal(norms2.respiratoryRateMax, 30);
		assert.equal(norms2.spo2MinSafe, 95);

		// Age 5 (Preschool)
		const norms5 = getAgeVitalNorms(5);
		assert.equal(norms5.ageGroupKey, 'preschool_4_6');
		assert.equal(norms5.pulseBpmMin, 75);
		assert.equal(norms5.pulseBpmMax, 120);

		// Age 9 (School)
		const norms9 = getAgeVitalNorms(9);
		assert.equal(norms9.ageGroupKey, 'school_7_10');
		assert.equal(norms9.pulseBpmMin, 70);
		assert.equal(norms9.pulseBpmMax, 110);

		// Age 13 (Adolescent)
		const norms13 = getAgeVitalNorms(13);
		assert.equal(norms13.ageGroupKey, 'adolescent_11_14');
		assert.equal(norms13.pulseBpmMin, 60);
		assert.equal(norms13.pulseBpmMax, 100);
	});

	it('evaluates vital signs safety and triggers warning/critical alerts appropriately', () => {
		// Normal case: 5yo, SpO2 99%, Pulse 95 bpm, RR 22
		const normalEval = evaluateVitalSigns({ spo2: 99, pulse: 95, respiratoryRate: 22 }, 5);
		assert.equal(normalEval.overallStatus, 'safe');
		assert.equal(normalEval.spo2Status, 'safe');
		assert.equal(normalEval.pulseStatus, 'safe');
		assert.equal(normalEval.respiratoryStatus, 'safe');

		// Warning case: 5yo, SpO2 93% (Mild desaturation)
		const warnEval = evaluateVitalSigns({ spo2: 93, pulse: 100, respiratoryRate: 22 }, 5);
		assert.equal(warnEval.overallStatus, 'warning');
		assert.equal(warnEval.spo2Status, 'warning');
		assert.ok(warnEval.alertsRu.some((a) => a.includes('Снижение сатурации SpO₂')));

		// Critical case: 5yo, SpO2 88% (Severe hypoxemia)
		const critEval = evaluateVitalSigns({ spo2: 88, pulse: 130, respiratoryRate: 36 }, 5);
		assert.equal(critEval.overallStatus, 'critical');
		assert.equal(critEval.spo2Status, 'critical');
		assert.ok(critEval.alertsRu.some((a) => a.includes('Критическая десатурация')));

		// Bradycardia critical alert: 3yo, Pulse 60 bpm (< critical low 70)
		const bradyEval = evaluateVitalSigns({ spo2: 98, pulse: 60, respiratoryRate: 22 }, 3);
		assert.equal(bradyEval.overallStatus, 'critical');
		assert.equal(bradyEval.pulseStatus, 'critical');
		assert.ok(bradyEval.alertsRu.some((a) => a.includes('Критическая брадикардия')));
	});

	it('calculates gas mixture ratios and validates safety limits', () => {
		// 100% O2 Induction
		const induction = calculateGasMixture(0, 5.0);
		assert.equal(induction.n2oPercent, 0);
		assert.equal(induction.o2Percent, 100);
		assert.equal(induction.n2oFlowLpm, 0);
		assert.equal(induction.o2FlowLpm, 5.0);
		assert.equal(induction.isSafe, true);
		assert.equal(induction.isHypoxiaRisk, false);

		// 35% N2O / 65% O2 at 6.0 L/min
		const routine = calculateGasMixture(35, 6.0);
		assert.equal(routine.n2oPercent, 35);
		assert.equal(routine.o2Percent, 65);
		assert.equal(routine.n2oFlowLpm, 2.1);
		assert.equal(routine.o2FlowLpm, 3.9);
		assert.equal(routine.isSafe, true);

		// >50% N2O flags excessive sedation risk warning
		const highN2o = calculateGasMixture(55, 5.0);
		assert.equal(highN2o.isExcessiveSedationRisk, true);
		assert.ok(highN2o.safetyWarningsRu.some((w) => w.includes('превышает стандартный')));
	});

	it('calculates total gas consumption volume and kopeck-exact cost', () => {
		// Timeline:
		// Step 1: 3 min @ 5.0 L/min, 0% N2O (100% O2) -> O2 = 15L, N2O = 0L
		// Step 2: 20 min @ 5.0 L/min, 40% N2O (60% O2) -> O2 = 60L, N2O = 40L
		// Step 3: 5 min @ 6.0 L/min, 0% N2O (100% O2) -> O2 = 30L, N2O = 0L
		// Total O2 = 15 + 60 + 30 = 105 L
		// Total N2O = 40 L
		// Cost O2 = 105 * 0.85 = 89.25 RUB
		// Cost N2O = 40 * 2.50 = 100.00 RUB
		// Total Cost = 189.25 RUB
		const steps = [
			{ durationMin: 3, flowRateLpm: 5.0, n2oPercent: 0, o2Percent: 100 },
			{ durationMin: 20, flowRateLpm: 5.0, n2oPercent: 40, o2Percent: 60 },
			{ durationMin: 5, flowRateLpm: 6.0, n2oPercent: 0, o2Percent: 100 }
		];

		const result = calculateSedationGasConsumption(steps);
		assert.equal(result.totalO2VolumeLiters, 105);
		assert.equal(result.totalN2oVolumeLiters, 40);
		assert.equal(result.totalGasVolumeLiters, 145);
		assert.equal(result.o2CostRub, 89.25);
		assert.equal(result.n2oCostRub, 100);
		assert.equal(result.totalCostRub, 189.25);
		assert.equal(result.totalSedationDurationMinutes, 28);
		assert.equal(result.flushDurationMinutes, 5);
		assert.equal(result.isFlushAdequate, true);
		assert.equal(result.maxN2oReachedPercent, 40);
	});

	it('detects inadequate flush phase when 100% O2 emergence is under 5 minutes', () => {
		const stepsWithoutFlush = [
			{ durationMin: 3, flowRateLpm: 5.0, n2oPercent: 0, o2Percent: 100 },
			{ durationMin: 20, flowRateLpm: 5.0, n2oPercent: 35, o2Percent: 65 },
			{ durationMin: 2, flowRateLpm: 5.0, n2oPercent: 0, o2Percent: 100 } // only 2 min flush
		];

		const result = calculateSedationGasConsumption(stepsWithoutFlush);
		assert.equal(result.flushDurationMinutes, 2);
		assert.equal(result.isFlushAdequate, false);
	});

	it('validates pre-sedation fasting guidelines for pediatric patients', () => {
		// Compliant fasting (3h liquids, 7h solids)
		const safeFasting = validateFastingSafety(3, 7);
		assert.equal(safeFasting.isSafe, true);
		assert.equal(safeFasting.clearLiquidsSafe, true);
		assert.equal(safeFasting.solidsSafe, true);
		assert.equal(safeFasting.warningsRu.length, 0);

		// Non-compliant fasting (1h liquids, 4h solids)
		const unsafeFasting = validateFastingSafety(1, 4);
		assert.equal(unsafeFasting.isSafe, false);
		assert.equal(unsafeFasting.clearLiquidsSafe, false);
		assert.equal(unsafeFasting.solidsSafe, false);
		assert.equal(unsafeFasting.warningsRu.length, 2);
	});

	it('evaluates Modified Aldrete discharge score accurately', () => {
		// Perfect score: 2+2+2+2+2 = 10 -> discharge ready
		const readyAldrete = calculateModifiedAldreteScore({
			consciousness: 2,
			activity: 2,
			respiration: 2,
			circulation: 2,
			spo2: 2
		});
		assert.equal(readyAldrete.totalScore, 10);
		assert.equal(readyAldrete.isDischargeReady, true);

		// Incomplete recovery: consciousness 1, total score 7 -> not ready
		const unreadyAldrete = calculateModifiedAldreteScore({
			consciousness: 1,
			activity: 1,
			respiration: 2,
			circulation: 2,
			spo2: 1
		});
		assert.equal(unreadyAldrete.totalScore, 7);
		assert.equal(unreadyAldrete.isDischargeReady, false);
		assert.ok(unreadyAldrete.remarksRu.some((r) => r.includes('недостаточен для выписки')));
	});

	it('generates a complete official Form 043/u Russian medical record diary entry', () => {
		const protocolOutput = generateSedationProtocol043({
			patientFullName: 'Петров Артем',
			patientAgeYears: 6,
			procedureDate: '22.08.2026',
			doctorFullName: 'Д-р Ковалева М. А.',
			assistantFullName: 'Медсестра Соколова И. В.',
			clinicalDiagnosisRu: 'К02.1 Кариес дентина зуба 74',
			plannedProcedureRu: 'Препарирование и реставрация зуба 74 композитом',
			preOpFrankl: 'frankl_2_negative',
			postOpFrankl: 'frankl_4_definitely_positive',
			maskScent: 'bubble_gum',
			fastingHoursSinceSolids: 6,
			fastingHoursSinceLiquids: 3,
			vitalLogs: [
				{
					id: 'log_1',
					timestampMinutes: 0,
					spo2Percent: 99,
					pulseBpm: 100,
					n2oPercent: 0,
					o2Percent: 100,
					flowRateLpm: 5.0,
					franklRating: 'frankl_2_negative'
				},
				{
					id: 'log_2',
					timestampMinutes: 5,
					spo2Percent: 98,
					pulseBpm: 92,
					n2oPercent: 35,
					o2Percent: 65,
					flowRateLpm: 5.0,
					franklRating: 'frankl_3_positive'
				},
				{
					id: 'log_3',
					timestampMinutes: 25,
					spo2Percent: 99,
					pulseBpm: 88,
					n2oPercent: 0,
					o2Percent: 100,
					flowRateLpm: 6.0,
					franklRating: 'frankl_4_definitely_positive'
				}
			]
		});

		const text = protocolOutput.fullFormattedTextRu;
		assert.ok(text.includes('ПРОТОКОЛ ПРОВЕДЕНИЯ ИНГАЛЯЦИОННОЙ СЕДАЦИИ ЗАКС'));
		assert.ok(text.includes('Петров Артем (6 лет)'));
		assert.ok(text.includes('Д-р Ковалева М. А.'));
		assert.ok(text.includes('шкала Франкла'));
		assert.ok(text.includes('Сладкая жвачка (Bubble Gum) 🍬'));
		assert.ok(text.includes('РАСХОД МЕДИЦИНСКИХ ГАЗОВ'));
		assert.ok(text.includes('ПОСТОПЕРАЦИОННЫЙ СТАТУС И ВЫПИСКА'));
		assert.equal(protocolOutput.safetyAuditPassed, true);
	});

	it('generates pediatric bravery diploma data with badges and custom praise', () => {
		const diploma = generateBraveryDiploma({
			childName: 'Алиса Смирнова',
			childAgeYears: 4,
			procedureDate: '22.08.2026',
			doctorName: 'Д-р Васильев Д. И.',
			badgeId: 'magic_mask_master',
			customPraiseRu: 'За самую смелую улыбку в нашей клинике!'
		});

		assert.equal(diploma.titleRu, 'ГРАМОТА ЗА ХРАБРОСТЬ');
		assert.equal(diploma.recipientNameRu, 'Алиса Смирнова');
		assert.equal(diploma.ageTextRu, '4 года');
		assert.equal(diploma.badgeTitleRu, 'Повелитель Волшебной Маски');
		assert.equal(diploma.badgeEmoji, '🤿');
		assert.equal(diploma.congratulationTextRu, 'За самую смелую улыбку в нашей клинике!');
		assert.ok(diploma.doctorTitleRu.includes('Д-р Васильев Д. И.'));
	});

	it('verifies all sedation clinical presets and aroma mask scents catalog', () => {
		const presets = Object.values(SEDATION_PRESETS);
		assert.equal(presets.length, 5);
		for (const p of presets) {
			assert.ok(p.targetN2oPercent <= 50, `Preset ${p.id} N2O must be <= 50%`);
			assert.ok(p.targetO2Percent >= 50, `Preset ${p.id} O2 must be >= 50%`);
			assert.ok(p.defaultFlowRateLpm >= 3.0 && p.defaultFlowRateLpm <= 8.0);
		}

		const scents = Object.values(AROMA_MASK_SCENTS);
		assert.equal(scents.length, 6);
		assert.ok(scents.some((s) => s.id === 'strawberry'));
		assert.ok(scents.some((s) => s.id === 'bubble_gum'));
		assert.ok(scents.some((s) => s.id === 'banana'));
		assert.ok(scents.some((s) => s.id === 'unscented'));

		const badges = Object.values(BRAVERY_BADGES);
		assert.equal(badges.length, 5);
	});
});
