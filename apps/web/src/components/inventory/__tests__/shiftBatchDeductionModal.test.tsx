/**
 * apps/web/src/components/inventory/__tests__/shiftBatchDeductionModal.test.tsx
 *
 * Tests for ShiftBatchDeductionModal (Mandates 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ShiftBatchDeductionModal } from "../ConsumablesBatchWriteoffModal.js";

describe("ShiftBatchDeductionModal SSR & Component Verification (Mandates 8e, 8n)", () => {
	it("1. При isOpen = false возвращает пустую строку", () => {
		const html = renderToString(
			<ShiftBatchDeductionModal
				isOpen={false}
				onClose={() => {}}
				organizationId="test-org-uuid"
			/>,
		);
		assert.equal(html, "");
	});

	it("2. При isOpen = true рендерит модальное окно с заголовком и 1-клик бейджем", () => {
		const html = renderToString(
			<ShiftBatchDeductionModal
				isOpen={true}
				onClose={() => {}}
				organizationId="test-org-uuid"
				initialShiftData={{
					date: "2026-11-20",
					shiftStats: { completedVisitsCount: 1, totalProceduresCount: 1, breakdown: [] },
					consumablesSummary: [
						{ itemId: "1", itemName: "Перчатки смотровые", category: "Расходники", unit: "пар", qtyToDeduct: 2, currentStock: 0, projectedStock: -2, isOverdraft: true, deficit: 2 },
					],
					totalItemsCount: 1,
					overdraftItemsCount: 1,
					isAlreadyDeducted: false,
				}}
			/>,
		);

		assert.ok(html.includes("Списание расходников за смену"), "Должен быть заголовок списания смены");
		assert.ok(html.includes("Списание по техкартам"), "Должен быть бейдж автосписания по техкартам");
		assert.ok(html.includes("Мягкий овердрафт"), "Должно быть упоминание мягкого овердрафта (Мандат 8n)");
		assert.ok(html.includes("btn-confirm-shift-batch-deduction"), "Должна быть кнопка подтверждения списания");
	});
});
