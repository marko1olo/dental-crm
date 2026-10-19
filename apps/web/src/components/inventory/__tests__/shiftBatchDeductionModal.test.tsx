/**
 * apps/web/src/components/inventory/__tests__/shiftBatchDeductionModal.test.tsx
 *
 * Tests for ShiftBatchDeductionModal (Mandates 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ShiftBatchDeductionModal } from "../ShiftBatchDeductionModal.js";

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
			/>,
		);

		assert.ok(html.includes("Списание расходников за смену"), "Должен быть заголовок списания смены");
		assert.ok(html.includes("1 клик по техкартам"), "Должен быть бейдж автосписания по техкартам");
		assert.ok(html.includes("Мягкий овердрафт"), "Должно быть упоминание мягкого овердрафта (Мандат 8n)");
		assert.ok(html.includes("btn-confirm-shift-batch-deduction"), "Должна быть кнопка подтверждения списания");
	});
});
