/**
 * treatmentPlanPresenterFdiAndBooking.test.tsx — формула FDI (11..48) и 1-клик запись/ЗТЛ.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import { expect } from "./helpers/signatureTestHelpers";
import { renderToString } from "react-dom/server";
import { TreatmentPlanStagesList } from "../presenterModules/TreatmentPlanStagesList";
import { TreatmentPlanAcceptanceFooter } from "../presenterModules/TreatmentPlanAcceptanceFooter";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { sampleTeethSsot, sampleTiersSsot, standardTierSsot } from "./helpers/ssotTestHelpers";

describe("Treatment Plan Presenter — FDI Formula & 1-Click Handoff", () => {
	it("renders clinical stages and FDI formula header with correct badges", () => {
		const html = renderToString(
			<TreatmentPlanStagesList
				activeTier={standardTierSsot as any}
				onToggleStage={() => {}}
				showMicroConsumables={false}
			/>
		);
		expect(html).toContain('data-testid="treatment-plan-fdi-formula"');
		expect(html).toContain("Зубная формула плана:");
		expect(html).toContain("FDI 11–48");
		expect(html).toContain('data-testid="stages-accordion-section"');
		expect(html).toContain("Клинические этапы плана");
	});

	it("renders 1-click stage payment and acceptance footer actions", () => {
		const html = renderToString(
			<TreatmentPlanAcceptanceFooter
				activeTier={standardTierSsot as any}
				selectedTierId="standard"
				getTierLetter={(id) => `Тариф ${id}`}
				onConfirmChoice={() => {}}
			/>
		);

		expect(html).toContain('data-testid="treatment-plan-acceptance-footer"');
		expect(html).toContain('data-testid="confirm-patient-choice-btn"');
		expect(html).toContain("Сумма к оплате:");
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
