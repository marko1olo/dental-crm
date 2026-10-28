/**
 * periodontalProphyAndKeyboard.test.ts — Пресет «Профгигиена» и экспресс-скрининг ВОЗ (Мандат 8e, 8k).
 * Переписан в соответствии с приказом Создателя: без симуляторов клавиатуры и микро-дроча.
 */

import { PSR_SEXTANTS } from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { generatePsrDiaryProtocol } from "../perioMath";
import { PeriodontogramChart } from "../PeriodontogramChart";

describe("8. Prophy Protocol & PSR Screening Invariants (Mandates 8e, 8k)", () => {
	it("pro_hygiene_express generates clinical hygiene protocol", () => {
		const prophyDiary = generatePsrDiaryProtocol("pro_hygiene_express");
		assert.ok(prophyDiary.includes("Профгигиена полости рта: УЗ-скейлинг"));
		assert.ok(prophyDiary.includes("Air-Flow порошком на основе глицина"));
		assert.ok(prophyDiary.includes("полировка абразивной пастой"));
		assert.ok(prophyDiary.includes("глубокое фторирование эмали"));
	});

	it("PeriodontogramChart renders PSR 6-sextant screening and hygiene actions cleanly", () => {
		const html = renderToString(
			React.createElement(PeriodontogramChart, {
				patientId: "patient-keyboard-test",
				patientName: "Кузнецов Петр Сергеевич",
			}),
		);

		assert.ok(html.includes("data-testid=\"perio-toolbar-norm-1click-btn\""));
		assert.ok(html.includes("data-testid=\"psr-all-intact-btn\""));
		assert.ok(html.includes("data-testid=\"psr-hygiene-preset-btn\""));
		assert.ok(html.includes("Кузнецов Петр Сергеевич"));

		for (const sextant of PSR_SEXTANTS) {
			assert.ok(html.includes(sextant.name));
		}
	});

	it("detailed chart tier 3 expands cleanly on request", () => {
		const htmlTier3 = renderToString(
			React.createElement(PeriodontogramChart, {
				patientId: "patient-tier3-test",
				patientName: "Кузнецов Петр Сергеевич",
				initialTier3Expanded: true,
			}),
		);
		assert.ok(htmlTier3.includes("data-testid=\"perio-tooth-btn-16\""));
		assert.ok(htmlTier3.includes("Дистально-вестибулярная"));
	});
});
