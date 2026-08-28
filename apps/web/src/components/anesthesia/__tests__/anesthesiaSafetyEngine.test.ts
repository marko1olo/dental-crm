import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	ANESTHESIA_DRUG_CATALOG,
	EPINEPHRINE_CEILINGS_MG,
	calculateAnesthesiaSafety,
	screenPatientContraindications,
	isPediatricPatient,
	isGeriatricPatient,
	calculateEffectiveMgPerKg
} from '../anesthesiaSafetyEngine';
import {
	EMERGENCY_PROTOCOLS,
	calculateAllEmergencyDosagesForWeight,
	formatEmergencyStopwatchTime,
	generateEmergencyForm043Act,
	generateEmergency112DispatchScript
} from '../emergencyProtocols';

describe('anesthesiaSafetyEngine — 1. Adult Maximum Recommended Dose (MRD) Calculations', () => {
	it('calculates safe Articaine 4% 1:100k dose for 70kg adult at 7.0 mg/kg limit (max 490 mg)', () => {
		const res = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_100k',
			patientWeightKg: 70,
			carpulesCount: 1,
			patientAgeYears: 35
		});

		assert.equal(res.effectiveMaxMgPerKg, 7.0);
		assert.equal(res.maxSafeActiveMg, 490.0);
		assert.equal(res.injectedActiveMg, 68.0); // 1.7 ml * 40 mg/ml
		assert.equal(res.injectedEpinephrineMg, 0.017); // 1.7 ml * 0.01 mg/ml
		assert.equal(res.maxSafeCarpulesCount, 7.2); // 490 / 68 = 7.2
		assert.equal(res.remainingSafeCarpulesCount, 6.2);
		assert.equal(res.isOverdose, false);
		assert.equal(res.isEpinephrineOverdose, false);
		assert.equal(res.safetyZone, 'safe');
		assert.match(res.soapDiaryText, /Ультракаин Д-С форте/);
		assert.match(res.soapDiaryText, /490 мг/);
	});

	it('caps maximum adult dose at 500 mg absolute limit for 100kg patient', () => {
		const res = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_100k',
			patientWeightKg: 100, // 100 * 7 = 700 mg -> capped at 500 mg
			carpulesCount: 2,
			patientAgeYears: 40
		});

		assert.equal(res.maxSafeActiveMg, 500.0);
		assert.equal(res.injectedActiveMg, 136.0);
		assert.equal(res.maxSafeCarpulesCount, 7.4); // 500 / 68 = 7.3529 -> 7.4
		assert.equal(res.isOverdose, false);
		assert.equal(res.safetyZone, 'safe');
		assert.match(res.limitingFactor, /Абсолютный максимум/);
	});

	it('correctly calculates Articaine 4% 1:200k (half epinephrine content 0.0085 mg/carpule)', () => {
		const res = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_200k',
			patientWeightKg: 70,
			carpulesCount: 2,
			patientAgeYears: 30
		});

		assert.equal(res.injectedActiveMg, 136.0);
		assert.equal(res.injectedEpinephrineMg, 0.017); // 2 * 0.0085 mg
		assert.equal(res.drug.vasoconstrictorRatio, '1:200000');
		assert.equal(res.isOverdose, false);
	});

	it('calculates Mepivacaine 3% plain for 60kg adult at 4.4 mg/kg limit (max 264 mg)', () => {
		const res = calculateAnesthesiaSafety({
			drugId: 'mepivacaine_3_plain',
			patientWeightKg: 60,
			carpulesCount: 2, // 2 * 51 = 102 mg
			patientAgeYears: 45
		});

		assert.equal(res.effectiveMaxMgPerKg, 4.4);
		assert.equal(res.maxSafeActiveMg, 264.0); // 60 * 4.4
		assert.equal(res.injectedActiveMg, 102.0);
		assert.equal(res.injectedEpinephrineMg, 0.0);
		assert.equal(res.drug.isAdrenalineFree, true);
		assert.equal(res.drug.containsSulfites, false);
		assert.equal(res.isOverdose, false);
		assert.equal(res.safetyZone, 'safe');
	});

	it('caps Mepivacaine 3% at 300 mg absolute limit for 80kg patient', () => {
		const res = calculateAnesthesiaSafety({
			drugId: 'mepivacaine_3_plain',
			patientWeightKg: 80, // 80 * 4.4 = 352 mg -> capped at 300 mg
			carpulesCount: 3,
			patientAgeYears: 50
		});

		assert.equal(res.maxSafeActiveMg, 300.0);
		assert.equal(res.injectedActiveMg, 153.0);
		assert.equal(res.isOverdose, false);
	});
});

