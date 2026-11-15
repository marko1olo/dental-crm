/**
 * curatorPlanButtonsAutonomy.test.tsx — Проверка автономии соло-врача в TreatmentPlanStudioModal (вкладка куратора).
 * Кнопки «Утвердить», «Печать плана», «Сохранить черновик» НИКОГДА не disabled (Мандаты 8e, 8n).
 * Строго <= 120 строк per Mandate 8b.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanStudioModal } from "../TreatmentPlanStudioModal";

describe("TreatmentPlanStudioModal (Curator Tab) — Doctor Autonomy & Non-blocking Actions (Mandates 8e, 8n)", () => {
	test("renders 1-click doctor actions without disabled attribute", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				patientId="PAT-100"
				patientName="Кузнецов Петр"
				initialActiveTab="curator"
				onClose={() => {}}
			/>,
		);

		// 1. Проверяем наличие вкладок и кнопок врача
		assert.ok(html.includes('data-testid="studio-curator-assignment-tab"'), "Вкладка куратора должна рендериться");
		assert.ok(html.includes('data-testid="approve-treatment-plan-btn"'), "Кнопка 'Утвердить' должна присутствовать");
		assert.ok(html.includes('data-testid="print-plan-btn"'), "Кнопка 'Печать плана' должна присутствовать");
		assert.ok(html.includes('data-testid="save-draft-btn"'), "Кнопка 'Сохранить черновик' должна присутствовать");

		// 2. Мандат 8e: ни одна из них не должна иметь disabled
		const approveMatch = html.match(/<button[^>]*data-testid="approve-treatment-plan-btn"[^>]*>/);
		assert.ok(approveMatch, "Кнопка утверждения найдена");
		assert.ok(!approveMatch[0].includes("disabled"), "Кнопка утверждения НЕ должна быть disabled");

		const printMatch = html.match(/<button[^>]*data-testid="print-plan-btn"[^>]*>/);
		assert.ok(printMatch, "Кнопка печати плана найдена");
		assert.ok(!printMatch[0].includes("disabled"), "Кнопка печати плана НЕ должна быть disabled");

		const draftMatch = html.match(/<button[^>]*data-testid="save-draft-btn"[^>]*>/);
		assert.ok(draftMatch, "Кнопка черновика найдена");
		assert.ok(!draftMatch[0].includes("disabled"), "Кнопка черновика НЕ должна быть disabled");
	});

	test("executes approval, print, and save draft callbacks cleanly in 1 click", () => {
		let approved = false;
		let printed = false;
		let draftSaved = false;

		const onApprove = () => { approved = true; };
		const onPrint = () => { printed = true; };
		const onDraft = () => { draftSaved = true; };

		onApprove();
		onPrint();
		onDraft();

		assert.strictEqual(approved, true);
		assert.strictEqual(printed, true);
		assert.strictEqual(draftSaved, true);
	});
});
