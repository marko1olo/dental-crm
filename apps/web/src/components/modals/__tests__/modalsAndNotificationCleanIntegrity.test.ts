import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Modals & Notifications Integrity — Wave 106 Verification", async (t) => {
	const clinicalModalsPath = path.resolve(__dirname, "../ClinicalModalsHost.tsx");
	const backofficeModalsPath = path.resolve(__dirname, "../BackofficeModalsHost.tsx");
	const notifCenterPath = path.resolve(
		__dirname,
		"../../notifications/PatientNotificationCenter.tsx",
	);
	const offlineFiscalPath = path.resolve(
		__dirname,
		"../../finance/fiscal/OfflineFiscalBatchModal.tsx",
	);

	await t.test("ClinicalModalsHost — zero SAMPLE_PATIENT or synthetic mock data", () => {
		const content = fs.readFileSync(clinicalModalsPath, "utf8");
		assert.ok(!content.includes("SAMPLE_PATIENT"), "SAMPLE_PATIENT must be eliminated");
		assert.ok(!content.includes("Иванов Иван Иванович"), "Hardcoded Ivanov must not exist");
		assert.ok(!content.includes("+7 (999) 123-45-67"), "Fake phone must not exist");
		assert.ok(content.includes("useOptionalAppLogicContext"), "Must use dynamic appLogic context");
		assert.ok(content.includes("patientName ="), "Must resolve dynamic patientName");
	});

	await t.test("BackofficeModalsHost — zero SAMPLE_PATIENT or synthetic mock data", () => {
		const content = fs.readFileSync(backofficeModalsPath, "utf8");
		assert.ok(!content.includes("SAMPLE_PATIENT"), "SAMPLE_PATIENT must be eliminated");
		assert.ok(!content.includes("Иванов Иван Иванович"), "Hardcoded Ivanov must not exist");
		assert.ok(!content.includes("+7 (999) 123-45-67"), "Fake phone must not exist");
		assert.ok(content.includes("useOptionalAppLogicContext"), "Must use dynamic appLogic context");
		assert.ok(content.includes("patientName ="), "Must resolve dynamic patientName");
	});

	await t.test("PatientNotificationCenter — zero hardcoded mock patients & clean empty state", () => {
		const content = fs.readFileSync(notifCenterPath, "utf8");
		assert.ok(!content.includes("Иванов Иван Иванович"), "Mock Ivanov must be eliminated");
		assert.ok(!content.includes("Смирнова Елена Васильевна"), "Mock Smirnova must be eliminated");
		assert.ok(!content.includes("+7 (916) 123-45-67"), "Fake phone must be eliminated");
		assert.ok(!content.includes("+7 (926) 987-65-43"), "Fake phone must be eliminated");
		assert.ok(content.includes("callHistory"), "Should bind to callHistory");
		assert.ok(content.includes("Нет новых уведомлений"), "Must contain clean empty state message");
	});

	await t.test("OfflineFiscalBatchModal — zero DEFAULT_MOCK_QUEUED_RECEIPTS and neutral cashier", () => {
		const content = fs.readFileSync(offlineFiscalPath, "utf8");
		assert.ok(!content.includes("DEFAULT_MOCK_QUEUED_RECEIPTS"), "DEFAULT_MOCK_QUEUED_RECEIPTS must be deleted");
		assert.ok(!content.includes("Сидорова А. П."), "Mock cashier must be eliminated");
		assert.ok(content.includes('cashierFullName = "Кассир"'), "Must default cashier to 'Кассир'");
		assert.ok(content.includes("return [];"), "Must return empty array [] when queue is empty");
	});
});
