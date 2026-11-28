/**
 * apps/web/src/components/analytics/__tests__/analyticsMedicalPrivacy.test.ts
 * Mandate 8b: File <= 120 lines. Medical secrecy & patient privacy enforcement.
 */

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { formatInitialsOnly, maskRussianPhone } from "@dental/shared";
import { PnlActionFooter } from "../../finance/pnl/dashboardModules/PnlActionFooter";

test("Analytics domain enforces patient initials only, masked phone, and medical secrecy (152-ФЗ)", () => {
	const initials = formatInitialsOnly("Иванов Иван Иванович");
	assert.equal(initials, "Иванов И. И.");

	const maskedPhone = maskRussianPhone("+79998887766");
	assert.ok(maskedPhone.includes("•••") || maskedPhone.includes("***"), "Phone must be masked for patient privacy");
	assert.equal(maskedPhone.includes("8887766"), false, "Raw phone middle/suffix digits must not leak");
});

test("PnlActionFooter renders medical secrecy notice and strictly impersonal accounting aggregates", () => {
	const html = renderToString(
		React.createElement(PnlActionFooter, {
			report: null,
			onOpenQuickExpense: () => {},
			periodLabel: "Март 2026",
		}),
	);

	assert.ok(
		html.includes('data-testid="financial-privacy-note"'),
		"PnlActionFooter must render data-testid=financial-privacy-note",
	);
	assert.ok(
		html.includes("врачебной тайны"),
		"Rendered footer must display medical secrecy compliance notice",
	);
	assert.ok(
		html.includes("агрегированными кассовыми суммами"),
		"Rendered footer must state accounting operates strictly on aggregated figures",
	);
});