describe('anesthesiaSafetyEngine — 2. Pediatric Strict Limits (5.0 mg/kg for Articaine)', () => {
	it('applies strict 5.0 mg/kg limit for 20kg child (max 100 mg Articaine)', () => {
		const child1Carpule = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_100k',
			patientWeightKg: 20,
			patientAgeYears: 7,
			carpulesCount: 1 // 68 mg <= 100 mg
		});

		assert.equal(child1Carpule.isPediatric, true);
		assert.equal(child1Carpule.effectiveMaxMgPerKg, 5.0);
		assert.equal(child1Carpule.maxSafeActiveMg, 100.0);
		assert.equal(child1Carpule.injectedActiveMg, 68.0);
		assert.equal(child1Carpule.percentOfMaxDose, 68);
		assert.equal(child1Carpule.isOverdose, false);
		assert.equal(child1Carpule.safetyZone, 'caution'); // 68% falls into caution zone
	});

	it('triggers critical overdose danger when child exceeds 5.0 mg/kg limit', () => {
		const child2Carpules = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_100k',
			patientWeightKg: 20,
			patientAgeYears: 7,
			carpulesCount: 2 // 136 mg > 100 mg limit!
		});

		assert.equal(child2Carpules.isOverdose, true);
		assert.equal(child2Carpules.safetyZone, 'overdose_danger');
		assert.ok(child2Carpules.warnings.some(w => w.includes('ПРЕВЫШЕНА ПРЕДЕЛЬНО ДОПУСТИМАЯ ДОЗА')));
	});

	it('handles pediatric classification by weight < 40 kg even if age is not specified', () => {
		const res = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_200k',
			patientWeightKg: 30,
			carpulesCount: 1
		});

		assert.equal(res.isPediatric, true);
		assert.equal(res.effectiveMaxMgPerKg, 5.0);
		assert.equal(res.maxSafeActiveMg, 150.0);
	});
});

describe('anesthesiaSafetyEngine — 3. Epinephrine Cardiovascular Gating (0.04 mg Ceiling)', () => {
	it('enforces 0.04 mg limit for hypertension and ASA III patients', () => {
		const cardioSafe = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_100k',
			patientWeightKg: 70,
			carpulesCount: 2, // 2 * 0.017 = 0.034 mg <= 0.04 mg
			hasHypertension: true,
			asaStatus: 'asa_3'
		});

		assert.equal(cardioSafe.maxSafeEpinephrineMg, 0.04);
		assert.equal(cardioSafe.injectedEpinephrineMg, 0.034);
		assert.equal(cardioSafe.isEpinephrineOverdose, false);
		assert.equal(cardioSafe.maxSafeCarpulesCount, 2.4); // 0.04 / 0.017 = 2.3529 -> 2.4
	});

	it('triggers epinephrine overdose alert when exceeding 0.04 mg cardio limit', () => {
		const cardioOverdose = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_100k',
			patientWeightKg: 70,
			carpulesCount: 3, // 3 * 0.017 = 0.051 mg > 0.04 mg!
			hasCardiovascularRisk: true
		});

		assert.equal(cardioOverdose.isEpinephrineOverdose, true);
		assert.equal(cardioOverdose.safetyZone, 'overdose_danger');
		assert.ok(cardioOverdose.warnings.some(w => w.includes('КАРДИОЛИМИТ АДРЕНАЛИНА')));
	});

	it('allows up to 4 carpules of 1:200k under 0.04 mg cardio limit', () => {
		const res = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_200k',
			patientWeightKg: 80,
			carpulesCount: 4, // 4 * 0.0085 = 0.034 mg <= 0.04 mg
			hasHypertension: true
		});

		assert.equal(res.injectedEpinephrineMg, 0.034);
		assert.equal(res.isEpinephrineOverdose, false);
		assert.equal(res.maxSafeCarpulesCount, 4.7); // 0.04 / 0.0085 = 4.7
	});
});

