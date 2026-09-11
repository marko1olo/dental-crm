/**
 * Production UI Purity & Dev Leaks Purge Unit Tests (Wave 106)
 * (Supreme Law: THE HAMMER, Mandate 8p, Mandate 8d)
 *
 * Verifies that production UI components contain zero dev leaks, test SMS codes,
 * or interactive debug test buttons:
 * 1. PatientOnlineBookingModal.tsx: No "Тестовый код: 7788", placeholder 7788, or test code error hints.
 * 2. PatientMobilePortalModal.tsx: No "Тестовый код: 7788" or "7788 для тестового входа".
 * 3. ImplantPassportModal.tsx: No "Тест задержки накладной" button.
 * 4. MdlpScanningModal.tsx: No "Тест связи" button or "Тестовые образцы" strip.
 * 5. MdlpDisposalQueueModal.tsx: No "Тест ПКУ" block or fast test references in empty state.
 * 6. KraftPackageBarcodeModal.tsx: No "Тестовые образцы" sample chips.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute base path to apps/web/src
const SRC_DIR = path.resolve(__dirname, "../../..");

const TARGET_FILES = {
	patientOnlineBooking: path.join(SRC_DIR, "components/portal/PatientOnlineBookingModal.tsx"),
	patientMobilePortal: path.join(SRC_DIR, "components/portal/PatientMobilePortalModal.tsx"),
	implantPassport: path.join(SRC_DIR, "components/implants/ImplantPassportModal.tsx"),
	mdlpScanning: path.join(SRC_DIR, "components/mdlp/MdlpScanningModal.tsx"),
	mdlpDisposalQueue: path.join(SRC_DIR, "components/inventory/mdlp/MdlpDisposalQueueModal.tsx"),
	kraftBarcode: path.join(SRC_DIR, "components/sanpin/kraft/KraftPackageBarcodeModal.tsx"),
} as const;

describe("Production UI Purity & Dev Leaks Purge (Wave 106 - Mandate 8p/8d)", () => {
	it("all 6 target component files exist on disk", () => {
		for (const [key, filePath] of Object.entries(TARGET_FILES)) {
			assert.ok(fs.existsSync(filePath), `Target file for ${key} must exist: ${filePath}`);
		}
	});

	it("1. PatientOnlineBookingModal contains no dev leaks or 7788 test code exposures", () => {
		const content = fs.readFileSync(TARGET_FILES.patientOnlineBooking, "utf8");

		assert.ok(!content.includes("Тестовый код: 7788"), "Must not expose 'Тестовый код: 7788'");
		assert.ok(!content.includes("Тестовый код:"), "Must not expose 'Тестовый код:'");
		assert.ok(!content.includes("7788 для тестового"), "Must not hint 7788 for test confirmation in error text");
		assert.ok(!content.includes('placeholder="7788"'), "Input placeholder must not reveal test code 7788");
		assert.ok(content.includes('placeholder="0000"'), "Input placeholder must use standard 0000");
		assert.ok(content.includes("Код из 4 цифр отправлен на номер"), "Must retain clean phone dispatch notice");
	});

	it("2. PatientMobilePortalModal contains no dev leaks or 7788 test code hints", () => {
		const content = fs.readFileSync(TARGET_FILES.patientMobilePortal, "utf8");

		assert.ok(!content.includes("Тестовый код: 7788"), "Must not expose 'Тестовый код: 7788'");
		assert.ok(!content.includes("Тестовый код:"), "Must not expose 'Тестовый код:'");
		assert.ok(!content.includes("7788 для тестового"), "Must not hint 7788 for test login in auth error");
		assert.ok(!content.includes('placeholder="7788"'), "Input placeholder must not reveal test code 7788");
		assert.ok(content.includes('placeholder="0000"'), "Input placeholder must use standard 0000");
		assert.ok(content.includes("Код отправлен на номер"), "Must retain clean auth phone notice");
	});

	it("3. ImplantPassportModal contains no 'Тест задержки накладной' interactive debug button", () => {
		const content = fs.readFileSync(TARGET_FILES.implantPassport, "utf8");

		assert.ok(!content.includes("Тест задержки накладной"), "Must not contain 'Тест задержки накладной'");
		assert.ok(!content.includes("btn-toggle-overdraft-test"), "Must not contain debug test toggle button");
		assert.ok(!content.includes("Снять овердрафт"), "Must not contain toggle action in UI");
		assert.ok(content.includes("inventoryOverdraftActive"), "Must receive overdraft status from warehouse context prop");
	});

	it("4. MdlpScanningModal contains no 'Тест связи' button or 'Тестовые образцы' strip", () => {
		const content = fs.readFileSync(TARGET_FILES.mdlpScanning, "utf8");

		assert.ok(!content.includes("Тест связи"), "Must not contain 'Тест связи' button");
		assert.ok(!content.includes("Тестовые образцы"), "Must not contain 'Тестовые образцы' strip");
		assert.ok(!content.includes("mdlp-crpt-test-btn"), "Must not contain crpt test button CSS class");
		assert.ok(!content.includes("mdlp-sample-strip"), "Must not render sample strip in UI");
		assert.ok(content.includes("Поднесите 2D-сканер к коду DataMatrix на упаковке"), "Must contain clean scanner instruction");
	});

	it("5. MdlpDisposalQueueModal contains no 'Тест ПКУ' block or test references", () => {
		const content = fs.readFileSync(TARGET_FILES.mdlpDisposalQueue, "utf8");

		assert.ok(!content.includes("Тест ПКУ"), "Must not contain 'Тест ПКУ' block");
		assert.ok(!content.includes("+ Ультракаин форте"), "Must not render demo drug addition buttons");
		assert.ok(!content.includes("+ Скандонест"), "Must not render demo drug addition buttons");
		assert.ok(!content.includes("быстрым тестом выше"), "Empty queue table must not reference fast test above");
		assert.ok(content.includes("Отсканируйте DataMatrix код"), "Must contain clean 2D scanner instruction");
	});

	it("6. KraftPackageBarcodeModal contains no 'Тестовые образцы' sample chips", () => {
		const content = fs.readFileSync(TARGET_FILES.kraftBarcode, "utf8");

		assert.ok(!content.includes("Тестовые образцы:"), "Must not contain 'Тестовые образцы:' label");
		assert.ok(!content.includes("Azov Свежий (50 сут)"), "Must not contain Azov demo package button");
		assert.ok(!content.includes("Просроченный пакет"), "Must not contain expired demo package button");
	});

	it("7. Universal check: zero forbidden debug substrings in all 6 files", () => {
		const forbiddenPhrases = [
			"Тестовый код: 7788",
			"Тест задержки накладной",
			"Тест связи",
			"Тестовые образцы",
			"Тест ПКУ",
		];

		for (const [name, filePath] of Object.entries(TARGET_FILES)) {
			const text = fs.readFileSync(filePath, "utf8");
			for (const phrase of forbiddenPhrases) {
				assert.ok(
					!text.includes(phrase),
					`File ${name} (${path.basename(filePath)}) must not contain forbidden phrase "${phrase}"`,
				);
			}
		}
	});
});
