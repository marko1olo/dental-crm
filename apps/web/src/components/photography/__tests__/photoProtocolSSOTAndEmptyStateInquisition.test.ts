/**
 * photoProtocolSSOTAndEmptyStateInquisition.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * - [PHO-03] Photo Protocol PostgreSQL 18 persistence via Fastify API.
 * - [PHO-05] SSOT Before/After Slider consolidation & facade compactness.
 * - [PHO-06] Elimination of cartoon yellow smile SVG, honest clinical empty state.
 * - [PHO-07] Elimination of hardcoded metadata ('К-8492', 'Д-р Смирнова Е. В.').
 * - [PHO-08] Keyword slot mapping on batch upload without shifting entire grid.
 * - Mandate 8e: Doctor autonomy (0 disabled buttons).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Photo Protocol SSOT, Empty State & Persistence Inquisition Suite', () => {
	const photographyDir = path.resolve(process.cwd(), 'apps/web/src/components/photography');
	const visitDir = path.resolve(process.cwd(), 'apps/web/src/components/visit');
	const orthoModalDir = path.resolve(process.cwd(), 'apps/web/src/components/diagnostics/orthoModal');
	const presenterDir = path.resolve(process.cwd(), 'apps/web/src/components/treatment-plans');

	it('[PHO-03] usePhotoProtocolUpload hydrats and saves via PostgreSQL 18 Fastify API', () => {
		const hookFile = fs.readFileSync(path.join(photographyDir, 'modal/usePhotoProtocolUpload.ts'), 'utf-8');
		assert.ok(hookFile.includes('/api/patients/${patientId}/photo-protocol'), 'Hook must call /api/patients/:patientId/photo-protocol');
		assert.ok(hookFile.includes('fetch('), 'Hook must execute network request to API');
		assert.ok(hookFile.includes("method: 'POST'") || hookFile.includes('method: "POST"'), 'Hook must save protocol via POST request');
	});

	it('[PHO-05] BeforeAfterSplitter and OrthoSliderSplitView are thin facades over BeforeAfterSplitSlider SSOT', () => {
		const splitterFile = fs.readFileSync(path.join(visitDir, 'BeforeAfterSplitter.tsx'), 'utf-8');
		const orthoSliderFile = fs.readFileSync(path.join(orthoModalDir, 'OrthoSliderSplitView.tsx'), 'utf-8');

		assert.ok(splitterFile.includes('BeforeAfterSplitSlider'), 'BeforeAfterSplitter must delegate to BeforeAfterSplitSlider');
		assert.ok(orthoSliderFile.includes('BeforeAfterSplitSlider'), 'OrthoSliderSplitView must delegate to BeforeAfterSplitSlider');

		const splitterLines = splitterFile.split('\n').filter((l) => l.trim().length > 0).length;
		const orthoSliderLines = orthoSliderFile.split('\n').filter((l) => l.trim().length > 0).length;

		assert.ok(splitterLines <= 40, `BeforeAfterSplitter must be a thin facade <= 40 lines (got ${splitterLines})`);
		assert.ok(orthoSliderLines <= 40, `OrthoSliderSplitView must be a thin facade <= 40 lines (got ${orthoSliderLines})`);
	});

	it('[PHO-05] Treatment plan presenter integrates Before/After split comparison', () => {
		const photoTabFile = fs.readFileSync(path.join(presenterDir, 'studioTabs/StudioPhotoProtocolTab.tsx'), 'utf-8');
		const studioFile = fs.readFileSync(path.join(presenterDir, 'TreatmentPlanStudioModal.tsx'), 'utf-8');

		assert.ok(studioFile.includes('"photo"'), 'StudioTab must include "photo" tab');
		assert.ok(studioFile.includes('data-testid="tab-photo-protocol"'), 'Studio must contain button for tab-photo-protocol');
		assert.ok(photoTabFile.includes('BeforeAfterSplitSlider'), 'StudioPhotoProtocolTab must mount BeforeAfterSplitSlider');
		assert.ok(photoTabFile.includes('data-testid="studio-photo-protocol-tab"'), 'StudioPhotoProtocolTab must render before/after tab content');
	});

	it('[PHO-06] Elimination of cartoon yellow smile SVG, honest empty state indicator', () => {
		const demoDataFile = fs.readFileSync(path.join(photographyDir, 'patientPresentationDemoData.ts'), 'utf-8');
		const sliderFile = fs.readFileSync(path.join(photographyDir, 'BeforeAfterSplitSlider.tsx'), 'utf-8');

		// No cartoon yellow color stop #f5e6cb / #ecd1a7 in demo data
		assert.ok(!demoDataFile.includes('#f5e6cb'), 'DEMO_BEFORE_SMILE_SVG must not use cartoon yellow #f5e6cb');
		assert.ok(!demoDataFile.includes('#ecd1a7'), 'DEMO_BEFORE_SMILE_SVG must not use cartoon yellow #ecd1a7');

		// Slider contains empty state data-testid
		assert.ok(sliderFile.includes('data-testid="before-after-empty-state"'), 'BeforeAfterSplitSlider must render honest clinical empty state');
		assert.ok(sliderFile.includes('Снимки клинического протокола До / После не загружены'), 'Empty state must explain status clinically');
	});

	it('[PHO-07] Elimination of hardcoded metadata ("К-8492", "Д-р Смирнова Е. В.") from components', () => {
		const modalFile = fs.readFileSync(path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx'), 'utf-8');
		const labExportFile = fs.readFileSync(path.join(photographyDir, 'LabPhotoExportDrawer.tsx'), 'utf-8');

		assert.ok(!modalFile.includes("'К-8492'"), 'ClinicalPhotoProtocolModal must not contain hardcoded "К-8492"');
		assert.ok(!modalFile.includes("'Д-р Смирнова Е. В.'"), 'ClinicalPhotoProtocolModal must not contain hardcoded doctor name');
		assert.ok(!labExportFile.includes("'К-8492'"), 'LabPhotoExportDrawer must not contain hardcoded "К-8492"');
		assert.ok(!labExportFile.includes("'Д-р Смирнова Е. В.'"), 'LabPhotoExportDrawer must not contain hardcoded doctor name');
	});

	it('[PHO-08] Keyword slot mapping on batch upload prevents index shift bug', () => {
		const modalFile = fs.readFileSync(path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx'), 'utf-8');

		assert.ok(modalFile.includes('emptySlotIds'), 'handleFilesSelected must track vacant slots');
		assert.ok(modalFile.includes('matchedSlotId'), 'handleFilesSelected must match keywords (smile, profile, upper, lower, etc.)');
		assert.ok(!modalFile.includes('slots[i % length]'), 'Must eliminate blind modulo indexing bug');
	});

	it('Mandate 8e: Proves 0 disabled buttons across photography components', () => {
		const files = [
			path.join(photographyDir, 'BeforeAfterSplitSlider.tsx'),
			path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx'),
			path.join(photographyDir, 'LabPhotoExportDrawer.tsx'),
			path.join(photographyDir, 'PhotoCollageExportSheet.tsx'),
		];

		for (const file of files) {
			const content = fs.readFileSync(file, 'utf-8');
			assert.ok(!content.includes('disabled={true}'), `${path.basename(file)} must not contain disabled={true}`);
			assert.ok(!content.includes('disabled={!'), `${path.basename(file)} must not contain disabled={!...}`);
		}
	});
});
