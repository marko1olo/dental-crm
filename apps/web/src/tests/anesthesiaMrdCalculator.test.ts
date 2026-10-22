import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	calculateAnesthesiaSafety,
	resolveClinicalDefaultWeightKg,
	STANDARD_ANESTHESIA_PRESETS,
	DENTAL_ANESTHETICS,
	generateAnesthesiaDiaryEntry,
} from '../components/anesthesia';

describe('Red Team First-Principles Dental Anesthesia Safety & Clinical Presets', () => {
	describe('1. Workhorse Clinical Presets (1-Click Chairside)', () => {
		it('verifies Articaine 4% 1:100 000 (Ultracain D-S forte) 1 carpule standard', () => {
			const preset = STANDARD_ANESTHESIA_PRESETS.ultracain_ds_forte;
			assert.ok(preset, 'Ultracain D-S forte preset must exist');
			assert.equal(preset.drugId, 'articaine_1_100k');
			assert.equal(preset.carpulesCount, 1);
			assert.equal(preset.techniqueId, 'infiltration');

			const res = calculateAnesthesiaSafety({
				drugId: preset.drugId,
				carpulesCount: 1.0,
				patientWeightKg: 70,
				patientAgeYears: 35,
				asaStatus: 'asa_1',
				hasCardiovascularRisk: false,
				hasSulfiteAllergy: false,
				hasBronchialAsthma: false,
				isPregnantOrLactating: false,
				techniqueId: preset.techniqueId,
			});

			assert.equal(res.injectedActiveMg, 68.0);
			assert.equal(res.injectedVolumeMl, 1.7);
			assert.equal(res.maxSafeActiveMg, 490.0);
			assert.equal(res.maxSafeCarpulesCount, 7.2);
			assert.equal(res.isOverdose, false);
			assert.equal(res.isEpinephrineOverdose, false);
			assert.equal(res.safetyZone, 'safe');
		});

		it('verifies Articaine 4% 1:200 000 (Ultracain D-S) with gentle epinephrine', () => {
			const drug = DENTAL_ANESTHETICS.articaine_1_200k;
			assert.equal(drug.vasoconstrictorRatio, '1:200000');
			assert.equal(drug.epinephrineMgPerMl, 0.005);

			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_200k',
				carpulesCount: 2.0,
				patientWeightKg: 70,
				techniqueId: 'infiltration',
			});

			assert.equal(res.injectedActiveMg, 136.0);
			assert.equal(res.injectedVolumeMl, 3.4);
			assert.equal(res.injectedEpinephrineMg, 0.017);
			assert.equal(res.isOverdose, false);
			assert.equal(res.safetyZone, 'safe');
		});

		it('verifies Mepivacaine 3% plain (Scandonest) without vasoconstrictor for cardio risk', () => {
			const drug = DENTAL_ANESTHETICS.mepivacaine_plain;
			assert.equal(drug.isAdrenalineFree, true);
			assert.equal(drug.epinephrineMgPerMl, 0);

			const res = calculateAnesthesiaSafety({
				drugId: 'mepivacaine_plain',
				carpulesCount: 1.0,
				patientWeightKg: 70,
				hasCardiovascularRisk: true,
				techniqueId: 'infiltration',
			});

			assert.equal(res.injectedActiveMg, 51.0);
			assert.equal(res.injectedVolumeMl, 1.7);
			assert.equal(res.injectedEpinephrineMg, 0.0);
			assert.equal(res.isEpinephrineOverdose, false);
			assert.equal(res.isOverdose, false);
			assert.equal(res.safetyZone, 'safe');
		});
	});

	describe('2. Mandates 8e & 8y: Doctor Autonomy & Passive Safety', () => {
		it('allows doctor to apply anesthesia even when warnings exist without blocking', () => {
			const res = calculateAnesthesiaSafety({
				drugId: 'articaine_1_100k',
				carpulesCount: 1.0,
				patientWeightKg: 70,
				hasSulfiteAllergy: true, // warning for sulfite-containing drug
				techniqueId: 'infiltration',
			});

			// Warning is provided passively for clinical awareness
			assert.ok(res.warnings.length > 0 || res.contraindicationsTriggered.length > 0);
			// Doctor autonomy: result is computed, no fatal throw, doctor makes clinical judgment
			assert.equal(res.injectedActiveMg, 68);
		});

		it('resolves robust weight defaults without stalling UI', () => {
			assert.equal(resolveClinicalDefaultWeightKg(undefined, 35, false), 70);
			assert.equal(resolveClinicalDefaultWeightKg(null, 7, true), 25);
			assert.equal(resolveClinicalDefaultWeightKg(80, 40, false), 80);
		});
	});

	describe('3. SOAP Diary Entry Synthesis', () => {
		it('generates clean clinical diary entry for outpatient reception', () => {
			const drug = DENTAL_ANESTHETICS.articaine_1_100k;
			const text = generateAnesthesiaDiaryEntry({
				drug,
				carpulesCount: 1,
				injectedVolumeMl: 1.7,
				injectedActiveMg: 68,
				injectedEpinephrineMg: 0.017,
				techniqueId: 'infiltration',
				needleType: 'g30_short_21mm',
				targetToothNumberFdi: 16,
				aspirationNegativeConfirmed: true,
			});

			assert.ok(text.includes('инфильтрационная'));
			assert.ok(text.includes('16'));
			assert.ok(text.includes('1.7 мл'));
			assert.ok(text.includes('1 карп.'));
			assert.ok(text.includes('соматических реакций нет'));
		});
	});
});
