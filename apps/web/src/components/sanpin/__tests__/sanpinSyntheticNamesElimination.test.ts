import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSanpinShiftAutopilotBundle } from "@dental/shared";
import {
	computeExpressStandardCycleValues,
	EXPRESS_CYCLE_DEFAULTS,
} from "../autoclaveLog/AutoclaveNewCycleTab.js";
import {
	createQuickClassBWasteRecord,
	createQuickClassGWasteRecord,
} from "../waste/medicalWasteEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sanpinDir = path.resolve(__dirname, "..");

const BANNED_SYNTHETIC_NAMES = [
	"Иванова О.С.",
	"Иванова М. П.",
	"Смирнова Анна Викторовна",
	"Петрова Елена Сергеевна",
	"Иванова Ольга Николаевна",
	"Смирнова О. И.",
];

describe("SanPiN Registers — Synthetic Names Elimination & Regulatory Roles Verification (Wave 105)", () => {
	it("verifies elimination of banned synthetic names from production SanPiN components", () => {
		const targetFiles = [
			"SanpinRegisters.tsx",
			"AutoclaveRegisterTab.tsx",
			"GeneralCleaningRegisterTab.tsx",
			"EmergencyBiohazardRegisterTab.tsx",
			"BactericidalRegisterTab.tsx",
			"PsoRegisterTab.tsx",
			"RetroactiveBatchTab.tsx",
			"RetroactiveSanpinBatchModal.tsx",
			"autoclaveLog/AutoclaveJournal257Tab.tsx",
			"autoclaveLog/AutoclaveNewCycleTab.tsx",
			"autoclaveLog/AutoclaveLog257Modal.tsx",
			"waste/MedicalWasteJournalModal.tsx",
			"waste/medicalWasteEngine.ts",
		];

		for (const relPath of targetFiles) {
			const fullPath = path.join(sanpinDir, relPath);
			assert.ok(fs.existsSync(fullPath), `Target file exists: ${relPath}`);
			const content = fs.readFileSync(fullPath, "utf8");

			for (const banned of BANNED_SYNTHETIC_NAMES) {
				assert.ok(
					!content.includes(banned),
					`Found banned synthetic name "${banned}" in ${relPath}`,
				);
			}
		}
	});

	it("verifies regulatory statutory roles are used as clean defaults", () => {
		// 1. Autoclave express cycle defaults
		assert.equal(EXPRESS_CYCLE_DEFAULTS.defaultOperatorName, "Сотрудник клиники");
		const expressValues = computeExpressStandardCycleValues({});
		assert.equal(expressValues.operatorFullName, "Сотрудник клиники");

		// 2. Shared autopilot shift bundle
		const bundle = generateSanpinShiftAutopilotBundle();
		assert.equal(bundle.operatorFullName, "Медсестра ЦСО");
		assert.equal(bundle.headNurseFullName, "Главная медсестра");

		// 3. Quick waste records
		const wasteB = createQuickClassBWasteRecord();
		assert.equal(wasteB.operatorStaffFullName, "Медсестра процедурного кабинета");
		assert.equal(wasteB.operatorStaffPosition, "Медсестра процедурного кабинета");

		const wasteG = createQuickClassGWasteRecord();
		assert.equal(wasteG.operatorStaffFullName, "Старшая медицинская сестра");
		assert.equal(wasteG.operatorStaffPosition, "Старшая медицинская сестра");
	});
});
