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

import { INITIAL_CABINET_DOCUMENTS } from "../EgiszSigningCabinetModal";
import { generateSmpDispatchCheatSheet } from "../../emergency/emergencyRescueEngine";

describe("Wave 116: Synthetic Mock & Raw Emoji Eradication (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	it("1. EgiszSigningCabinetModal: INITIAL_CABINET_DOCUMENTS is strictly empty array and source uses [] fallback", () => {
		// Verify exported constant is empty
		assert.deepStrictEqual(INITIAL_CABINET_DOCUMENTS, []);

		// Verify source code invariants
		const egiszPath = path.join(
			repoRoot,
			"apps/web/src/components/cmo/EgiszSigningCabinetModal.tsx",
		);
		const egiszContent = fs.readFileSync(egiszPath, "utf-8");

		assert.ok(
			egiszContent.includes("export const INITIAL_CABINET_DOCUMENTS: readonly EgiszCabinetDocumentItem[] = [];"),
			"INITIAL_CABINET_DOCUMENTS must be empty array []",
		);
		assert.ok(
			egiszContent.includes("data-testid=\"egisz-docs-empty-state\""),
			"EgiszSigningCabinetModal must contain dedicated empty-state test ID",
		);
	});

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
			!omnichannelContent.includes("29.08.2026"),
			"PatientOmnichannelHubModal must not contain hardcoded date '29.08.2026'",
		);
		assert.ok(
			!omnichannelContent.includes("SBP-ORD-DEMO"),
			"PatientOmnichannelHubModal must not contain hardcoded demo link 'SBP-ORD-DEMO'",
		);
		assert.ok(
			!omnichannelContent.includes('"15 000,00 ₽"'),
			"PatientOmnichannelHubModal must not contain hardcoded sum '15 000,00 ₽'",
		);
	});

	it("5. Emojis eradication: DmsGuaranteeLetterModal & InsuranceContractsPanel (no star emoji)", () => {
		const guaranteePath = path.join(
			repoRoot,
			"apps/web/src/components/insurance/DmsGuaranteeLetterModal.tsx",
		);
		const guaranteeContent = fs.readFileSync(guaranteePath, "utf-8");
		assert.ok(!guaranteeContent.includes("⭐"), "DmsGuaranteeLetterModal must not contain ⭐ emoji");

		const contractsPath = path.join(
			repoRoot,
			"apps/web/src/components/settings/InsuranceContractsPanel.tsx",
		);
		const contractsContent = fs.readFileSync(contractsPath, "utf-8");
		assert.ok(!contractsContent.includes("⭐"), "InsuranceContractsPanel must not contain ⭐ emoji");
	});

	it("6. Emojis eradication: EmergencyRescueModal & emergencyRescueEngine (no raw ⚠️ or 🚨)", () => {
		const rescueModalPath = path.join(
			repoRoot,
			"apps/web/src/components/emergency/EmergencyRescueModal.tsx",
		);
		const rescueModalContent = fs.readFileSync(rescueModalPath, "utf-8");
		assert.ok(!rescueModalContent.includes("⚠️"), "EmergencyRescueModal must not contain raw ⚠️ emoji");
		assert.ok(
			rescueModalContent.includes("<AlertTriangle"),
			"EmergencyRescueModal must use Lucide AlertTriangle icon instead of raw emoji",
		);

		const rescueEnginePath = path.join(
			repoRoot,
			"apps/web/src/components/emergency/emergencyRescueEngine.ts",
		);
		const rescueEngineContent = fs.readFileSync(rescueEnginePath, "utf-8");
		assert.ok(!rescueEngineContent.includes("🚨"), "emergencyRescueEngine must not contain 🚨 emoji");

		// Test function output
		const sampleInput = {
			scenarioId: "anaphylactic_shock" as const,
			clinicName: "ООО Денте",
			clinicAddress: "ул. Ленина 10",
			cabinetNumber: "2",
			doctorFullName: "Врач А.Б.",
			patientFullName: "Пациент В.Г.",
			patientAgeYears: 35,
			patientGender: "female" as const,
			patientWeightKg: 65,
			medCardNumber: "043/у-2026",
			incidentStartTime: "2026-09-11T12:00:00Z",
			completedSteps: [],
			patientOutcomeRu: "Купировано",
			initialVitals: {
				bpSystolic: 80,
				bpDiastolic: 50,
				hr: 115,
				spo2: 91,
				rr: 24,
				consciousnessRu: "Сохранено, заторможен",
			},
		};
		const cheatSheet = generateSmpDispatchCheatSheet(sampleInput);
		assert.ok(!cheatSheet.includes("🚨"), "Ambulance cheat sheet must not contain 🚨 emoji");
		assert.ok(cheatSheet.includes("[ЭКСТРЕННО]"), "Ambulance cheat sheet must include [ЭКСТРЕННО] marker");
	});
});