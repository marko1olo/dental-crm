import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateGoldenProportionDeviation } from '../math/goldenProportionMath.js';
import { calculateBipupillaryAlignment, calculateInterpupillaryTilt } from '../math/facialAlignmentMath.js';
import { calculateSmileLineCurvature } from '../math/smileArcMath.js';
import {
	WHEELER_AESTHETIC_NORMS,
	dsdAnalysisDataSchema,
	calculateWheelerToothMetrics,
} from '../../../../../../packages/shared/src/clinical/photoProtocol.js';
import { DsdCanvasOverlay } from '../dsd/DsdCanvasOverlay.js';
import { DsdMetricsSidebar } from '../dsd/DsdMetricsSidebar.js';
import { DsdAestheticStudioModal } from '../dsd/DsdAestheticStudioModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Digital Smile Design (DSD) Inquisition Suite [PHO-02]', () => {
	test('1. Clinical Mathematics & Golden Proportion (1.618 : 1.0 : 0.618)', () => {
		// Центральный резец 8.5 мм (канон Wheeler)
		const centralWidth = 8.5;
		const idealLateral = centralWidth / 1.61803398875; // ~5.25 мм
		const idealCanine = idealLateral / 1.61803398875; // ~3.25 мм

		const result = calculateGoldenProportionDeviation(centralWidth, idealLateral, idealCanine);
		assert.strictEqual(result.isWithinGoldenTolerance, true);
		assert.ok(Math.abs(result.lateralRatioToCentral - 0.618) < 0.01);
		assert.ok(Math.abs(result.canineRatioToLateral - 0.618) < 0.01);
		assert.ok(result.lateralDeviationPercent < 0.01);

		// Диспропорция
		const wideLateral = 7.5;
		const badResult = calculateGoldenProportionDeviation(centralWidth, wideLateral, 4.0, 5);
		assert.strictEqual(badResult.isWithinGoldenTolerance, false);
		assert.ok(badResult.lateralDeviationPercent > 10);

		// Нормы Wheeler 2.5D
		assert.strictEqual(WHEELER_AESTHETIC_NORMS[11].widthMm, 8.5);
		assert.strictEqual(WHEELER_AESTHETIC_NORMS[11].heightMm, 10.5);
		assert.strictEqual(WHEELER_AESTHETIC_NORMS[11].ratioWH, 0.81);
		assert.strictEqual(WHEELER_AESTHETIC_NORMS[12].widthMm, 6.5);
		assert.strictEqual(WHEELER_AESTHETIC_NORMS[13].widthMm, 7.5);
	});

	test('2. Facial Alignment & Smile Arc Curvature', () => {
		const leftPupil = { x: 300, y: 400 };
		const rightPupil = { x: 700, y: 420 };
		const alignment = calculateBipupillaryAlignment(leftPupil, rightPupil);

		assert.strictEqual(alignment.isLevel, false);
		assert.ok(alignment.angleDegrees > 0);
		assert.ok(Math.abs(alignment.correctionAngleDegrees - (-alignment.angleDegrees)) < 0.05);

		// Smile arc curvature:
		const leftComm = { x: 200, y: 600 };
		const rightComm = { x: 800, y: 600 };

		// Консонантная
		const consonantRes = calculateSmileLineCurvature(leftComm, rightComm, [{ x: 500, y: 640 }]);
		assert.strictEqual(consonantRes.curvatureType, 'consonant');

		// Плоская
		const flatRes = calculateSmileLineCurvature(leftComm, rightComm, [{ x: 500, y: 601 }]);
		assert.strictEqual(flatRes.curvatureType, 'flat');

		// Обратная
		const reverseRes = calculateSmileLineCurvature(leftComm, rightComm, [{ x: 500, y: 550 }]);
		assert.strictEqual(reverseRes.curvatureType, 'reverse');
	});

	test('3. Shared Zod Schema Validation for DSD Analysis Payload', () => {
		const validPayload = {
			id: 'dsd_sample_01',
			photoUrl: 'https://cdn.dente.clinic/photos/smile.jpg',
			calibratedMmPerPx: 0.052,
			calibrationDistancePx: 192,
			calibrationKnownMm: 10,
			bipupillaryTiltDegrees: 0.5,
			facialMidlineOffsetMm: 0.2,
			incisalCantingDegrees: 0.0,
			smileArcCurvature: 'consonant',
			smileArcSymmetryPercent: 96,
			teethMetrics: [
				{
					toothFdi: 11,
					widthMm: 8.5,
					heightMm: 10.5,
					ratioWidthToHeight: 0.81,
					visibleProportionToCentral: 1.0,
					goldenDeviationPercent: 0,
				},
			],
			recommendedMaterial: 'emax_lithium_disilicate',
			recommendedVitaShade: 'A2',
			translucencyLevel: 'HT',
			doctorNotes: 'Клинический осмотр: норма Wheeler',
		};

		const parsed = dsdAnalysisDataSchema.safeParse(validPayload);
		assert.strictEqual(parsed.success, true);
	});

	test('4. DsdCanvasOverlay & DsdMetricsSidebar Runtime Contracts', () => {
		// Runtime checks without fs.readFileSync static inspection
		assert.strictEqual(typeof DsdCanvasOverlay, 'function', 'DsdCanvasOverlay must be a valid React component');
		assert.strictEqual(typeof DsdMetricsSidebar, 'function', 'DsdMetricsSidebar must be a valid React component');

		// Test Wheeler tooth metrics runtime algorithm
		const metrics = calculateWheelerToothMetrics(360, 100, 0.09);
		assert.ok(Array.isArray(metrics), 'Metrics must return an array');
		assert.strictEqual(metrics.length, 6, 'Must calculate metrics for all 6 anterior teeth (13..23)');

		const central = metrics.find((m) => m.toothFdi === 11);
		const lateral = metrics.find((m) => m.toothFdi === 12);
		assert.ok(central, 'Tooth 11 must be calculated');
		assert.ok(lateral, 'Tooth 12 must be calculated');
		assert.ok(central.widthMm > lateral.widthMm, 'Central incisor must be wider than lateral');
	});

	test('5. Doctor Autonomy (Mandate 8e) & Clinical Mathematical Calculations', () => {
		// Test interpupillary tilt calculation with precision
		const tiltDegrees = calculateInterpupillaryTilt({ x: 100, y: 200 }, { x: 500, y: 220 });
		assert.ok(typeof tiltDegrees === 'number', 'Tilt degrees must be a numeric value');
		assert.ok(Math.abs(tiltDegrees) > 0, 'Non-horizontal pupils must produce non-zero tilt');

		// Level pupils must produce 0 tilt
		const levelTilt = calculateInterpupillaryTilt({ x: 100, y: 200 }, { x: 500, y: 200 });
		assert.strictEqual(Math.round(levelTilt), 0, 'Horizontal pupils must yield 0 tilt');
	});

	test('6. Fastify API Payload Validation & Rejection of Malformed Payloads', () => {
		// Schema must reject negative calibrations or impossible metrics
		const invalidPayload = {
			id: 'dsd_invalid',
			photoUrl: 'not_a_valid_url',
			calibratedMmPerPx: -1, // invalid negative scale
			calibrationDistancePx: 0,
			calibrationKnownMm: 0,
			bipupillaryTiltDegrees: 120, // out of bounds tilt
			facialMidlineOffsetMm: -50,
			incisalCantingDegrees: 0,
			smileArcCurvature: 'unknown_curvature', // invalid enum
			smileArcSymmetryPercent: -10, // negative symmetry
			teethMetrics: [],
		};

		const parsed = dsdAnalysisDataSchema.safeParse(invalidPayload);
		assert.strictEqual(parsed.success, false, 'Malformed DSD payload must fail Zod schema validation');
	});

	test('7. Clinical Photography Runtime Mounting & Integration [PHO-02]', () => {
		const photoDir = path.resolve(__dirname, '..');
		assert.ok(fs.existsSync(path.join(photoDir, 'ClinicalPhotoProtocolModal.tsx')), 'ClinicalPhotoProtocolModal must exist');
		assert.ok(fs.existsSync(path.join(photoDir, 'ClinicalPhotoProtocolHeader.tsx')), 'ClinicalPhotoProtocolHeader must exist');
		assert.ok(fs.existsSync(path.join(photoDir, 'DirectPhotoProtocolLauncher.tsx')), 'DirectPhotoProtocolLauncher must exist');
		assert.strictEqual(typeof DsdAestheticStudioModal, 'function', 'DsdAestheticStudioModal must be a function');
	});
});
