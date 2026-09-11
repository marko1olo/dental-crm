/**
 * wave115MockPurification.test.ts — Wave 115 Mock Purity Verification Suite
 *
 * Verifies strict eradication of synthetic names, developer leaks, fake requisites,
 * and emojis according to Supreme Law: THE HAMMER (Mandates 8a–8q).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Wave 115: Mocks & Dev Leaks Purification Suite", () => {
	it("1. InsurancePreAuthModal.tsx: must NOT contain 'Иванова Елена' or 'Иванов И.И.'", () => {
		const filePath = path.resolve(
			webSrcRoot,
			"components/insurance/InsurancePreAuthModal.tsx",
		);
		assert.ok(fs.existsSync(filePath), `File must exist at ${filePath}`);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.equal(
			content.includes("Иванова Елена"),
			false,
			"InsurancePreAuthModal.tsx must NOT contain synthetic curator name 'Иванова Елена'",
		);
		assert.equal(
			content.includes("Иванов И.И."),
			false,
			"InsurancePreAuthModal.tsx must NOT contain fallback patient name 'Иванов И.И.'",
		);
	});

	it("2. ChairsidePreFlightChecklist.tsx: must NOT contain 'Смирнова Е. В.' or 'Иванова М. А.' in default values", () => {
		const filePath = path.resolve(
			webSrcRoot,
			"components/chairside/ChairsidePreFlightChecklist.tsx",
		);
		assert.ok(fs.existsSync(filePath), `File must exist at ${filePath}`);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.equal(
			content.includes("Смирнова Е. В."),
			false,
			"ChairsidePreFlightChecklist.tsx must NOT contain synthetic doctorName default 'Смирнова Е. В.'",
		);
		assert.equal(
			content.includes("Иванова М. А."),
			false,
			"ChairsidePreFlightChecklist.tsx must NOT contain synthetic assistantName default 'Иванова М. А.'",
		);
	});

	it("3. DmsInsuranceManagerModal.tsx: must NOT contain 'Иванов Сергей Александрович'", () => {
		const filePath = path.resolve(
			webSrcRoot,
			"components/insurance/dmsManager/DmsInsuranceManagerModal.tsx",
		);
		assert.ok(fs.existsSync(filePath), `File must exist at ${filePath}`);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.equal(
			content.includes("Иванов Сергей Александрович"),
			false,
			"DmsInsuranceManagerModal.tsx must NOT contain synthetic patient name 'Иванов Сергей Александрович'",
		);
		assert.equal(
			content.includes("Кузнецова Ольга Дмитриевна"),
			false,
			"DmsInsuranceManagerModal.tsx must NOT contain sample visit patient 'Кузнецова Ольга Дмитриевна'",
		);
		assert.equal(
			content.includes("Петров Василий Николаевич"),
			false,
			"DmsInsuranceManagerModal.tsx must NOT contain sample visit patient 'Петров Василий Николаевич'",
		);
	});

	it("4. PrescriptionPrintModal.tsx: must NOT contain emojis ⚠️ or ⚖️", () => {
		const filePath = path.resolve(
			webSrcRoot,
			"components/prescriptions/PrescriptionPrintModal.tsx",
		);
		assert.ok(fs.existsSync(filePath), `File must exist at ${filePath}`);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.equal(
			content.includes("⚠️"),
			false,
			"PrescriptionPrintModal.tsx must NOT contain emoji ⚠️",
		);
		assert.equal(
			content.includes("⚖️"),
			false,
			"PrescriptionPrintModal.tsx must NOT contain emoji ⚖️",
		);
	});

	it("5. PublicBookingWidget.tsx: must NOT contain '+7 (999) 123-45-67'", () => {
		const filePath = path.resolve(
			webSrcRoot,
			"pages/PublicBookingWidget.tsx",
		);
		assert.ok(fs.existsSync(filePath), `File must exist at ${filePath}`);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.equal(
			content.includes("+7 (999) 123-45-67"),
			false,
			"PublicBookingWidget.tsx must NOT contain synthetic demo phone '+7 (999) 123-45-67'",
		);
	});

	it("6. PatientBillingModal.tsx & dmsSplitEngine.ts: must NOT contain fake requisites", () => {
		const billingPath = path.resolve(
			webSrcRoot,
			"components/finance/PatientBillingModal.tsx",
		);
		assert.ok(fs.existsSync(billingPath), `File must exist at ${billingPath}`);
		const billingContent = fs.readFileSync(billingPath, "utf-8");

		assert.equal(
			billingContent.includes("7701234567"),
			false,
			"PatientBillingModal.tsx must NOT contain hardcoded INN '7701234567'",
		);
		assert.equal(
			billingContent.includes("1027700132195"),
			false,
			"PatientBillingModal.tsx must NOT contain hardcoded OGRN '1027700132195'",
		);
		assert.equal(
			billingContent.includes("Ломоносовский проспект"),
			false,
			"PatientBillingModal.tsx must NOT contain hardcoded address 'Ломоносовский проспект'",
		);
		assert.equal(
			billingContent.includes("ОВД Хамовники"),
			false,
			"PatientBillingModal.tsx must NOT contain synthetic passport data with 'ОВД Хамовники'",
		);

		const splitEnginePath = path.resolve(
			webSrcRoot,
			"components/insurance/dmsSplitEngine.ts",
		);
		assert.ok(fs.existsSync(splitEnginePath), `File must exist at ${splitEnginePath}`);
		const splitEngineContent = fs.readFileSync(splitEnginePath, "utf-8");

		assert.equal(
			splitEngineContent.includes("7701234567"),
			false,
			"dmsSplitEngine.ts must NOT contain hardcoded INN fallback '7701234567'",
		);
	});
});
