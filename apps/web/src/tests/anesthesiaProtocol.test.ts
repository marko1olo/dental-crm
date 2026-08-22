import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	DENTAL_ANESTHETICS,
	DENTAL_NEEDLES,
	INJECTION_TECHNIQUES
} from '../components/anesthesia/anesthesiaCatalog';

import {
	determineAgeCategory,
	calculateAgeReductionFactor,
	calculateAnesthesiaSafety,
	generateAnesthesiaDiaryEntry,
	EPINEPHRINE_CEILINGS_MG,
	ASA_CLASSIFICATIONS
} from '../components/anesthesia/anesthesiaEngine';

describe('Dental Anesthesia Protocol & Safe Vasoconstrictor Dosage Suite', () => {

	describe('1. Pharmacopeia & Drug Constants', () => {
		it('verifies Articaine 4% 1:100 000 parameters', () => {
			const drug = DENTAL_ANESTHETICS.articaine_1_100k;
			assert.equal(drug.activeConcentrationPercent, 4.0);
			assert.equal(drug.mgPerMlActive, 40.0);
			assert.equal(drug.carpuleVolumeMl, 1.7);
			assert.equal(drug.mgActivePerCarpule, 68.0);
			assert.equal(drug.mgEpiPerCarpule, 0.017);
			assert.equal(drug.maxDoseMgPerKgAdult, 7.0);
			assert.equal(drug.absoluteMaxDoseMgAdult, 500.0);
			assert.equal(drug.containsSulfites, true);
			assert.equal(drug.isAdrenalineFree, false);
		});

		it('verifies Articaine 4% 1:200 000 parameters', () => {
			const drug = DENTAL_ANESTHETICS.articaine_1_200k;
			assert.equal(drug.mgEpiPerCarpule, 0.0085);
			assert.equal(drug.vasoconstrictorRatio, '1:200000');
			assert.equal(drug.containsSulfites, true);
		});

		it('verifies Mepivacaine 3% plain (adrenaline-free) parameters', () => {
			const drug = DENTAL_ANESTHETICS.mepivacaine_plain;
			assert.equal(drug.activeConcentrationPercent, 3.0);
			assert.equal(drug.mgPerMlActive, 30.0);
			assert.equal(drug.mgActivePerCarpule, 51.0);
			assert.equal(drug.mgEpiPerCarpule, 0.0);
			assert.equal(drug.isAdrenalineFree, true);
			assert.equal(drug.containsSulfites, false);
			assert.equal(drug.maxDoseMgPerKgAdult, 4.4);
			assert.equal(drug.absoluteMaxDoseMgAdult, 300.0);
		});

		it('verifies Bupivacaine 0.5% extended surgical anesthesia parameters', () => {
			const drug = DENTAL_ANESTHETICS.bupivacaine_05;
			assert.equal(drug.activeConcentrationPercent, 0.5);
			assert.equal(drug.mgActivePerCarpule, 9.0);
			assert.equal(drug.maxDoseMgPerKgAdult, 2.0);
			assert.equal(drug.absoluteMaxDoseMgAdult, 90.0);
		});

		it('verifies dental needle gauges and lengths', () => {
			assert.equal(DENTAL_NEEDLES.g27_long_35mm.lengthMm, 35);
			assert.equal(DENTAL_NEEDLES.g30_short_21mm.lengthMm, 21);
			assert.equal(DENTAL_NEEDLES.g30_ultrashort_12mm.lengthMm, 12);
		});
	});

	describe('2. Safe Dosage & Toxic Threshold Calculations', () => {
		it('calculates safe dose for standard 70 kg healthy adult (1 carpule articaine 1:100k)', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_100k',
				carpulesCount: 1.0,
				patientWeightKg: 70,
				patientAgeYears: 35,
				asaStatus: 'asa_1',
				hasCardiovascularRisk: false,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: 'infiltration',
				needleType: 'g30_short_21mm',
				aspirationNegativeConfirmed: true
			});

			assert.equal(res.injectedActiveMg, 68.0);
			assert.equal(res.injectedEpinephrineMg, 0.017);
			assert.equal(res.maxSafeActiveMg, 490.0); // 70 * 7 = 490 mg
			assert.equal(res.maxSafeEpinephrineMg, 0.20);
			assert.equal(res.safetyZone, 'safe');
			assert.equal(res.isOverdose, false);
			assert.equal(res.isEpinephrineOverdose, false);
		});

		it('detects overdose when carpules exceed patient weight-based threshold', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_100k',
				carpulesCount: 8.0, // 8 * 68 = 544 mg (exceeds 490 mg for 70 kg and 500 mg absolute)
				patientWeightKg: 70,
				patientAgeYears: 30,
				asaStatus: 'asa_1',
				hasCardiovascularRisk: false,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: 'mandibular_torus',
				needleType: 'g27_long_35mm',
				aspirationNegativeConfirmed: true
			});

			assert.equal(res.isOverdose, true);
			assert.equal(res.safetyZone, 'overdose_danger');
			assert.ok(res.warnings.some(w => w.includes('ПРЕВЫШЕНИЕ МАКСИМАЛЬНОЙ СУТОЧНОЙ ДОЗЫ')));
		});
	});

	describe('3. Cardiovascular & Epinephrine Ceilings (AHA / СтАР)', () => {
		it('enforces 0.04 mg epinephrine ceiling for ASA III cardiovascular risk patients', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_100k',
				carpulesCount: 3.0, // 3 * 0.017 = 0.051 mg epi (exceeds 0.04 mg cardio limit)
				patientWeightKg: 80,
				patientAgeYears: 55,
				asaStatus: 'asa_3',
				hasCardiovascularRisk: true,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: 'infiltration',
				needleType: 'g30_short_21mm',
				aspirationNegativeConfirmed: true
			});

			assert.equal(res.maxSafeEpinephrineMg, 0.04);
			assert.equal(res.isEpinephrineOverdose, true);
			assert.equal(res.safetyZone, 'overdose_danger');
			assert.ok(res.warnings.some(w => w.includes('Превышен кардиоваскулярный лимит адреналина')));
		});

		it('allows up to 4 carpules of Articaine 1:200 000 for cardio risk patient', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_200k',
				carpulesCount: 4.0, // 4 * 0.0085 = 0.034 mg epi <= 0.04 mg
				patientWeightKg: 70,
				patientAgeYears: 60,
				asaStatus: 'asa_3',
				hasCardiovascularRisk: true,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: 'infiltration',
				needleType: 'g30_short_21mm',
				aspirationNegativeConfirmed: true
			});

			assert.equal(res.isEpinephrineOverdose, false);
			assert.ok(res.percentOfEpiMaxDose <= 100);
		});

		it('allows Mepivacaine 3% plain for cardio risk with zero epinephrine', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'mepivacaine_plain',
				carpulesCount: 3.0,
				patientWeightKg: 70,
				patientAgeYears: 62,
				asaStatus: 'asa_3',
				hasCardiovascularRisk: true,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: 'infiltration',
				needleType: 'g30_short_21mm',
				aspirationNegativeConfirmed: true
			});

			assert.equal(res.injectedEpinephrineMg, 0.0);
			assert.equal(res.isEpinephrineOverdose, false);
			assert.equal(res.safetyZone, 'safe');
		});
	});

	describe('4. Pediatric & Geriatric Age Scaling', () => {
		it('applies geriatric 0.70 reduction factor for age >= 65', () => {
			const factor = calculateAgeReductionFactor(72, 70);
			assert.equal(factor, 0.70);

			const category = determineAgeCategory(72);
			assert.equal(category, 'geriatric');

			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_100k',
				carpulesCount: 1.0,
				patientWeightKg: 70,
				patientAgeYears: 75,
				asaStatus: 'asa_2',
				hasCardiovascularRisk: false,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: 'infiltration',
				needleType: 'g30_short_21mm',
				aspirationNegativeConfirmed: true
			});

			assert.equal(res.ageDoseReductionFactor, 0.70);
			assert.equal(res.maxSafeActiveMg, 343.0); // 70 * 7 * 0.7 = 343 mg
		});

		it('applies Clark weight-based scaling for pediatric patients', () => {
			const factor = calculateAgeReductionFactor(8, 28);
			assert.equal(factor, 0.4); // 28 / 70 = 0.4

			const category = determineAgeCategory(8);
			assert.equal(category, 'pediatric');
		});
	});

	describe('5. Somatic Risk Checks & Contraindications', () => {
		it('triggers contraindication alert for sulfite allergy with articaine', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_100k',
				carpulesCount: 1.0,
				patientWeightKg: 70,
				patientAgeYears: 30,
				asaStatus: 'asa_2',
				hasCardiovascularRisk: false,
				hasSulfiteAllergy: true,
				hasBronchialAsthma: true,
				isPregnantOrLactating: false,
				techniqueId: 'infiltration',
				needleType: 'g30_short_21mm',
				aspirationNegativeConfirmed: true
			});

			assert.ok(res.contraindicationsTriggered.length > 0);
			assert.ok(res.contraindicationsTriggered[0]?.includes('ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ'));
		});

		it('triggers warning when aspiration check is not confirmed for mandibular block', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_100k',
				carpulesCount: 1.0,
				patientWeightKg: 70,
				patientAgeYears: 30,
				asaStatus: 'asa_1',
				hasCardiovascularRisk: false,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: 'mandibular_torus',
				needleType: 'g27_long_35mm',
				aspirationNegativeConfirmed: false
			});

			assert.ok(res.warnings.some(w => w.includes('Аспирационная проба обязательна')));
		});
	});

	describe('6. Clinical Diary Serialization (Форма № 043/у)', () => {
		it('formats clinical diary entry string accurately', () => {
			const entry = generateAnesthesiaDiaryEntry({
				drug: DENTAL_ANESTHETICS.articaine_1_100k,
				carpulesCount: 1.5,
				injectedVolumeMl: 2.55,
				injectedActiveMg: 102.0,
				injectedEpinephrineMg: 0.0255,
				techniqueId: 'mandibular_torus',
				needleType: 'g27_long_35mm',
				targetToothNumberFdi: 47,
				aspirationNegativeConfirmed: true
			});

			assert.ok(entry.includes('Проведена местная проводниковая мандибулярная / торусальная (по вейсбрему) анестезия в области зуба 47'));
			assert.ok(entry.includes('Ультракаин Д-С форте'));
			assert.ok(entry.includes('объем 2.55 мл (1.5 карп., 102 мг действующего вещества'));
			assert.ok(entry.includes('Игла: Игла 27G длинная (0.4 x 35 мм)'));
			assert.ok(entry.includes('Аспирационная проба отрицательна'));
		});
	});

});
