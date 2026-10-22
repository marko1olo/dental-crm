import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	getFefoTrafficLight,
	validateBatchForClinicalUse,
} from "../fefoTrafficLight.js";
import { formatShiftCloseClassBWasteActHtml } from "../autoBomDeductionEngine.js";

// Mandate 8d Zero Emoji Detector
const FORBIDDEN_EMOJI_REGEX =
	/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("Mandate 8d Strict Zero-Emoji Compliance", () => {
	it("ноль эмодзи в сгенерированном акте утилизации", () => {
		const html = formatShiftCloseClassBWasteActHtml(
			"АКТ-Б-999",
			"15.05.2026 20:00",
			"PLOMBA-7711",
			"BAR-CLASSB-999",
			15,
			15,
			3,
			0.85,
			0.15,
			0.7,
			"Петрова А. В.",
			"Медицинская сестра",
			"ООО «ДЕНТЕ»",
			{
				brokenCarpulesCount: 3,
				partiallyUsedCarpulesCount: 2,
				cabinetId: "Кабинет №1",
				chairId: "Кресло A",
			},
		);

		assert.equal(
			FORBIDDEN_EMOJI_REGEX.test(html),
			false,
			"Акт утилизации отходов не должен содержать эмодзи!",
		);
	});

	it("ноль эмодзи в системных предупреждениях и FEFO-метках", () => {
		const expiredBatch = {
			batchNumber: "LOT-ZERO-EMOJI",
			expiryDate: "2026-01-01",
			stockQuantity: 10,
		};
		const val = validateBatchForClinicalUse(expiredBatch, new Date("2026-05-01"));
		assert.equal(
			FORBIDDEN_EMOJI_REGEX.test(val.alertMessage || ""),
			false,
			"Предупреждение о просрочке не должно содержать эмодзи!",
		);

		const traffic = getFefoTrafficLight("2026-01-01", new Date("2026-05-01"));
		assert.equal(
			FORBIDDEN_EMOJI_REGEX.test(traffic.label),
			false,
			"Метка светофора FEFO не должна содержать эмодзи!",
		);
		assert.equal(
			FORBIDDEN_EMOJI_REGEX.test(traffic.badgeText),
			false,
			"Текст бейджа FEFO не должен содержать эмодзи!",
		);
	});
});
