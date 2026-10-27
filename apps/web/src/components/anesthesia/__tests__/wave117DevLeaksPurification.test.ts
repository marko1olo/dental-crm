/**
 * wave117DevLeaksPurification.test.ts
 * Tests for Wave 117 Dev Leaks Purification (Mandates 8a–8q, 8b <= 120 lines).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("Wave 117: Dev Leaks Purification (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	it("1. NurseCarpuleDisposalModal: absence of «Мандат 8e» and presence of pure clinical SanPiN reference", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/inventory/NurseCarpuleDisposalModal.tsx",
		);
		if (!fs.existsSync(filePath)) {
			assert.ok(!fs.existsSync(filePath), "NurseCarpuleDisposalModal eradicated");
			return;
		}
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(!content.includes("Мандат 8e"), "Must NOT leak prompt text 'Мандат 8e'");
		assert.ok(
			content.includes("СанПиН 3.3686-21 • Врачом, администратором или медсестрой (без комиссии из 3 человек)"),
			"Must use pure regulatory citation",
		);
	});

	it("2. chairsideConsentEngine: absence of «Мандат 8e» in legalStampText and pure 323-FZ / 1051n citation", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/chairside/chairsideConsentEngine.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(!content.includes("Мандат 8e"), "chairsideConsentEngine must NOT contain prompt text 'Мандат 8e'");
		assert.ok(
			content.includes("ЛИЧНОЕ СОГЛАСИЕ В ПРИСУТСТВИИ ПАЦИЕНТА В КРЕСЛЕ (ст. 20 323-ФЗ, Приказ МЗ РФ № 1051н)"),
			"legalStampText must strictly follow official regulatory citation",
		);
	});

	it("3. App.tsx / AppTopBar.tsx: absence of synthetic doctor mocks «Смирнов Олег Игоревич»", () => {
		const filePath = path.join(repoRoot, "apps/web/src/App.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		const topBarPath = path.join(repoRoot, "apps/web/src/components/appLayout/AppTopBar.tsx");
		const topBarModulesPath = path.join(
			repoRoot,
			"apps/web/src/components/appLayout/topBarModules/TopBarModalsHost.tsx",
		);
		const topBarContent = `${fs.existsSync(topBarPath) ? fs.readFileSync(topBarPath, "utf-8") : ""}\n${fs.existsSync(topBarModulesPath) ? fs.readFileSync(topBarModulesPath, "utf-8") : ""}`;
		const combined = `${content}\n${topBarContent}`;

		assert.ok(!combined.includes("Смирнов Олег Игоревич"), "Must not contain 'Смирнов Олег Игоревич'");
		assert.ok(!combined.includes("Смирнов Алексей Петрович"), "Must not contain 'Смирнов Алексей Петрович'");
		assert.ok(
			combined.includes('activeDoctor?.fullName || "Лечащий врач"'),
			"Must use neutral fallback 'Лечащий врач'",
		);
	});
});
