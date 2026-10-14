/**
 * treatmentPlanPresenterSsotUnified.test.tsx — Red Team верификация единого канонического SSOT
 * студии презентации планов лечения пациенту у кресла (Chairside Treatment Plan Presenter).
 *
 * ТЕСТИРУЕМЫЕ ТРЕБОВАНИЯ:
 * 1. 3 прозрачных сценария («Эконом», «Стандарт», «Премиум»).
 * 2. Интерактивная анатомическая формула FDI (11..48) с подсветкой зубов выбранного сценария.
 * 3. 1-клик запись этапа в расписание через QuickBookingDrawer.
 * 4. 1-клик оформление заказ-наряда в ЗТЛ (DentalLabOrderDrawer) на ортопедических этапах.
 * 5. Автономия врача (Мандат 8e): скидки в % (0-100%) и фиксированных рублях (₽) на весь план или отдельный этап.
 * 6. Консолидация дубликатов: PlanScenarioComparisonModal — легковесный фасад к SSOT.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import {
	applyDoctorDiscountToStages,
	applyDoctorFixedDiscountToStages,
	recalculateTierTotals,
} from "../treatmentPlanMath";
import { TreatmentPlanPresenterDentalFormula } from "../presenterModules/TreatmentPlanPresenterDentalFormula";
import { TreatmentPlanPresenterComparisonTab } from "../TreatmentPlanPresenterComparisonTab";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { PlanScenarioComparisonModal } from "../PlanScenarioComparisonModal";
import type { ToothData } from "../../odontogram/ToothChart";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

const sampleTeeth: ToothData[] = [
	{ id: 16, toothNumber: 16, state: "Caries", notes: "Глубокий кариес" } as any,
	{ id: 36, toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация)" } as any,
	{ id: 46, toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 канала)" } as any,
	{ id: 11, toothNumber: 11, state: "Crown", notes: "Коронка e.max" } as any,
	{ id: 24, toothNumber: 24, state: "Caries", notes: "Кариес" } as any,
];

describe("Treatment Plan Presenter SSOT Unified Suite", () => {
	const tiers = generate3TierPlanComparison(sampleTeeth, undefined, 0, 0, { isDemoMode: true });
	const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0]!;

	describe("1. Interactive FDI Dental Formula (11..48)", () => {
		it("renders both upper and lower arches with correct FDI numbers", () => {
			const html = renderToString(
				<TreatmentPlanPresenterDentalFormula
					tier={standardTier}
					teeth={sampleTeeth}
				/>,
			);

			// Upper arch teeth: 16, 11, 24
			expect(html).toContain('data-testid="presenter-fdi-tooth-16"');
			expect(html).toContain('data-testid="presenter-fdi-tooth-11"');
			expect(html).toContain('data-testid="presenter-fdi-tooth-24"');
			expect(html).toContain('data-testid="presenter-fdi-tooth-36"');
			expect(html).toContain('data-testid="presenter-fdi-tooth-46"');

			// Shows count of treated teeth
			expect(html).toContain("В тарифе задействовано:");
		});

		it("marks teeth with active stage indicators in the formula", () => {
			const html = renderToString(
				<TreatmentPlanPresenterDentalFormula
					tier={standardTier}
					teeth={sampleTeeth}
				/>,
			);

			// Treated teeth have stage badge (e.g. Э1)
			expect(html).toContain("Э1");
		});
	});

	describe("2. 1-Click Handoff: Schedule Booking & Dental Lab Order", () => {
		it("renders 1-click stage booking button for each stage", () => {
			const html = renderToString(
				<TreatmentPlanPresenterComparisonTab
					allTiers={tiers}
					selectedTierId="standard"
					onSelectTier={() => {}}
					getTierLetter={(id) => `Тариф ${id}`}
					formatRubles={(num) => `${num || 0} ₽`}
					expandedStages={{ 1: true, 2: true, 3: true }}
					onToggleStage={() => {}}
					onToggleAllStages={() => {}}
					showMicroConsumables={false}
					onUpdateItemPrice={() => {}}
					onConfirmPatientChoice={() => {}}
					isChoiceConfirmed={false}
					confirmedTierId={null}
					teeth={sampleTeeth}
					planId="PLAN-TEST-42"
					patientId="PAT-101"
					patientName="Кузнецов Петр"
				/>,
			);

			// Stage 1 booking CTA
			expect(html).toContain('data-testid="stage-book-btn-1"');
			expect(html).toContain("Записать 1-й этап");

			// Booking button exists for all stages
			expect(html).toContain('data-testid="stage-book-btn-2"');
			expect(html).toContain('data-testid="stage-book-btn-3"');
		});

		it("renders 1-click dental lab order button for prosthetic/orthopedic stages", () => {
			const html = renderToString(
				<TreatmentPlanPresenterComparisonTab
					allTiers={tiers}
					selectedTierId="standard"
					onSelectTier={() => {}}
					getTierLetter={(id) => `Тариф ${id}`}
					formatRubles={(num) => `${num || 0} ₽`}
					expandedStages={{ 1: true, 2: true, 3: true }}
					onToggleStage={() => {}}
					onToggleAllStages={() => {}}
					showMicroConsumables={false}
					onUpdateItemPrice={() => {}}
					onConfirmPatientChoice={() => {}}
					isChoiceConfirmed={false}
					confirmedTierId={null}
					teeth={sampleTeeth}
					planId="PLAN-TEST-42"
					patientId="PAT-101"
					patientName="Кузнецов Петр"
				/>,
			);

			// Stage 3 contains crowns / orthopedics -> lab order button must be present
			expect(html).toContain('data-testid="stage-lab-order-btn-3"');
			expect(html).toContain("Заказ ЗТЛ");
		});

		it("dispatches stage booking payload correctly to scheduleStore and uiSurfaceStore", () => {
			// Simulate booking dispatch
			const stage = standardTier.stages[0]!;
			const stageSlot = {
				dateKey: "2026-10-14",
				startTime: "10:00",
				patientId: "PAT-101",
				patientName: "Кузнецов Петр",
				treatmentPlanId: "PLAN-TEST-42",
				stageId: "stage_1",
				stageNumber: 1,
				stageTitle: stage.title,
				estimatedDurationMinutes: 45,
				durationMinutes: 45,
				services: stage.items.map((it) => ({
					code804n: it.code804n,
					name: it.name,
					priceRub: it.priceRub,
					quantity: it.quantity || 1,
				})),
			};

			useScheduleStore.getState().setPendingStageBooking(stageSlot);
			useUiSurfaceStore.getState().openDrawer("quick_booking");

			expect(useScheduleStore.getState().pendingStageBooking).toEqual(stageSlot);
			expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");

			// Clean up store
			useScheduleStore.getState().setPendingStageBooking(null);
			useUiSurfaceStore.getState().closeDrawer();
		});
	});

	describe("3. Doctor Autonomy (Mandate 8e): Percentage & Fixed Ruble Discounts", () => {
		it("applies fixed ruble discount proportionally across stages without precision loss", () => {
			const initialTotalRub = standardTier.totalRub;
			const discountRub = 15000;

			const discountedStages = applyDoctorFixedDiscountToStages(standardTier.stages, discountRub);
			const recalculatedTier = recalculateTierTotals(standardTier, discountedStages);

			const difference = Math.abs(recalculatedTier.totalRub - (initialTotalRub - discountRub));
			expect(difference).toBeLessThanOrEqual(5);
		});

		it("applies discount exclusively to a target stage when stageNumber is provided", () => {
			const stage1Initial = standardTier.stages.find((s) => s.stageNumber === 1)!.totalRub;
			const stage2Initial = standardTier.stages.find((s) => s.stageNumber === 2)!.totalRub;

			// Apply 20% discount ONLY to Stage 1
			const discountedStages = applyDoctorDiscountToStages(standardTier.stages, 20, 1);
			const stage1Discounted = discountedStages.find((s) => s.stageNumber === 1)!.totalRub;
			const stage2Discounted = discountedStages.find((s) => s.stageNumber === 2)!.totalRub;

			// Stage 1 reduced by 20%
			expect(stage1Discounted).toBe(Math.round(stage1Initial * 0.8));
			// Stage 2 remains unchanged
			expect(stage2Discounted).toBe(stage2Initial);
		});

		it("allows 100% warranty discount reducing plan price to 0 ₽", () => {
			const discountedStages = applyDoctorDiscountToStages(standardTier.stages, 100);
			const recalculatedTier = recalculateTierTotals(standardTier, discountedStages);

			expect(recalculatedTier.totalRub).toBe(0);
		});
	});

	describe("4. Facade & Modal Consolidation", () => {
		it("renders PlanScenarioComparisonModal facade cleanly delegating to SSOT", () => {
			const html = renderToString(
				<PlanScenarioComparisonModal
					isOpen={true}
					patientName="Иванова Анна"
					doctorName="Д-р Орлов"
					isDemoMode={true}
				/>,
			);

			// Verifies comparison grid renders
			expect(html).toContain("Студия сравнения планов лечения");
			expect(html).toContain("Иванова Анна");
		});

		it("renders full TreatmentPlanPresenterModal with tools strip, FDI formula, and zero emojis", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					patientName="Кузнецов Петр"
					doctorFullName="Д-р Ковалев С. П."
					teeth={sampleTeeth}
					planId="PLAN-TEST-42"
					patientId="PAT-101"
				/>,
			);

			// Header, Tools Strip, FDI formula, Comparison cards
			expect(html).toContain('data-testid="treatment-plan-presenter-modal"');
			expect(html).toContain('data-testid="toggle-discount-panel-btn"');
			expect(html).toContain('data-testid="treatment-plan-fdi-formula"');
			expect(html).toContain('data-testid="stages-accordion-section"');

			// Zero cartoon emojis check
			const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u;
			expect(emojiRegex.test(html)).toBe(false);
		});
	});
});
