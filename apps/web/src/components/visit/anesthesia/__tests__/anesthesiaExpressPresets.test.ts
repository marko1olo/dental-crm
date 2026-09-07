/**
 * anesthesiaExpressPresets.test.ts — Unit Tests for 1-Click Chairside Express Anesthesia Presets
 * Standards: Минздрав РФ (Форма № 043/у), СтАР, ФАР, Malamed
 * Mandates 8e (Doctor Autonomy), 8k (Friction-Killer Law), 8n (Solo Doctor & Small Clinic Sovereignty)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	EXPRESS_ANESTHESIA_PRESETS,
	EXPRESS_PRESETS_BY_ID,
	applyExpressPresetToSession,
	createExpressAspirationAttempt,
	generateExpressPresetDiaryText,
	getExpressPresetById,
	validateAllExpressPresets,
} from '../anesthesiaExpressPresets';
import {
	getAnestheticDrugSpecification,
	getNeedleSpecification,
	getTechniqueSpecification,
	validateNeedleForTechnique,
} from '../anesthesiaTechniqueMath';
import { evaluateVascularRisk } from '../aspirationSafetyEngine';

describe('Anesthesia Express Presets Engine (Mandates 8e, 8k, 8n)', () => {
	it('should define exactly 7 chairside express presets matching clinical standards', () => {
		assert.equal(EXPRESS_ANESTHESIA_PRESETS.length, 7);
		const ids = EXPRESS_ANESTHESIA_PRESETS.map((p) => p.id);
		assert.ok(ids.includes('infiltration_articaine_1_7'));
		assert.ok(ids.includes('mandibular_weisbrem_articaine_1_7'));
		assert.ok(ids.includes('torusal_articaine_1_7'));
		assert.ok(ids.includes('mandibular_cardio_scandonest_1_7'));
		assert.ok(ids.includes('intraligamentary_articaine_0_4'));
		assert.ok(ids.includes('mandibular_plus_infiltration_ultracaine_forte'));
		assert.ok(ids.includes('infiltration_septanest_1_7'));
	});


	it('should correctly configure Preset 1: Infiltration 1.7 ml (Articaine 1:100k, 30G 21mm)', () => {
		const preset = getExpressPresetById('infiltration_articaine_1_7');
		assert.ok(preset);
		assert.equal(preset.techniqueId, 'infiltration_supraperiosteal');
		assert.equal(preset.needleId, 'gauge_30_short_21mm');
		assert.equal(preset.drugKey, 'articaine_1_100k');
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, false);

		const needle = getNeedleSpecification(preset.needleId);
		assert.equal(needle.gauge, '30G');
		assert.equal(needle.lengthMm, 21);

		const drug = getAnestheticDrugSpecification(preset.drugKey);
		assert.equal(drug.vasoconstrictorRatio, '1:100000');
		assert.equal(drug.activeConcentrationPercent, 4.0);
	});

	it('should correctly configure Preset 2: Mandibular 1.7 ml Weisbrem (Articaine 1:100k, 27G 35mm)', () => {
		const preset = getExpressPresetById('mandibular_weisbrem_articaine_1_7');
		assert.ok(preset);
		assert.equal(preset.techniqueId, 'mandibular_weisbrem');
		assert.equal(preset.needleId, 'gauge_27_long_35mm');
		assert.equal(preset.drugKey, 'articaine_1_100k');
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, true);

		const needle = getNeedleSpecification(preset.needleId);
		assert.equal(needle.gauge, '27G');
		assert.equal(needle.lengthMm, 35);
		assert.equal(needle.aspirationLumenSafety, 'high');
	});

	it('should correctly configure Preset 3: Torusal 1.7 ml (Articaine 1:100k, 27G 35mm)', () => {
		const preset = getExpressPresetById('torusal_articaine_1_7');
		assert.ok(preset);
		assert.equal(preset.techniqueId, 'torusal');
		assert.equal(preset.needleId, 'gauge_27_long_35mm');
		assert.equal(preset.drugKey, 'articaine_1_100k');
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, true);

		const tech = getTechniqueSpecification(preset.techniqueId);
		assert.equal(tech.aspirationPlanesRequired, 2);
		assert.equal(tech.requiresBoneContact, true);
	});

	it('should correctly configure Preset 4: Mandibular Cardio (Scandonest 3% Plain, 27G 35mm)', () => {
		const preset = getExpressPresetById('mandibular_cardio_scandonest_1_7');
		assert.ok(preset);
		assert.equal(preset.techniqueId, 'mandibular_weisbrem');
		assert.equal(preset.needleId, 'gauge_27_long_35mm');
		assert.equal(preset.drugKey, 'mepivacaine_plain_3');
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, true);

		const drug = getAnestheticDrugSpecification(preset.drugKey);
		assert.equal(drug.isAdrenalineFree, true);
		assert.equal(drug.vasoconstrictorRatio, 'none');
		assert.equal(drug.containsSulfites, false);
	});

	it('should correctly configure Preset 5: Intraligamentary 0.4 ml PDL (Articaine 1:100k, 30G 12mm)', () => {
		const preset = getExpressPresetById('intraligamentary_articaine_0_4');
		assert.ok(preset);
		assert.equal(preset.techniqueId, 'intraligamentary_pdl');
		assert.equal(preset.needleId, 'gauge_30_ultrashort_12mm');
		assert.equal(preset.drugKey, 'articaine_1_100k');
		assert.equal(preset.volumeMl, 0.4);
		assert.equal(preset.isTwoPlaneRequired, false);

		const needle = getNeedleSpecification(preset.needleId);
		assert.equal(needle.lengthMm, 12);
		assert.ok(needle.lengthMm <= 15, 'PDL needle must not exceed 15mm to avoid deflection');

		const tech = getTechniqueSpecification(preset.techniqueId);
		assert.equal(tech.targetPressureAtm.isHighPressure, true);
		assert.equal(tech.targetPressureAtm.min, 10);
		assert.equal(tech.targetPressureAtm.max, 15);
	});

	it('should correctly configure Preset 6: Mandibular + Infiltration 1.7 ml Ultracain DS Forte (27G 35mm)', () => {
		const preset = getExpressPresetById('mandibular_plus_infiltration_ultracaine_forte');
		assert.ok(preset);
		assert.equal(preset.techniqueId, 'mandibular_weisbrem');
		assert.equal(preset.needleId, 'gauge_27_long_35mm');
		assert.equal(preset.drugKey, 'articaine_1_100k');
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, true);

		const needle = getNeedleSpecification(preset.needleId);
		assert.equal(needle.gauge, '27G');
		assert.equal(needle.lengthMm, 35);
		assert.equal(needle.aspirationLumenSafety, 'high');
	});

	it('should correctly configure Preset 7: Infiltration 1.7 ml Septanest (30G 21mm)', () => {
		const preset = getExpressPresetById('infiltration_septanest_1_7');
		assert.ok(preset);
		assert.equal(preset.techniqueId, 'infiltration_supraperiosteal');
		assert.equal(preset.needleId, 'gauge_30_short_21mm');
		assert.equal(preset.drugKey, 'articaine_1_100k');
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, false);

		const drug = getAnestheticDrugSpecification(preset.drugKey);
		assert.ok(drug.tradeNamesRu.some((name) => name.includes('Септонест') || name.includes('Септанест')));
	});

	it('should anatomically validate all presets without any clinical warnings', () => {
		const validation = validateAllExpressPresets();
		assert.equal(validation.allValid, true);
		assert.equal(validation.results.length, 7);

		for (const r of validation.results) {
			assert.equal(r.isNeedleValid, true, `Preset ${r.presetId} needle must be valid`);
			assert.equal(r.warningRu, null, `Preset ${r.presetId} must have no warnings`);
		}
	});


	it('should create valid negative aspiration attempts for all presets', () => {
		for (const preset of EXPRESS_ANESTHESIA_PRESETS) {
			const attempt = createExpressAspirationAttempt(preset, 1);
			assert.equal(attempt.overallResult, 'negative');
			assert.equal(attempt.bloodObserved, false);
			assert.equal(attempt.plane1Result, 'negative');
			assert.equal(attempt.needleId, preset.needleId);
			assert.equal(attempt.actionTaken, 'proceed_slow_injection');

			if (preset.isTwoPlaneRequired) {
				assert.equal(attempt.plane2Result, 'negative');
			} else {
				assert.equal(attempt.plane2Result, undefined);
			}
		}
	});

	it('should generate complete, legally compliant Form 043/u text for all presets', () => {
		for (const preset of EXPRESS_ANESTHESIA_PRESETS) {
			const exportResult = generateExpressPresetDiaryText(preset, {
				patientFullName: 'Смирнова Екатерина Васильевна',
				toothNumber: '46',
				side: 'right',
			});

			assert.equal(exportResult.isLegalSafe, true, `Preset ${preset.id} must be legally safe`);
			assert.equal(
				exportResult.complianceCheckPassed,
				true,
				`Preset ${preset.id} must pass compliance check`,
			);
			assert.equal(exportResult.warningsRu.length, 0, `Preset ${preset.id} must have 0 warnings`);

			const text = exportResult.diaryText043;
			assert.ok(
				text.includes('ПРОТОКОЛ МЕСТНОЙ АНЕСТЕЗИИ И АСПИРАЦИОННОЙ ПРОБЫ'),
				'Must have header',
			);
			assert.ok(text.includes('ОТРИЦАТЕЛЬНАЯ'), 'Must record negative aspiration');
			assert.ok(text.includes(`${preset.volumeMl} мл`), 'Must state exact volume');
			assert.ok(text.includes('Оценка эффективности и безопасности'), 'Must have safety evaluation');
		}
	});

	it('should apply preset to existing session and preserve patient demographics', () => {
		const initialSession = {
			patientFullName: 'Иванов Иван Иванович',
			medCardNumber: '043-2026/001',
			patientAgeYears: 42,
			toothNumber: '36',
			side: 'left' as const,
		};

		const preset = EXPRESS_PRESETS_BY_ID.mandibular_weisbrem_articaine_1_7;
		const updatedSession = applyExpressPresetToSession(initialSession, preset);

		assert.equal(updatedSession.patientFullName, 'Иванов Иван Иванович');
		assert.equal(updatedSession.medCardNumber, '043-2026/001');
		assert.equal(updatedSession.toothNumber, '36');
		assert.equal(updatedSession.side, 'left');
		assert.equal(updatedSession.techniqueId, 'mandibular_weisbrem');
		assert.equal(updatedSession.needleId, 'gauge_27_long_35mm');
		assert.equal(updatedSession.drugKey, 'articaine_1_100k');
		assert.equal(updatedSession.volumeMl, 1.7);
		assert.equal(updatedSession.aspirationStatus, 'negative_safe');
		assert.equal(updatedSession.isTwoPlaneConfirmed, true);
		assert.equal(updatedSession.attempts.length, 1);
		assert.equal(updatedSession.attempts[0]?.overallResult, 'negative');
	});
});
