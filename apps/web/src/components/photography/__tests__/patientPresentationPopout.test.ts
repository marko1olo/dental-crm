/**
 * DENTE Dental CRM — Unit & Regression Tests: Patient Presentation Pop-out Screen,
 * Real-time BroadcastChannel Synchronization & Memory Overflow Protection
 *
 * Mandate Compliance:
 * - Mandate 8e: Doctor Autonomy (0 disabled buttons, non-blocking flow)
 * - Mandate 8d pt 7: Zero cartoon emojis
 * - Mandate 8k: Rapid Before/After Comparison & Clinical Presentation
 * - Anti-monolith <= 800 lines per file
 * - Strict Clinical Isolation: 0 prices, 0 notes, 0 CRM nav on patient screen
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const photographyDir = path.resolve(__dirname, '..');

import {
	DENTE_PRESENTATION_SYNC_CHANNEL,
	DENTE_PRESENTATION_STORAGE_KEY,
	isPatientPresentationRoute,
} from '../presentationSyncProtocol';
import { compressChairsidePhotoToBlobUrl } from '../chairsidePhotoCompressor';

describe('Patient Presentation Pop-out & Memory Overflow Protection Suite', () => {
	const presentationViewPath = path.join(photographyDir, 'PatientPresentationStandaloneView.tsx');
	const demoDataPath = path.join(photographyDir, 'patientPresentationDemoData.ts');
	const syncProtocolPath = path.join(photographyDir, 'presentationSyncProtocol.ts');
	const syncHookPath = path.join(photographyDir, 'usePresentationSync.ts');
	const modalPath = path.join(photographyDir, 'ClinicalPhotoProtocolModal.tsx');
	const blendViewPath = path.join(photographyDir, 'BeforeAfterBlendView.tsx');
	const comparisonViewPath = path.join(photographyDir, 'BeforeAfterComparisonView.tsx');
	const compressorPath = path.join(photographyDir, 'chairsidePhotoCompressor.ts');

	it('1. Anti-monolith Law: all required files exist and are <= 800 lines', () => {
		const files = [
			presentationViewPath,
			demoDataPath,
			syncProtocolPath,
			syncHookPath,
			modalPath,
			blendViewPath,
			comparisonViewPath,
			compressorPath,
		];

		for (const file of files) {
			assert.ok(fs.existsSync(file), `File must exist: ${file}`);
			const content = fs.readFileSync(file, 'utf8');
			const lineCount = content.split('\n').length;
			assert.ok(
				lineCount <= 800,
				`File ${path.basename(file)} must not exceed 800 lines (currently ${lineCount})`,
			);
		}
	});

	it('2. Doctor Autonomy (Mandate 8e): proves 0 disabled buttons across all presentation components', () => {
		const files = [
			presentationViewPath,
			blendViewPath,
			comparisonViewPath,
			modalPath,
		];

		for (const file of files) {
			const content = fs.readFileSync(file, 'utf8');
			const buttonMatches = content.match(/<button[^>]*\bdisabled\b/gi);
			assert.equal(
				buttonMatches,
				null,
				`File ${path.basename(file)} must have 0 disabled buttons, but found: ${buttonMatches?.join(', ')}`,
			);

			const disabledPropMatches = content.match(/\bdisabled\s*=\s*\{[^}]+\}/gi);
			assert.equal(
				disabledPropMatches,
				null,
				`File ${path.basename(file)} must have 0 disabled={...} props, but found: ${disabledPropMatches?.join(', ')}`,
			);
		}
	});

	it('3. Zero Cartoon Emojis (Mandate 8d pt 7): proves 0 cartoon emojis in components and protocols', () => {
		const files = [
			presentationViewPath,
			demoDataPath,
			syncProtocolPath,
			syncHookPath,
			blendViewPath,
			comparisonViewPath,
			modalPath,
			compressorPath,
		];

		const emojiRegex =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

		for (const file of files) {
			const content = fs.readFileSync(file, 'utf8');
			const hasEmoji = emojiRegex.test(content);
			assert.equal(
				hasEmoji,
				false,
				`File ${path.basename(file)} must not contain cartoon emojis`,
			);
		}
	});

	it('4. Strict Clinical Isolation: proves 0 prices, 0 financial terms, 0 clinical notes on patient screen', () => {
		const content = fs.readFileSync(presentationViewPath, 'utf8');

		// 0 currency symbols and price figures
		assert.equal(content.includes('₽'), false, 'Patient screen must not contain rubles symbol');
		assert.equal(content.includes('€'), false, 'Patient screen must not contain euro symbol');
		assert.equal(/\$\s*\d+/.test(content), false, 'Patient screen must not contain dollar price figures');

		// 0 financial terms
		assert.equal(/прейскурант/i.test(content), false, 'Must not contain price list');
		assert.equal(/задолженность/i.test(content), false, 'Must not contain debt info');
		assert.equal(/себестоимость/i.test(content), false, 'Must not contain cost price');
		assert.equal(/касса/i.test(content), false, 'Must not contain cash register');
		assert.equal(/оплата/i.test(content), false, 'Must not contain payment terms');

		// 0 internal CRM navigation or notes
		assert.equal(/анамнез/i.test(content), false, 'Must not contain anamnesis');
		assert.equal(/диагноз/i.test(content), false, 'Must not contain diagnosis notes');
	});

	it('5. Popout Launcher Buttons: proves presence of data-testid="btn-patient-presentation-popout" in all relevant views', () => {
		const views = [modalPath, blendViewPath, comparisonViewPath];

		for (const view of views) {
			const content = fs.readFileSync(view, 'utf8');
			assert.ok(
				content.includes('data-testid="btn-patient-presentation-popout"'),
				`File ${path.basename(view)} must contain data-testid="btn-patient-presentation-popout"`,
			);
		}
	});

	it('6. BroadcastChannel Sync Protocol Constants & Storage Keys', () => {
		assert.equal(DENTE_PRESENTATION_SYNC_CHANNEL, 'dente_presentation_sync');
		assert.equal(DENTE_PRESENTATION_STORAGE_KEY, 'dente_presentation_cached_state');
	});

	it('7. Memory Overflow Invariants: verifies blob URL creation and memory cleanup in compressor and modal', () => {
		const compressorContent = fs.readFileSync(compressorPath, 'utf8');
		const modalContent = fs.readFileSync(modalPath, 'utf8');

		// Compressor frees GPU canvas buffer & image src
		assert.ok(compressorContent.includes("img.src = ''"), 'Compressor must clear img.src');
		assert.ok(compressorContent.includes('canvas.width = 0'), 'Compressor must reset canvas width to 0');
		assert.ok(compressorContent.includes('compressChairsidePhotoToBlobUrl'), 'Compressor must export compressChairsidePhotoToBlobUrl');

		// Modal uses Blob URLs and revokes them
		assert.ok(modalContent.includes('URL.revokeObjectURL'), 'Modal must revoke object URLs to prevent leaks');
		assert.ok(modalContent.includes('createdBlobUrlsRef'), 'Modal must track blob URLs in createdBlobUrlsRef');
		assert.ok(modalContent.includes('compressChairsidePhotoToBlobUrl'), 'Modal must use stream compression');
	});
});
