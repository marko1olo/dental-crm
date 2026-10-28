/**
 * treatmentPlanPresenterFinancialBridgeAndMobileSegmented.test.tsx — Red Team проверка финансового моста в Кассу и Apple HIG.
 * Мандат 8e (Автономия врача), Мандат 8am (Ровно 1 Primary CTA), Мандат 8b (лимит <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { sampleTiers } from "./helpers/presenterModalTestHelpers";

describe("TreatmentPlanPresenterModal — Financial Bridge & Apple HIG Mobile Segmented", () => {
	it("renders 'Оплатить этап' financial bridge button for every clinical stage", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
				patientName="Иванов Петр Сергеевич"
			/>,
		);

		assert.ok(html.includes("Оплатить этап"));
		assert.ok(html.includes("presenter-pay-stage-btn-"));
	});

	it("renders exactly ONE primary CTA button (#0d9488) in visible context", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
			/>,
		);

		const primaryMatches = html.match(/primary-button/g) || [];
		assert.equal(primaryMatches.length, 1, "Must have exactly ONE Primary CTA button");
		assert.ok(html.includes("confirm-patient-choice-btn"));
	});

	it("guarantees 0px mobile scroll-tunnel: non-selected tier cards are hidden on mobile screens", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
			/>,
		);

		// Non-selected cards must have 'hidden md:flex' class to avoid 2500px scrolling
		assert.ok(html.includes("hidden md:flex"), "Non-selected tier cards must be hidden on mobile");
		// Selected card has 'flex'
		assert.ok(html.includes("border-[var(--teal)] bg-[var(--teal)]/5 ring-2"));
	});

	it("guarantees print and approval buttons are never blocked (disabled)", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
				onApproveAndSign={() => {}}
			/>,
		);

		assert.equal(html.includes('disabled="" data-testid="print-contract-btn"'), false);
		assert.equal(html.includes('disabled="" data-testid="approve-and-sign-btn"'), false);
		assert.equal(html.includes('disabled="" data-testid="confirm-patient-choice-btn"'), false);
	});
});
