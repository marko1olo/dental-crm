import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { resolvePatientActiveTreatmentPlan } from "../../../store/telephonyClinical";
import type { TreatmentPlanItem, TreatmentPlanScenario } from "@dental/shared";

describe("Telephony Treatment Plan Resolution & Fast Intake (Mandates 8b, 8e, 8n)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	const drawerPanelPath = path.resolve(srcDir, "components/telephony/drawerModules/TelephonyActiveCallPanel.tsx");
	const callerCardPath = path.resolve(srcDir, "components/telephony/IncomingCallerCard.tsx");
	const quickActionsPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/useIncomingCallQuickActions.ts");
	const popupDrawerPath = path.resolve(srcDir, "components/telephony/IncomingCallPatientDrawer.tsx");

	it("3. Existing Patient: Instant Active Treatment Plan Resolution & Progress Bar", () => {
		const patientId = "pat-202";
		const mockScenarios: Partial<TreatmentPlanScenario>[] = [
			{
				id: "scen-1",
				organizationId: "org-1",
				patientId,
				title: "Комплексная имплантация и протезирование",
				totalRub: 125000,
				durationMonths: 4,
				visitCount: 6,
				includedServiceIds: ["srv-1", "srv-2"],
			},
		];

		const mockItems: Partial<TreatmentPlanItem>[] = [
			{
				id: "item-1",
				organizationId: "org-1",
				patientId,
				serviceId: "srv-1",
				snapshotServiceName: "Установка имплантата Dentium SuperLine (зуб 36)",
				quantity: 1,
				unitPriceRub: 45000,
				discountRub: 0,
				status: "completed",
			},
			{
				id: "item-2",
				organizationId: "org-1",
				patientId,
				serviceId: "srv-2",
				snapshotServiceName: "Формирователь десны и металлокерамическая коронка (зуб 36)",
				quantity: 1,
				unitPriceRub: 80000,
				discountRub: 0,
				status: "in_progress",
			},
		];

		const planSummary = resolvePatientActiveTreatmentPlan(
			patientId,
			mockItems as TreatmentPlanItem[],
			mockScenarios as TreatmentPlanScenario[],
		);

		assert.equal(planSummary.hasActivePlan, true, "Must detect active treatment plan");
		assert.equal(planSummary.planTitle, "Комплексная имплантация и протезирование");
		assert.equal(planSummary.totalCostRub, 125000);
		assert.equal(planSummary.itemsCount, 2);
		assert.equal(planSummary.completedCount, 1);
		assert.equal(planSummary.pendingCount, 1);
		assert.equal(planSummary.progressPercent, 50);

		const drawerPanelSource = fs.readFileSync(drawerPanelPath, "utf-8");
		const callerCardSource = fs.readFileSync(callerCardPath, "utf-8");

		assert.ok(drawerPanelSource.includes('data-testid="telephony-drawer-active-plan-card"'));
		assert.ok(callerCardSource.includes('data-testid="incoming-call-active-plan-badge"'));
	});

	it("4. New Patient: 1-Click Fast Intake Without Bureaucratic Red Tape", () => {
		const quickActionsSource = fs.readFileSync(quickActionsPath, "utf-8");
		assert.ok(quickActionsSource.includes("const targetName = entered.trim() || `Пациент ${formattedPhone}`;"));
		assert.ok(quickActionsSource.includes("fullName: targetName,\n\t\t\t\t\tphone: currentCall.phone,"));

		const drawerPanelSource = fs.readFileSync(drawerPanelPath, "utf-8");
		const popupDrawerSource = fs.readFileSync(popupDrawerPath, "utf-8");

		assert.ok(drawerPanelSource.includes('data-testid="drawer-quick-create-patient-btn"'));
		assert.ok(drawerPanelSource.includes('data-testid="drawer-new-patient-name-input"'));
		assert.ok(drawerPanelSource.includes("+ Создать пациента за 5 секунд"));

		assert.ok(popupDrawerSource.includes('data-testid="popup-drawer-quick-create-patient-btn"'));
		assert.ok(popupDrawerSource.includes('data-testid="popup-drawer-new-patient-name-input"'));
	});

	it("5. Empty State / No Plan Safe Handling", () => {
		const emptySummary = resolvePatientActiveTreatmentPlan("unknown-patient-999", [], []);
		assert.equal(emptySummary.hasActivePlan, false);
		assert.equal(emptySummary.totalCostRub, 0);
		assert.equal(emptySummary.formattedTotalCost, "0 ₽");
		assert.equal(emptySummary.itemsCount, 0);
		assert.equal(emptySummary.nextService, null);
	});
});
