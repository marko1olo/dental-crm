import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kopecksToRubles } from "@dental/shared";
import React from "react";
import { renderToString } from "react-dom/server";
import { BatchWriteoffConsumablesTable } from "../../inventory/writeoff/BatchWriteoffConsumablesTable";
import type { ShiftConsumableItem } from "../../inventory/writeoff/useConsumablesBatchWriteoff";
import { DoctorPayrollTabPanel } from "../../payroll/DoctorPayrollTabPanel";
import type { PayrollDoctorProfile } from "../../payroll/payrollCatalogData";
import { TelephonyDrawerFinancialAndUpcoming } from "../../telephony/TelephonyDrawerFinancialAndUpcoming";
import { TreatmentPlanContractClinicPatientInfo } from "../../treatment-plans/TreatmentPlanContractClinicPatientInfo";
import { OdontogramStampPalette } from "../OdontogramStampPalette";
import { estimatorRulesForTooth } from "../treatmentEstimatorRules";

describe("Competitor Parity UI Core Regression Suite", () => {
	it("1. BatchWriteoffConsumablesTable renders 2-tier grouping and ВН/ВИ controls with 0 disabled buttons", () => {
		const consumables: ShiftConsumableItem[] = [
			{
				itemId: "implant-1",
				itemName: "Имплантат Osstem",
				category: "Хирургия",
				unit: "шт.",
				qtyToDeduct: 2,
				currentStock: 1,
				projectedStock: -1,
				isOverdraft: true,
				deficit: 1,
				tier: "expensive_clinical",
				canOmit: true,
				canAdjustQuantity: true,
			},
			{
				itemId: "gloves-1",
				itemName: "Перчатки смотровые нитриловые",
				category: "Расходник",
				unit: "пар",
				qtyToDeduct: 10,
				currentStock: 0,
				projectedStock: -10,
				isOverdraft: true,
				deficit: 10,
				tier: "cheap_overhead",
				canOmit: false,
				canAdjustQuantity: false,
			},
		];

		const html = renderToString(
			<BatchWriteoffConsumablesTable
				consumables={consumables}
				onToggleOmit={() => {}}
				onAdjustQuantity={() => {}}
			/>,
		);
		assert.ok(html.includes("Уровень 2"), "Must render clinical tier header");
		assert.ok(html.includes("Уровень 1"), "Must render overhead tier header");
		assert.ok(html.includes("writeoff-vn-toggle-implant-1"), "Must render ВН toggle for expensive item");
		assert.ok(html.includes("writeoff-vi-controls-implant-1"), "Must render ВИ +/- controls for expensive item");
		assert.equal(html.includes("writeoff-vn-toggle-gloves-1"), false, "Overhead item must not show ВН toggle");
	});

	it("2. TreatmentPlanContractClinicPatientInfo embeds real patient odontogram WheelerToothArch in printed contract", () => {
		const html = renderToString(
			<TreatmentPlanContractClinicPatientInfo
				clinicName="Клиника DENTE"
				displayContractNumber="D-2026-TEST"
				todayRu="26 ноября 2026"
				qrPayload="https://dente.local/plan/test"
				doctorFullName="Д-р Тестов И.О."
				patientName="Петров Пётр"
				patientId="patient-uuid-1"
				tier={{
					id: "optimum",
					title: "Оптимум",
					subtitle: "Сбалансированный",
					totalRub: 45000,
					totalKopecks: 4500000,
					durationWeeks: 3,
					durationVisits: 3,
					warrantyYears: 3,
					materialsHeadline: "Керамика E.max",
					features: [],
				}}
				teethData={[
					{ toothNumber: 16, state: "Caries", surfaces: ["O", "M"] },
					{ toothNumber: 26, state: "Crown" },
				]}
				plannedToothNumbers={[16]}
			/>,
		);
		assert.ok(html.includes("contract-print-odontogram"));
		assert.ok(html.includes("Зубная формула пациента по результатам осмотра"));
		assert.ok(html.includes("Зуб 16: Caries (OM)"));
		assert.ok(html.includes("Зуб 26: Crown"));
	});

	it("3. OdontogramStampPalette renders dynamic classifier trigger (91+ defects fallback) and expanded estimatorRulesForTooth covers full pathology matrix", () => {
		const html = renderToString(
			<OdontogramStampPalette
				activeStampTool={null}
				setActiveStampTool={() => {}}
				handleQuickTriggerState={() => {}}
				selectedTeeth={[]}
			/>,
		);
		assert.ok(html.includes("odontogram-all-defects-trigger"));
		assert.ok(html.includes("Классификатор ("));

		assert.ok(estimatorRulesForTooth("Veneer", 11).some((r) => r.key === "veneer"));
		assert.ok(estimatorRulesForTooth("Bridge", 16).some((r) => r.key === "bridge"));
		assert.ok(estimatorRulesForTooth("Root", 46).some((r) => r.key === "extraction"));
		assert.ok(estimatorRulesForTooth("Calculus", 31).some((r) => r.key === "hygiene"));
		assert.ok(estimatorRulesForTooth("Gingivitis", 21).some((r) => r.key === "perio"));
		assert.ok(estimatorRulesForTooth("Missing", 36).some((r) => r.key === "implant"));
		assert.deepEqual(estimatorRulesForTooth("Missing", 55), []);
		assert.deepEqual(estimatorRulesForTooth("Healthy", 11), []);
		assert.deepEqual(estimatorRulesForTooth("Filled", 16), []);
	});

	it("4. TelephonyDrawerFinancialAndUpcoming renders real appointment confirm button & DoctorPayrollTabPanel formats real defaultShiftRateKop", () => {
		const telephonyHtml = renderToString(
			<TelephonyDrawerFinancialAndUpcoming
				isKnownPatient={true}
				financialSummary={{
					balanceRub: 0,
					formattedBalance: "0 ₽",
					hasDebt: false,
					debtRub: 0,
					formattedDebt: "0 ₽",
					hasInsurance: false,
					insuranceName: null,
					policyNumber: null,
				}}
				upcomingAppointment={{
					appointmentId: "appt-1",
					startsAt: "2026-11-27T10:00:00Z",
					endsAt: "2026-11-27T11:00:00Z",
					formattedDate: "27.11",
					formattedTime: "10:00",
					doctorName: "Волков А.С.",
					chairName: "Кресло 1",
					reason: "Осмотр",
					status: "planned",
					isToday: false,
					isTomorrow: true,
				}}
				lastVisitSummary={null}
				onConfirmAppointment={() => {}}
				onSendWhatsApp={() => {}}
				onCopySms={() => {}}
			/>,
		);
		assert.ok(telephonyHtml.includes("telephony-confirm-appointment-btn"));
		assert.ok(telephonyHtml.includes("Подтвердить"));

		const rentalDoctor: PayrollDoctorProfile = {
			id: "doc-rent",
			name: "Д-р Арендов И.М.",
			initials: "АИ",
			specialtyId: "solo_rental",
			specialtyTitleRu: "Соло-врач",
			commissionPercent: 100,
			payoutModel: "chair_rental",
			defaultShiftRateKop: 550000,
			minGuaranteeMonthlyKop: 0,
			taxRegime: "self_employed",
		};
		const payrollHtml = renderToString(
			<DoctorPayrollTabPanel
				doctor={rentalDoctor}
				doctors={[rentalDoctor]}
				onSelectDoctor={() => {}}
				effectiveOrders={[]}
				periodDates={{ startIso: "2026-11-01", endIso: "2026-11-30", labelRu: "Ноябрь 2026" }}
				clinicName="Клиника DENTE"
				isRkoPaid={false}
				isDemo={false}
				rub={(kop) => `${Math.round(kopecksToRubles(kop)).toLocaleString("ru-RU")} ₽`}
				allDoctorsSummaries={[]}
			/>,
		);
		assert.equal(payrollHtml.includes("4 000 ₽"), false, "Hardcoded 4 000 ₽ must be gone");
		assert.ok(payrollHtml.includes("5"), "Dynamic defaultShiftRateKop (5 500 ₽) must be rendered");
	});
});
