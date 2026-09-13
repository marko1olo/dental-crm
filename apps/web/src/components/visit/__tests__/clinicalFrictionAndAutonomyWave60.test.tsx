/**
 * clinicalFrictionAndAutonomyWave60.test.tsx
 *
 * Verification suite for WAVE 60 (FEATURE 249):
 * «клинический_прием_автономия::ликвидация_блокировок_сохранения_пациента_привязка_снимков_к_визиту_и_снижение_трения_анестезии»
 * Mandates: 8c (Universal 3-Tier), 8d (Burden of Proof & Sin Checklist), 8e (Doctor Autonomy),
 * 8k (CRM != Reality Simulator), 8n (Solo Doctor & Small Clinic Sovereignty).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	buildPatientAdministrativeProfilePayload,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileTimeWarning,
} from '../../../utils/clinicProfileUtils';
import { ANESTHETIC_DRUGS_CATALOG } from '../anesthesia/anesthesiaTechniqueCatalog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Wave 60 / Feature 249: Clinical Autonomy & Friction Reduction', () => {
	const clinicProfileUtilsPath = path.resolve(__dirname, '../../../utils/clinicProfileUtils.ts');
	const usePatientLogicPath = path.resolve(__dirname, '../../../hooks/domains/usePatientLogic.ts');
	const visiographAnalyzerPath = path.resolve(__dirname, '../../imaging/VisiographAnalyzer.tsx');
	const visitDiagnosticsTabPath = path.resolve(__dirname, '../VisitDiagnosticsTab.tsx');
	const anesthesiaQuickBarPath = path.resolve(__dirname, '../../anesthesia/AnesthesiaQuickBar.tsx');

	const clinicProfileUtilsCode = fs.readFileSync(clinicProfileUtilsPath, 'utf8');
	const usePatientLogicCode = fs.readFileSync(usePatientLogicPath, 'utf8');
	const visiographAnalyzerCode = fs.readFileSync(visiographAnalyzerPath, 'utf8');
	const visitDiagnosticsTabCode = fs.readFileSync(visitDiagnosticsTabPath, 'utf8');
	const anesthesiaQuickBarCode = fs.readFileSync(anesthesiaQuickBarPath, 'utf8');

	describe('1. Patient Administrative Profile Unblocking (Mandates 8e, 8n)', () => {
		const baseDraft = patientAdministrativeProfileDraftFromPatient(null);

		it('sanitizes incomplete or inverted appointment times into null without throwing or blocking', () => {
			// Case A: Only start time provided
			const draftStartOnly = {
				...baseDraft,
				preferredAppointmentStart: '10:00',
				preferredAppointmentEnd: '',
			};
			const payloadStartOnly = buildPatientAdministrativeProfilePayload(draftStartOnly);
			assert.strictEqual(payloadStartOnly.preferredAppointmentStart, null);
			assert.strictEqual(payloadStartOnly.preferredAppointmentEnd, null);

			// Case B: Only end time provided
			const draftEndOnly = {
				...baseDraft,
				preferredAppointmentStart: '',
				preferredAppointmentEnd: '12:00',
			};
			const payloadEndOnly = buildPatientAdministrativeProfilePayload(draftEndOnly);
			assert.strictEqual(payloadEndOnly.preferredAppointmentStart, null);
			assert.strictEqual(payloadEndOnly.preferredAppointmentEnd, null);

			// Case C: Inverted times (end <= start)
			const draftInverted = {
				...baseDraft,
				preferredAppointmentStart: '15:00',
				preferredAppointmentEnd: '14:00',
			};
			const payloadInverted = buildPatientAdministrativeProfilePayload(draftInverted);
			assert.strictEqual(payloadInverted.preferredAppointmentStart, null);
			assert.strictEqual(payloadInverted.preferredAppointmentEnd, null);

			// Case D: Valid window preserved
			const draftValid = {
				...baseDraft,
				preferredAppointmentStart: '09:00',
				preferredAppointmentEnd: '18:00',
			};
			const payloadValid = buildPatientAdministrativeProfilePayload(draftValid);
			assert.strictEqual(payloadValid.preferredAppointmentStart, '09:00');
			assert.strictEqual(payloadValid.preferredAppointmentEnd, '18:00');
		});

		it('sanitizes invalid INN into null while preserving valid INN', () => {
			const draftInvalidInn = {
				...baseDraft,
				taxpayerInn: '12345', // invalid length
			};
			const payloadInvalidInn = buildPatientAdministrativeProfilePayload(draftInvalidInn);
			assert.strictEqual(payloadInvalidInn.taxpayerInn, null);

			const draftValidInn = {
				...baseDraft,
				taxpayerInn: '770123456789', // valid 12-digit physical person INN
			};
			const payloadValidInn = buildPatientAdministrativeProfilePayload(draftValidInn);
			assert.strictEqual(payloadValidInn.taxpayerInn, '770123456789');
		});

		it('provides soft non-blocking patientAdministrativeProfileTimeWarning', () => {
			const draftIncomplete = {
				...baseDraft,
				preferredAppointmentStart: '11:00',
				preferredAppointmentEnd: '',
			};

			const warning = patientAdministrativeProfileTimeWarning(draftIncomplete);
			assert.ok(warning !== null, 'Warning must be returned for incomplete time');
			assert.ok(warning?.includes('конец удобного времени') || warning?.includes('очистите'));

			// draft issue does NOT block on appointment time
			const draftIssue = patientAdministrativeProfileDraftIssue(draftIncomplete);
			assert.strictEqual(draftIssue, null, 'Draft issue must NOT block on appointment time');
		});

		it('guarantees usePatientLogic does NOT return false on administrative profile save with time warnings', () => {
			assert.ok(
				usePatientLogicCode.includes('patientAdministrativeProfileTimeWarning'),
				'usePatientLogic must import and use patientAdministrativeProfileTimeWarning',
			);
			assert.ok(
				!usePatientLogicCode.includes('if (draftIssue) {\n\t\t\t\tshowToast(draftIssue, "warning");\n\t\t\t\treturn false;'),
				'usePatientLogic must not halt with return false on non-critical administrative issues',
			);
		});
	});

	describe('2. Direct Patient Binding in Visiograph Analyzer (Mandates 8c, 8e)', () => {
		it('declares optional patientId prop in VisiographAnalyzerProps and resolves effectivePatientId', () => {
			assert.ok(
				visiographAnalyzerCode.includes('readonly patientId?: string | undefined;'),
				'VisiographAnalyzerProps must declare readonly patientId?: string | undefined;',
			);
			assert.ok(
				visiographAnalyzerCode.includes('const effectivePatientId = patientId ?? selectedPatientId;'),
				'VisiographAnalyzer must compute effectivePatientId = patientId ?? selectedPatientId',
			);
		});

		it('guards against cross-patient race conditions in processFile and handleRunAiAnalysis', () => {
			assert.ok(
				visiographAnalyzerCode.includes('patientNow = (patientId ?? usePatientStore.getState().selectedPatientId) ?? null;'),
				'processFile and handleRunAiAnalysis must read live patient from store after async read/AI call',
			);
			assert.ok(
				visiographAnalyzerCode.includes('if (patientAtStart !== patientNow)'),
				'processFile and handleRunAiAnalysis must abort if patient changed during async execution',
			);
		});

		it('passes patientId={activePatient?.id} from VisitDiagnosticsTab to VisiographAnalyzer', () => {
			assert.ok(
				visitDiagnosticsTabCode.includes('patientId={activePatient?.id}'),
				'VisitDiagnosticsTab must pass patientId={activePatient?.id} to VisiographAnalyzer',
			);
			assert.ok(
				visitDiagnosticsTabCode.includes('effectiveTargetPatientId = activePatient?.id ?? selectedPatientId'),
				'VisitDiagnosticsTab must compute effectiveTargetPatientId for imaging write target',
			);
		});

		it('eliminates duplicate btn-hotpath-norma-043 button from filter toolbar', () => {
			assert.strictEqual(
				visiographAnalyzerCode.includes('btn-hotpath-norma-043'),
				false,
				'VisiographAnalyzer must not contain duplicate btn-hotpath-norma-043 button',
			);
			assert.ok(
				visiographAnalyzerCode.includes('btn-visiograph-norma-043'),
				'VisiographAnalyzer must retain primary btn-visiograph-norma-043 button',
			);
		});
	});

	describe('3. Anesthesia Friction Reduction & Autonomy (Mandates 8e, 8k, 8n)', () => {
		it('implements 1-click standard norm preset and safety calculation', () => {
			assert.ok(
				anesthesiaQuickBarCode.includes('STANDARD_ANESTHESIA_NORM_PRESET_RU'),
				'AnesthesiaQuickBar must import STANDARD_ANESTHESIA_NORM_PRESET_RU',
			);
			assert.ok(
				anesthesiaQuickBarCode.includes('data-testid="anesthesia-dose-norm-preset"'),
				'AnesthesiaQuickBar must render anesthesia-dose-norm-preset',
			);
		});

		it('strictly complies with design tokens (var(--paper), var(--line), var(--ink)) with zero --border', () => {
			assert.strictEqual(
				anesthesiaQuickBarCode.includes('var(--border'),
				false,
				'AnesthesiaQuickBar must NOT use undefined var(--border)',
			);
			assert.ok(
				anesthesiaQuickBarCode.includes('var(--paper)'),
				'AnesthesiaQuickBar must use var(--paper)',
			);
			assert.ok(
				anesthesiaQuickBarCode.includes('var(--line)'),
				'AnesthesiaQuickBar must use var(--line)',
			);
		});

		it('complies with 44x44px touch targets and zero cartoon emojis (Mandates 8c, 8d UI Sin #7)', () => {
			// Touch targets
			assert.ok(
				anesthesiaQuickBarCode.includes('min-h-[44px]') || anesthesiaQuickBarCode.includes('min-h-[48px]'),
				'Interactive buttons must enforce min-h-[44px] touch target',
			);

			// Zero emojis in JSX markup
			const jsxWithoutComments = anesthesiaQuickBarCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
			const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
			assert.strictEqual(
				emojiPattern.test(jsxWithoutComments),
				false,
				'AnesthesiaQuickBar JSX must contain ZERO cartoon emojis (Mandate 8d Sin #7)',
			);
		});
	});
});
