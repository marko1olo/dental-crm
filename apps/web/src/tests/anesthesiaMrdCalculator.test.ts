import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	calculateAnesthesiaMrd,
	calculateClarkDose,
	calculateClarkFactor,
	calculateYoungDose,
	calculateYoungFactor,
	MRD_DRUG_CATALOG,
	EPINEPHRINE_LIMITS_MG,
} from '../components/visit/anesthesiaMrdMath';

describe('Dental Anesthesia Maximum Recommended Dose (MRD) Caliper & Cardiac Gate Suite', () => {

	describe('1. Standard Weight-Based MRD Calculations (Adults)', () => {
		it('calculates exact MRD for Articaine 4% 1:100 000 in a standard 70 kg adult', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 70,
				carpulesCount: 1.0,
				carpuleVolumeMl: 1.7,
			});

			assert.equal(res.drug.id, 'articaine_1_100k');
			assert.equal(res.carpuleVolumeMl, 1.7);
			assert.equal(res.mgActivePerCarpule, 68.0);
			assert.equal(res.mgEpiPerCarpule, 0.017);
			assert.equal(res.injectedActiveMg, 68.0);
			assert.equal(res.injectedEpinephrineMg, 0.017);
			assert.equal(res.maxSafeActiveMg, 490.0); // 70 * 7.0 = 490 mg
			assert.equal(res.maxSafeCarpulesCount, 7.2); // 490 / 68 = 7.2
			assert.equal(res.remainingSafeCarpules, 6.2);
			assert.equal(res.activeDosePercent, 14);
			assert.equal(res.safetyZone, 'green_safe');
			assert.equal(res.limitingFactor, 'patient_weight');
			assert.equal(res.isOverdose, false);
			assert.equal(res.isEpinephrineOverdose, false);
		});

		it('caps Articaine 4% MRD at absolute maximum 500 mg for heavy adults (100 kg)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 100, // 100 * 7.0 = 700 mg -> capped at 500 mg
				carpulesCount: 2.0,
				carpuleVolumeMl: 1.7,
			});

			assert.equal(res.maxSafeActiveMg, 500.0);
			assert.equal(res.maxSafeCarpulesCount, 7.3); // 500 / 68 = 7.35 -> 7.3
			assert.equal(res.limitingFactor, 'absolute_max_cap');
			assert.match(res.limitingFactorDescriptionRu, /абсолютным максимумом/);
			assert.equal(res.isOverdose, false);
		});

		it('calculates Articaine 4% 1:200 000 with reduced epinephrine (0.0085 mg/carpule)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_200k',
				patientWeightKg: 70,
				carpulesCount: 2.0,
				carpuleVolumeMl: 1.7,
			});

			assert.equal(res.mgEpiPerCarpule, 0.0085);
			assert.equal(res.injectedEpinephrineMg, 0.017); // 2 * 0.0085
			assert.equal(res.drug.vasoconstrictorRatio, '1:200000');
			assert.equal(res.safetyZone, 'green_safe');
		});

		it('calculates Mepivacaine 3% plain for 50 kg patient (4.4 mg/kg, max 220 mg)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'mepivacaine_plain',
				patientWeightKg: 50, // 50 * 4.4 = 220 mg (< 300)
				carpulesCount: 1.0,
				carpuleVolumeMl: 1.7,
			});

			assert.equal(res.mgActivePerCarpule, 51.0);
			assert.equal(res.mgEpiPerCarpule, 0.0);
			assert.equal(res.injectedActiveMg, 51.0);
			assert.equal(res.injectedEpinephrineMg, 0.0);
			assert.equal(res.maxSafeActiveMg, 220.0);
			assert.equal(res.maxSafeCarpulesCount, 4.3); // 220 / 51 = 4.31 -> 4.3
			assert.equal(res.drug.isAdrenalineFree, true);
			assert.equal(res.limitingFactor, 'patient_weight');
		});

		it('caps Mepivacaine 3% plain at absolute maximum 300 mg for 80 kg patient', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'mepivacaine_plain',
				patientWeightKg: 80, // 80 * 4.4 = 352 mg -> capped at 300 mg
				carpulesCount: 3.0,
				carpuleVolumeMl: 1.7,
			});

			assert.equal(res.maxSafeActiveMg, 300.0);
			assert.equal(res.maxSafeCarpulesCount, 5.8); // 300 / 51 = 5.88 -> 5.8
			assert.equal(res.limitingFactor, 'absolute_max_cap');
		});

		it('calculates Lidocaine 2% with Epinephrine 1:100 000 (34 mg / 0.017 mg epi per 1.7 ml)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'lidocaine_1_100k',
				patientWeightKg: 70, // 70 * 4.4 = 308 mg -> capped at 300 mg
				carpulesCount: 2.0,
				carpuleVolumeMl: 1.7,
			});

			assert.equal(res.mgActivePerCarpule, 34.0);
			assert.equal(res.mgEpiPerCarpule, 0.017);
			assert.equal(res.injectedActiveMg, 68.0);
			assert.equal(res.injectedEpinephrineMg, 0.034);
			assert.equal(res.maxSafeActiveMg, 300.0);
			assert.equal(res.maxSafeCarpulesCount, 8.8); // 300 / 34 = 8.82 -> 8.8
		});
	});

	describe('2. Carpule Volume Variations (1.7 ml, 1.8 ml, 2.0 ml)', () => {
		it('supports 1.8 ml North American carpule volume (72 mg / 0.018 mg epi for Articaine 1:100k)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 70,
				carpulesCount: 2.0,
				carpuleVolumeMl: 1.8,
			});

			assert.equal(res.carpuleVolumeMl, 1.8);
			assert.equal(res.mgActivePerCarpule, 72.0); // 40 * 1.8 = 72 mg
			assert.equal(res.mgEpiPerCarpule, 0.018); // 0.01 * 1.8 = 0.018 mg
			assert.equal(res.injectedActiveMg, 144.0); // 2 * 72
			assert.equal(res.injectedVolumeMl, 3.6);
		});

		it('supports 2.0 ml ampoule volume for Lidocaine 2% plain', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'lidocaine_plain',
				patientWeightKg: 70,
				carpulesCount: 2.0,
				carpuleVolumeMl: 2.0,
			});

			assert.equal(res.carpuleVolumeMl, 2.0);
			assert.equal(res.mgActivePerCarpule, 40.0); // 20 * 2.0 = 40 mg
			assert.equal(res.injectedActiveMg, 80.0);
			assert.equal(res.injectedVolumeMl, 4.0);
		});
	});

	describe('3. Cardiac Epinephrine Gate (0.04 mg Limit)', () => {
		it('strictly limits Articaine 1:100 000 to max 2.3 carpules (0.04 mg limit) for cardiac patients', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 80, // by weight could be 7.3 carpules
				carpulesCount: 2.0,
				carpuleVolumeMl: 1.7,
				isCardiacRisk: true,
			});

			assert.equal(res.isCardiacRestricted, true);
			assert.equal(res.cardiacGateActive, true);
			assert.equal(res.maxSafeEpinephrineMg, EPINEPHRINE_LIMITS_MG.cardiovascularGate); // 0.04 mg
			assert.equal(res.maxSafeCarpulesCount, 2.3); // 0.04 / 0.017 = 2.35 -> 2.3
			assert.equal(res.limitingFactor, 'cardiac_epinephrine_gate');
			assert.equal(res.isEpinephrineOverdose, false);
			assert.equal(res.safetyZone, 'orange_warning'); // 2 / 2.3 = 87% (> 85% orange warning)
		});

		it('triggers Red STOP and cardiac epinephrine overdose alert when exceeding 2 carpules of 1:100k', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 80,
				carpulesCount: 3.0, // 3 * 0.017 = 0.051 mg > 0.04 mg
				carpuleVolumeMl: 1.7,
				isCardiacRisk: true,
			});

			assert.equal(res.isEpinephrineOverdose, true);
			assert.equal(res.safetyZone, 'red_stop');
			assert.equal(res.speedoMeterLabelRu, 'СТОП / ОПАСНОСТЬ');
			assert.ok(res.warnings.some((w) => w.includes('ПРЕВЫШЕН КАРДИОЛОГИЧЕСКИЙ ЛИМИТ АДРЕНАЛИНА')));
		});

		it('allows up to 4.7 carpules of Articaine 1:200 000 under cardiac gate', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_200k',
				patientWeightKg: 80,
				carpulesCount: 4.0, // 4 * 0.0085 = 0.034 mg <= 0.04 mg
				carpuleVolumeMl: 1.7,
				isCardiacRisk: true,
			});

			assert.equal(res.maxSafeCarpulesCount, 4.7); // 0.04 / 0.0085 = 4.7
			assert.equal(res.injectedEpinephrineMg, 0.034);
			assert.equal(res.isEpinephrineOverdose, false);
			assert.equal(res.safetyZone, 'yellow_caution'); // 0.034 / 0.04 = 85%
		});

		it('imposes no epinephrine penalty on Mepivacaine 3% plain under cardiac gate', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'mepivacaine_plain',
				patientWeightKg: 70,
				carpulesCount: 3.0,
				carpuleVolumeMl: 1.7,
				isCardiacRisk: true,
			});

			assert.equal(res.isCardiacRestricted, false);
			assert.equal(res.cardiacGateActive, false);
			assert.equal(res.injectedEpinephrineMg, 0.0);
			assert.equal(res.maxSafeCarpulesCount, 5.8); // 300 / 51 = 5.8
			assert.equal(res.safetyZone, 'green_safe');
		});
	});

	describe('4. Pediatric Formulas: Clark’s Rule, Young’s Rule & Direct mg/kg', () => {
		it('calculates Clark’s Rule factor and dose for 28 kg child (28 / 70 = 0.40)', () => {
			const factor = calculateClarkFactor(28);
			assert.equal(factor, 0.4);

			const clarkDose = calculateClarkDose(500, 28);
			assert.equal(clarkDose, 200.0); // 500 * 0.40 = 200 mg

			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 28,
				carpulesCount: 1.0,
				carpuleVolumeMl: 1.7,
				isPediatric: true,
				pediatricFormula: 'clark',
			});

			assert.equal(res.isPediatricScaled, true);
			assert.equal(res.pediatricFormulaUsed, 'clark');
			assert.equal(res.limitingFactor, 'pediatric_clark');
			// Weight limit: 28 * 5.0 = 140 mg (< 200 mg Clark), so min is 140 mg
			assert.equal(res.maxSafeActiveMg, 140.0);
			assert.equal(res.maxSafeCarpulesCount, 2.0); // 140 / 68 = 2.05 -> 2.0
		});

		it('calculates Young’s Rule factor and dose for 6 year old child (6 / 18 = 0.333)', () => {
			const factor = calculateYoungFactor(6);
			assert.equal(factor, 0.333);

			const youngDose = calculateYoungDose(500, 6);
			assert.equal(youngDose, 166.5); // 500 * 0.333 = 166.5 mg

			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 22,
				patientAgeYears: 6,
				carpulesCount: 1.0,
				carpuleVolumeMl: 1.7,
				isPediatric: true,
				pediatricFormula: 'young',
			});

			assert.equal(res.pediatricFormulaUsed, 'young');
			assert.equal(res.limitingFactor, 'pediatric_young');
			// Weight limit: 22 * 5.0 = 110 mg (< 166.5 mg Young), so min is 110 mg
			assert.equal(res.maxSafeActiveMg, 110.0);
			assert.equal(res.maxSafeCarpulesCount, 1.6); // 110 / 68 = 1.61 -> 1.6
		});

		it('calculates direct pediatric mg/kg standard (5.0 mg/kg for Articaine in 20 kg child)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 20,
				carpulesCount: 1.0,
				carpuleVolumeMl: 1.7,
				isPediatric: true,
				pediatricFormula: 'direct_mg_kg',
			});

			assert.equal(res.maxSafeActiveMg, 100.0); // 20 * 5.0 = 100 mg
			assert.equal(res.maxSafeCarpulesCount, 1.4); // 100 / 68 = 1.47 -> 1.4
			assert.equal(res.limitingFactor, 'pediatric_direct_mg_kg');
		});
	});

	describe('5. Safety Speedometer & Zones (Green, Yellow, Orange, Red STOP)', () => {
		it('classifies low dose as green_safe (<= 70%)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 70,
				carpulesCount: 1.0,
			});

			assert.equal(res.safetyZone, 'green_safe');
			assert.equal(res.speedoMeterLabelRu, 'БЕЗОПАСНО');
			assert.equal(res.speedoMeterColorHex, '#10b981');
		});

		it('classifies moderate dose as yellow_caution (70 - 85%)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'mepivacaine_plain',
				patientWeightKg: 50, // max = 220 mg
				carpulesCount: 3.5, // 178.5 mg / 220 = 81%
			});

			assert.equal(res.safetyZone, 'yellow_caution');
			assert.equal(res.speedoMeterLabelRu, 'ВНИМАНИЕ');
			assert.equal(res.speedoMeterColorHex, '#eab308');
		});

		it('classifies near-limit dose as orange_warning (85 - 100%)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'mepivacaine_plain',
				patientWeightKg: 50, // max = 220 mg
				carpulesCount: 4.0, // 204 mg / 220 = 93%
			});

			assert.equal(res.safetyZone, 'orange_warning');
			assert.equal(res.speedoMeterLabelRu, 'ПРЕДЕЛ ДОЗЫ');
			assert.equal(res.speedoMeterColorHex, '#f97316');
		});

		it('classifies overdose as red_stop (> 100%)', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'mepivacaine_plain',
				patientWeightKg: 50, // max = 220 mg
				carpulesCount: 5.0, // 255 mg / 220 = 116%
			});

			assert.equal(res.safetyZone, 'red_stop');
			assert.equal(res.isOverdose, true);
			assert.equal(res.speedoMeterLabelRu, 'СТОП / ОПАСНОСТЬ');
			assert.equal(res.speedoMeterColorHex, '#ef4444');
			assert.ok(res.warnings.some((w) => w.includes('ПРЕВЫШЕНА МАКСИМАЛЬНО ДОПУСТИМАЯ ДОЗА')));
		});
	});

	describe('6. Somatic Allergy Cross-Check & SOAP Serialization', () => {
		it('triggers contraindication for Sulfite allergy / Bronchial asthma with Articaine', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_100k',
				patientWeightKg: 70,
				carpulesCount: 1.0,
				hasSulfiteAllergy: true,
			});

			assert.equal(res.safetyZone, 'red_stop');
			assert.ok(res.contraindications.length > 0);
			assert.ok(res.contraindications[0]?.includes('ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ'));
		});

		it('formats Form 043/u clinical diary note with all critical parameters', () => {
			const res = calculateAnesthesiaMrd({
				drugId: 'articaine_1_200k',
				patientWeightKg: 75,
				carpulesCount: 1.5,
				carpuleVolumeMl: 1.7,
				isCardiacRisk: true,
			});

			assert.match(res.soapDiaryText, /Ультракаин Д-С/);
			assert.match(res.soapDiaryText, /2\.55 мл \(1\.5 карп\., 102 мг действ\. в-ва/);
			assert.match(res.soapDiaryText, /Кардиоконтроль: адреналин <= 0\.04 мг/);
			assert.match(res.soapDiaryText, /Аспирационная проба отрицательная/);
		});
	});

});