describe('anesthesiaSafetyEngine — 4. Somatic Screening & Blocking Contraindications', () => {
	it('blocks epinephrine for patients taking MAO Inhibitors (ИМАО)', () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 70, takesMaoInhibitors: true },
			'articaine_4_epi_100k'
		);

		assert.equal(screening.isBlocked, true);
		assert.equal(screening.recommendedAlternativeId, 'mepivacaine_3_plain');
		assert.ok(screening.blockingContraindications.some(b => b.includes('ингибиторы МАО')));

		const calc = calculateAnesthesiaSafety({
			drugId: 'articaine_4_epi_100k',
			patientWeightKg: 70,
			carpulesCount: 1,
			takesMaoInhibitors: true
		});
		assert.equal(calc.isBlocked, true);
		assert.equal(calc.safetyZone, 'overdose_danger');
	});

	it('blocks high-dose epinephrine 1:100k for Tricyclic Antidepressants (ТЦА)', () => {
		const screening100k = screenPatientContraindications(
			{ patientWeightKg: 70, takesTricyclicAntidepressants: true },
			'articaine_4_epi_100k'
		);
		assert.equal(screening100k.isBlocked, true);
		assert.ok(screening100k.blockingContraindications.some(b => b.includes('трициклические антидепрессанты')));

		const screening200k = screenPatientContraindications(
			{ patientWeightKg: 70, takesTricyclicAntidepressants: true },
			'articaine_4_epi_200k'
		);
		assert.equal(screening200k.isBlocked, false);
		assert.ok(screening200k.warnings.some(w => w.includes('ТЦА')));
	});

	it('blocks epinephrine for patients with Thyrotoxicosis / Hyperthyroidism', () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 65, hasThyrotoxicosis: true },
			'articaine_4_epi_100k'
		);

		assert.equal(screening.isBlocked, true);
		assert.equal(screening.recommendedAlternativeId, 'mepivacaine_3_plain');
		assert.ok(screening.blockingContraindications.some(b => b.includes('тиреотоксикоз')));
	});

	it('blocks adrenaline 1:100k for severe Cardiac Arrhythmias', () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 70, hasCardiacArrhythmia: true },
			'articaine_4_epi_100k'
		);

		assert.equal(screening.isBlocked, true);
		assert.ok(screening.blockingContraindications.some(b => b.includes('нарушения ритма сердца')));
	});

	it('blocks sulfite-containing anesthetics for Sulfite Allergy & Bronchial Asthma', () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 70, hasSulfiteAllergy: true, hasBronchialAsthma: true },
			'articaine_4_epi_100k'
		);

		assert.equal(screening.isBlocked, true);
		assert.equal(screening.recommendedAlternativeId, 'mepivacaine_3_plain');
		assert.ok(screening.blockingContraindications.some(b => b.includes('метабисульфит натрия')));
	});

	it('safely accepts Mepivacaine 3% (Scandonest) for all blocked categories', () => {
		const screening = screenPatientContraindications(
			{
				patientWeightKg: 70,
				takesMaoInhibitors: true,
				hasThyrotoxicosis: true,
				hasSulfiteAllergy: true,
				hasBronchialAsthma: true,
				hasCardiacArrhythmia: true
			},
			'mepivacaine_3_plain'
		);

		assert.equal(screening.isBlocked, false);
		assert.equal(screening.blockingContraindications.length, 0);

		const calc = calculateAnesthesiaSafety({
			drugId: 'mepivacaine_3_plain',
			patientWeightKg: 70,
			carpulesCount: 2,
			takesMaoInhibitors: true,
			hasThyrotoxicosis: true,
			hasSulfiteAllergy: true,
			hasBronchialAsthma: true
		});

		assert.equal(calc.isBlocked, false);
		assert.equal(calc.safetyZone, 'safe');
	});

	it('warns about 1:100k adrenaline in Pregnancy and Lactation', () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 65, isPregnantOrLactating: true },
			'articaine_4_epi_100k'
		);

		assert.equal(screening.isBlocked, false);
		assert.ok(screening.warnings.some(w => w.includes('БЕРЕМЕННОСТЬ')));
	});
});

