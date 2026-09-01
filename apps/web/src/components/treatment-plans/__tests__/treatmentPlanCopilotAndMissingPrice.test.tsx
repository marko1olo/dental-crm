import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MissingPriceAlert } from "../MissingPriceAlert";
import { TreatmentPlanStageCard } from "../TreatmentPlanStageCard";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import {
	optimizePlanForBudget,
	replaceImplantationWithBridge,
	addAllOn4UpperJaw,
	addAllOn4LowerJaw,
	addBoneGraftingBioOss,
	recalculateAnesthesiaAndIsolation,
	applyCopilotCommandToPlan,
	getAdjacentFdiTeeth,
	COPILOT_PRESET_ACTIONS,
	requestTreatmentPlanAiValidationAndComment,
} from "../../../services/ai/treatmentPlanCopilot";
import {
	generateTreatmentPlanStages,
	generate3TierPlanComparison,
	computeTierInstallments,
} from "../treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTier } from "../types";
import { calculatePlanTaxDeductionBreakdown, parseKopecks } from "@dental/shared";

describe("MissingPriceAlert & AI Treatment Plan Copilot Suite", () => {
	const sampleItemMissingPrice: TreatmentPlanItem = {
		id: "item-custom-01",
		toothNumber: 16,
		code804n: "A16.07.002.099",
		name: "Индивидуальная реставрация зуба композитом повышенной эстетики",
		category: "Терапия",
		priceRub: 0,
		unitPriceRub: 0,
		discountRub: 0,
		quantity: 1,
		phase: 1,
		stageKind: "stage_1_therapy",
		requiresManualPricing: true,
	};

	const sampleItemPriced: TreatmentPlanItem = {
		id: "item-priced-02",
		toothNumber: 21,
		code804n: "A16.07.002.001",
		name: "Лечение кариеса эмали",
		category: "Терапия",
		priceRub: 4500,
		unitPriceRub: 4500,
		discountRub: 0,
		quantity: 1,
		phase: 1,
		stageKind: "stage_1_therapy",
		requiresManualPricing: false,
	};

	describe("MissingPriceAlert Component", () => {
		it("renders full banner alert when price is 0 or requiresManualPricing is true", () => {
			const html = renderToString(
				<MissingPriceAlert
					item={sampleItemMissingPrice}
					variant="full"
				/>,
			);

			assert.ok(
				html.includes("Требуется ручная оценка: услуга не найдена в прайс-листе клиники"),
				"Must display missing price banner warning text",
			);
			assert.ok(html.includes("Указать цену"), "Must have button to enter manual price");
			assert.ok(html.includes(sampleItemMissingPrice.name), "Must display item name");
		});

		it("renders inline alert when variant is inline or compact", () => {
			const html = renderToString(
				<MissingPriceAlert
					item={sampleItemMissingPrice}
					variant="inline"
				/>,
			);

			assert.ok(html.includes("missing-price-alert-inline"), "Must have inline alert class");
			assert.ok(html.includes("Требуется ручная оценка"), "Must have compact alert text");
			assert.ok(html.includes("Указать цену"), "Must render inline price edit trigger");
		});

		it("renders null if item has positive price and requiresManualPricing is false", () => {
			const html = renderToString(
				<MissingPriceAlert
					item={sampleItemPriced}
					variant="full"
				/>,
			);

			assert.equal(html, "", "Priced item with requiresManualPricing=false must not render alert");
		});
	});

	describe("TreatmentPlanStageCard Integration with MissingPriceAlert", () => {
		const sampleStageWithMissingPrice: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Этап 1: Неотложная помощь и терапевтическая санация",
			subtitle: "Санация полости рта",
			clinicalGoal: "Ликвидация очагов инфекции",
			items: [sampleItemMissingPrice, sampleItemPriced],
			totalRub: 4500,
			totalKopecks: 450000 as any,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: ["A16.07.002.099", "A16.07.002.001"],
		};

		it("renders MissingPriceAlert inside TreatmentPlanStageCard when an item is unpriced", () => {
			const html = renderToString(
				<TreatmentPlanStageCard
					stage={sampleStageWithMissingPrice}
					defaultExpanded={true}
				/>,
			);

			assert.ok(
				html.includes("missing-price-alert-item-custom-01") ||
				html.includes("Требуется ручная оценка: услуга не найдена в прайс-листе клиники"),
				"Stage card must render MissingPriceAlert for unpriced items",
			);
		});
	});

	describe("TreatmentPlanPresenterModal Integration with Copilot and MissingPriceAlert", () => {
		const sampleTeeth: ToothData[] = [
			{ id: 16, toothNumber: 16, state: "Caries" } as any,
			{ id: 36, toothNumber: 36, state: "Missing" } as any,
		];
		const sampleTiers = generate3TierPlanComparison(sampleTeeth);

		it("renders AI Copilot quick actions toolbar inside TreatmentPlanPresenterModal", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					tiers={sampleTiers}
					patientName="Смирнова Екатерина Васильевна"
				/>,
			);

			assert.ok(html.includes("AI Copilot у кресла"), "Presenter must include AI Copilot toolbar");
			assert.ok(html.includes("presenter-copilot-btn-budget_optimize"), "Must include budget optimization action");
			assert.ok(html.includes("presenter-copilot-btn-implant_to_bridge"), "Must include implant to bridge action");
			assert.ok(html.includes("presenter-copilot-btn-all_on_4_upper"), "Must include all-on-4 upper action");
			assert.ok(html.includes("presenter-copilot-btn-all_on_4_lower"), "Must include all-on-4 lower action");
			assert.ok(html.includes("presenter-copilot-btn-bone_graft_bio_oss"), "Must include bone grafting bio-oss action");
			assert.ok(html.includes("presenter-copilot-btn-recalculate_anesthesia_isolation"), "Must include anesthesia/isolation action");
		});
	});

	describe("AI Copilot Modifier Engines (treatmentPlanCopilot.ts)", () => {
		const sampleTeeth: ToothData[] = [
			{ id: 16, toothNumber: 16, state: "Caries" } as any,
			{ id: 36, toothNumber: 36, state: "Missing" } as any,
			{ id: 46, toothNumber: 46, state: "Pulpitis" } as any,
		];

		const initialStages = generateTreatmentPlanStages(sampleTeeth);

		it("1. optimizePlanForBudget parses numbers with spaces and optimizes total sum while preserving therapy", () => {
			const initialTotal = initialStages.reduce((acc, s) => acc + s.totalRub, 0);
			const targetBudget = 60000;

			const result = optimizePlanForBudget(initialStages, targetBudget);

			assert.ok(result.success, "Optimization must succeed");
			assert.equal(result.commandType, "budget_optimize");
			assert.ok(result.stages.length >= 1, "Must return valid stages");
			assert.ok(result.newTotalRub <= initialTotal, "New total must be less than or equal to initial total");
			assert.ok(result.explanation.includes("успешно оптимизирован") || result.explanation.includes("укладывается"), "Must provide explanation");

			// Natural command with spaces
			const nlpResult = applyCopilotCommandToPlan(initialStages, "Оптимизировать смету под 100 000 руб");
			assert.equal(nlpResult.commandType, "budget_optimize");
			assert.ok(nlpResult.explanation.includes("100 000 ₽") || nlpResult.explanation.includes("100 000 ₽") || nlpResult.explanation.includes("100000"), "Must recognize 100 000 руб");
		});

		it("2. replaceImplantationWithBridge handles single tooth and tooth ranges (34-36) with valid FDI adjacency", () => {
			// FDI Adjacency tests
			const adj11 = getAdjacentFdiTeeth(11);
			assert.equal(adj11.mesial, 21, "Mesial of 11 is 21 across midline");
			assert.equal(adj11.distal, 12, "Distal of 11 is 12");

			const adj41 = getAdjacentFdiTeeth(41);
			assert.equal(adj41.mesial, 31, "Mesial of 41 is 31 across midline");
			assert.equal(adj41.distal, 42, "Distal of 41 is 42");

			const adj36 = getAdjacentFdiTeeth(36);
			assert.equal(adj36.mesial, 35, "Mesial of 36 is 35");
			assert.equal(adj36.distal, 37, "Distal of 36 is 37");

			// Single tooth replacement
			const resultSingle = replaceImplantationWithBridge(initialStages, { replaceToothNumbers: [36] });
			assert.ok(resultSingle.success, "Conversion must succeed");
			assert.equal(resultSingle.commandType, "implant_to_bridge");

			const stage3Single = resultSingle.stages.find((s) => s.stageNumber === 3);
			assert.ok(stage3Single, "Stage 3 must exist");
			const hasBridge36 = stage3Single.items.some((it) => it.name.includes("35-36-37"));
			assert.ok(hasBridge36, "Must create 3-unit bridge for tooth 36 with abutments 35 and 37");

			// Range replacement via NLP: "Заменить импланты 34-36 на мост"
			const resultRange = applyCopilotCommandToPlan(initialStages, "Заменить импланты 34-36 на мост");
			assert.equal(resultRange.commandType, "implant_to_bridge");
			const stage3Range = resultRange.stages.find((s) => s.stageNumber === 3);
			assert.ok(stage3Range, "Stage 3 must exist for range");
			const hasBridgeSpan = stage3Range.items.some((it) => it.name.includes("33-34-35-36-37") || it.name.includes("единиц"));
			assert.ok(hasBridgeSpan, "Must create bridge spanning 34-36");
		});

		it("3. addAllOn4UpperJaw and addAllOn4LowerJaw add complete total rehabilitation protocols", () => {
			// Upper Jaw All-on-4
			const resUpper = applyCopilotCommandToPlan(initialStages, "Добавить All-on-4 на верхнюю челюсть");
			assert.equal(resUpper.commandType, "all_on_4_upper");
			const stage2Upper = resUpper.stages.find((s) => s.stageNumber === 2);
			assert.ok(stage2Upper?.items.some((it) => it.quantity === 4 && it.code804n === "A16.07.054.001"), "Stage 2 must have 4 upper implants");
			assert.ok(resUpper.explanation.includes("верхней челюсти"), "Explanation must specify upper jaw");

			// Lower Jaw All-on-4
			const resLower = applyCopilotCommandToPlan(initialStages, "Добавить All-on-4 на нижнюю челюсть");
			assert.equal(resLower.commandType, "all_on_4_lower");
			const stage2Lower = resLower.stages.find((s) => s.stageNumber === 2);
			assert.ok(stage2Lower?.items.some((it) => it.quantity === 4 && it.code804n === "A16.07.054.001"), "Stage 2 must have 4 lower implants");
			assert.ok(resLower.explanation.includes("нижней челюсти"), "Explanation must specify lower jaw");
		});

		it("4. addBoneGraftingBioOss adds guided bone regeneration with Bio-Oss and Bio-Gide", () => {
			const resGraft = applyCopilotCommandToPlan(initialStages, "Включить костную пластику Bio-Oss");
			assert.equal(resGraft.commandType, "bone_graft_bio_oss");

			const stage2 = resGraft.stages.find((s) => s.stageNumber === 2);
			assert.ok(stage2, "Stage 2 must exist");
			const hasBioOss = stage2.items.some((it) => it.code804n === "A16.07.041" && it.name.includes("Bio-Oss"));
			assert.ok(hasBioOss, "Stage 2 must contain Order 804n A16.07.041 Bio-Oss grafting item");
			assert.ok(resGraft.explanation.includes("Geistlich Bio-Oss"), "Explanation must mention Geistlich Bio-Oss");
		});

		it("5. recalculateAnesthesiaAndIsolation audits and adds missing anesthesia & rubber dam", () => {
			const result = recalculateAnesthesiaAndIsolation(initialStages);

			assert.ok(result.success, "Anesthesia & isolation audit must succeed");
			assert.equal(result.commandType, "recalculate_anesthesia_isolation");

			// Verify anesthesia is present in stages with invasive procedures
			result.stages.forEach((st) => {
				if (st.items.length > 0) {
					const hasAnesthesia = st.items.some((it) => it.code804n === "A11.07.012" || /анестези/i.test(it.name));
					assert.ok(hasAnesthesia, `Stage ${st.stageNumber} must have anesthesia`);
				}
			});

			// Verify Stage 1 has rubber dam
			const stage1 = result.stages.find((s) => s.stageNumber === 1);
			if (stage1 && stage1.items.length > 0) {
				const hasRubberDam = stage1.items.some((it) => it.code804n === "A16.07.002.001" || /коффердам/i.test(it.name));
				assert.ok(hasRubberDam, "Stage 1 must have rubber dam isolation");
			}
		});

		it("6. Preset actions constant contains all 6 mandatory actions with metadata", () => {
			assert.equal(COPILOT_PRESET_ACTIONS.length, 6, "Must define 6 preset copilot actions");
			const ids = COPILOT_PRESET_ACTIONS.map((a) => a.id);
			assert.ok(ids.includes("budget_optimize"));
			assert.ok(ids.includes("implant_to_bridge"));
			assert.ok(ids.includes("all_on_4_upper"));
			assert.ok(ids.includes("all_on_4_lower"));
			assert.ok(ids.includes("bone_graft_bio_oss"));
			assert.ok(ids.includes("recalculate_anesthesia_isolation"));
		});

		it("7. Installments (3, 6, 12, 24 mo) and 13% NDFL recalculate accurately for price edits", () => {
			const totalKopecks = parseKopecks(120000);
			const installments = computeTierInstallments(totalKopecks);

			assert.equal(installments[3].monthlyPaymentRub, 40000, "3-month installment must be 40 000 ₽");
			assert.equal(installments[6].monthlyPaymentRub, 20000, "6-month installment must be 20 000 ₽");
			assert.equal(installments[12].monthlyPaymentRub, 10000, "12-month installment must be 10 000 ₽");
			assert.equal(installments[24].monthlyPaymentRub, 5000, "24-month installment must be 5 000 ₽");

			// NDFL calculation
			const sampleItems: TreatmentPlanItem[] = [
				{
					id: "test-item-1",
					code804n: "A16.07.002.001",
					name: "Терапевтическое лечение",
					category: "Терапия",
					priceRub: 50000,
					unitPriceRub: 50000,
					discountRub: 0,
					quantity: 1,
					phase: 1,
					stageKind: "stage_1_therapy",
				},
			];
			const ndfl = calculatePlanTaxDeductionBreakdown(sampleItems);
			assert.equal(ndfl.grandTotalRefund13Rub, 6500, "13% of 50 000 ₽ is 6 500 ₽");
			assert.equal(ndfl.netPriceWithRefundRub, 43500, "50 000 - 6 500 = 43 500 ₽");
		});

		it("8. requestTreatmentPlanAiValidationAndComment returns structured validation and chairside commentary", async () => {
			const stages = generateTreatmentPlanStages(
				[
					{
						toothNumber: 16,
						state: "Pulpitis",
						mobility: 0,
					},
				],
				undefined,
				0,
				{ isDemoMode: true },
			);

			const aiResult = await requestTreatmentPlanAiValidationAndComment(stages, {
				patientContext: { patientName: "Иванов И.И." },
				targetBudgetRub: 45000,
			});

			assert.ok(aiResult.clinicalValidation, "Must return clinical validation object");
			assert.ok(aiResult.chairsideCommentary, "Must return chairside patient commentary");
			assert.ok(aiResult.financialArgumentation, "Must return financial argumentation with NDFL");
			assert.ok(aiResult.chairsideCommentary.urgencyArgument.length > 0, "Must include health math urgency argument");
			assert.ok(aiResult.financialArgumentation.ndflDeduction.totalRefundRub > 0, "Must calculate 13% tax refund");
		});

		it("9. TreatmentPlanPresenterModal renders AI Audit tab and trigger button", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					patientName="Петров Петр"
					doctorFullName="Д-р Смирнов"
				/>,
			);

			assert.ok(html.includes("ИИ-Аудит &amp; Комментарий"), "Must include AI Audit tab button in presenter modal");
			assert.ok(html.includes("tab-ai-audit-btn"), "Must have tab-ai-audit-btn data-testid");
		});
	});
});

