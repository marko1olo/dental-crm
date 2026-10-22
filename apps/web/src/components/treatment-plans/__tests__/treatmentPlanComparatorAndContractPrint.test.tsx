/**
 * treatmentPlanComparatorAndContractPrint.test.tsx — модалка сравнения и печать договора.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPhased4StageView } from "../TreatmentPlanPhased4StageView";
import { TreatmentPlanComparatorModal } from "../comparator/TreatmentPlanComparatorModal";
import { TreatmentPlanContractPrint } from "../TreatmentPlanContractPrint";
import { sampleStages3Tier, sampleTiers3Tier } from "./helpers/threeTierTestHelpers";

describe("Treatment Plan — Студия сравнения и печать договора", () => {
	it("renders TreatmentPlanPhased4StageView with sticky bottom grand totals and action bar", () => {
		const html = renderToString(
			<TreatmentPlanPhased4StageView
				stages={sampleStages3Tier}
				planTierTitle="Оптимальный план"
				patientName="Смирнова Е. В."
				onOpenInstallment={() => {}}
				onOpenStagePayment={() => {}}
				onApproveAndSign={() => {}}
				onPrintContract={() => {}}
			/>
		);

		assert.ok(html.includes("4 клинических этапа") || html.includes("4 Клинических этапа"));
		assert.ok(html.includes("Итоговая смета"));
		assert.ok(html.includes("Согласовать этап") || html.includes("Утвердить план"));
		assert.ok(html.includes("Рассрочка"));
		assert.ok(html.includes("Эскроу"));
		assert.ok(html.includes("Печать"));
	});

	it("renders TreatmentPlanComparatorModal with sticky presentation footer in demo mode", () => {
		const html = renderToString(
			<TreatmentPlanComparatorModal
				isOpen={true}
				isDemoMode={true}
				patientName="Иванов И. И."
				doctorName="Д-р Смирнов А. В."
				clinicName="Клиника DENTE"
			/>
		);

		assert.ok(html.includes("Студия сравнения планов лечения"));
		assert.ok(html.includes("plan-comparator-footer"));
		assert.ok(html.includes("Согласовать план с пациентом"));
		assert.ok(html.includes("Рассрочка 0%"));
		assert.ok(html.includes("Печать брошюры"));
	});

	it("renders authentic empty state in TreatmentPlanComparatorModal when not in demo mode", () => {
		const html = renderToString(
			<TreatmentPlanComparatorModal
				isOpen={true}
				isDemoMode={false}
				patientName="Иванов И. И."
				doctorName="Д-р Смирнов А. В."
				clinicName="Клиника DENTE"
			/>
		);

		assert.ok(html.includes("plan-comparator-empty-state"));
		assert.ok(html.includes("Варианты планов лечения пока не сформированы"));
		assert.ok(html.includes("btn-comparator-empty-close"));
	});

	it("renders TreatmentPlanContractPrint with patient-friendly mode, messenger copy, and Order 1051n consent", () => {
		const html = renderToString(
			<TreatmentPlanContractPrint
				isOpen={true}
				tier={sampleTiers3Tier[1]!}
				stages={sampleStages3Tier}
				patientName="Петрова Анна Сергеевна"
				patientId="PAT-999"
				doctorFullName="Д-р Соколов И. В."
				clinicName="Клиника DENTE"
				onClose={() => {}}
			/>
		);

		assert.ok(html.includes("data-testid=\"contract-view-patient-friendly-btn\""));
		assert.ok(html.includes("data-testid=\"contract-view-official-btn\""));
		assert.ok(html.includes("data-testid=\"contract-copy-messenger-btn\""));
		assert.ok(html.includes("1051н"));
		assert.ok(html.includes("323-ФЗ"));
	});
});
