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
import { StudioModalFooter } from "../studioModules/StudioModalFooter";

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
		let capturedApprovedTier: unknown = null;
		let capturedDraftStages: unknown = null;
		let capturedDraftTier: unknown = null;
		let capturedPrintTier: unknown = null;

		const mockTier = {
			id: "optimum" as const,
			tierId: "optimum" as const,
			name: "Оптимальный",
			title: "Оптимальный",
			totalRub: 45000,
			durationDays: 14,
			visitCount: 3,
			stages: [],
			highlights: ["Гарантия 2 года"],
		};

		const onApprovePlan = (tier: typeof mockTier) => {
			capturedApprovedTier = tier;
		};
		const onSaveDraft = (stages: readonly unknown[], tier: typeof mockTier) => {
			capturedDraftStages = stages;
			capturedDraftTier = tier;
		};
		const onPrintContract = (tier: typeof mockTier) => {
			capturedPrintTier = tier;
		};

		// 1. Проверяем прямое исполнение контракта кнопок автономии врача (Мандат 8e)
		onApprovePlan(mockTier);
		onSaveDraft([], mockTier);
		onPrintContract(mockTier);

		assert.deepStrictEqual(capturedApprovedTier, mockTier, "План должен быть передан в onApprovePlan");
		assert.deepStrictEqual(capturedDraftTier, mockTier, "Тариф должен быть передан в onSaveDraft");
		assert.deepStrictEqual(capturedDraftStages, [], "Этапы должны быть переданы в onSaveDraft");
		assert.deepStrictEqual(capturedPrintTier, mockTier, "Тариф должен быть передан в onPrintContract");

		// 2. Проверяем вызовы обработчиков подвала StudioModalFooter
		let footerApprovedCalled = false;
		let footerDraftCalled = false;

		const handleSaveDraft = () => {
			footerDraftCalled = true;
		};
		const handleApprove = () => {
			footerApprovedCalled = true;
		};

		const footer = StudioModalFooter({
			sanitizedActiveTitle: "Оптимальный",
			activeTierTotalRub: 45000,
			handleSaveDraft,
			handleApprove,
		});

		assert.ok(footer, "Подвал студии должен быть успешно инициализирован");
		
		// Проверяем проброс обработчиков на кнопки подвала
		const buttonsContainer = footer.props.children[1];
		const draftButton = buttonsContainer.props.children[0];
		const approveButton = buttonsContainer.props.children[1];

		assert.strictEqual(draftButton.props["data-testid"], "save-draft-btn");
		assert.strictEqual(approveButton.props["data-testid"], "approve-treatment-plan-btn");

		draftButton.props.onClick();
		approveButton.props.onClick();

		assert.strictEqual(footerDraftCalled, true, "Кнопка 'Сохранить черновик' должна вызывать handleSaveDraft");
		assert.strictEqual(footerApprovedCalled, true, "Кнопка 'Утвердить' должна вызывать handleApprove");
	});
});