describe('emergencyProtocols — 5. Statutory Emergency Resuscitation Algorithms (Orders 786n / 1144n)', () => {
	it('defines all 4 key statutory dental emergency scenarios', () => {
		assert.ok(EMERGENCY_PROTOCOLS.anaphylaxis);
		assert.ok(EMERGENCY_PROTOCOLS.last_toxicity);
		assert.ok(EMERGENCY_PROTOCOLS.syncope_collapse);
		assert.ok(EMERGENCY_PROTOCOLS.hypertensive_crisis);
	});

	it('contains golden rule and 0.5 mg i/m adrenaline first-line step for Anaphylaxis', () => {
		const anaph = EMERGENCY_PROTOCOLS.anaphylaxis;
		assert.match(anaph.immediateGoldenRuleRu, /НЕ САЖАТЬ/);
		assert.match(anaph.immediateGoldenRuleRu, /Адреналин 0.5 мг/);

		const step1 = anaph.steps[0]!;
		assert.equal(step1.stepNumber, 1);
		assert.match(step1.titleRu, /Тренделенбурга/);

		const step2 = anaph.steps[1]!;
		assert.equal(step2.stepNumber, 2);
		assert.match(step2.titleRu, /ЭПИНЕФРИН.*АДРЕНАЛИН/);
		assert.equal(step2.drugDetail?.standardAdultDoseRu, '0.5 мг (0.5 мл) в/м');
		assert.match(step2.drugDetail?.administrationRouteRu ?? '', /переднебоковой поверхности бедра/);
	});

	it('calculates exact 20% Lipid Emulsion dosages for LAST based on weight', () => {
		// 70 kg patient
		const doses70 = calculateAllEmergencyDosagesForWeight('last_toxicity', 70);
		const lipidDose70 = doses70['20% Липидная эмульсия (Липофундин / Интралипид 20%)'];
		assert.ok(lipidDose70);
		assert.match(lipidDose70.doseText, /Болюс 105 мл/); // 70 * 1.5 = 105 ml
		assert.match(lipidDose70.volumeText, /1050 мл\/час/); // 70 * 0.25 * 60 = 1050 ml/hr
		assert.match(lipidDose70.noteRu ?? '', /840 мл/); // 70 * 12 = 840 ml max

		// 50 kg patient
		const doses50 = calculateAllEmergencyDosagesForWeight('last_toxicity', 50);
		const lipidDose50 = doses50['20% Липидная эмульсия (Липофундин / Интралипид 20%)'];
		assert.ok(lipidDose50);
		assert.match(lipidDose50.doseText, /Болюс 75 мл/); // 50 * 1.5 = 75 ml
		assert.match(lipidDose50.volumeText, /750 мл\/час/); // 50 * 0.25 * 60 = 750 ml/hr
	});

	it('calculates pediatric weight-adjusted adrenaline dose for 20kg child (0.2 mg)', () => {
		const doses = calculateAllEmergencyDosagesForWeight('anaphylaxis', 20, 6);
		const adr = doses['Эпинефрин (Адреналин) 0.1% (1 мг/мл)'];
		assert.ok(adr);
		assert.equal(adr.doseText, '0.2 мг');
		assert.equal(adr.volumeText, '0.2 мл (0.1% р-р)');
	});

	it('formats stopwatch seconds correctly (MM:SS)', () => {
		assert.equal(formatEmergencyStopwatchTime(0), '00:00');
		assert.equal(formatEmergencyStopwatchTime(45), '00:45');
		assert.equal(formatEmergencyStopwatchTime(65), '01:05');
		assert.equal(formatEmergencyStopwatchTime(3599), '59:59');
	});

	it('generates statutory Form 043/u Emergency Resuscitation Act', () => {
		const act = generateEmergencyForm043Act({
			scenarioId: 'anaphylaxis',
			patient: {
				fullName: 'Смирнов Андрей Васильевич',
				ageYears: 42,
				weightKg: 75
			},
			doctorFullName: 'Волкова Е. С.',
			clinicName: 'ООО «ДЕНТЕ»',
			clinicAddress: 'г. Москва, ул. Усачёва, д. 29',
			cabinetNumber: '2',
			startTimeIso: new Date().toISOString(),
			initialBp: '75/40',
			finalBp: '120/80',
			initialHr: '130',
			finalHr: '78',
			initialSpo2: '89',
			finalSpo2: '98',
			executedSteps: [
				{
					stepNumber: 1,
					titleRu: 'Положение Тренделенбурга',
					timestampSeconds: 15,
					timeFormatted: '00:15'
				},
				{
					stepNumber: 2,
					titleRu: 'Адреналин 0.5 мг в/м в бедро',
					timestampSeconds: 45,
					timeFormatted: '00:45'
				}
			],
			smpBrigadeCalled: true,
			smpCallTime: '14:22',
			patientOutcome: 'transferred_to_smp',
			smpDoctorFullName: 'Д-р Ковалев'
		});

		assert.match(act, /ПРОТОКОЛ ОКАЗАНИЯ НЕОТЛОЖНОЙ МЕДИЦИНСКОЙ ПОМОЩИ/);
		assert.match(act, /Приказ МЗ РФ № 786н/);
		assert.match(act, /Смирнов Андрей Васильевич/);
		assert.match(act, /Адреналин 0.5 мг в\/м в бедро/);
		assert.match(act, /Д-р Ковалев/);
	});

	it('generates 112 dispatcher phone cheat sheet', () => {
		const script = generateEmergency112DispatchScript({
			scenarioId: 'anaphylaxis',
			clinicName: 'ДЕНТЕ',
			clinicAddress: 'ул. Усачева 29',
			cabinetNumber: '1',
			patientAgeYears: 35,
			patientGender: 'male',
			currentBp: '80/50',
			currentHr: '125',
			currentSpo2: '91',
			adrenalineGivenMg: 0.5
		});

		assert.match(script, /ШПАРГАЛКА ДЛЯ ДИСПЕТЧЕРА 112 \/ 103/);
		assert.match(script, /Анафилактический шок/);
		assert.match(script, /ул\. Усачева 29/);
		assert.match(script, /Введен адреналин 0\.1% 0\.5 мг/);
	});
});
