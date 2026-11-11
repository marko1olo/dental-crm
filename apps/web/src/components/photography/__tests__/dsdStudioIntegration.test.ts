import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	calculateWheelerToothMetrics,
	WHEELER_AESTHETIC_NORMS,
	type DsdPoint2D,
	type DsdToothMetric,
} from '../../../../../../packages/shared/src/clinical/photoProtocol';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const photographyDir = path.resolve(__dirname, '..');
const dsdDir = path.resolve(photographyDir, 'dsd');
const webSrcDir = path.resolve(photographyDir, '../..');
const visitPhotoDir = path.resolve(webSrcDir, 'components/visit/photoUpload');

describe('Digital Smile Design (DSD) Studio Integration Suite [PHO-02..05]', () => {
	test('1. Wheeler 2.5D Proportions & Calibration Math', () => {
		// Arch width 380px, height 110px, mmPerPx = 0.089 (10mm / 112.35px)
		const mmPerPx = 0.089;
		const metrics = calculateWheelerToothMetrics(380, 110, mmPerPx);

		assert.ok(Array.isArray(metrics), 'Metrics must be computed as an array');
		assert.strictEqual(metrics.length, 6, 'Must compute metrics for 6 anterior teeth (13..23)');

		const central11 = metrics.find((m) => m.toothFdi === 11);
		const lateral12 = metrics.find((m) => m.toothFdi === 12);
		const canine13 = metrics.find((m) => m.toothFdi === 13);

		assert.ok(central11, 'Tooth 11 must be present');
		assert.ok(lateral12, 'Tooth 12 must be present');
		assert.ok(canine13, 'Tooth 13 must be present');

		// Золотое сечение: центральный резец шире бокового резца в пропорции ~1.618
		const goldenRatio = central11.widthMm / lateral12.widthMm;
		assert.ok(
			Math.abs(goldenRatio - 1.618) < 0.1,
			`Golden ratio must approximate 1.618, got: ${goldenRatio}`,
		);

		// Боковой шире клыка в пропорции ~1.618
		const lateralToCanineRatio = lateral12.widthMm / canine13.widthMm;
		assert.ok(
			Math.abs(lateralToCanineRatio - 1.618) < 0.1,
			`Lateral to canine ratio must approximate 1.618, got: ${lateralToCanineRatio}`,
		);
	});

	test('2. Anti-Orphan Verification (Mandate 8aq): DsdCanvasOverlay & DsdMetricsSidebar imports', () => {
		const canvasFile = path.join(dsdDir, 'DsdCanvasOverlay.tsx');
		const sidebarFile = path.join(dsdDir, 'DsdMetricsSidebar.tsx');
		const studioModalFile = path.join(dsdDir, 'DsdAestheticStudioModal.tsx');
		const photoModalFile = path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx');
		const indexExportFile = path.join(photographyDir, 'index.ts');

		assert.ok(fs.existsSync(canvasFile), 'DsdCanvasOverlay.tsx must exist');
		assert.ok(fs.existsSync(sidebarFile), 'DsdMetricsSidebar.tsx must exist');
		assert.ok(fs.existsSync(studioModalFile), 'DsdAestheticStudioModal.tsx must exist');
		assert.ok(fs.existsSync(photoModalFile), 'ClinicalPhotoProtocolModal.tsx must exist');

		const photoModalContent = fs.readFileSync(photoModalFile, 'utf-8');
		const studioModalContent = fs.readFileSync(studioModalFile, 'utf-8');
		const indexExportContent = fs.readFileSync(indexExportFile, 'utf-8');

		// 1. ClinicalPhotoProtocolModal mounts DsdCanvasOverlay & DsdMetricsSidebar
		assert.ok(
			photoModalContent.includes("from './dsd/DsdCanvasOverlay'"),
			'ClinicalPhotoProtocolModal must import DsdCanvasOverlay',
		);
		assert.ok(
			photoModalContent.includes("from './dsd/DsdMetricsSidebar'"),
			'ClinicalPhotoProtocolModal must import DsdMetricsSidebar',
		);

		// 2. DsdAestheticStudioModal mounts DsdCanvasOverlay & DsdMetricsSidebar
		assert.ok(
			studioModalContent.includes("from './DsdCanvasOverlay'"),
			'DsdAestheticStudioModal must import DsdCanvasOverlay',
		);
		assert.ok(
			studioModalContent.includes("from './DsdMetricsSidebar'"),
			'DsdAestheticStudioModal must import DsdMetricsSidebar',
		);

		// 3. Index exports all DSD artifacts
		assert.ok(
			indexExportContent.includes("from './dsd/DsdAestheticStudioModal'"),
			'index.ts must export DsdAestheticStudioModal',
		);
		assert.ok(
			indexExportContent.includes("from './dsd/DsdCanvasOverlay'"),
			'index.ts must export DsdCanvasOverlay',
		);
		assert.ok(
			indexExportContent.includes("from './dsd/DsdMetricsSidebar'"),
			'index.ts must export DsdMetricsSidebar',
		);
	});

	test('3. Visit Diary Photo Upload Integration (Mandate 8aq & Chairside Workflow)', () => {
		const visitUploadFile = path.join(visitPhotoDir, 'VisitDiaryPhotoUpload.tsx');
		const visitToolbarFile = path.join(visitPhotoDir, 'VisitDiaryPhotoActionsToolbar.tsx');
		const visitGridFile = path.join(visitPhotoDir, 'VisitDiaryPhotoThumbnailGrid.tsx');
		const visitModalsFile = path.join(visitPhotoDir, 'VisitDiaryPhotoModals.tsx');

		const visitUploadContent = fs.readFileSync(visitUploadFile, 'utf-8');
		const visitToolbarContent = fs.readFileSync(visitToolbarFile, 'utf-8');
		const visitGridContent = fs.readFileSync(visitGridFile, 'utf-8');
		const visitModalsContent = fs.readFileSync(visitModalsFile, 'utf-8');

		// VisitDiaryPhotoModals mounts DsdAestheticStudioModal
		assert.ok(
			visitModalsContent.includes('DsdAestheticStudioModal'),
			'VisitDiaryPhotoModals must import and render DsdAestheticStudioModal',
		);
		assert.ok(
			visitUploadContent.includes('dente:open-dsd'),
			'VisitDiaryPhotoUpload must listen to dente:open-dsd event',
		);
		assert.ok(
			visitUploadContent.includes('dsdPatientPhotos'),
			'VisitDiaryPhotoUpload must provide patient visit photos to DSD studio',
		);

		// VisitDiaryPhotoActionsToolbar has DSD button with onDsdOpen
		assert.ok(
			visitToolbarContent.includes('onDsdOpen'),
			'VisitDiaryPhotoActionsToolbar must provide onDsdOpen prop',
		);
		assert.ok(
			visitToolbarContent.includes('DSD Эстетика'),
			'VisitDiaryPhotoActionsToolbar must have DSD Эстетика button',
		);

		// VisitDiaryPhotoThumbnailGrid has DSD action button per photo
		assert.ok(
			visitGridContent.includes('onDsdPhotoOpen'),
			'VisitDiaryPhotoThumbnailGrid must have onDsdPhotoOpen prop',
		);
		assert.ok(
			visitGridContent.includes('btn-dsd-photo-'),
			'VisitDiaryPhotoThumbnailGrid must render testable DSD trigger per photo thumbnail',
		);
	});

	test('4. Memory Leak Protection (PHO-04) & URL.revokeObjectURL cleanup', () => {
		const studioModalContent = fs.readFileSync(path.join(dsdDir, 'DsdAestheticStudioModal.tsx'), 'utf-8');
		const photoModalContent = fs.readFileSync(path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx'), 'utf-8');

		assert.ok(
			studioModalContent.includes('URL.revokeObjectURL'),
			'DsdAestheticStudioModal must explicitly revoke Blob URLs to prevent memory leaks',
		);
		assert.ok(
			photoModalContent.includes('URL.revokeObjectURL'),
			'ClinicalPhotoProtocolModal must explicitly revoke Blob URLs to prevent memory leaks',
		);
	});

	test('5. Touch Target & Apple HIG Standards (>= 44x44px and Single Primary CTA)', () => {
		const sidebarContent = fs.readFileSync(path.join(dsdDir, 'DsdMetricsSidebar.tsx'), 'utf-8');
		const studioModalContent = fs.readFileSync(path.join(dsdDir, 'DsdAestheticStudioModal.tsx'), 'utf-8');

		// Touch targets >= 44px
		assert.ok(
			sidebarContent.includes('min-h-[44px]'),
			'Sidebar Primary CTA button must have min-h-[44px]',
		);
		assert.ok(
			sidebarContent.includes('bg-[var(--primary,#0d9488)]'),
			'Primary CTA must strictly use brand primary (#0d9488)',
		);

		// Apple HIG Drag Handle on Mobile
		assert.ok(
			studioModalContent.includes('sm:hidden') && studioModalContent.includes('rounded-full'),
			'Mobile view must include Apple HIG Drag Handle',
		);
	});
});
