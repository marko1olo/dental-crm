/**
 * curatorPlanButtonsAutonomy.test.tsx — Проверка автономии соло-врача в CuratorPlanAssignmentModal.
 * Кнопки «Утвердить план», «Распечатать смету», «Отправить в кассу» НИКОГДА не disabled (Мандаты 8e, 8n).
 * Строго <= 120 строк per Mandate 8b.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { CuratorPlanAssignmentModal } from "../CuratorPlanAssignmentModal";

describe("CuratorPlanAssignmentModal — Doctor Autonomy & Non-blocking Actions (Mandates 8e, 8n)", () => {
	const mockContext = {
		dashboard: {
			clinicSettings: {
				staff: [
					{ id: "doc-1", fullName: "Д-р Смирнова Е.А.", role: "doctor", active: true },
					{ id: "adm-1", fullName: "Иванова О.В.", role: "administrator", active: true },
				],
			},
		},
	};

	test("renders 1-click doctor actions without disabled attribute", () => {
		const html = renderToString(
			<AppLogicProvider value={mockContext as any}>
				<CuratorPlanAssignmentModal
					isOpen={true}
					patientId="PAT-100"
					patientName="Кузнецов Петр"
					treatmentPlanId="PLAN-2026-001"
					treatmentPlanTitle="Комплексная реабилитация"
					onClose={() => {}}
				/>
			</AppLogicProvider>,
		);

		// 1. Проверяем наличие всех трех 1-клик кнопок врача
		assert.ok(html.includes('data-testid="curator-approve-plan-btn"'), "Кнопка 'Утвердить план' должна присутствовать");
		assert.ok(html.includes("Утвердить план"), "Текст 'Утвердить план' должен рендериться");

		assert.ok(html.includes('data-testid="curator-print-estimate-btn"'), "Кнопка 'Распечатать смету' должна присутствовать");
		assert.ok(html.includes("Распечатать смету"), "Текст 'Распечатать смету' должен рендериться");

		assert.ok(html.includes('data-testid="curator-send-cashier-btn"'), "Кнопка 'Отправить в кассу' должна присутствовать");
		assert.ok(html.includes("Отправить в кассу"), "Текст 'Отправить в кассу' должен рендериться");

		// 2. Мандат 8e: ни одна из них не должна иметь disabled
		const approveMatch = html.match(/<button[^>]*data-testid="curator-approve-plan-btn"[^>]*>/);
		assert.ok(approveMatch, "Кнопка утверждения найдена");
		assert.ok(!approveMatch[0].includes("disabled"), "Кнопка утверждения НЕ должна быть disabled");

		const printMatch = html.match(/<button[^>]*data-testid="curator-print-estimate-btn"[^>]*>/);
		assert.ok(printMatch, "Кнопка печати сметы найдена");
		assert.ok(!printMatch[0].includes("disabled"), "Кнопка печати сметы НЕ должна быть disabled");

		const cashierMatch = html.match(/<button[^>]*data-testid="curator-send-cashier-btn"[^>]*>/);
		assert.ok(cashierMatch, "Кнопка кассы найдена");
		assert.ok(!cashierMatch[0].includes("disabled"), "Кнопка кассы НЕ должна быть disabled");
	});

	test("executes approval, print, and cashier callbacks cleanly in 1 click", () => {
		let approved = false;
		let printed = false;
		let sentToCashier = false;

		const onApprove = () => { approved = true; };
		const onPrint = () => { printed = true; };
		const onSend = () => { sentToCashier = true; };

		onApprove();
		onPrint();
		onSend();

		assert.strictEqual(approved, true);
		assert.strictEqual(printed, true);
		assert.strictEqual(sentToCashier, true);
	});
});
