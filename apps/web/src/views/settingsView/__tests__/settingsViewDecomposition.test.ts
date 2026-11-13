/**
 * apps/web/src/views/settingsView/__tests__/settingsViewDecomposition.test.ts
 *
 * Test suite verifying SettingsView facade and submodules decomposition,
 * navigation menu, tab rendering, and file limit compliance (<= 80 lines facade).
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
	DOCTOR_TABS,
	ADMIN_TABS,
	OWNER_TABS,
	ENTERPRISE_ADVANCED_TABS,
	SETTINGS_ROLE_LABELS,
} from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("SettingsView Architecture & Decomposition", () => {
	const viewDir = path.resolve(__dirname, "..");

	it("has facade index.tsx strictly <= 80 lines per Mandate 8b", () => {
		const indexPath = path.join(viewDir, "index.tsx");
		const content = fs.readFileSync(indexPath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(lines <= 80, `index.tsx must be <= 80 lines, got ${lines}`);
	});

	it("has submodules each strictly <= 120 lines per Mandate 8b", () => {
		const files = [
			"settingsNavigationMenu.tsx",
			"settingsTabRenderer.tsx",
			"SettingsNavigationSidebar.tsx",
			"SettingsClinicGeneralTab.tsx",
			"SettingsSecurityAndBackupTab.tsx",
			"SettingsDesktopLayout.tsx",
			"MobileSettingsViewWrapper.tsx",
			"useSettingsViewLogic.ts",
			"types.ts",
		];
		for (const file of files) {
			const fullPath = path.join(viewDir, file);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(lines <= 120, `${file} must be <= 120 lines, got ${lines}`);
			}
		}
	});

	it("properly separates roles into DOCTOR_TABS, ADMIN_TABS, OWNER_TABS, and ENTERPRISE_ADVANCED_TABS sets", () => {
		assert.strictEqual(DOCTOR_TABS.has("profile"), true);
		assert.strictEqual(DOCTOR_TABS.has("protocols"), true);

		assert.strictEqual(ADMIN_TABS.has("staff"), true);
		assert.strictEqual(ADMIN_TABS.has("booking"), true);

		assert.strictEqual(OWNER_TABS.has("clinic"), true);
		assert.strictEqual(OWNER_TABS.has("prices"), true);
		assert.strictEqual(OWNER_TABS.has("audit"), true);

		assert.strictEqual(ENTERPRISE_ADVANCED_TABS.has("bpmn"), true);
		assert.strictEqual(ENTERPRISE_ADVANCED_TABS.has("sources"), true);
		assert.strictEqual(SETTINGS_ROLE_LABELS.owner, "Управление клиникой");
	});

	it("verifies SettingsClinicTab facade <= 250 lines and legal modules <= 500 lines", () => {
		const clinicTabPath = path.resolve(
			viewDir,
			"../../components/settings/SettingsClinicTab.tsx",
		);
		const legalSectionPath = path.resolve(
			viewDir,
			"../../components/settings/clinic/SettingsClinicLegalSection.tsx",
		);

		const tabContent = fs.readFileSync(clinicTabPath, "utf-8");
		const tabLines = tabContent.split("\n").length;
		assert.ok(tabLines <= 250, `SettingsClinicTab.tsx must be <= 250 lines, got ${tabLines}`);

		const legalContent = fs.readFileSync(legalSectionPath, "utf-8");
		const legalLines = legalContent.split("\n").length;
		assert.ok(legalLines <= 250, `SettingsClinicLegalSection.tsx must be <= 250 lines, got ${legalLines}`);
	});

	it("enforces Mandate 8am unified 36px/rounded-xl geometry and zero hardcoded colors in settings styles", () => {
		const sidebarContent = fs.readFileSync(
			path.join(viewDir, "SettingsNavigationSidebar.tsx"),
			"utf-8",
		);
		assert.ok(sidebarContent.includes("h-9 min-h-[36px] px-3 rounded-xl"));
		assert.ok(sidebarContent.includes("w-4 h-4"));
		assert.ok(sidebarContent.includes("text-[var(--primary)]"));
		assert.ok(sidebarContent.includes("text-[var(--ink-muted)]"));

		const menuContent = fs.readFileSync(
			path.join(viewDir, "settingsNavigationMenu.tsx"),
			"utf-8",
		);
		assert.ok(menuContent.includes("min-h-[48px] max-h-[52px]"));
		assert.ok(menuContent.includes("h-9 min-h-[36px] max-h-[36px] p-0.5 rounded-xl"));
		assert.ok(menuContent.includes("h-8 px-3 rounded-lg"));

		const layoutCss = fs.readFileSync(
			path.resolve(viewDir, "../../styles/modules/settings-layout.css"),
			"utf-8",
		);
		assert.ok(!layoutCss.includes("#f8fafc"));
		assert.ok(!layoutCss.includes("#f1f5f9"));
		assert.ok(!layoutCss.includes("rgba(30, 41, 59"));
		assert.ok(!layoutCss.includes("rgba(15, 23, 42"));
	});
});
