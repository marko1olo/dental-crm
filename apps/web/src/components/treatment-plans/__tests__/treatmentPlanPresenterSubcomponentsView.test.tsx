/**
 * treatmentPlanPresenterSubcomponentsView.test.tsx — визуальные компоненты презентера.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import { expect } from "./helpers/signatureTestHelpers";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { TreatmentPlanStagesList } from "../presenterModules/TreatmentPlanStagesList";
import { TreatmentPlanPaymentSchedule } from "../presenterModules/TreatmentPlanPaymentSchedule";
import { TreatmentPlanAcceptanceFooter } from "../presenterModules/TreatmentPlanAcceptanceFooter";
import { mockStandardTierPresenter, mockTiersPresenter } from "./helpers/presenterModulesTestHelpers";

describe("Treatment Plan Presenter — Модули отображения", () => {
	it("renders TreatmentPlanStagesList with GPU acceleration and 44px touch targets", () => {
		const html = renderToString(
			<TreatmentPlanStagesList
				tier={mockStandardTierPresenter}
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
				tier={mockStandardTierPresenter}
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

	it("renders TreatmentPlanAcceptanceFooter and full TreatmentPlanPresenterModal", () => {
		const htmlFooter = renderToString(
			<TreatmentPlanAcceptanceFooter
				selectedTier={mockStandardTierPresenter}
				isChoiceConfirmed={false}
				onConfirmPatientChoice={() => {}}
				onPrintAppendix={() => {}}
			/>
		);

		expect(htmlFooter).toContain("data-testid=\"treatment-plan-acceptance-footer\"");
		expect(htmlFooter).toContain("Подпись на планшете");
		expect(htmlFooter).toContain("Печать формы");
		expect(htmlFooter).toContain("Пациент выбрал");

		const htmlModal = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				patientName="Кузнецов Михаил Андреевич"
				doctorFullName="Д-р Петров Сергей Иванович"
				tiers={mockTiersPresenter}
				initialSelectedTierId="standard"
			/>
		);

		expect(htmlModal).toContain("data-testid=\"treatment-plan-presenter-modal\"");
		expect(htmlModal).toContain("Кузнецов Михаил Андреевич");
		expect(htmlModal).toContain("Рекомендация врача");
	});
});
