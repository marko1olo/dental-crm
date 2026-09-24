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

