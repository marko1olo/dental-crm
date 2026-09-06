import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_VALID_VITA_SHADES,
	isValidVitaShade,
	normalizeVitaShade,
	vitaShadeSchema,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	VITA_CLASSICAL_SHADES,
} from "@dental/shared";
import {
	LAB_ORDER_CLINIC_TRANSITIONS,
	LAB_ORDER_TECHNICIAN_TRANSITIONS,
	type LabOrderStatus,
} from "../../db/labQuery.js";

describe("Dental Laboratory VITA Shades & FDI Tooth Validation", () => {
	it("validates all 16 VITA Classical shades (A1–D4)", () => {
		for (const shade of VITA_CLASSICAL_SHADES) {
			assert.equal(
				isValidVitaShade(shade),
				true,
				`Expected VITA Classical shade ${shade} to be valid`,
			);
			assert.equal(
				isValidVitaShade(shade.toLowerCase()),
				true,
				`Expected lower-case shade ${shade} to be normalized and valid`,
			);
		}
	});

	it("validates VITA Bleach shades (0M1-0M3, BL1-BL4)", () => {
		for (const shade of VITA_BLEACH_SHADES) {
			assert.equal(
				isValidVitaShade(shade),
				true,
				`Expected VITA Bleach shade ${shade} to be valid`,
			);
		}
	});

	it("validates 26 VITA 3D-Master shades (e.g. 1M1, 2M2, 3L1.5)", () => {
		for (const shade of VITA_3D_MASTER_SHADES) {
			assert.equal(
				isValidVitaShade(shade),
				true,
				`Expected VITA 3D-Master shade ${shade} to be valid`,
			);
		}
	});

	it("normalizes Cyrillic homoglyphs for VITA tooth shades (Mandates 8e, 8k)", () => {
		// Russian homoglyph letters: А (U+0410), В (U+0412), С (U+0421), Д (U+0414), М (U+041C), Р (U+0420), Л (U+041B)
		const homoglyphCases: Array<{ input: string; expected: string }> = [
			{ input: "А1", expected: "A1" }, // Cyrillic А
			{ input: "А2", expected: "A2" }, // Cyrillic А
			{ input: "А3", expected: "A3" }, // Cyrillic А
			{ input: "А3.5", expected: "A3.5" }, // Cyrillic А
			{ input: "А4", expected: "A4" }, // Cyrillic А
			{ input: "а2", expected: "A2" }, // Lowercase Cyrillic а
			{ input: "  а3.5  ", expected: "A3.5" }, // Lowercase Cyrillic with whitespace
			{ input: "В1", expected: "B1" }, // Cyrillic В
			{ input: "В2", expected: "B2" }, // Cyrillic В
			{ input: "в3", expected: "B3" }, // Lowercase Cyrillic в
			{ input: "С1", expected: "C1" }, // Cyrillic С
			{ input: "С2", expected: "C2" }, // Cyrillic С
			{ input: "с3", expected: "C3" }, // Lowercase Cyrillic с
			{ input: "D2", expected: "D2" }, // Latin D
			{ input: "Д3", expected: "D3" }, // Cyrillic Д
			{ input: "д4", expected: "D4" }, // Lowercase Cyrillic д
			{ input: "1М1", expected: "1M1" }, // Cyrillic М
			{ input: "1м2", expected: "1M2" }, // Lowercase Cyrillic м
			{ input: "2R1.5", expected: "2R1.5" }, // Latin R
			{ input: "2Р1.5", expected: "2R1.5" }, // Cyrillic Р
			{ input: "2р2.5", expected: "2R2.5" }, // Lowercase Cyrillic р
			{ input: "3L2.5", expected: "3L2.5" }, // Latin L
			{ input: "3Л2.5", expected: "3L2.5" }, // Cyrillic Л
			{ input: "3л1.5", expected: "3L1.5" }, // Lowercase Cyrillic л
			{ input: "0М1", expected: "0M1" }, // Bleach 0M1 with Cyrillic М
			{ input: "ВЛ1", expected: "BL1" }, // Bleach BL1 with Cyrillic В and Л
			{ input: "вл2", expected: "BL2" }, // Lowercase Cyrillic вл
		];

		for (const { input, expected } of homoglyphCases) {
			assert.equal(
				normalizeVitaShade(input),
				expected,
				`Expected normalizeVitaShade('${input}') to be '${expected}'`,
			);
			assert.equal(
				isValidVitaShade(input),
				true,
				`Expected isValidVitaShade('${input}') with Cyrillic homoglyph to be valid`,
			);
			const parsed = vitaShadeSchema.parse(input);
			assert.equal(
				parsed,
				expected,
				`Expected vitaShadeSchema.parse('${input}') to transform to '${expected}'`,
			);
		}
	});

	it("rejects non-standard or invalid shade names even with Cyrillic input", () => {
		const invalidShades = ["E1", "Z9", "superwhite", "123", "A5", "Хлам", "Ж1", "Я2", "Ы", ""];
		for (const shade of invalidShades) {
			assert.equal(
				isValidVitaShade(shade),
				false,
				`Expected shade '${shade}' to be rejected`,
			);
			assert.throws(
				() => vitaShadeSchema.parse(shade),
				`Expected vitaShadeSchema.parse('${shade}') to throw validation error`,
			);
		}
	});
});

describe("Dental Lab Order State Machine Transitions", () => {
	it("allows standard clinic forward lifecycle from draft to completed", () => {
		const transitions: Array<[LabOrderStatus, LabOrderStatus]> = [
			["draft", "sent"],
			["sent", "in_progress"],
			["in_progress", "shipped"],
			["shipped", "received"],
			["received", "completed"],
		];

		for (const [from, to] of transitions) {
			const allowed = LAB_ORDER_CLINIC_TRANSITIONS[from];
			assert.ok(
				allowed.includes(to),
				`Expected clinic transition ${from} -> ${to} to be permitted`,
			);
		}
	});

	it("allows clinic cancellation from any non-final state", () => {
		const cancellableStates: LabOrderStatus[] = [
			"draft",
			"sent",
			"in_progress",
			"shipped",
			"received",
			"refitting",
		];

		for (const state of cancellableStates) {
			const allowed = LAB_ORDER_CLINIC_TRANSITIONS[state];
			assert.ok(
				allowed.includes("cancelled"),
				`Expected cancellation from state ${state} to be permitted for clinic`,
			);
		}
	});

	it("allows clinic warranty rework transition from completed to refitting", () => {
		const allowed = LAB_ORDER_CLINIC_TRANSITIONS.completed;
		assert.ok(
			allowed.includes("refitting"),
			"Expected completed orders to be transitional to refitting for warranty reworks",
		);
	});

	it("technician portal cannot directly cancel or reopen draft orders", () => {
		assert.equal(
			LAB_ORDER_TECHNICIAN_TRANSITIONS.draft.length,
			0,
			"Technician cannot transition draft orders directly",
		);
		assert.equal(
			LAB_ORDER_TECHNICIAN_TRANSITIONS.completed.length,
			0,
			"Completed orders are locked and cannot transition",
		);
		assert.equal(
			LAB_ORDER_TECHNICIAN_TRANSITIONS.cancelled.length,
			0,
			"Cancelled orders are locked and cannot transition",
		);
	});
});
