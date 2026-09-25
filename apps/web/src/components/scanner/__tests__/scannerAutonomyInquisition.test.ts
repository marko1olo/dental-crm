import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Red Team Inquisitor: Clinical Imaging, Scanner & Visiograph Autonomy', () => {
	const scannerDir = path.resolve(process.cwd(), 'apps/web/src/components/scanner');
	const visiographDir = path.resolve(process.cwd(), 'apps/web/src/components/visiograph');
	const photographyDir = path.resolve(process.cwd(), 'apps/web/src/components/photography');

	const targetDirs = [scannerDir, visiographDir, photographyDir];

	function getAllSourceFiles(dir: string): string[] {
		const result: string[] = [];
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
					result.push(...getAllSourceFiles(fullPath));
				}
			} else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css'))) {
				result.push(fullPath);
			}
		}
		return result;
	}

	it('1. Doctor Autonomy (Mandate 8e): ZERO disabled button attributes across all clinical imaging modules', () => {
		const allFiles = targetDirs.flatMap(getAllSourceFiles);
		const violations: { file: string; line: number; text: string }[] = [];

		for (const file of allFiles) {
			if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
			const content = fs.readFileSync(file, 'utf8');
			const lines = content.split('\n');

			lines.forEach((line, idx) => {
				const trimmed = line.trim();
				// Check for disabled attribute on JSX elements (e.g. disabled={...}, disabled, disabled="true")
				// Ignore comments, aria-disabled, CSS classes (disabled:), or object properties (disabled?: boolean)
				if (
					/\bdisabled\b/.test(trimmed) &&
					!trimmed.startsWith('//') &&
					!trimmed.startsWith('/*') &&
					!trimmed.startsWith('*') &&
					!trimmed.includes('aria-disabled') &&
					!trimmed.includes('disabled:') &&
					!trimmed.includes('disabled?:') &&
					!trimmed.includes('disabled: boolean') &&
					!trimmed.includes('type') &&
					!trimmed.includes('interface') &&
					!trimmed.includes('// disabled') &&
					(trimmed.includes('<button') || trimmed.includes('<option') || /<[A-Za-z]+.*disabled/.test(trimmed) || /disabled=\{/.test(trimmed))
				) {
					violations.push({
						file: path.relative(process.cwd(), file),
						line: idx + 1,
						text: trimmed,
					});
				}
			});
		}

		assert.deepStrictEqual(
			violations,
			[],
			`Found ${violations.length} prohibited disabled elements violating Doctor Autonomy (Mandate 8e):\n` +
				violations.map((v) => `  ${v.file}:${v.line} -> ${v.text}`).join('\n')
		);
	});

	it('2. Real Hardware Camera Lifecycle & Multi-Device Support in DocumentCameraScannerModal', () => {
		const scannerModalPath = path.join(scannerDir, 'DocumentCameraScannerModal.tsx');
		assert.ok(fs.existsSync(scannerModalPath), 'DocumentCameraScannerModal.tsx must exist');

		const content = fs.readFileSync(scannerModalPath, 'utf8');

		// Device Enumeration & Selection
		assert.ok(
			content.includes('navigator.mediaDevices.enumerateDevices') || content.includes('enumerateDevices'),
			'DocumentCameraScannerModal must support device enumeration for USB document cameras'
		);
		assert.ok(
			content.includes('availableCameras') && content.includes('selectedCameraId'),
			'DocumentCameraScannerModal must maintain availableCameras and selectedCameraId state'
		);

		// Clean Track Teardown to prevent camera hardware locks and memory leaks
		assert.ok(
			content.includes('track.stop()'),
			'DocumentCameraScannerModal must release camera hardware stream via track.stop()'
		);

		// Offline / Hardware Failure Fallback
		assert.ok(
			content.includes('handleFallbackFileChange') || content.includes('type="file"'),
			'DocumentCameraScannerModal must provide a 1-click fallback file upload when no webcam is present'
		);
	});

	it('3. CRM != Simulator (Mandate 8i): Exterminate fake scan progress bars and simulated delays', () => {
		const allFiles = targetDirs.flatMap(getAllSourceFiles);
		const violations: { file: string; line: number; text: string }[] = [];

		for (const file of allFiles) {
			const content = fs.readFileSync(file, 'utf8');
			const lines = content.split('\n');

			lines.forEach((line, idx) => {
				const trimmed = line.trim();
				// Look for fake scanning simulations (e.g. simulatedScanProgress, fake scanning setTimeout loops)
				if (
					(trimmed.includes('simulatedScan') ||
						trimmed.includes('fakeScan') ||
						trimmed.includes('mockScan') ||
						trimmed.includes('mockSensorData') ||
						(trimmed.includes('setTimeout') && (trimmed.includes('scan') || trimmed.includes('progress')))) &&
					!trimmed.includes('//')
				) {
					violations.push({
						file: path.relative(process.cwd(), file),
						line: idx + 1,
						text: trimmed,
					});
				}
			});
		}

		assert.deepStrictEqual(
			violations,
			[],
			`Found fake scanning mocks or simulator delays violating CRM != Simulator (Mandate 8i):\n` +
				violations.map((v) => `  ${v.file}:${v.line} -> ${v.text}`).join('\n')
		);
	});

	it('4. Anti-Matryoshka Law (Mandate 8d pt 6): Modal depth <= 1 (No nested position: fixed overlays)', () => {
		// Verify clinicalPhotography.css .photo-editor-overlay uses position: absolute
		const photoCssPath = path.join(photographyDir, 'clinicalPhotography.css');
		assert.ok(fs.existsSync(photoCssPath), 'clinicalPhotography.css must exist');
		const photoCss = fs.readFileSync(photoCssPath, 'utf8');

		assert.ok(
			photoCss.includes('.photo-editor-overlay') && photoCss.includes('position: absolute;'),
			'.photo-editor-overlay must use position: absolute within parent modal to respect Anti-Matryoshka Law'
		);

		// Verify BeforeAfterComparisonView export overlay uses position: absolute
		const comparisonViewPath = path.join(photographyDir, 'BeforeAfterComparisonView.tsx');
		assert.ok(fs.existsSync(comparisonViewPath), 'BeforeAfterComparisonView.tsx must exist');
		const compView = fs.readFileSync(comparisonViewPath, 'utf8');

		assert.ok(
			compView.includes("position: 'absolute'") && compView.includes('zIndex: 50'),
			'BeforeAfterComparisonView export preview must use position: absolute; zIndex: 50 instead of nested fixed overlay'
		);
	});

	it('5. Zero Cartoon Emojis (Mandate 8d pt 7): 0 unicode emojis across all clinical imaging files', () => {
		const allFiles = targetDirs.flatMap(getAllSourceFiles);
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/u;
		const violations: { file: string; line: number; match: string }[] = [];

		for (const file of allFiles) {
			const content = fs.readFileSync(file, 'utf8');
			const lines = content.split('\n');

			lines.forEach((line, idx) => {
				const match = line.match(emojiRegex);
				if (match) {
					violations.push({
						file: path.relative(process.cwd(), file),
						line: idx + 1,
						match: match[0],
					});
				}
			});
		}

		assert.deepStrictEqual(
			violations,
			[],
			`Found cartoon emojis violating Mandate 8d pt 7:\n` +
				violations.map((v) => `  ${v.file}:${v.line} -> ${v.match}`).join('\n')
		);
	});

	it('6. Design System Tokens: CSS and component styles use standard CSS variables', () => {
		const photoCssPath = path.join(photographyDir, 'clinicalPhotography.css');
		const photoCss = fs.readFileSync(photoCssPath, 'utf8');

		assert.ok(photoCss.includes('var(--paper)'), 'clinicalPhotography.css must reference var(--paper)');
		assert.ok(photoCss.includes('var(--ink)'), 'clinicalPhotography.css must reference var(--ink)');
		assert.ok(photoCss.includes('var(--teal'), 'clinicalPhotography.css must reference var(--teal)');
	});
});
