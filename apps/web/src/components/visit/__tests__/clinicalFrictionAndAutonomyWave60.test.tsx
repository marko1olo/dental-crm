/**
 * clinicalFrictionAndAutonomyWave60.test.tsx
 *
 * Verification suite for WAVE 60 (FEATURE 249):
 * «клинический_прием_автономия::ликвидация_блокировок_сохранения_пациента_привязка_снимков_к_визиту_и_снижение_трения_анестезии»
 * Mandates: 8c (Universal 3-Tier), 8d (Burden of Proof & Sin Checklist), 8e (Doctor Autonomy),
 * 8k (CRM != Reality Simulator), 8n (Solo Doctor & Small Clinic Sovereignty).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	buildPatientAdministrativeProfilePayload,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileTimeWarning,
} from "../../../utils/clinicProfileUtils";
import { ChairsideAnesthesiaQuickBar } from "../../anesthesia/ChairsideAnesthesiaQuickBar";
import { calculateAnesthesiaSafety } from "../../anesthesia/anesthesiaEngine";
import { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../../lib/clinicalProtocols";

describe("Wave 60 / Feature 249: Clinical Autonomy & Friction Reduction", () => {

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

		it('patientAdministrativeProfileDraftIssue allows administrative save even when time window is partial', () => {
			const draftWithPartialTime = {
				...baseDraft,
				preferredAppointmentStart: '09:30',
				preferredAppointmentEnd: '',
			};
			assert.strictEqual(patientAdministrativeProfileDraftIssue(draftWithPartialTime), null);
			const payload = buildPatientAdministrativeProfilePayload(draftWithPartialTime);
			assert.strictEqual(payload.preferredAppointmentStart, null);
		});
	});

	describe('2. Chairside Anesthesia QuickBar SSR, Token Compliance & Safety Engine (Mandates 8e, 8k, 8n)', () => {
		it('renders ChairsideAnesthesiaQuickBar with norm preset, design tokens, >=44px controls & 0 emojis', () => {
			const html = renderToStaticMarkup(
				React.createElement(ChairsideAnesthesiaQuickBar, {
					patientId: 'pat-anest-1',
					visitId: 'visit-anest-1',
					patientWeightKg: 70,
				}),
			);
			assert.ok(STANDARD_ANESTHESIA_NORM_PRESET_RU.length > 0);
			assert.ok(html.includes('data-testid="anesthesia-dose-norm-preset"'));
			assert.strictEqual(html.includes('var(--border'), false);
			assert.ok(html.includes('min-h-[44px]') || html.includes('min-h-[48px]'));
			const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
			assert.strictEqual(emojiPattern.test(html), false);
		});

		it('calculateAnesthesiaSafety computes safe carpule ceiling without locking doctor CTA', () => {
			const safety = calculateAnesthesiaSafety({
				drugId: 'articaine_1_200k',
				carpulesCount: 2,
				patientWeightKg: 70,
				patientAgeYears: 32,
				hasCardiovascularRisk: false,
				hasBronchialAsthma: false,
				hasSulfiteAllergy: false,
				hasArticaineAllergy: false,
				hasMepivacaineAllergy: false,
				isPregnantOrLactating: false,
				takesBetaBlockers: false,
			});
			assert.ok(safety.maxSafeActiveMg > 0);
			assert.strictEqual(safety.isOverdose, false);
		});
	});
});
