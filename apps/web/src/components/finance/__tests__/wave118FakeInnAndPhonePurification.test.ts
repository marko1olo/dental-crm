import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildLabOrderMessengerSummary } from "../../lab/DentalLabOrderModal";
import { formatOrthodonticPatientMemo } from "../../orthodontics/OrthodonticVisitProtocolWidget";

function resolveRepoPath(relPathFromRepoRoot: string): string {
	const cwd = process.cwd();
	const repoRoot =
		cwd.endsWith("apps\\web") || cwd.endsWith("apps/web")
			? path.resolve(cwd, "../..")
			: cwd;
	return path.resolve(repoRoot, relPathFromRepoRoot);
}

describe("Wave 118: Eradication of Synthetic INNs and Phone Fallbacks", () => {
	const FAKE_INN = "7701234567";
	const FAKE_PHONE = "+7 (495) 123-45-67";

	describe("1. Static Code Audit — Zero Hardcoded Fake INN ('7701234567')", () => {
		const filesToCheckForInn = [
			"apps/web/src/components/finance/Billing1CExportModal.tsx",
			"apps/web/src/components/finance/CashDayTally.tsx",
			"apps/web/src/components/finance/CashShiftWidget.tsx",
			"apps/web/src/components/finance/OneCExportButton.tsx",
			"apps/web/src/components/finance/CashRegisterModal.tsx",
			"apps/web/src/components/finance/PaymentModal.tsx",
		];

		for (const relPath of filesToCheckForInn) {
			it(`file ${path.basename(relPath)} contains NO hardcoded INN '${FAKE_INN}'`, () => {
				const fullPath = resolveRepoPath(relPath);
				assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.strictEqual(
					content.includes(FAKE_INN),
					false,
					`Found forbidden fake INN '${FAKE_INN}' in ${relPath}`,
				);
			});
		}
	});

	describe("2. Static Code Audit — Zero Hardcoded Fake Phone ('+7 (495) 123-45-67')", () => {
		const filesToCheckForPhone = [
			"apps/web/src/components/finance/Billing1CExportModal.tsx",
			"apps/web/src/components/finance/OneCExportButton.tsx",
			"apps/web/src/components/prescriptions/generator/MedicalPrescriptionModal.tsx",
			"apps/web/src/components/emergency/EmergencyRescueModal.tsx",
			"apps/web/src/components/lab/DentalLabOrderModal.tsx",
			"apps/web/src/components/orthodontics/OrthodonticVisitProtocolWidget.tsx",
		];

		for (const relPath of filesToCheckForPhone) {
			it(`file ${path.basename(relPath)} contains NO hardcoded phone '${FAKE_PHONE}'`, () => {
				const fullPath = resolveRepoPath(relPath);
				assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.strictEqual(
					content.includes(FAKE_PHONE),
					false,
					`Found forbidden fake phone '${FAKE_PHONE}' in ${relPath}`,
				);
			});
		}
	});

	describe("3. Runtime Behavior — formatOrthodonticPatientMemo phone fallback autonomy", () => {
		it("omitted clinicPhone does NOT produce fake phone and formats cleanly", () => {
			const memo = formatOrthodonticPatientMemo({
				clinicName: "DENTE Test",
				doctorName: "Д-р Ортодонт",
				patientName: "Пациент Тест",
				bracketSystem: "damon_q2",
			});

			assert.strictEqual(
				memo.includes(FAKE_PHONE),
				false,
				"Must NOT include fake phone number",
			);
			assert.ok(
				memo.includes("немедленно свяжитесь с клиникой."),
				"Outputs clean contact prompt without trailing colon or empty string",
			);
		});

		it("provided clinicPhone is correctly included", () => {
			const memo = formatOrthodonticPatientMemo({
				clinicName: "DENTE Test",
				clinicPhone: "+7 (999) 555-44-33",
				doctorName: "Д-р Ортодонт",
				patientName: "Пациент Тест",
				bracketSystem: "damon_q2",
			});

			assert.ok(
				memo.includes("немедленно свяжитесь с клиникой: +7 (999) 555-44-33."),
				"Must include provided clinic phone",
			);
		});
	});

	describe("4. Runtime Behavior — buildLabOrderMessengerSummary phone fallback autonomy", () => {
		it("omitted clinicPhone outputs 'не указан' and zero fake phone", () => {
			const summary = buildLabOrderMessengerSummary({
				clinicName: "Денте Лаб",
				gostOrderNumber: "ЗТЛ-118",
				patientName: "Пациент Тест",
				doctorName: "Врач Тест",
				teethOrJaw: "16",
				constructionTypeTitle: "Коронка",
				materialTitle: "Цирконий",
				shade: "A2",
				dueDate: "20.09.2026",
			});

			assert.strictEqual(
				summary.includes(FAKE_PHONE),
				false,
				"Must NOT include fake phone number",
			);
			assert.ok(
				summary.includes("Курьерская доставка / Связь с клиникой: не указан."),
				"Outputs 'не указан' when phone is omitted",
			);
		});

		it("provided clinicPhone is correctly included", () => {
			const summary = buildLabOrderMessengerSummary({
				clinicName: "Денте Лаб",
				clinicPhone: "+7 (812) 333-22-11",
				gostOrderNumber: "ЗТЛ-118",
				patientName: "Пациент Тест",
				doctorName: "Врач Тест",
				teethOrJaw: "16",
				constructionTypeTitle: "Коронка",
				materialTitle: "Цирконий",
				shade: "A2",
				dueDate: "20.09.2026",
			});

			assert.ok(
				summary.includes("Курьерская доставка / Связь с клиникой: +7 (812) 333-22-11."),
				"Must include provided clinic phone",
			);
		});
	});
});
