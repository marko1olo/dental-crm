import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDentalSlang } from "../lib/stringUtils.js";

describe("normalizeDentalSlang", () => {
	it("should map slang words with fallback quadrant '1' when no context is provided", () => {
		assert.equal(normalizeDentalSlang("шестерка"), "16");
		assert.equal(normalizeDentalSlang("единичка"), "11");
		assert.equal(normalizeDentalSlang("двойка"), "12");
	});

	it("should apply explicit quadrant context (both upper/lower and left/right)", () => {
		assert.equal(normalizeDentalSlang("верхняя левая шестерка"), "верхняя левая 26");
		assert.equal(normalizeDentalSlang("верхняя правая двойка"), "верхняя правая 12");
		assert.equal(normalizeDentalSlang("нижняя левая восьмерка"), "нижняя левая 38");
		assert.equal(normalizeDentalSlang("нижняя правая тройка"), "нижняя правая 43");
	});

	it("should apply explicit single quadrant context", () => {
		assert.equal(normalizeDentalSlang("верхняя шестерка"), "верхняя 16");
		assert.equal(normalizeDentalSlang("нижняя шестерка"), "нижняя 46");
		assert.equal(normalizeDentalSlang("правая шестерка"), "правая 16");
		assert.equal(normalizeDentalSlang("левая шестерка"), "левая 26");
	});

	it("should process pure digits accompanied by quadrant words", () => {
		assert.equal(normalizeDentalSlang("верхний левый 6"), "верхний левый 26");
		assert.equal(normalizeDentalSlang("нижняя правая 3"), "нижняя правая 43");
	});

	it("should not process pure digits without quadrant context", () => {
		assert.equal(normalizeDentalSlang("просто 6"), "просто 6");
		assert.equal(normalizeDentalSlang("зуб 8"), "зуб 8");
	});

	it("should ignore normal text without quadrant or slang matches", () => {
		assert.equal(normalizeDentalSlang("удалить зуб"), "удалить зуб");
		assert.equal(normalizeDentalSlang("жалоб нет"), "жалоб нет");
	});

	it("should handle mixed content correctly", () => {
		assert.equal(
			normalizeDentalSlang("удалить зуб верхняя левая шестерка срочно"),
			"удалить зуб верхняя левая 26 срочно",
		);
		assert.equal(
			normalizeDentalSlang("кариес на нижней правой пятерке"),
			"кариес на нижней правой 45",
		);
	});

	it("should affect nearby tooth definitions within 10 words (shared context)", () => {
		assert.equal(
			normalizeDentalSlang("верхняя левая шестерка и семерка"),
			"верхняя левая 26 и 27",
		);
	});
});
