import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateGoldenProportionDeviation } from '../math/goldenProportionMath';
import { calculateBipupillaryAlignment, calculateInterpupillaryTilt } from '../math/facialAlignmentMath';
import { calculateSmileLineCurvature } from '../math/smileArcMath';
import { WHEELER_AESTHETIC_NORMS, dsdAnalysisDataSchema } from '@dental/shared';

describe('Digital Smile Design (DSD) Inquisition Suite [PHO-02]', () => {
	const photographyDir = path.resolve(process.cwd(), 'apps/web/src/components/photography');
	const dsdDir = path.join(photographyDir, 'dsd');

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

	test('4. DsdCanvasOverlay Source Code & Touch-Target Integrity', () => {
		const overlayFile = fs.readFileSync(path.join(dsdDir, 'DsdCanvasOverlay.tsx'), 'utf-8');

		// Интерактивные слои и ручки
		assert.ok(overlayFile.includes('data-testid="dsd-canvas-container"'), 'Canvas container must exist');
		assert.ok(overlayFile.includes('data-testid="handle-left-pupil"'), 'Left pupil handle must exist');
		assert.ok(overlayFile.includes('data-testid="handle-right-pupil"'), 'Right pupil handle must exist');
		assert.ok(overlayFile.includes('data-testid="handle-midline-top"'), 'Midline top handle must exist');
		assert.ok(overlayFile.includes('data-testid="handle-commissure-left"'), 'Commissure left handle must exist');
		assert.ok(overlayFile.includes('data-testid="handle-teeth-origin"'), 'Teeth arch origin handle must exist');
		assert.ok(overlayFile.includes('data-testid="handle-calib-p1"'), 'Calibration P1 handle must exist');

		// Apple HIG: тач-мишени радиусом >= 22 (диаметр >= 44px)
		assert.ok(overlayFile.includes('r="22"'), 'Touch targets must be at least 44x44px (r=22) for touch ergonomics');
	});

	test('5. DsdMetricsSidebar & Mandate 8e Doctor Autonomy (No Disabled CTA)', () => {
		const sidebarFile = fs.readFileSync(path.join(dsdDir, 'DsdMetricsSidebar.tsx'), 'utf-8');

		assert.ok(
			sidebarFile.includes('data-testid="btn-apply-dsd-to-plan-and-lab"'),
			'Primary CTA to apply to plan and lab must exist',
		);
		assert.ok(
			!sidebarFile.includes('disabled={'),
			'Mandate 8e: Primary CTA must NEVER be disabled by bureaucratic gates',
		);
		assert.ok(
			sidebarFile.includes('bg-[var(--primary,#0d9488)]'),
			'Must follow primary brand style without button carnival',
		);
		assert.ok(
			sidebarFile.includes('min-h-[44px]'),
			'Action button must be at least 44px high for mobile touch',
		);
	});

	test('6. DigitalSmileDesignModal & Fastify API + ZTL Event Integration (Zero Potemkin)', () => {
		const modalFile = fs.readFileSync(path.join(photographyDir, 'DigitalSmileDesignModal.tsx'), 'utf-8');

		// Проверка диспатча события в наряд лаборатории ЗТЛ
		assert.ok(
			modalFile.includes("window.dispatchEvent(new CustomEvent('dente-open-lab-order-modal'"),
			'Modal must dispatch dente-open-lab-order-modal event with computed parameters',
		);
		// Проверка диспатча в план лечения
		assert.ok(
			modalFile.includes("window.dispatchEvent(new CustomEvent('dente-apply-dsd-to-treatment-plan'"),
			'Modal must dispatch dente-apply-dsd-to-treatment-plan event',
		);
		// Проверка сохранения в Fastify API
		assert.ok(
			modalFile.includes('/api/patients/${patientId}/photo-protocol'),
			'Modal must persist DSD analysis to backend photo protocol',
		);
		// Apple HIG mobile drag handle
		assert.ok(
			modalFile.includes('sm:hidden w-10 h-[5px]'),
			'Modal must render Apple HIG 36-40px mobile drag handle',
		);
	});

	test('7. ClinicalPhotoProtocolModal & Header Tab Mounting [PHO-02]', () => {
		const headerFile = fs.readFileSync(path.join(photographyDir, 'ClinicalPhotoProtocolHeader.tsx'), 'utf-8');
		const modalFile = fs.readFileSync(path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx'), 'utf-8');
		const launcherFile = fs.readFileSync(path.join(photographyDir, 'DirectPhotoProtocolLauncher.tsx'), 'utf-8');

		// Вкладка DSD в шапке
		assert.ok(
			headerFile.includes('data-testid="tab-dsd-aesthetic"'),
			'Header must contain DSD Aesthetic tab',
		);
		assert.ok(
			headerFile.includes('DSD Эстетика'),
			'Tab must use clean clinical Russian name without dev-jargon',
		);

		// Рендеринг режима dsd в модалке
		assert.ok(
			modalFile.includes("activeViewMode === 'dsd'"),
			'ClinicalPhotoProtocolModal must handle activeViewMode === dsd',
		);
		assert.ok(
			modalFile.includes('<DsdCanvasOverlay'),
			'ClinicalPhotoProtocolModal must render DsdCanvasOverlay',
		);
		assert.ok(
			modalFile.includes('<DsdMetricsSidebar'),
			'ClinicalPhotoProtocolModal must render DsdMetricsSidebar',
		);

		// Launcher mounts DSD
		assert.ok(
			launcherFile.includes('DigitalSmileDesignModal'),
			'DirectPhotoProtocolLauncher must mount DigitalSmileDesignModal',
		);
		assert.ok(
			launcherFile.includes('dente:open-dsd'),
			'Launcher must listen to dente:open-dsd event',
		);
	});
});
