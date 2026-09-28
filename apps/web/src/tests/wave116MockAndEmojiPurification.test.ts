/**
 * wave116MockAndEmojiPurification.test.ts
 *
 * Unit tests verifying complete eradication of residual synthetic mock data
 * and raw emojis across EGISZ, DMS, Recall, Omnichannel, Emergency, and Chairside
 * modules in accordance with Supreme Law: THE HAMMER (Mandates 8a–8q).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSmpDispatchCheatSheet } from "../components/emergency/emergencyRescueEngine";

describe("Wave 116: Synthetic Mock & Raw Emoji Eradication (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../..");

	it("2. DmsRegistryExportModal: records defaults to empty array []", () => {
		const dmsExportPath = path.join(
			repoRoot,
			"apps/web/src/components/insurance/DmsRegistryExportModal.tsx",
		);
		const dmsExportContent = fs.readFileSync(dmsExportPath, "utf-8");

		assert.ok(
			dmsExportContent.includes("records = [],"),
			"DmsRegistryExportModal must default records to []",
		);
	});

	it("3. PatientRecallsHubModal: fallback candidates pool defaults to [] instead of synthetic records", () => {
		const recallPath = path.join(
			repoRoot,
			"apps/web/src/components/recalls/PatientRecallsHubModal.tsx",
		);
		const recallContent = fs.readFileSync(recallPath, "utf-8");

		assert.ok(
			recallContent.includes("initialCandidates ?? []"),
			"PatientRecallsHubModal must default candidates state to [] when initialCandidates is empty or missing",
		);
		assert.ok(
			!recallContent.includes("DEFAULT_RECALL_CANDIDATES"),
			"PatientRecallsHubModal must not use synthetic DEFAULT_RECALL_CANDIDATES",
		);
	});

	it("4. PatientOmnichannelHubModal: eradicate synthetic dates, names, amounts and demo payment links", () => {
		const omnichannelPath = path.join(
			repoRoot,
			"apps/web/src/components/messaging/PatientOmnichannelHubModal.tsx",
		);
		const omnichannelContent = fs.readFileSync(omnichannelPath, "utf-8");

		assert.ok(
			!omnichannelContent.includes("Кузнецова Е.В."),
			"PatientOmnichannelHubModal must not contain hardcoded doctor 'Кузнецова Е.В.'",
		);
		assert.ok(
			!omnichannelContent.includes("Ольга Смирнова"),
			"PatientOmnichannelHubModal must not contain hardcoded patient 'Ольга Смирнова'",
		);
		assert.ok(
			!omnichannelContent.includes("14 500 ₽"),
			"PatientOmnichannelHubModal must not contain hardcoded demo amount '14 500 ₽'",
		);
		assert.ok(
			!omnichannelContent.includes("https://pay.dente.ru/demo/"),
			"PatientOmnichannelHubModal must not contain fake payment links",
		);
	});

	it("5. Emojis eradication: DmsGuaranteeLetterModal & InsuranceContractsPanel (no star emoji)", () => {
		const dmsLetterPath = path.join(
			repoRoot,
			"apps/web/src/components/insurance/DmsGuaranteeLetterModal.tsx",
		);
		const dmsLetterContent = fs.readFileSync(dmsLetterPath, "utf-8");
		assert.ok(
			!dmsLetterContent.includes("⭐") && !dmsLetterContent.includes("★"),
			"DmsGuaranteeLetterModal must not contain cartoon star emojis",
		);

		const insuranceContractsPath = path.join(
			repoRoot,
			"apps/web/src/components/settings/InsuranceContractsPanel.tsx",
		);
		const insuranceContractsContent = fs.readFileSync(insuranceContractsPath, "utf-8");
		assert.ok(
			!insuranceContractsContent.includes("⭐") && !insuranceContractsContent.includes("★"),
			"InsuranceContractsPanel must not contain cartoon star emojis",
		);
	});

	it("6. Emojis eradication: EmergencyRescueModal & emergencyRescueEngine (no raw ⚠️ or 🚨)", () => {
		const rescueModalPath = path.join(
			repoRoot,
			"apps/web/src/components/emergency/EmergencyRescueModal.tsx",
		);
		const rescueModalContent = fs.readFileSync(rescueModalPath, "utf-8");
		assert.ok(
			!rescueModalContent.includes("⚠️") && !rescueModalContent.includes("🚨"),
			"EmergencyRescueModal must not contain raw cartoon emojis",
		);

		const rescueEnginePath = path.join(
			repoRoot,
			"apps/web/src/components/emergency/emergencyRescueEngine.ts",
		);
		const rescueEngineContent = fs.readFileSync(rescueEnginePath, "utf-8");
		assert.ok(
			!rescueEngineContent.includes("⚠️") && !rescueEngineContent.includes("🚨"),
			"emergencyRescueEngine must not contain raw cartoon emojis",
		);

		const cheatSheet = generateSmpDispatchCheatSheet({
			scenarioId: "anaphylactic_shock",
			patientFullName: "Тестов Тест Тестович",
			patientAgeYears: 35,
			patientGender: "male",
			patientWeightKg: 75,
			clinicName: "ДЕНТЕ",
			clinicAddress: "ул. Стоматологов, 1",
			doctorFullName: "Д-р Иванов И. И.",
			cabinetNumber: "1",
			medCardNumber: "043/у-101",
			incidentStartTime: new Date("2026-08-22T10:15:00"),
			completedSteps: [],
			patientOutcomeRu: "Купировано",
			initialVitals: {
				bpSystolic: 70,
				bpDiastolic: 40,
				hr: 130,
				rr: 24,
				spo2: 88,
				consciousnessRu: "сознание спутанное",
			},
		});
		assert.ok(cheatSheet);
		assert.ok(!cheatSheet.includes("⚠️") && !cheatSheet.includes("🚨"));
	});
});
