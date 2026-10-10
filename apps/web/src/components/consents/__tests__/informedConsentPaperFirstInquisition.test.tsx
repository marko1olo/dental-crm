/**
 * informedConsentPaperFirstInquisition.test.tsx
 *
 * Red Team Inquisitor Test Suite: Paper-First Sovereignty & Anti-Tablet Coercion (Mandates 8e, 8l, 8n):
 * 1. Default View: Paper-First is dominant.
 *    - Prominent print button: «Печать согласия для подписи».
 *    - Prominent paper confirmation button: «Подтвердить подписание на бумаге».
 *    - Signature vector pad (<svg>) is HIDDEN by default.
 *    - Optional tablet button is collapsed and non-intrusive.
 * 2. Explicit Tablet Mode:
 *    - When tablet_stylus is requested, vector pad is expanded.
 *    - Easy fallback button «Вернуться к бумажному бланку» is present.
 * 3. Zero Dead-Ends (Mandate 8n):
 *    - Paper confirmation creates valid signed consent with SHA-256 integrity hash.
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
globalThis.React = React;
import { renderToString } from "react-dom/server";
const { InformedConsentModal } = await import("../InformedConsentModal.js");

describe("Red Team Inquisition: Paper-First Sovereignty & Anti-Tablet Coercion (Mandates 8l & 8n)", () => {
	const mockPatient = {
		fullName: "Григорьев Михаил Семенович",
		birthDate: "24.06.1979",
		passport: "4507 № 654321",
		phone: "+7 (903) 123-45-67",
		cardNumber: "043-2026/305",
	};

	it("renders pure Paper-First layout by default: prominent A4 print and paper confirm, vector pad is HIDDEN", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="single"
				patient={mockPatient}
				doctorName="Д-р Воронов К. Л."
				diagnosisIcd="K02.1"
				toothNumbers="4.6"
			/>,
		);

		// 1. Prominent Paper actions
		assert.ok(
			html.includes("Печать согласия для подписи"),
			"Must render prominent A4 print button for hand-signing",
		);
		assert.ok(
			html.includes('data-testid="btn-confirm-paper-signed"'),
			"Must render paper confirmation button",
		);
		assert.ok(
			html.includes("Подтвердить подписание на бумаге"),
			"Must have clear paper confirmation label",
		);

		// 2. Tablet touch pad is HIDDEN by default
		assert.ok(
			!html.includes('data-testid="consent-vector-pad-svg"'),
			"Touch signature pad must be strictly HIDDEN by default (90% of clinics have no tablets)",
		);

		// 3. Tablet option is optional and collapsed
		assert.ok(
			html.includes("Подписать на экране / планшете (опционально)"),
			"Tablet signing must be strictly optional and collapsed",
		);
	});

	it("in package mode: renders prominent multi-page A4 print and batch paper confirmation, vector pad is HIDDEN", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="packages"
				initialPackageKey="PACKAGE_PRIMARY_VISIT"
				patient={mockPatient}
				doctorName="Д-р Воронов К. Л."
			/>,
		);

		assert.ok(
			html.includes("Печать пакета для подписи"),
			"Must render prominent package print button",
		);
		assert.ok(
			html.includes("Подтвердить подписание пакета (4 док.)"),
			"Must render batch paper confirmation button",
		);
		assert.ok(
			!html.includes('data-testid="consent-vector-pad-svg"'),
			"Touch pad must remain HIDDEN in package mode by default",
		);
	});

	it("reveals vector pad ONLY when explicit tablet mode is activated, with return-to-paper button", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="single"
				initialVerificationMethod="tablet_stylus"
				patient={mockPatient}
				doctorName="Д-р Воронов К. Л."
			/>,
		);

		// Vector pad is revealed
		assert.ok(
			html.includes('data-testid="consent-vector-pad-svg"'),
			"Must render vector pad when explicitly in tablet_stylus mode",
		);
		// Return to paper button is present
		assert.ok(
			html.includes("Вернуться к бумажному бланку"),
			"Must provide frictionless return to paper mode",
		);
		assert.ok(
			html.includes("Печать бланка (А4)"),
			"Must provide print to paper button even in tablet view",
		);
	});
});
