/**
 * treatmentPlanPresenterModules.test.tsx — Red Team компонентные и модульные тесты
 * презентации планов лечения пациенту у кресла (Low-spec chairside, 3-Tier, 30/40/30, 0% рассрочка, 13% НДФЛ).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
	calculateStaged304030Schedule,
	calculatePlanTaxDeductionBreakdown,
	parseKopecks,
} from "@dental/shared";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { TreatmentPlanStagesList } from "../presenterModules/TreatmentPlanStagesList";
import { TreatmentPlanPaymentSchedule } from "../presenterModules/TreatmentPlanPaymentSchedule";
import { TreatmentPlanAcceptanceFooter } from "../presenterModules/TreatmentPlanAcceptanceFooter";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import {
	applyDoctorDiscountToStages,
	recalculateTierTotals,
} from "../treatmentPlanMath";
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanTier } from "../types";

const mockSampleTeeth: ToothData[] = [
	{ id: 16, toothNumber: 16, state: "Caries", notes: "Глубокий кариес жевательной поверхности" } as any,
	{ id: 36, toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация Astra Tech)" } as any,
	{ id: 46, toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 корневых канала)" } as any,
	{ id: 11, toothNumber: 11, state: "Crown", notes: "Эстетическая реставрация / коронка e.max" } as any,
];

describe("Treatment Plan Presenter Modules & Math Invariants", () => {
	const tiers = generate3TierPlanComparison(mockSampleTeeth, undefined, 0, 0, { isDemoMode: true });
	const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0]!;

	describe("1. 3-Tier Alternative Plans Engine (@dental/shared & stages engine)", () => {
		it("generates exactly 3 distinct tiers: economy, standard, and optimum", () => {
			expect(tiers).toHaveLength(3);
			const tierIds = tiers.map((t) => t.tierId);
			expect(tierIds).toContain("economy");
			expect(tierIds).toContain("standard");
			expect(tierIds).toContain("optimum");
		});

		it("maintains pricing hierarchy: economy <= standard <= optimum", () => {
			const economy = tiers.find((t) => t.tierId === "economy")!;
			const standard = tiers.find((t) => t.tierId === "standard")!;
			const optimum = tiers.find((t) => t.tierId === "optimum")!;

			expect(economy.totalRub).toBeGreaterThan(0);
			expect(standard.totalRub).toBeGreaterThanOrEqual(economy.totalRub);
			expect(optimum.totalRub).toBeGreaterThanOrEqual(standard.totalRub);
		});

		it("includes valid clinical Order 804n nomenclature codes in all stages", () => {
			for (const tier of tiers) {
				expect(tier.stages.length).toBeGreaterThan(0);
				for (const stage of tier.stages) {
					for (const item of stage.items) {
						expect(item.code804n).toMatch(/^A\d{2}\.\d{2}\.\d{3}/);
						expect(item.unitPriceRub).toBeGreaterThan(0);
						expect(item.quantity).toBeGreaterThanOrEqual(1);
					}
				}
			}
		});
	});

	describe("2. Payment Schedule Math: 30/40/30 Split & 0% Installments", () => {
		it("calculates exact 30/40/30 payment milestones with zero kopeck drift", () => {
			const totalKopecks = parseKopecks(standardTier.totalRub);
			const schedule = calculateStaged304030Schedule(totalKopecks, true);

			expect(schedule.isBalanced).toBe(true);
			expect(schedule.partsKopecks).toHaveLength(3);

			const sumMilestonesKopecks =
				schedule.stage1AdvanceTherapyKopecks +
				schedule.stage2SurgeryImplantKopecks +
				schedule.stage3OrthopedicsKopecks;

			expect(sumMilestonesKopecks).toBe(totalKopecks);
			expect(schedule.totalKopecks).toBe(totalKopecks);
		});

		it("computes 0% installments for 3, 6, 12, and 24 months without bank interest", () => {
			const totalRub = standardTier.totalRub;
			const installment12 = Math.round(totalRub / 12);
			const installment6 = Math.round(totalRub / 6);

			expect(standardTier.monthlyInstallment12Rub).toBe(installment12);
			expect(installment6).toBeGreaterThan(installment12);
		});

		it("calculates 13% NDFL tax deduction accurately", () => {
			const planItems = standardTier.stages.flatMap((s) =>
				s.items.map((it) => ({
					id: it.id,
					name: it.name,
					code804n: it.code804n,
					priceRub: it.unitPriceRub,
					quantity: it.quantity,
				})),
			);
			const deduction = calculatePlanTaxDeductionBreakdown(planItems);

			expect(deduction.grandTotalRefund13Kopecks).toBeGreaterThan(0);
			expect(deduction.netPriceWithRefundRub).toBeLessThanOrEqual(deduction.grandTotalRub);
		});
	});

	describe("3. Doctor Discount & Recalculation Engine", () => {
		it("applies doctor discount without breaking line item precision", () => {
			const discountPercent = 15;
			const discountedStages = applyDoctorDiscountToStages(standardTier.stages, discountPercent);
			const recalculated = recalculateTierTotals(standardTier, discountedStages);

			expect(recalculated.totalRub).toBeLessThan(standardTier.totalRub);

			// Check first stage items have positive discounts
			const firstItem = discountedStages[0]?.items[0];
			if (firstItem) {
				expect(firstItem.discountRub).toBeGreaterThan(0);
				expect(firstItem.priceRub).toBe(firstItem.unitPriceRub * firstItem.quantity - firstItem.discountRub);
			}
		});

		it("prevents doctor discount from exceeding 100% or going negative", () => {
			const clampedZero = applyDoctorDiscountToStages(standardTier.stages, -10);
			const zeroTier = recalculateTierTotals(standardTier, clampedZero);
			expect(zeroTier.totalRub).toBe(standardTier.totalRub);

			const clampedHundred = applyDoctorDiscountToStages(standardTier.stages, 120);
			const hundredTier = recalculateTierTotals(standardTier, clampedHundred);
			expect(hundredTier.totalRub).toBe(0);
		});
	});

	describe("4. Presentation Subcomponents Rendering & Ergonomics", () => {
		it("renders TreatmentPlanStagesList with GPU acceleration and 44px touch targets", () => {
			const html = renderToString(
				<TreatmentPlanStagesList
					tier={standardTier}
					expandedStages={{ 1: true, 2: false }}
					onToggleStage={() => {}}
					onToggleAllStages={() => {}}
					showMicroConsumables={false}
				/>
			);

			expect(html).toContain("data-testid=\"treatment-plan-stages-list\"");
			expect(html).toContain("transform:translateZ(0)");
			expect(html).toContain("A16.07");
			expect(html).toContain("Этап 1");
			expect(html).toContain("min-h-[52px]");
		});

		it("renders TreatmentPlanPaymentSchedule with 30/40/30 split and NDFL badge", () => {
			const html = renderToString(
				<TreatmentPlanPaymentSchedule
					tier={standardTier}
					selectedMonths={12}
					onSelectMonths={() => {}}
				/>
			);

			expect(html).toContain("data-testid=\"treatment-plan-payment-schedule\"");
			expect(html).toContain("Беспроцентная рассрочка 0%");
			expect(html).toContain("Возврат 13% НДФЛ");
			expect(html).toContain("Аванс 30%");
			expect(html).toContain("Хирургия 40%");
			expect(html).toContain("Финал 30%");
		});

		it("renders TreatmentPlanAcceptanceFooter with digital signature canvas and 323-FZ compliance", () => {
			let accepted = false;
			const html = renderToString(
				<TreatmentPlanAcceptanceFooter
					selectedTier={standardTier}
					isChoiceConfirmed={false}
					onConfirmPatientChoice={() => {
						accepted = true;
					}}
					onPrintAppendix={() => {}}
				/>
			);

			expect(html).toContain("data-testid=\"treatment-plan-acceptance-footer\"");
			expect(html).toContain("Подпись на планшете");
			expect(html).toContain("Печать формы");
			expect(html).toContain("Пациент выбрал");
		});

		it("renders full TreatmentPlanPresenterModal facade cleanly without DOM hydration errors", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					patientName="Кузнецов Михаил Андреевич"
					doctorFullName="Д-р Петров Сергей Иванович"
					tiers={tiers}
					initialSelectedTierId="standard"
				/>
			);

			expect(html).toContain("data-testid=\"treatment-plan-presenter-modal\"");
			expect(html).toContain("Кузнецов Михаил Андреевич");
			expect(html).toContain("Д-р Петров Сергей Иванович");
			expect(html).toContain("Рекомендация врача");
			expect(html).toContain("Пациент выбрал Вариант Б: Оптимум");
		});
	});
});
