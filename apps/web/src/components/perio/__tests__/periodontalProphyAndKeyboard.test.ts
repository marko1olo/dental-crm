/**
 * periodontalProphyAndKeyboard.test.ts — Пресет «Профгигиена» и инвариант фокуса Numpad (Мандат 8k).
 * Мандат 8b: <= 120 строк.
 */

import { PSR_SEXTANTS } from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { generatePsrDiaryProtocol } from "../perioMath";
import { PeriodontogramChart } from "../PeriodontogramChart";

describe("8. Prophy Protocol & Keyboard Intercept Invariants (Mandate 8k)", () => {
	it("pro_hygiene_express generates clinical hygiene protocol", () => {
		const prophyDiary = generatePsrDiaryProtocol("pro_hygiene_express");
		assert.ok(prophyDiary.includes("Профгигиена полости рта: УЗ-скейлинг"));
		assert.ok(prophyDiary.includes("Air-Flow порошком на основе глицина"));
		assert.ok(prophyDiary.includes("полировка абразивной пастой"));
		assert.ok(prophyDiary.includes("глубокое фторирование эмали"));
	});

	it("keyboard intercept is off by default and cards render cleanly", () => {
		const html = renderToString(
			React.createElement(PeriodontogramChart, {
				patientId: "patient-keyboard-test",
				patientName: "Кузнецов Петр Сергеевич",
			}),
		);

		assert.ok(html.includes('data-testid="perio-probe-keyboard-toggle"'));
		assert.ok(html.includes('tabindex="-1"') || html.includes('tabIndex="-1"'));
		assert.ok(html.includes('data-testid="perio-preset-norm-card"'));
		assert.ok(html.includes('data-testid="perio-preset-prophy-card"'));
		assert.ok(html.includes('data-testid="perio-preset-gingivitis-card"'));

		for (const sextant of PSR_SEXTANTS) {
			assert.ok(html.includes(sextant.name));
		}
	});

	it("keyboard toggle duplicate is rendered when Tier 3 is expanded", () => {
		const htmlTier3 = renderToString(
			React.createElement(PeriodontogramChart, {
				patientId: "patient-tier3-test",
				patientName: "Кузнецов Петр Сергеевич",
				initialTier3Expanded: true,
			}),
		);
		assert.ok(htmlTier3.includes('data-testid="perio-probe-keyboard-toggle-tier3"'));
	});
});
