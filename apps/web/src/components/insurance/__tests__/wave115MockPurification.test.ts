/**
 * wave115MockPurification.test.ts — Wave 115 Mock Purity Verification Suite
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Wave 115: Mocks & Dev Leaks Purification Suite", () => {
	it("1. DmsGuaranteeLetterModal.tsx: must NOT contain 'Иванова Елена' or 'Иванов И.И.'", () => {
		const filePath = path.resolve(webSrcRoot, "components/insurance/DmsGuaranteeLetterModal.tsx");
		assert.ok(fs.existsSync(filePath), `File must exist at ${filePath}`);
		const content = fs.readFileSync(filePath, "utf-8");
		assert.equal(content.includes("Иванова Елена"), false);
		assert.equal(content.includes("Иванов И.И."), false);
	});

	it("2. ChairsidePreFlightChecklist.tsx: purged per Reality Simulator & Mandate 8e purge", () => {
		const filePath = path.resolve(webSrcRoot, "components/chairside/ChairsidePreFlightChecklist.tsx");
		if (!fs.existsSync(filePath)) {
			assert.ok(true, "Purged per Mandate 8e");
			return;
		}
		const content = fs.readFileSync(filePath, "utf-8");
		assert.equal(content.includes("Смирнова Е. В."), false);
		assert.equal(content.includes("Иванова М. А."), false);
	});

	it("3. DmsGuaranteeLetterModal.tsx: must NOT contain synthetic names", () => {
		const filePath = path.resolve(webSrcRoot, "components/insurance/DmsGuaranteeLetterModal.tsx");
		assert.ok(fs.existsSync(filePath));
		const content = fs.readFileSync(filePath, "utf-8");
		assert.equal(content.includes("Иванов Сергей Александрович"), false);
		assert.equal(content.includes("Кузнецова Ольга Дмитриевна"), false);
		assert.equal(content.includes("Петров Василий Николаевич"), false);
	});

	it("4. PrescriptionPrintModal.tsx: must NOT contain emojis", () => {
		const filePath = path.resolve(webSrcRoot, "components/prescriptions/PrescriptionPrintModal.tsx");
		assert.ok(fs.existsSync(filePath));
		const content = fs.readFileSync(filePath, "utf-8");
		assert.equal(content.includes("⚠️"), false);
		assert.equal(content.includes("⚖️"), false);
	});

	it("5. PublicBookingWidget.tsx: must NOT contain '+7 (999) 123-45-67'", () => {
		const filePath = path.resolve(webSrcRoot, "pages/PublicBookingWidget.tsx");
		assert.ok(fs.existsSync(filePath));
		const content = fs.readFileSync(filePath, "utf-8");
		assert.equal(content.includes("+7 (999) 123-45-67"), false);
	});

	it("6. PatientBillingModal.tsx & dmsSplitEngine.ts: must NOT contain fake requisites", () => {
		const billingPath = path.resolve(webSrcRoot, "components/finance/PatientBillingModal.tsx");
		assert.ok(fs.existsSync(billingPath));
		const billingContent = fs.readFileSync(billingPath, "utf-8");
		assert.equal(billingContent.includes("7701234567"), false);
		assert.equal(billingContent.includes("1027700132195"), false);
		assert.equal(billingContent.includes("Ломоносовский проспект"), false);
		assert.equal(billingContent.includes("ОВД Хамовники"), false);

		const splitEnginePath = path.resolve(webSrcRoot, "components/insurance/dmsSplitEngine.ts");
		assert.ok(fs.existsSync(splitEnginePath));
		const splitEngineContent = fs.readFileSync(splitEnginePath, "utf-8");
		assert.equal(splitEngineContent.includes("7701234567"), false);
	});
});
