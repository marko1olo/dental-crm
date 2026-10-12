/**
 * apps/web/src/views/settingsView/__tests__/settingsViewDecomposition.test.ts
 *
 * Vitest suite verifying SettingsView facade and submodules decomposition,
 * navigation menu, tab rendering, and file limit compliance (<= 250 lines facade).
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	DOCTOR_TABS,
	ADMIN_TABS,
	OWNER_TABS,
	ENTERPRISE_ADVANCED_TABS,
	SETTINGS_ROLE_LABELS,
} from "../types";

describe("SettingsView Architecture & Decomposition", () => {
	const viewDir = path.resolve(__dirname, "..");

	it("has facade index.tsx strictly <= 250 lines", () => {
		const indexPath = path.join(viewDir, "index.tsx");
		const content = fs.readFileSync(indexPath, "utf-8");
		const lines = content.split("\n").length;
		expect(lines).toBeLessThanOrEqual(250);
	});

	it("has submodules each strictly <= 500 lines", () => {
		const files = [
			"settingsNavigationMenu.tsx",
			"settingsTabRenderer.tsx",
			"SettingsNavigationSidebar.tsx",
			"SettingsClinicGeneralTab.tsx",
			"SettingsSecurityAndBackupTab.tsx",
		];
		for (const file of files) {
			const fullPath = path.join(viewDir, file);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, "utf-8");
				const lines = content.split("\n").length;
				expect(lines).toBeLessThanOrEqual(500);
			}
		}
	});

	it("properly separates roles into DOCTOR_TABS, ADMIN_TABS, OWNER_TABS, and ENTERPRISE_ADVANCED_TABS sets", () => {
		expect(DOCTOR_TABS.has("profile")).toBe(true);
		expect(DOCTOR_TABS.has("protocols")).toBe(true);

		expect(ADMIN_TABS.has("staff")).toBe(true);
		expect(ADMIN_TABS.has("booking")).toBe(true);

		expect(OWNER_TABS.has("clinic")).toBe(true);
		expect(OWNER_TABS.has("prices")).toBe(true);
		expect(OWNER_TABS.has("audit")).toBe(true);

		expect(ENTERPRISE_ADVANCED_TABS.has("bpmn")).toBe(true);
		expect(ENTERPRISE_ADVANCED_TABS.has("sources")).toBe(true);
		expect(SETTINGS_ROLE_LABELS.owner).toBe("Управление клиникой");
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
		expect(tabLines).toBeLessThanOrEqual(250);

		const legalContent = fs.readFileSync(legalSectionPath, "utf-8");
		const legalLines = legalContent.split("\n").length;
		expect(legalLines).toBeLessThanOrEqual(250);
	});

	it("enforces Mandate 8am unified 36px/rounded-xl geometry and zero hardcoded colors in settings styles", () => {
		const sidebarContent = fs.readFileSync(
			path.join(viewDir, "SettingsNavigationSidebar.tsx"),
			"utf-8",
		);
		expect(sidebarContent).toContain("h-9 min-h-[36px] px-3 rounded-xl");
		expect(sidebarContent).toContain("w-4 h-4");
		expect(sidebarContent).toContain("text-[var(--primary)]");
		expect(sidebarContent).toContain("text-[var(--ink-muted)]");

		const menuContent = fs.readFileSync(
			path.join(viewDir, "settingsNavigationMenu.tsx"),
			"utf-8",
		);
		expect(menuContent).toContain("min-h-[48px] max-h-[52px]");
		expect(menuContent).toContain("h-9 min-h-[36px] max-h-[36px] p-0.5 rounded-xl");
		expect(menuContent).toContain("h-8 px-3 rounded-lg");

		const layoutCss = fs.readFileSync(
			path.resolve(viewDir, "../../styles/modules/settings-layout.css"),
			"utf-8",
		);
		expect(layoutCss).not.toContain("#f8fafc");
		expect(layoutCss).not.toContain("#f1f5f9");
		expect(layoutCss).not.toContain("rgba(30, 41, 59");
		expect(layoutCss).not.toContain("rgba(15, 23, 42");
	});
});
