import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("Portal Domain SSOT Consolidation & Zero-Bloat Inquisition (Mandates 8s, 8d pt 7, 8e)", async (t) => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	const portalDir = path.resolve(srcDir, "components/portal");
	const patientPortalDir = path.resolve(srcDir, "components/patient-portal");

	const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

	await t.test(
		"1. Canonical portal directory contains all required core modules as authoritative SSOT (Mandate 8s)",
		() => {
			const expectedFiles = [
				"PatientFriendlyOdontogram.tsx",
				"PatientPlanView.tsx",
				"PatientPortalTreatmentStageCard.tsx",
				"patientWebappEngine.ts",
				"PatientBudgetSignView.tsx",
				"patientPortalEngine.ts",
				"patientPortalPresets.ts",
				"patientPortalTypes.ts",
				"index.ts",
			];

			for (const file of expectedFiles) {
				const fullPath = path.join(portalDir, file);
				assert.ok(
					fs.existsSync(fullPath),
					`Expected canonical SSOT file ${file} to exist in components/portal/`,
				);
			}
		},
	);

	await t.test(
		"2. components/portal/index.ts exports all modules directly with zero circular dependency on patient-portal",
		() => {
			const portalIndexSource = fs.readFileSync(
				path.join(portalDir, "index.ts"),
				"utf-8",
			);

			assert.ok(
				!portalIndexSource.includes('export * from "../patient-portal"'),
				"portal/index.ts must not have backwards dependency on ../patient-portal",
			);
			assert.ok(
				portalIndexSource.includes('export * from "./PatientFriendlyOdontogram.js"'),
				"portal/index.ts must export PatientFriendlyOdontogram directly",
			);
			assert.ok(
				portalIndexSource.includes('export * from "./PatientPlanView.js"'),
				"portal/index.ts must export PatientPlanView directly",
			);
			assert.ok(
				portalIndexSource.includes('export * from "./PatientPortalTreatmentStageCard.js"'),
				"portal/index.ts must export PatientPortalTreatmentStageCard directly",
			);
			assert.ok(
				portalIndexSource.includes('export * from "./patientWebappEngine.js"'),
				"portal/index.ts must export patientWebappEngine directly",
			);
		},
	);

	await t.test(
		"3. Legacy patient-portal/ directory files are ultra-thin delegation facades (<25 lines each)",
		() => {
			const facadeFiles = [
				"index.ts",
				"PatientFriendlyOdontogram.tsx",
				"PatientPlanView.tsx",
				"PatientPortalTreatmentStageCard.tsx",
				"patientWebappEngine.ts",
			];

			for (const file of facadeFiles) {
				const fullPath = path.join(patientPortalDir, file);
				assert.ok(fs.existsSync(fullPath), `Facade file ${file} must exist`);
				const source = fs.readFileSync(fullPath, "utf-8");
				const lines = source.split("\n");
				assert.ok(
					lines.length <= 25,
					`Facade ${file} must be <= 25 lines, got ${lines.length}`,
				);
				assert.ok(
					source.includes("../portal/"),
					`Facade ${file} must delegate to ../portal/`,
				);
			}
		},
	);

	await t.test(
		"4. PatientCabinetModal and patientCabinetEngine import from canonical local portal modules",
		() => {
			const modalSource = fs.readFileSync(
				path.join(portalDir, "patientCabinet/PatientCabinetModal.tsx"),
				"utf-8",
			);
			assert.ok(
				modalSource.includes('import { PatientPlanView } from "../PatientPlanView'),
				"PatientCabinetModal must import PatientPlanView from ../PatientPlanView",
			);
			assert.ok(
				!modalSource.includes("../../patient-portal/PatientPlanView"),
				"PatientCabinetModal must not import from ../../patient-portal/",
			);

			const engineSource = fs.readFileSync(
				path.join(portalDir, "patientCabinet/patientCabinetEngine.ts"),
				"utf-8",
			);
			assert.ok(
				engineSource.includes('from "../PatientFriendlyOdontogram.js"'),
				"patientCabinetEngine must import from ../PatientFriendlyOdontogram.js",
			);
			assert.ok(
				!engineSource.includes("../../patient-portal/"),
				"patientCabinetEngine must not import from ../../patient-portal/",
			);
		},
	);

	await t.test(
		"5. Zero cartoon emojis in all portal canonical and facade components (Mandate 8d pt 7)",
		() => {
			const filesToCheck = [
				path.join(portalDir, "PatientFriendlyOdontogram.tsx"),
				path.join(portalDir, "PatientPlanView.tsx"),
				path.join(portalDir, "PatientPortalTreatmentStageCard.tsx"),
				path.join(portalDir, "PatientBudgetSignView.tsx"),
				path.join(portalDir, "index.ts"),
			];

			for (const filePath of filesToCheck) {
				const source = fs.readFileSync(filePath, "utf-8");
				const lines = source.split("\n");
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					assert.ok(
						!emojiRegex.test(line),
						`Found cartoon emoji in ${path.basename(filePath)}:${i + 1}: ${line.trim()}`,
					);
				}
			}
		},
	);
});
