import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	TORQUE_STANDARDS,
	ISQ_THRESHOLDS,
	MISCH_BONE_DENSITIES,
	classifyTorqueBand,
	classifyIsqLevel
} from '../components/implant/isq/implantIsqPresets';

import {
	calculateIsqDirectionalStats,
	evaluateImplantIsqStability,
	generateImplantSurgeryDiaryEntry,
	generateImplantPassportRecord
} from '../components/implant/isq/implantIsqEngine';

describe('Dental Implant Insertion Torque & ISQ RFA Sensor Suite', () => {

	describe('1. Torque Standards & Classification', () => {
		it('classifies low primary stability for torque < 20 Ncm', () => {
			const info = classifyTorqueBand(15);
			assert.equal(info.id, 'insufficient_stability');
			assert.ok(info.statusBadgeRu.includes('Двухэтапный'));
		});

		it('classifies standard stability for torque 20-34 Ncm', () => {
			const info = classifyTorqueBand(28);
			assert.equal(info.id, 'standard_stability');
		});

		it('classifies high stability for torque 35-50 Ncm', () => {
			const info = classifyTorqueBand(40);
			assert.equal(info.id, 'high_stability');
			assert.ok(info.statusBadgeRu.includes('Немедленная нагрузка'));
		});

		it('detects excessive torque danger for torque > 50 Ncm', () => {
			const info = classifyTorqueBand(58);
			assert.equal(info.id, 'excessive_torque_risk');
			assert.ok(info.clinicalImplicationRu.includes('ишемического'));
		});
	});

	describe('2. Osstell / Penguin RFA ISQ Scale & 4-Directional Probes', () => {
		it('classifies ISQ thresholds correctly (<60 low, 60-69 moderate, >=70 high)', () => {
			assert.equal(classifyIsqLevel(55).level, 'isq_low');
			assert.equal(classifyIsqLevel(64).level, 'isq_moderate');
			assert.equal(classifyIsqLevel(75).level, 'isq_high');
		});

		it('calculates 4-directional ISQ stats (mean, min, max, anisotropy)', () => {
			const stats = calculateIsqDirectionalStats({
				vestibularBuccal: 72,
				lingualPalatal: 76,
				mesial: 70,
				distal: 74
			});

			assert.equal(stats.meanIsq, 73.0);
			assert.equal(stats.minIsq, 70);
			assert.equal(stats.maxIsq, 76);
			assert.equal(stats.anisotropyDelta, 6);
		});
	});

	describe('3. Misch Bone Density Characteristics', () => {
		it('verifies Misch D1 to D4 bone density properties', () => {
			assert.ok(MISCH_BONE_DENSITIES.D1.tactileHounsfieldRu.includes('> 1250 HU'));
			assert.ok(MISCH_BONE_DENSITIES.D2.tactileHounsfieldRu.includes('850–1250 HU'));
			assert.ok(MISCH_BONE_DENSITIES.D3.tactileHounsfieldRu.includes('350–850 HU'));
			assert.ok(MISCH_BONE_DENSITIES.D4.tactileHounsfieldRu.includes('150–350 HU'));
		});
	});

	describe('4. Loading Protocol Recommendations', () => {
		it('recommends immediate loading for torque >= 35 Ncm and ISQ >= 70', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'Straumann BLX',
				diameterMm: 4.0,
				lengthMm: 10.0,
				toothNumberFdi: 36,
				insertionTorqueNcm: 40,
				boneDensity: 'D2',
				isqReadings: { vestibularBuccal: 74, lingualPalatal: 76, mesial: 72, distal: 74 },
				isGbrOrSinusLift: false,
				isImmediateExtractionSocket: false,
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.loadingRecommendation, 'immediate_loading_safe');
			assert.ok(res.loadingRecommendationTitleRu.includes('немедленной нагрузки'));
		});

		it('recommends early loading (6-8 weeks) for torque 25 Ncm and ISQ 65', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'Osstem TS III',
				diameterMm: 4.5,
				lengthMm: 11.5,
				toothNumberFdi: 46,
				insertionTorqueNcm: 25,
				boneDensity: 'D3',
				isqReadings: { vestibularBuccal: 64, lingualPalatal: 66, mesial: 65, distal: 65 },
				isGbrOrSinusLift: false,
				isImmediateExtractionSocket: false,
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.loadingRecommendation, 'early_loading_6_weeks');
		});

		it('recommends delayed 2-stage loading when torque or ISQ are low', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'Dentium SuperLine',
				diameterMm: 4.0,
				lengthMm: 10.0,
				toothNumberFdi: 26,
				insertionTorqueNcm: 15,
				boneDensity: 'D4',
				isqReadings: { vestibularBuccal: 54, lingualPalatal: 56, mesial: 55, distal: 55 },
				isGbrOrSinusLift: false,
				isImmediateExtractionSocket: false,
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.loadingRecommendation, 'delayed_loading_3_months');
		});

		it('recommends extended healing when GBR or sinus lift was performed', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'Straumann BLT',
				diameterMm: 4.1,
				lengthMm: 10.0,
				toothNumberFdi: 16,
				insertionTorqueNcm: 40,
				boneDensity: 'D3',
				isqReadings: { vestibularBuccal: 72, lingualPalatal: 74, mesial: 72, distal: 72 },
				isGbrOrSinusLift: true,
				isImmediateExtractionSocket: false,
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.loadingRecommendation, 'extended_healing_gbr');
			assert.ok(res.loadingRecommendationTitleRu.includes('НКР'));
		});
	});

	describe('5. Multi-Stage Osseointegration Dynamics & Baseline Tracking', () => {
		it('tracks positive osseointegration delta from Day 0 baseline', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'NobelActive',
				diameterMm: 4.3,
				lengthMm: 11.5,
				toothNumberFdi: 47,
				insertionTorqueNcm: 35,
				boneDensity: 'D2',
				isqReadings: { vestibularBuccal: 78, lingualPalatal: 80, mesial: 78, distal: 80 },
				isGbrOrSinusLift: false,
				isImmediateExtractionSocket: false,
				previousStages: [
					{
						stageId: 'day_0_insertion',
						labelRu: 'День 0',
						daysPostOp: 0,
						readings: { vestibularBuccal: 70, lingualPalatal: 72, mesial: 70, distal: 72 },
						meanIsq: 71.0,
						timestampIso: '2026-06-01T10:00:00Z'
					}
				],
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.deltaFromBaselineIsq, 8.0); // 79.0 - 71.0 = +8.0
			assert.ok(res.osseointegrationVelocityRu.includes('Высокая динамика остеоинтеграции'));
		});
	});

	describe('6. Form 043/u Surgery Diary & Implant Passport', () => {
		it('generates Form 043/u diary protocol text accurately', () => {
			const diary = generateImplantSurgeryDiaryEntry({
				toothNumberFdi: 36,
				implantSystemName: 'Straumann BLX',
				diameterMm: 4.0,
				lengthMm: 10.0,
				insertionTorqueNcm: 38,
				boneDensity: 'D2',
				stats: { meanIsq: 72.5, minIsq: 70, maxIsq: 75 },
				loadingRecommendationTitleRu: 'Немедленная нагрузка',
				surgeonName: 'Д-р Ковалев С. П.'
			});

			assert.ok(diary.includes('Протокол дентальной имплантации (Форма № 043/у)'));
			assert.ok(diary.includes('области отсутствующего зуба 36'));
			assert.ok(diary.includes('Straumann BLX Ø4 x 10 мм'));
			assert.ok(diary.includes('Первичный торк фиксации: 38 Н·см'));
			assert.ok(diary.includes('ISQ средний = 72.5'));
		});

		it('generates Implant Passport card text', () => {
			const passport = generateImplantPassportRecord({
				toothNumberFdi: 36,
				implantSystemName: 'Straumann BLX',
				diameterMm: 4.0,
				lengthMm: 10.0,
				insertionTorqueNcm: 38,
				meanIsq: 72.5,
				surgeonName: 'Д-р Ковалев С. П.'
			});

			assert.ok(passport.includes('ПАСПОРТ ИМПЛАНТАТА'));
			assert.ok(passport.includes('Зуб 36'));
			assert.ok(passport.includes('Торк: 38 Н·см'));
		});

		it('generates Form 043/u diary and passport for torque-only mode (without ISQ apparatus)', () => {
			const diary = generateImplantSurgeryDiaryEntry({
				toothNumberFdi: 46,
				implantSystemName: 'Osstem TS III',
				diameterMm: 4.5,
				lengthMm: 10.0,
				insertionTorqueNcm: 40,
				boneDensity: 'D2',
				stats: { meanIsq: 0, minIsq: 0, maxIsq: 0 },
				isIsqMeasured: false,
				loadingRecommendationTitleRu: 'Немедленная нагрузка',
				surgeonName: 'Д-р Ковалев С. П.'
			});

			assert.ok(diary.includes('Контроль стабильности: по торку динамометрического ключа (40 Н·см, без аппарата ISQ)'));

			const passport = generateImplantPassportRecord({
				toothNumberFdi: 46,
				implantSystemName: 'Osstem TS III',
				diameterMm: 4.5,
				lengthMm: 10.0,
				insertionTorqueNcm: 40,
				meanIsq: 0,
				isIsqMeasured: false,
				surgeonName: 'Д-р Ковалев С. П.'
			});

			assert.ok(passport.includes('Торк: 40 Н·см • Контроль по торку (без ISQ)'));
		});
	});

	describe('7. Solo Freedom: Torque-Only Stability Control (Without ISQ Apparatus)', () => {
		it('evaluates high stability and immediate loading safely purely based on torque >= 35 Ncm', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'Straumann BLX',
				diameterMm: 4.0,
				lengthMm: 10.0,
				toothNumberFdi: 36,
				insertionTorqueNcm: 42,
				boneDensity: 'D2',
				isIsqMeasured: false,
				isGbrOrSinusLift: false,
				isImmediateExtractionSocket: false,
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.isIsqMeasured, false);
			assert.equal(res.isqStatusRu, 'Контроль по торку (без аппарата ISQ)');
			assert.equal(res.loadingRecommendation, 'immediate_loading_safe');
			assert.ok(res.clinicalRationaleRu.includes('динамометрическому ключу'));
			assert.equal(res.warnings.length, 0, 'No false anisotropy warning when ISQ is not used');
		});

		it('evaluates standard stability (early loading) for torque 25 Ncm without ISQ', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'Dentium SuperLine',
				diameterMm: 4.0,
				lengthMm: 10.0,
				toothNumberFdi: 15,
				insertionTorqueNcm: 25,
				boneDensity: 'D3',
				isIsqMeasured: false,
				isGbrOrSinusLift: false,
				isImmediateExtractionSocket: false,
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.isIsqMeasured, false);
			assert.equal(res.loadingRecommendation, 'early_loading_6_weeks');
		});

		it('evaluates delayed loading for low torque < 20 Ncm without ISQ', () => {
			const res = evaluateImplantIsqStability({
				implantSystemName: 'Osstem TS III',
				diameterMm: 4.0,
				lengthMm: 8.5,
				toothNumberFdi: 26,
				insertionTorqueNcm: 15,
				boneDensity: 'D4',
				isIsqMeasured: false,
				isGbrOrSinusLift: false,
				isImmediateExtractionSocket: false,
				surgeonName: 'Д-р Ковалев'
			});

			assert.equal(res.isIsqMeasured, false);
			assert.equal(res.loadingRecommendation, 'delayed_loading_3_months');
		});
	});

});

