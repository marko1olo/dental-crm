/**
 * treatmentPlanPresenterFdiAndBooking.test.tsx — формула FDI (11..48) и 1-клик запись/ЗТЛ.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterDentalFormula } from "../presenterModules/TreatmentPlanPresenterDentalFormula";
import { TreatmentPlanPresenterComparisonTab } from "../TreatmentPlanPresenterComparisonTab";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { sampleTeethSsot, sampleTiersSsot, standardTierSsot } from "./helpers/ssotTestHelpers";

describe("Treatment Plan Presenter — FDI Formula & 1-Click Handoff", () => {
	it("renders both upper and lower arches with correct FDI numbers and stage badges", () => {
		const html = renderToString(<TreatmentPlanPresenterDentalFormula tier={standardTierSsot} teeth={sampleTeethSsot} />);
		expect(html).toContain('data-testid="presenter-fdi-tooth-16"');
		expect(html).toContain('data-testid="presenter-fdi-tooth-11"');
		expect(html).toContain('data-testid="presenter-fdi-tooth-24"');
		expect(html).toContain('data-testid="presenter-fdi-tooth-36"');
		expect(html).toContain('data-testid="presenter-fdi-tooth-46"');
		expect(html).toContain("В тарифе задействовано:");
		expect(html).toContain("Э1");
	});

	it("renders 1-click stage booking button and lab order button", () => {
		const html = renderToString(
			<TreatmentPlanPresenterComparisonTab
				allTiers={sampleTiersSsot}
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
				teeth={sampleTeethSsot}
				planId="PLAN-TEST-42"
				patientId="PAT-101"
				patientName="Кузнецов Петр"
			/>
		);

		expect(html).toContain('data-testid="stage-book-btn-1"');
		expect(html).toContain("Записать 1-й этап");
		expect(html).toContain('data-testid="stage-book-btn-2"');
		expect(html).toContain('data-testid="stage-book-btn-3"');
		expect(html).toContain('data-testid="stage-lab-order-btn-3"');
		expect(html).toContain("Заказ ЗТЛ");
	});

	it("dispatches stage booking payload correctly to scheduleStore and uiSurfaceStore", () => {
		const stage = standardTierSsot.stages[0]!;
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

		useScheduleStore.getState().setPendingStageBooking(null);
		useUiSurfaceStore.getState().closeDrawer();
	});
});
