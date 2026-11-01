/**
 * apps/web/src/components/settings/__tests__/settingsStudioSSOT.test.tsx
 *
 * DENTE Dental CRM — Исчерпывающий Red Team SSOT-тест Студии настроек клиники (Clinic Settings Studio SSOT).
 * Проверяет соответствие Mandates:
 *   - Mandate 8b: Sweet Spot Architectural File Size Limits (Catalog 300-380, Modal 400-480, Launcher 60-80, CSS 300-400)
 *   - Mandate 8e, 8n: Doctor Autonomy (Zero disabled buttons, 1-click clinical standard preset, solo-doctor sovereignty)
 *   - Mandate 8am: Exactly ONE Primary CTA button #0d9488 (var(--teal))
 *   - Mandate 8ze: Apple HIG Mobile Ergonomics (touch >= 44x44px, bottom sheet drag handle 36x5px)
 *   - Mandate 8aq: Live UI Mounting (AppShell, administrativeLaunchersRegistry, SpecializedAdministrativeLaunchers)
 *   - Mandates 8x, 8ap: Clean clinical Russian language, zero foreign CRM names, zero Soviet ministerial bureaucracy
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	STANDARD_CLINIC_PRESET_RF,
	SOLO_DOCTOR_PRESET_RF,
	DEFAULT_CHAIRS_PRESET,
	DEFAULT_STAFF_PRESET,
	ROLE_LABELS,
	SPECIALTY_LABELS,
	validateRequisitesSoft,
	formatInnHint,
	loadClinicStudioSettings,
	exportClinicSettingsJson,
	type ClinicStudioSettings,
} from "../settingsCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("DENTE Clinic Settings & Requisites SSOT Suite", () => {
	// =========================================================================
	// 1. MANDATE 8b: SWEET SPOT ARCHITECTURAL LIMITS
	// =========================================================================
	describe("1. Mandate 8b — Sweet Spot Architectural File Size Limits", () => {
		it("verifies settingsCatalogData.ts is strictly within 300–380 lines", () => {
			const p = path.join(webSrcRoot, "components/settings/settingsCatalogData.ts");
			assert.ok(fs.existsSync(p), "settingsCatalogData.ts must exist");
			const lineCount = fs.readFileSync(p, "utf8").split("\n").length;
			assert.ok(
				lineCount >= 300 && lineCount <= 380,
				`settingsCatalogData.ts must be 300–380 lines, was ${lineCount}`,
			);
		});

		it("verifies SettingsStudioModal.tsx is strictly within 400–480 lines", () => {
			const p = path.join(webSrcRoot, "components/settings/SettingsStudioModal.tsx");
			assert.ok(fs.existsSync(p), "SettingsStudioModal.tsx must exist");
			const lineCount = fs.readFileSync(p, "utf8").split("\n").length;
			assert.ok(
				lineCount >= 400 && lineCount <= 480,
				`SettingsStudioModal.tsx must be 400–480 lines, was ${lineCount}`,
			);
		});

		it("verifies DirectSettingsLauncher.tsx is strictly within 60–80 lines", () => {
			const p = path.join(webSrcRoot, "components/settings/DirectSettingsLauncher.tsx");
			assert.ok(fs.existsSync(p), "DirectSettingsLauncher.tsx must exist");
			const lineCount = fs.readFileSync(p, "utf8").split("\n").length;
			assert.ok(
				lineCount >= 60 && lineCount <= 80,
				`DirectSettingsLauncher.tsx must be 60–80 lines, was ${lineCount}`,
			);
		});

		it("verifies settingsStudio.css is strictly within 300–400 lines", () => {
			const p = path.join(webSrcRoot, "components/settings/settingsStudio.css");
			assert.ok(fs.existsSync(p), "settingsStudio.css must exist");
			const lineCount = fs.readFileSync(p, "utf8").split("\n").length;
			assert.ok(
				lineCount >= 300 && lineCount <= 400,
				`settingsStudio.css must be 300–400 lines, was ${lineCount}`,
			);
		});
	});

	// =========================================================================
	// 2. MANDATES 8e, 8n: DOCTOR AUTONOMY & ZERO DISABLED BUTTONS
	// =========================================================================
	describe("2. Mandates 8e, 8n — Doctor Autonomy & Zero Bureaucratic Locks", () => {
		it("ensures Primary CTA button in SettingsStudioModal is NEVER disabled", () => {
			const p = path.join(webSrcRoot, "components/settings/SettingsStudioModal.tsx");
			const content = fs.readFileSync(p, "utf8");
			assert.ok(
				content.includes("disabled={false}"),
				"Primary CTA save button must explicitly enforce disabled={false}",
			);
			assert.ok(
				!content.includes("disabled={true}"),
				"Primary CTA save button must never have disabled={true}",
			);
		});

		it("validates soft notice helper does not block saving when fields are missing", () => {
			const emptyReq = {};
			const notices = validateRequisitesSoft(emptyReq);
			assert.ok(Array.isArray(notices), "Soft notices must return an array");
			assert.ok(notices.length > 0, "Empty requisites should generate advisory notices");
			for (const notice of notices) {
				assert.equal(notice.isWarningOnly, true, "Notices must be non-blocking advisory warnings");
			}
		});

		it("supports solo-doctor (IP) with 12-digit INN and no KPP requirement", () => {
			const hint12 = formatInnHint(SOLO_DOCTOR_PRESET_RF.requisites.inn);
			assert.ok(hint12.includes("ИП"), "12-digit INN must be identified as IP");
			assert.equal(SOLO_DOCTOR_PRESET_RF.requisites.kpp, "", "Solo-doctor has no KPP requirement");
			assert.equal(SOLO_DOCTOR_PRESET_RF.requisites.entityType, "ip");
		});
	});

	// =========================================================================
	// 3. 1-CLICK CLINICAL NORMALITY PRESETS (SSOT FOR RUSSIAN DENTAL CLINIC)
	// =========================================================================
	describe("3. 1-Click Clinical Presets & Russian Federation Requisites", () => {
		it("contains comprehensive Russian Federation clinical standard preset (ООО)", () => {
			const p = STANDARD_CLINIC_PRESET_RF;
			assert.equal(p.requisites.clinicName, "Стоматология ДЕНТЕ");
			assert.equal(p.requisites.legalName, 'ООО "Денте Клиник"');
			assert.equal(p.requisites.inn, "7701123456");
			assert.equal(p.requisites.kpp, "770101001");
			assert.ok(p.requisites.medicalLicenseNumber.startsWith("Л041-"), "License must follow Roszdravnadzor format");
			assert.equal(p.requisites.bik, "044525225");
			assert.equal(p.requisites.checkingAccount.length, 20, "Checking account must have 20 digits");
		});

		it("contains standard 1-5 chairs configuration with equipment badges", () => {
			const chairs = STANDARD_CLINIC_PRESET_RF.chairs;
			assert.equal(chairs.length, 3, "Default preset must configure 3 chairs");
			assert.equal(chairs[0].hasXraySensor, true, "Chair 1 must have X-ray sensor");
			assert.equal(chairs[0].hasMicroscope, true, "Chair 1 must have microscope");
			assert.equal(chairs[1].hasSurgeryKit, true, "Chair 2 must have surgery kit");
		});

		it("contains standard staff team preset with doctors and assistants", () => {
			const staff = STANDARD_CLINIC_PRESET_RF.staff;
			assert.ok(staff.length >= 3, "Must have at least 3 default team members");
			const hasDoctor = staff.some((s) => s.role === "doctor");
			const hasAssistant = staff.some((s) => s.role === "assistant");
			const hasAdmin = staff.some((s) => s.role === "administrator");
			assert.ok(hasDoctor, "Must include a doctor");
			assert.ok(hasAssistant, "Must include an assistant");
			assert.ok(hasAdmin, "Must include an administrator");
		});

		it("exports valid JSON representation of clinic studio settings", () => {
			const json = exportClinicSettingsJson(STANDARD_CLINIC_PRESET_RF);
			const parsed = JSON.parse(json);
			assert.equal(parsed.requisites.clinicName, "Стоматология ДЕНТЕ");
			assert.equal(parsed.chairs.length, 3);
		});
	});

	// =========================================================================
	// 4. MANDATES 8am, 8ze: SINGLE PRIMARY CTA & APPLE HIG TOUCH ERGONOMICS
	// =========================================================================
	describe("4. Mandates 8am, 8ze — Single Primary CTA & Apple HIG", () => {
		it("verifies SettingsStudioModal has exactly ONE primary CTA button with class settings-studio-primary-cta", () => {
			const p = path.join(webSrcRoot, "components/settings/SettingsStudioModal.tsx");
			const content = fs.readFileSync(p, "utf8");
			const matches = content.match(/className=["'][^"']*settings-studio-primary-cta[^"']*["']/g) || [];
			assert.equal(matches.length, 1, "There must be exactly ONE Primary CTA button rendered");
		});

		it("verifies settingsStudio.css includes Apple HIG bottom sheet, drag handle, and touch ergonomics", () => {
			const p = path.join(webSrcRoot, "components/settings/settingsStudio.css");
			const css = fs.readFileSync(p, "utf8");
			assert.ok(css.includes(".settings-studio-drag-handle"), "Must contain drag handle for mobile bottom sheet");
			assert.ok(css.includes("max-width: 768px"), "Must define dedicated mobile breakpoint <= 768px");
			assert.ok(css.includes("safe-area-inset-bottom"), "Must respect iOS home indicator safe area");
			assert.ok(css.includes("min-height: 44px") || css.includes("min-height: 50px"), "Must enforce >= 44x44px touch targets");
		});
	});

	// =========================================================================
	// 5. MANDATE 8aq: LIVE UI MOUNTING IN APPSHELL & LAUNCHERS
	// =========================================================================
	describe("5. Mandate 8aq — Live UI Mounting across System Entry Points", () => {
		it("verifies DirectSettingsLauncher is imported and mounted in AppShell.tsx", () => {
			const p = path.join(webSrcRoot, "AppShell.tsx");
			const content = fs.readFileSync(p, "utf8");
			assert.ok(
				content.includes("DirectSettingsLauncher"),
				"AppShell.tsx must import and mount DirectSettingsLauncher",
			);
			assert.ok(
				content.includes("<DirectSettingsLauncher />"),
				"AppShell.tsx must render <DirectSettingsLauncher />",
			);
			assert.ok(
				content.includes("h.includes(\"settings\")") || content.includes("s.includes(\"settings\")"),
				"AppShell.tsx isStandaloneActive must include settings token",
			);
		});

		it("verifies DirectSettingsLauncher is registered in administrativeLaunchersRegistry.tsx", () => {
			const p = path.join(
				webSrcRoot,
				"components/appLayout/modalsContainerModules/standalone/administrativeLaunchersRegistry.tsx",
			);
			const content = fs.readFileSync(p, "utf8");
			assert.ok(
				content.includes("DirectSettingsLauncher"),
				"administrativeLaunchersRegistry.tsx must import DirectSettingsLauncher",
			);
			assert.ok(
				content.includes('id: "settings-studio"'),
				"administrativeLaunchersRegistry.tsx must register settings-studio entry",
			);
		});

		it("verifies DirectSettingsLauncher is mounted in SpecializedAdministrativeLaunchers.tsx", () => {
			const p = path.join(
				webSrcRoot,
				"components/appLayout/modalsContainerModules/standalone/SpecializedAdministrativeLaunchers.tsx",
			);
			const content = fs.readFileSync(p, "utf8");
			assert.ok(
				content.includes("DirectSettingsLauncher"),
				"SpecializedAdministrativeLaunchers.tsx must import DirectSettingsLauncher",
			);
			assert.ok(
				content.includes("<DirectSettingsLauncher />"),
				"SpecializedAdministrativeLaunchers.tsx must return <DirectSettingsLauncher />",
			);
		});

		it("verifies DirectSettingsLauncher is exported from StandaloneLaunchers.tsx", () => {
			const p = path.join(
				webSrcRoot,
				"components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
			);
			const content = fs.readFileSync(p, "utf8");
			assert.ok(
				content.includes("export { DirectSettingsLauncher }"),
				"StandaloneLaunchers.tsx must re-export DirectSettingsLauncher",
			);
		});
	});

	// =========================================================================
	// 6. MANDATES 8x, 8ap: CLEAN CLINICAL RUSSIAN LANGUAGE
	// =========================================================================
	describe("6. Mandates 8x, 8ap — Clean Clinical Russian Language", () => {
		it("verifies zero forbidden competitors (IDENT, DentalPRO, StomX, iStom) in new settings SSOT files", () => {
			const filesToCheck = [
				"components/settings/settingsCatalogData.ts",
				"components/settings/SettingsStudioModal.tsx",
				"components/settings/DirectSettingsLauncher.tsx",
				"components/settings/settingsStudio.css",
			];
			const forbidden = ["IDENT", "DentalPRO", "StomX", "iStom"];
			for (const relPath of filesToCheck) {
				const full = path.join(webSrcRoot, relPath);
				const code = fs.readFileSync(full, "utf8");
				for (const bad of forbidden) {
					assert.ok(
						!code.includes(bad),
						`File ${relPath} must not contain forbidden competitor name "${bad}"`,
					);
				}
			}
		});

		it("verifies clean human labels without Soviet bureaucratic decree numbers in UI", () => {
			const p = path.join(webSrcRoot, "components/settings/SettingsStudioModal.tsx");
			const code = fs.readFileSync(p, "utf8");
			assert.ok(!code.includes("804н"), "UI must not mention decree 804n");
			assert.ok(!code.includes("54-ФЗ"), "UI must not mention law 54-FZ");
			assert.ok(!code.includes("043/у"), "UI must not mention Soviet medical form 043/u in title");
		});
	});
});
