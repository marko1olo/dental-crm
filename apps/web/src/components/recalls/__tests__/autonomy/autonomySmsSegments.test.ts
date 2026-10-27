import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DEFAULT_RECALL_CANDIDATES,
	calculateSmsSegments,
	formatSmsSummary,
} from "../../patientRecallEngine";

describe("4. Anti-Simulator Law & Real SMS Segment Calculations (Mandate 8i)", () => {
	it("calculates GSM-7 single and multipart SMS segments with mathematical accuracy", () => {
		const shortGsm = "Hello! Routine dental checkup reminder from DENTE Clinic. Call 123456.";
		const shortCalc = calculateSmsSegments(shortGsm);

		assert.strictEqual(shortCalc.characterCount, shortGsm.length);
		assert.strictEqual(shortCalc.encoding, "GSM-7");
		assert.strictEqual(shortCalc.segmentCount, 1);
		assert.strictEqual(shortCalc.charsPerSegment, 160);
		assert.strictEqual(shortCalc.remainingInCurrentSegment, 160 - shortGsm.length);
		assert.strictEqual(shortCalc.isMultipart, false);

		const exact160 = "A".repeat(160);
		const exactCalc = calculateSmsSegments(exact160);
		assert.strictEqual(exactCalc.segmentCount, 1);
		assert.strictEqual(exactCalc.remainingInCurrentSegment, 0);

		const multi161 = "A".repeat(161);
		const multiCalc = calculateSmsSegments(multi161);
		assert.strictEqual(multiCalc.segmentCount, 2);
		assert.strictEqual(multiCalc.charsPerSegment, 153);
		assert.strictEqual(multiCalc.maxCharsInCurrentSegment, 306);
		assert.strictEqual(multiCalc.remainingInCurrentSegment, 306 - 161);
		assert.strictEqual(multiCalc.isMultipart, true);
	});

	it("calculates UCS-2 (Cyrillic) single and multipart SMS segments per 3GPP standards", () => {
		const shortCyrillic = "Мария, прошло 6 мес. Пора на гигиену: https://dente.clinic/b";
		const cyrCalc = calculateSmsSegments(shortCyrillic);

		assert.strictEqual(cyrCalc.characterCount, shortCyrillic.length);
		assert.strictEqual(cyrCalc.encoding, "UCS-2");
		assert.strictEqual(cyrCalc.segmentCount, 1);
		assert.strictEqual(cyrCalc.charsPerSegment, 70);
		assert.strictEqual(cyrCalc.remainingInCurrentSegment, 70 - shortCyrillic.length);
		assert.strictEqual(cyrCalc.isMultipart, false);

		const exact70 = "А".repeat(70);
		const exactCyr = calculateSmsSegments(exact70);
		assert.strictEqual(exactCyr.segmentCount, 1);
		assert.strictEqual(exactCyr.remainingInCurrentSegment, 0);

		const multi71 = "А".repeat(71);
		const multiCyr = calculateSmsSegments(multi71);
		assert.strictEqual(multiCyr.segmentCount, 2);
		assert.strictEqual(multiCyr.charsPerSegment, 67);
		assert.strictEqual(multiCyr.maxCharsInCurrentSegment, 134);
		assert.strictEqual(multiCyr.remainingInCurrentSegment, 134 - 71);
		assert.strictEqual(multiCyr.isMultipart, true);

		const tripleCyr = "А".repeat(150);
		const tripleCalc = calculateSmsSegments(tripleCyr);
		assert.strictEqual(tripleCalc.segmentCount, 3);
		assert.strictEqual(tripleCalc.remainingInCurrentSegment, 201 - 150);
	});

	it("formats human-readable SMS billing summary accurately", () => {
		const calc1 = calculateSmsSegments("Тест");
		const summary1 = formatSmsSummary(calc1);
		assert.ok(summary1.includes("4 симв."));
		assert.ok(summary1.includes("1 SMS"));
		assert.ok(summary1.includes("UCS-2"));

		const emptyCalc = calculateSmsSegments("");
		assert.strictEqual(formatSmsSummary(emptyCalc), "0 символов • 0 SMS");
	});

	it("proves default candidate pool is strictly empty (zero fake simulator records)", () => {
		assert.deepStrictEqual(DEFAULT_RECALL_CANDIDATES, []);
	});
});
