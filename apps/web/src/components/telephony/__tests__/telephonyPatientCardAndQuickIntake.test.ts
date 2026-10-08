import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import {
	resolvePatientActiveTreatmentPlan,
	resolvePatientSomaticAlerts,
	calculatePatientFinancialStatus,
} from "../../../store/telephonyClinical";
import type {
	Patient,
	PatientInsight,
	TreatmentPlanItem,
	TreatmentPlanScenario,
} from "@dental/shared";

describe("Telephony + Patient Registry & Fast Clinical Intake Suite (Mandates 8b, 8d, 8e, 8n, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
	const drawerPath = path.resolve(srcDir, "components/telephony/TelephonyDrawer.tsx");
	const popupSource = fs.readFileSync(popupPath, "utf-8");
	const drawerSource = fs.readFileSync(drawerPath, "utf-8");

	it("1. Existing Patient: 1-Click Card Access Without Resetting Active Form 043/u Visit (Doctor Autonomy)", () => {
		// Drawer toggle retains doctor context
		assert.ok(
			popupSource.includes("const handleToggleCardDrawer = () => {"),
			"IncomingCallPopup must provide handleToggleCardDrawer",
		);
		assert.ok(
			popupSource.includes("toggleCallDrawer();"),
			"IncomingCallPopup must toggle drawer state without calling setCurrentView('patients')",
		);

		// Route guard against abandoning active 043/u visit
		assert.ok(
			popupSource.includes('if (currentView === "visit") {'),
			"Must check if currentView === 'visit' before full page navigation",
		);
		assert.ok(
			popupSource.includes("Приём пациента активен. Карта доступна в текущей шторке без сброса визита."),
			"Must warn doctor that active visit is preserved and card is accessible in current drawer",
		);
	});

	it("2. Existing Patient: Instant Somatic Status (Allergies & Contraindications)", () => {
		const samplePatient: Partial<Patient> = {
			id: "pat-101",
			fullName: "Иванов Иван Иванович",
			phone: "+79991112233",
			notes: "Аллергия на лидокаин и новокаин. Кардиостимулятор.",
		};

		const sampleInsight: Partial<PatientInsight> = {
			patientId: "pat-101",
			riskLevel: "high",
			clinicalFlags: ["Аллергия на анестетики", "Острая боль"],
			balanceDueRub: 0,
		};

		const alerts = resolvePatientSomaticAlerts(
			samplePatient as Patient,
			sampleInsight as PatientInsight,
		);

		assert.ok(alerts.length >= 2, "Must resolve multiple somatic alerts");
		const hasAllergy = alerts.some((a) => a.category === "allergy");
		const hasPain = alerts.some((a) => a.category === "pain");
		const hasPacemaker = alerts.some((a) => a.label.includes("Кардиостимулятор"));

		assert.ok(hasAllergy, "Must identify anesthesia allergy");
		assert.ok(hasPain, "Must identify acute pain flag");
		assert.ok(hasPacemaker, "Must identify pacemaker contraindication for ultrasonic scalers");

		// Check UI rendering in TelephonyDrawer and IncomingCallPopup
		assert.ok(
			drawerSource.includes("somaticAlerts.map"),
			"TelephonyDrawer must render somatic alerts list",
		);
		assert.ok(
			popupSource.includes("allergyAlerts.length > 0"),
			"IncomingCallPopup must render dedicated allergy pill",
		);
	});

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
		assert.equal(
			planSummary.nextService,
			"Формирователь десны и металлокерамическая коронка (зуб 36)",
		);

		// TelephonyDrawer & IncomingCallPopup UI assertions
		assert.ok(
			drawerSource.includes('data-testid="telephony-drawer-active-plan-card"'),
			"TelephonyDrawer must render dedicated active treatment plan card",
		);
		assert.ok(
			popupSource.includes('data-testid="incoming-call-active-plan-badge"'),
			"IncomingCallPopup must render active treatment plan badge in caller snapshot",
		);
	});

	it("4. New Patient: 1-Click Fast Intake Without Bureaucratic Red Tape (SNILS/Passport/INN Free)", () => {
		// Verify handleQuickCreatePatient payload in IncomingCallPopup
		assert.ok(
			popupSource.includes("const targetName = entered.trim() || `Пациент ${formattedPhone}`;"),
			"Must auto-populate default fallback name 'Пациент {phone}' if doctor does not enter custom name",
		);
		assert.ok(
			popupSource.includes("body: JSON.stringify({\n\t\t\t\t\tfullName: targetName,\n\t\t\t\t\tphone: currentCall.phone,\n\t\t\t\t}),"),
			"Payload must contain strictly fullName and phone, with zero mandatory bureaucratic fields",
		);

		// Verify 5-second quick registration button and test id in TelephonyDrawer
		assert.ok(
			drawerSource.includes('data-testid="drawer-quick-create-patient-btn"'),
			"TelephonyDrawer must provide drawer-quick-create-patient-btn",
		);
		assert.ok(
			drawerSource.includes('data-testid="drawer-new-patient-name-input"'),
			"TelephonyDrawer must provide drawer-new-patient-name-input",
		);
		assert.ok(
			drawerSource.includes("+ Создать пациента за 5 секунд"),
			"Must provide explicit 5-second clinical button label",
		);

		// Verify quick registration in IncomingCallPopup
		assert.ok(
			popupSource.includes('data-testid="popup-drawer-quick-create-patient-btn"'),
			"IncomingCallPopup must provide popup-drawer-quick-create-patient-btn",
		);
		assert.ok(
			popupSource.includes('data-testid="popup-drawer-new-patient-name-input"'),
			"IncomingCallPopup must provide popup-drawer-new-patient-name-input",
		);
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
