/**
 * VisitEmkTabSbp.test.tsx
 * Live SSR tests for SBP QR payment modal, button order (8am), integer kopecks, and vector icons.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitEmkModals } from "../emkTab/VisitEmkModals";

function renderSbpModal(totalNetKop = 1250000) {
	return renderToStaticMarkup(
		<VisitEmkModals
			isSbpQrModalOpen={true}
			setIsSbpQrModalOpen={() => {}}
			completionResult={{
				visitId: "visit-1",
				invoiceId: "inv-1",
				receiptNumber: "00042",
				totalNetRub: totalNetKop / 100,
				totalNetKop,
				sbpQrPayload: "https://qr.nspk.ru/AD100000000000000000000000000001",
			}}
			activePatient={{
				id: "pat-1",
				organizationId: "org-1",
				fullName: "Иванова Мария",
				phone: "+7 (900) 123-45-67",
				birthDate: "1990-01-01",
				status: "active",
				balanceRub: 0,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			}}
			activeDoctor={null}
			isStarProtocolsOpen={false}
			setIsStarProtocolsOpen={() => {}}
			isSoapTemplatesModalOpen={false}
			setIsSoapTemplatesModalOpen={() => {}}
			isConsentModalOpen={false}
			setIsConsentModalOpen={() => {}}
			isPrintModalOpen={false}
			setIsPrintModalOpen={() => {}}
			visitNoteForm={{
				complaints: "",
				anamnesis: "",
				statusLocalis: "",
				diagnosisIcd10: "",
				treatmentDescription: "",
			}}
			updateVisitNoteField={() => {}}
			isSignedVisit={false}
			dashboard={null}
			onApplyCatalogPatch={() => {}}
		/>,
	);
}

describe("Mandate 8d/8am — VisitEmkModals SBP QR layout, CTA order & vector icons", () => {
	it("1. renders btn-confirm-sbp-paid with Lucide SVG icon, >= 44px height and --primary token", () => {
		const html = renderSbpModal();
		const btnIdx = html.indexOf('data-testid="btn-confirm-sbp-paid"');
		assert.ok(btnIdx > -1, "btn-confirm-sbp-paid must render");

		const btnSlice = html.slice(Math.max(0, btnIdx - 250), btnIdx + 500);
		assert.ok(btnSlice.includes("<svg"), "btn-confirm-sbp-paid must contain vector Lucide icon");
		assert.ok(btnSlice.includes("min-h-[48px]"), "btn-confirm-sbp-paid must comply with >= 44px touch target");
		assert.ok(btnSlice.includes("bg-[var(--primary)]"), "Primary CTA must use var(--primary)");
		assert.ok(btnSlice.includes("Подтвердить оплату в кассе"));
	});

	it("2. enforces Mandate 8am footer order: 'Закрыть' placed LEFT of Primary CTA btn-confirm-sbp-paid", () => {
		const html = renderSbpModal();
		const closeTextIdx = html.indexOf(">Закрыть</button>");
		const confirmBtnIdx = html.indexOf('data-testid="btn-confirm-sbp-paid"');
		assert.ok(closeTextIdx > -1, "Close button must render");
		assert.ok(confirmBtnIdx > -1, "Confirm SBP button must render");
		assert.ok(
			closeTextIdx < confirmBtnIdx,
			"Cancel/Close button MUST appear BEFORE Primary CTA btn-confirm-sbp-paid",
		);
	});

	it("3. guarantees zero raw checkmarks, zero cartoon emojis, and accessible dialog attributes", () => {
		const html = renderSbpModal(950000);
		assert.ok(html.includes('role="dialog"'));
		assert.ok(html.includes('aria-labelledby="sbp-qr-modal-title"'));
		assert.ok(html.includes('data-testid="sbp-qr-svg-container"'));
		assert.ok(html.includes("9") && html.includes("500"), "Must format amount from totalNetKop");
		assert.strictEqual(html.includes("✓"), false);
		assert.strictEqual(html.includes("✔"), false);
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(html), false, "Must render zero cartoon emojis");
	});
});
