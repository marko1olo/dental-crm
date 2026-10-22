import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../dentalLabFinancialGateEngine";

describe("Wave 239 — Doctor Autonomy & Zero Emojis Compliance", () => {
	it("3. Mandate 8e & 8n: Doctor Autonomy — Plan > 30 days & Advance < 50% do not block ZTL orders", () => {
		const checkResultOldPlan = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000,
			paidKopecks: 1500000,
			treatmentPlanAgeDays: 45,
			isPlanExpired: true,
		});

		assert.equal(checkResultOldPlan.isGatePassed, true);
		assert.equal(checkResultOldPlan.isPlanExpiredNotice !== undefined, true);

		const checkResultLowAdvance = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000,
			paidKopecks: 500000,
			doctorOverride: createDoctorClinicalOverride(
				"Клиническое решение лечащего врача-ортопеда: пациент в процессе протезирования",
			),
		});

		assert.equal(checkResultLowAdvance.isGatePassed, true);
		assert.equal(checkResultLowAdvance.gateStatus, "DOCTOR_OVERRIDE");
	});

	it("4. Zero Emojis Compliance across all ZTL components (Mandate 8d item 7)", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const labFiles = fs.readdirSync(labDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const file of labFiles) {
			const fullPath = path.join(labDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");
			const hasEmoji = emojiRegex.test(content);
			assert.equal(
				hasEmoji,
				false,
				`Файл ${file} содержит запрещенные эмодзи (Мандат 8d пункт 7 запрещает эмодзи в медицинских и официальных формах)`,
			);
		}
	});
});
