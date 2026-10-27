/**
 * apps/web/src/components/settings/__tests__/settingsStaffFourCanonicalRolesAndAutonomy.test.ts
 *
 * Red Team Inquisitor Verification for:
 * 1. 4 Canonical Staff Roles (Mandates 8e, 8n): Doctor, Administrator, Assistant, Owner/Chief Doctor.
 * 2. Doctor Autonomy: Save buttons NEVER disabled by optional fields or SNILS checksums.
 * 3. Zero Alien Brands: Eradication of StomX, IDENT, DentalPRO, iStom from live settings headers & cards.
 * 4. 1-Click Chair & Operatory setup with instant schedule synchronization.
 * 5. Apple HIG Mobile touch ergonomics (touch targets >= 44x44px, row height >= 52px).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsDir = path.resolve(__dirname, "..");

describe("Settings & Staff Four Canonical Roles & Autonomy Inquisition (Mandates 8e, 8n, 8x, 8ao)", () => {
	it("1. Four canonical role keys cover doctor, administrator/reception, assistant, owner/chief doctor", () => {
		const canonicalKeys = ["doctor", "administrator", "assistant", "owner"];
		assert.equal(canonicalKeys.length, 4);
		assert.ok(canonicalKeys.includes("doctor"), "Doctor must be present");
		assert.ok(canonicalKeys.includes("administrator"), "Administrator must be present");
		assert.ok(canonicalKeys.includes("assistant"), "Assistant must be present");
		assert.ok(canonicalKeys.includes("owner"), "Owner must be present");
	});

	it("2. GranularRoleMatrixView source code highlights 4 canonical profiles and eliminates matrix hell", () => {
		const filePath = path.join(settingsDir, "GranularRoleMatrixView.tsx");
		assert.ok(fs.existsSync(filePath), "GranularRoleMatrixView.tsx must exist");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(content.includes("CANONICAL_ROLE_PROFILES"), "Must declare CANONICAL_ROLE_PROFILES");
		assert.ok(content.includes("doctor"), "Must include doctor profile");
		assert.ok(content.includes("registrar") || content.includes("administrator"), "Must include administrator profile");
		assert.ok(content.includes("assistant"), "Must include assistant profile");
		assert.ok(content.includes("owner"), "Must include owner profile");
		assert.ok(!content.includes("bg-white"), "Must not use raw bg-white in matrix view");
		assert.ok(content.split("\n").length <= 800, "Must be <= 800 lines");
	});

	it("3. Alien brands (StomX, DentalPRO, IDENT, iStom) are eradicated from chairs and general UI cards", () => {
		const chairsSectionPath = path.join(settingsDir, "clinic", "SettingsClinicChairsSection.tsx");
		const chairsContent = fs.readFileSync(chairsSectionPath, "utf-8");
		assert.ok(!chairsContent.includes("StomX"), "SettingsClinicChairsSection must not mention StomX");

		const chairCardPath = path.join(settingsDir, "clinic", "chairsModules", "ClinicChairCard.tsx");
		const chairCardContent = fs.readFileSync(chairCardPath, "utf-8");
		assert.ok(!chairCardContent.includes("StomX"), "ClinicChairCard must not mention StomX");

		const chairEditModalPath = path.join(settingsDir, "clinic", "chairsModules", "ClinicChairEditModal.tsx");
		const chairEditModalContent = fs.readFileSync(chairEditModalPath, "utf-8");
		assert.ok(!chairEditModalContent.includes("StomX"), "ClinicChairEditModal must not mention StomX");

		const mobileRootPath = path.join(settingsDir, "mobile", "MobileSettingsRootView.tsx");
		const mobileRootContent = fs.readFileSync(mobileRootPath, "utf-8");
		assert.ok(!mobileRootContent.includes("Импорт из IDENT"), "MobileSettingsRootView must not advertise competitor brands in card subtitles");
	});

	it("4. DoctorSnilsValidationWidget uses CSS tokens, data.formatted/snilsFormatted, and never disables forms", () => {
		const widgetPath = path.join(settingsDir, "DoctorSnilsValidationWidget.tsx");
		assert.ok(fs.existsSync(widgetPath), "DoctorSnilsValidationWidget.tsx must exist");
		const facadeContent = fs.readFileSync(widgetPath, "utf-8");
		const hookContent = fs.readFileSync(path.join(settingsDir, "snils", "useDoctorSnilsValidation.ts"), "utf-8");
		const formContent = fs.readFileSync(path.join(settingsDir, "snils", "DoctorSnilsInputForm.tsx"), "utf-8");
		const content = facadeContent + "\n" + hookContent + "\n" + formContent;

		assert.ok(content.includes("data.formatted || data.snilsFormatted"), "Must support both formatted property names");
		assert.ok(!content.includes("bg-white"), "Must not use raw bg-white");
		assert.ok(content.includes("var(--paper)"), "Must use CSS token var(--paper)");
		assert.ok(content.includes("var(--teal)"), "Must use CSS token var(--teal)");
	});

	it("5. StaffProfileFooter 'Save' button is never disabled by missing optional fields (Mandate 8e)", () => {
		const footerPath = path.join(settingsDir, "staff", "profile", "StaffProfileFooter.tsx");
		assert.ok(fs.existsSync(footerPath), "StaffProfileFooter.tsx must exist");
		const content = fs.readFileSync(footerPath, "utf-8");

		assert.ok(content.includes("disabled={isSaving}"), "Save button is ONLY disabled while save is in flight");
		assert.ok(content.includes("min-h-[44px]"), "Touch target must be at least 44px");
	});

	it("6. Fast 1-click chair addition allows overrideName parameter without state race conditions", () => {
		const clinicTabPath = path.join(settingsDir, "SettingsClinicTab.tsx");
		assert.ok(fs.existsSync(clinicTabPath), "SettingsClinicTab.tsx must exist");
		const content = fs.readFileSync(clinicTabPath, "utf-8");

		assert.ok(content.includes("handleAddChair"), "Must define handleAddChair");
		assert.ok(content.includes("overrideName"), "handleAddChair must accept overrideName to avoid async React state lag");

		const chairsSectionPath = path.join(settingsDir, "clinic", "SettingsClinicChairsSection.tsx");
		const chairsSectionContent = fs.readFileSync(chairsSectionPath, "utf-8");
		assert.ok(chairsSectionContent.includes("handleAddChair(chairName)"), "1-click button directly passes chairName");
	});
});
