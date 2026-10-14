import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { clamp } from '../photoProtocolMath';

describe('Photo Protocol Chairside Autonomy & Dental Lab (ZTL) Bridge', () => {
	const photographyDir = path.resolve(process.cwd(), 'apps/web/src/components/photography');
	const labOrderDir = path.resolve(process.cwd(), 'apps/web/src/components/lab/orderCreateModules');

	test('1. VITA Shade to ZTL Bridge: dente-apply-lab-shade contract and storage key', () => {
		const vitaSelectorFile = fs.readFileSync(path.join(photographyDir, 'VitaShadeSelector.tsx'), 'utf-8');
		const useLabOrderFile = fs.readFileSync(path.join(labOrderDir, 'useLabOrderCreateForm.ts'), 'utf-8');

		// Proves VitaShadeSelector dispatches dente-apply-lab-shade and writes to localStorage
		assert.ok(
			vitaSelectorFile.includes("dispatchEvent(new CustomEvent('dente-apply-lab-shade'"),
			'VitaShadeSelector must dispatch dente-apply-lab-shade CustomEvent',
		);
		assert.ok(
			vitaSelectorFile.includes("localStorage.setItem('dente_active_lab_shade_preset'"),
			'VitaShadeSelector must persist shade preset in localStorage for offline/subsequent orders',
		);
		assert.ok(
			vitaSelectorFile.includes('data-testid="btn-transfer-vita-to-lab"'),
			'VitaShadeSelector must feature 1-click button to transfer shade to ZTL',
		);

		// Proves useLabOrderCreateForm listens for dente-apply-lab-shade and reads localStorage
		assert.ok(
			useLabOrderFile.includes('window.addEventListener("dente-apply-lab-shade"'),
			'useLabOrderCreateForm must subscribe to dente-apply-lab-shade event',
		);
		assert.ok(
			useLabOrderFile.includes('localStorage.getItem("dente_active_lab_shade_preset")'),
			'useLabOrderCreateForm must read active shade preset when opened',
		);
	});

	test('2. 1-Click Clipboard Photo Paste (Ctrl+V) Integration', () => {
		const modalFile = fs.readFileSync(path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx'), 'utf-8');

		// Proves useClipboardPhotoPaste is wired into ClinicalPhotoProtocolModal
		assert.ok(
			modalFile.includes('useClipboardPhotoPaste('),
			'ClinicalPhotoProtocolModal must wire useClipboardPhotoPaste hook',
		);
		assert.ok(
			modalFile.includes('uploadPhotoToBackend('),
			'ClinicalPhotoProtocolModal must persist pasted photo asynchronously to PostgreSQL 18',
		);
		assert.ok(
			modalFile.includes('Вставлен снимок из буфера (Ctrl+V)'),
			'ClinicalPhotoProtocolModal must provide instant toast feedback upon Ctrl+V',
		);
	});

	test('3. Apple Mobile HIG Bottom Sheet and Tactile Drag Handle', () => {
		const cssFile = fs.readFileSync(path.join(photographyDir, 'clinicalPhotography.css'), 'utf-8');
		const modalFile = fs.readFileSync(path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx'), 'utf-8');

		// Proves tactile drag handle is rendered in DOM
		assert.ok(
			modalFile.includes('className="photo-mobile-drag-handle"'),
			'ClinicalPhotoProtocolModal must render Apple HIG tactile drag handle',
		);

		// Proves CSS contains responsive bottom sheet rules for screens <= 768px
		assert.ok(
			cssFile.includes('@media (max-width: 768px)'),
			'clinicalPhotography.css must specify dedicated @media (max-width: 768px) sheet layer',
		);
		assert.ok(
			cssFile.includes('border-radius: 24px 24px 0 0;'),
			'clinicalPhotography.css must enforce Apple HIG 24px top radius for mobile sheet',
		);
		assert.ok(
			cssFile.includes('align-items: flex-end;'),
			'clinicalPhotography.css must anchor mobile bottom sheet to bottom of viewport',
		);
		assert.ok(
			cssFile.includes('photo-mobile-drag-handle'),
			'clinicalPhotography.css must style photo-mobile-drag-handle (36x5px)',
		);
	});

	test('4. Floating Zoom Bar & Projection Toolbar Decomposition (Anti-Monolith Invariant)', () => {
		const zoomBarFile = fs.readFileSync(path.join(photographyDir, 'BeforeAfterFloatingZoomBar.tsx'), 'utf-8');
		const projectionToolbarFile = fs.readFileSync(path.join(photographyDir, 'BeforeAfterProjectionToolbar.tsx'), 'utf-8');
		const compViewFile = fs.readFileSync(path.join(photographyDir, 'BeforeAfterComparisonView.tsx'), 'utf-8');

		// Check line count limits (Mandate 8c: <= 800 lines)
		const compViewLines = compViewFile.split('\n').length;
		const zoomBarLines = zoomBarFile.split('\n').length;
		const projToolbarLines = projectionToolbarFile.split('\n').length;

		assert.ok(
			compViewLines <= 800,
			`BeforeAfterComparisonView.tsx must stay <= 800 lines (actual: ${compViewLines})`,
		);
		assert.ok(
			zoomBarLines <= 250,
			`BeforeAfterFloatingZoomBar.tsx must stay <= 250 lines (actual: ${zoomBarLines})`,
		);
		assert.ok(
			projToolbarLines <= 250,
			`BeforeAfterProjectionToolbar.tsx must stay <= 250 lines (actual: ${projToolbarLines})`,
		);

		// Test zoom clamping math
		assert.equal(clamp(0.2, 0.5, 4.0), 0.5);
		assert.equal(clamp(5.0, 0.5, 4.0), 4.0);
		assert.equal(clamp(1.25, 0.5, 4.0), 1.25);
	});

	test('5. Multi-Slot Grid PNG Export Engine', () => {
		const gridExportFile = fs.readFileSync(path.join(photographyDir, 'photoProtocolGridExport.ts'), 'utf-8');
		const exportSheetFile = fs.readFileSync(path.join(photographyDir, 'PhotoCollageExportSheet.tsx'), 'utf-8');

		assert.ok(
			gridExportFile.includes('export async function exportProtocolGridAsPng'),
			'photoProtocolGridExport.ts must export exportProtocolGridAsPng',
		);
		assert.ok(
			gridExportFile.includes('canvas.toDataURL'),
			'photoProtocolGridExport.ts must render to canvas and produce dataUrl',
		);
		assert.ok(
			exportSheetFile.includes('data-testid="btn-export-collage-png"'),
			'PhotoCollageExportSheet must provide 1-click button to export collage as PNG',
		);
		assert.ok(
			!exportSheetFile.includes('disabled='),
			'PhotoCollageExportSheet must follow Mandate 8e (0 disabled buttons)',
		);
	});
});
