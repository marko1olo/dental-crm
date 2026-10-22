/**
 * treatmentPlanPresenterButtonAutonomy.test.tsx — автономия врача и пациента (Мандат 8e, глубина модалок <= 1).
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import { sampleTeethPresentation } from "./helpers/presentationTestHelpers";

describe("Treatment Plan Presenter — Button Autonomy & Modal Depth <= 1 (Mandate 8e, 8d)", () => {
	const tiers = generate3TierPlanComparison(sampleTeethPresentation);

	it("renders presenter modal with zero disabled buttons on copilot presets and sign triggers", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={tiers}
				initialSelectedTierId="standard"
				patientName="Иванова Анна Сергеевна"
				patientId="PAT-2026-1044"
				doctorFullName="Д-р Воронов Михаил Васильевич"
				onApproveAndSign={() => {}}
			/>
		);

		assert.ok(html.includes("presenter-copilot-btn-budget_optimize"));
		assert.ok(!html.includes('disabled="" data-testid="presenter-copilot-btn-budget_optimize"'));
		assert.ok(html.includes("presenter-copilot-send-btn"));
		assert.ok(!html.includes('disabled="" data-testid="presenter-copilot-send-btn"'));
		assert.ok(html.includes("approve-and-sign-btn"));
		assert.ok(html.includes("Подписать план лечения"));
	});

	it("allows instant agreement confirmation in SignatureModal without forced checkbox blockage", () => {
		const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0];
		const html = renderToString(
			<TreatmentPlanSignatureModal
				isOpen={true}
				tier={standardTier}
				patientName="Иванова Анна Сергеевна"
				patientId="PAT-2026-1044"
				doctorFullName="Д-р Воронов Михаил Васильевич"
				clinicName="ООО ДЕНТЕ"
				onClose={() => {}}
				onSignedSuccess={() => {}}
			/>
		);

		assert.ok(html.includes("paper-signature-confirm-btn"));
		assert.ok(!html.includes('disabled="" data-testid="paper-signature-confirm-btn"'));
		assert.ok(html.includes("confirm-sign-plan-btn"));
		assert.ok(!html.includes('disabled="" data-testid="confirm-sign-plan-btn"'));
	});

	it("TreatmentPlanPresenterModal renders a single cohesive surface with zero nested modals", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={tiers}
			/>
		);

		const backdropMatches = (html.match(/treatment-presenter-backdrop/g) || []).length;
		assert.equal(backdropMatches, 1);
		const modalContainerMatches = (html.match(/role="dialog"/g) || []).length;
		assert.equal(modalContainerMatches, 1);
	});
});
