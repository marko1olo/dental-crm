/**
 * apps/web/src/components/patients/__tests__/patientCardAutonomyAndValidationProof.test.tsx
 *
 * DENTE Dental CRM — Patient Card Autonomy, Validation & First Principles Test Proof.
 * Mandates:
 * - Mandate 8e (Doctor Autonomy): Save & CTA buttons are NEVER disabled.
 * - Mandate 8n (Solo Practice & 1-5 Chairs): Instant intake, 1-click healthy norm.
 * - Apple HIG (390x844): Touch minimum >= 44x44px, native Bottom Sheet rounded-t-[24px], 0px overflow-x.
 * - DEF-PAT-03: Zero Potemkin mock-IDs (pat-${lead.id}).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	validateExpressPatientRegistration,
	normalizePhoneNumber,
	formatKopecksToRub,
	DEMO_PATIENT_CATALOG,
} from "../patientCatalogData";
import { PatientCardModal } from "../PatientCardModal";

describe("Patient Card Autonomy & Validation Proof (Mandates 8e, 8n, Apple HIG)", () => {
	it("1. [Mandate 8e] Save button in PatientCardModal is NEVER disabled", () => {
		const html = renderToStaticMarkup(
			<PatientCardModal isOpen={true} onClose={() => {}} initialMode="create" />,
		);

		assert.ok(html.includes('data-testid="patient-studio-primary-cta"'));
		assert.equal(
			html.includes('disabled=""') || html.includes("disabled "),
			false,
			"Mandate 8e: Save buttons must NEVER be disabled!",
		);
	});

	it("2. [Mandate 8n] 10-second intake validates with only Full Name & Phone", () => {
		const valid = validateExpressPatientRegistration({
			fullName: "Алексей Смирнов",
			phone: "+7 999 000-11-22",
		});
		assert.equal(valid.isValid, true);
	});

	it("3. [Apple HIG] Bottom sheet container complies with mobile touch zones", () => {
		const html = renderToStaticMarkup(
			<PatientCardModal isOpen={true} onClose={() => {}} initialMode="create" />,
		);

		assert.ok(html.includes("min-h-[44px]"), "Interactive elements must respect Apple HIG >= 44x44px touch target");
		assert.ok(html.includes("overflow-x-clip"), "Must enforce 0px horizontal scroll drift");
	});

	it("4. [DEF-PAT-03] Patient catalog uses clean data without synthetic pat-${lead.id} mock IDs", () => {
		for (const patient of DEMO_PATIENT_CATALOG) {
			assert.equal(
				patient.id.includes("lead"),
				false,
				`Patient ID ${patient.id} must not be synthetic mock of lead id`,
			);
		}
	});

	it("5. [Mandate 8ap] Financial balances are formatted in rubles without float errors", () => {
		assert.equal(formatKopecksToRub(1540000), "15 400 ₽");
		assert.equal(formatKopecksToRub(0), "0 ₽");
	});
});
