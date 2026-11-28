import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CryptoProSigner } from "../CryptoProSigner";
import { VisitEmkCompletionSection } from "../emkTab/VisitEmkCompletionSection";
import { VisitEmkTab } from "../VisitEmkTab";

/**
 * Red Team Clinical Visit Diary & Doctor Autonomy Suite (Mandates 8e, 8am, 8b, 8x, 8ap)
 */
describe("Red Team Inquisition: Clinical Visit Diary & Doctor Autonomy (Mandates 8e, 8am, 8b)", () => {
	it("1. Footer has strictly ONE Primary CTA button (Primary) and secondary CryptoPro signer (Mandate 8am)", () => {
		const completionHtml = renderToStaticMarkup(
			React.createElement(VisitEmkCompletionSection, {
				isSignedVisit: false,
				isRevisingVisitNote: false,
				setIsRevisingVisitNote: () => {},
				handleSaveVisitNote: async () => {},
				handleCompleteVisitAndGenerateReceipt: async () => {},
				isCompletingVisit: false,
				completionResult: null,
				setIsSbpQrModalOpen: () => {},
				activeEmkTab: "all",
				setActiveEmkTab: () => {},
			}),
		);

		assert.ok(
			completionHtml.includes('data-testid="btn-complete-visit-emk"'),
			"Completion section must render btn-complete-visit-emk",
		);
		assert.ok(
			completionHtml.includes("primary-button") && completionHtml.includes("bg-[var(--primary)]"),
			"Primary CTA button must use primary-button and bg-[var(--primary)]",
		);
		assert.ok(
			completionHtml.includes("Завершить приём"),
			"Primary CTA label must contain 'Завершить приём'",
		);
		assert.ok(
			completionHtml.includes('data-testid="btn-save-visit-note"'),
			"Completion section must render btn-save-visit-note",
		);
		assert.ok(
			completionHtml.includes("secondary-button") && completionHtml.includes("border-[var(--line)]"),
			"Save draft button must be secondary with border",
		);
		assert.equal(
			/<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i.test(completionHtml),
			false,
			"Completion buttons must never be disabled by default",
		);

		const cryptoHtml = renderToStaticMarkup(
			React.createElement(CryptoProSigner, {
				visitId: "visit-1",
				patientId: "pt-1",
				patientName: "Тестов И.И.",
				diaryData: { complaint: "Нет", objective: "Норма", diagnosis: "Z01.2", treatmentPlan: "Осмотр" },
				isLocked: false,
				onSigned: () => {},
			}),
		);

		assert.ok(cryptoHtml.includes("Подписать ЭЦП"), "CryptoProSigner button must be titled 'Подписать ЭЦП'");
		assert.ok(cryptoHtml.includes("border-[var(--line)]"), "CryptoPro button must be neutral secondary");
		assert.ok(cryptoHtml.includes("bg-[var(--paper)]"), "CryptoPro button must use bg-[var(--paper)]");
		assert.equal(
			cryptoHtml.includes("bg-[var(--teal,var(--brand-primary))]"),
			false,
			"CryptoPro button must not steal Primary CTA background",
		);
	});

	it("2. VisitEmkTab renders canonical chairside EMR root with physiological norm trigger and zero legacy form numbers", () => {
		const html = renderToStaticMarkup(
			React.createElement(VisitEmkTab, {
				openVisitId: "visit-1",
				activePatient: { id: "pt-1", fullName: "Тестов И.И." },
				activeDoctor: { id: "doc-1", fullName: "Врач А.А.", specialty: "therapist" },
				visitNoteForm: {
					complaint: "",
					anamnesis: "",
					objectiveStatus: "",
					diagnosis: "",
					treatmentPlan: "",
					recommendations: "",
				},
				updateVisitNoteField: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="visit-emk-tab"'), "VisitEmkTab must render visit-emk-tab");
		assert.ok(
			html.includes('data-testid="btn-chairside-physiological-norm"'),
			"VisitEmkTab must render 1-click physiological norm button",
		);
		assert.equal(html.includes("vde-043"), false, "Must never leak legacy vde-043 id");
		assert.equal(html.includes("043/у"), false, "Must never leak raw 043/у code into visible UI");
	});
});
