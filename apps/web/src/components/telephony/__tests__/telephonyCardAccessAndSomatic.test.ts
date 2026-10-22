import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { resolvePatientSomaticAlerts } from "../../../store/telephonyClinical";
import type { Patient, PatientInsight } from "@dental/shared";

describe("Telephony Patient Card Access & Somatic Alerts (Mandates 8b, 8d, 8e)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	const drawerPanelPath = path.resolve(srcDir, "components/telephony/drawerModules/TelephonyActiveCallPanel.tsx");
	const callerCardPath = path.resolve(srcDir, "components/telephony/IncomingCallerCard.tsx");
	const quickActionsPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/useIncomingCallQuickActions.ts");

	it("1. Existing Patient: 1-Click Card Access Without Resetting Active Form 043/u Visit", () => {
		const quickActionsSource = fs.readFileSync(quickActionsPath, "utf-8");
		assert.ok(
			quickActionsSource.includes("const handleToggleCardDrawer = () => {"),
			"IncomingCallPopup controller must provide handleToggleCardDrawer",
		);
		assert.ok(
			quickActionsSource.includes("toggleCallDrawer();"),
			"IncomingCallPopup controller must toggle drawer state without calling setCurrentView('patients')",
		);
		assert.ok(
			quickActionsSource.includes('if (currentView === "visit") {'),
			"Must check if currentView === 'visit' before full page navigation",
		);
		assert.ok(
			quickActionsSource.includes("Приём пациента активен. Карта доступна в текущей шторке без сброса визита."),
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

		const drawerPanelSource = fs.readFileSync(drawerPanelPath, "utf-8");
		const callerCardSource = fs.readFileSync(callerCardPath, "utf-8");

		assert.ok(drawerPanelSource.includes("somaticAlerts.map"), "TelephonyDrawer panel must render somatic alerts list");
		assert.ok(callerCardSource.includes("allergyAlerts.length > 0"), "IncomingCallerCard must render dedicated allergy pill");
	});
});
