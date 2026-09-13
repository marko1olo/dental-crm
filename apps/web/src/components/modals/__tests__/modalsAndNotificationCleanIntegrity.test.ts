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

	await t.test("ClinicalModalsHost — eradicated per Mandate 8s (Wave 200)", () => {
		assert.ok(!fs.existsSync(clinicalModalsPath), "ClinicalModalsHost.tsx must be eradicated as a shirm facade host");
	});

	await t.test("BackofficeModalsHost — eradicated per Mandate 8s (Wave 200)", () => {
		assert.ok(!fs.existsSync(backofficeModalsPath), "BackofficeModalsHost.tsx must be eradicated as a shirm facade host");
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
