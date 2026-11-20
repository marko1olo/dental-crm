import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	markFrontalHygieneAction,
	markIntactDentitionAction,
	markWisdomTeethMissingAction,
} from "../batchSanitationActions";
import {
	FRONTAL_HYGIENE_SECTOR_ADULT,
	FRONTAL_HYGIENE_SECTOR_PEDIATRIC,
	parseDentalFormulaShorthand,
	resolveSafeSanitationTargets,
} from "@dental/shared";
import type { ToothData } from "../ToothChart";

interface MockFn {
	(...args: any[]): void;
	calls: any[][];
	mockClear(): void;
}

function createSpy(): MockFn {
	const calls: any[][] = [];
	const fn: any = (...args: any[]) => {
		calls.push(args);
	};
	fn.calls = calls;
	fn.mockClear = () => {
		calls.length = 0;
	};
	return fn;
}

describe("Odontogram Macro-Batch Clinical Actions SSOT", () => {
	it("1. Safe sanitation preserves surgical and prosthetic teeth without destructive overwrites", () => {
		const allAdultTeeth = Array.from({ length: 32 }, (_, i) => {
			const q = Math.floor(i / 8) + 1;
			const n = (i % 8) + 1;
			return q * 10 + n;
		});

		const mockTeethData: ToothData[] = allAdultTeeth.map((toothNumber) => {
			if (toothNumber === 16) return { toothNumber, state: "Caries" as const };
			if (toothNumber === 36) return { toothNumber, state: "Missing" as const };
			if (toothNumber === 26) return { toothNumber, state: "Implant" as const };
			if (toothNumber === 14) return { toothNumber, state: "Crown" as const };
			if (toothNumber === 48) return { toothNumber, state: "Root" as const };
			return { toothNumber, state: "Healthy" as const };
		});

		const quickStateChangeSpy = createSpy();
		markIntactDentitionAction(
			() => allAdultTeeth,
			quickStateChangeSpy,
			undefined,
			mockTeethData,
		);

		assert.strictEqual(quickStateChangeSpy.calls.length, 1);
		const [targets, state] = quickStateChangeSpy.calls[0]!;
		assert.strictEqual(state, "Healthy");

		// Surgical teeth (36 Missing, 26 Implant, 14 Crown, 48 Root) must NOT be in targets!
		assert.ok(!targets.includes(36));
		assert.ok(!targets.includes(26));
		assert.ok(!targets.includes(14));
		assert.ok(!targets.includes(48));

		// Non-surgical teeth (like 16 Caries and remaining healthy teeth) must be in targets
		assert.ok(targets.includes(16));
		assert.ok(targets.includes(11));
		assert.ok(targets.includes(21));
		assert.strictEqual(targets.length, 32 - 4); // 28 sanitized
	});

	it("2. Frontal hygiene applies calculus/plaque cleanup to frontal sector 13-23 and 33-43", () => {
		const quickStateChangeSpy = createSpy();

		// Adult mode
		markFrontalHygieneAction(false, quickStateChangeSpy);
		assert.strictEqual(quickStateChangeSpy.calls.length, 1);
		assert.deepStrictEqual(quickStateChangeSpy.calls[0], [
			[...FRONTAL_HYGIENE_SECTOR_ADULT],
			"Healthy",
			[],
		]);
		assert.strictEqual(quickStateChangeSpy.calls[0]![0].length, 12);

		// Pediatric mode
		quickStateChangeSpy.mockClear();
		markFrontalHygieneAction(true, quickStateChangeSpy);
		assert.strictEqual(quickStateChangeSpy.calls.length, 1);
		assert.deepStrictEqual(quickStateChangeSpy.calls[0], [
			[...FRONTAL_HYGIENE_SECTOR_PEDIATRIC],
			"Healthy",
			[],
		]);
		assert.strictEqual(quickStateChangeSpy.calls[0]![0].length, 12);
	});

	it("3. Shorthand dental formula parser handles Russian dental notations", () => {
		const parsed = parseDentalFormulaShorthand("16к 25п 36о 13-23зд");
		assert.strictEqual(parsed.hasMatches, true);

		const tooth16 = parsed.items.find((t) => t.toothNumber === 16);
		assert.strictEqual(tooth16?.state, "Caries");

		const tooth25 = parsed.items.find((t) => t.toothNumber === 25);
		assert.strictEqual(tooth25?.state, "Filled");

		const tooth36 = parsed.items.find((t) => t.toothNumber === 36);
		assert.strictEqual(tooth36?.state, "Missing");

		// Range 13..23 Healthy (6 teeth)
		const frontalTeeth = [13, 12, 11, 21, 22, 23];
		for (const fn of frontalTeeth) {
			const it = parsed.items.find((t) => t.toothNumber === fn);
			assert.strictEqual(it?.state, "Healthy");
		}
	});

	it("4. Wisdom teeth missing action targets third molars (18, 28, 38, 48)", () => {
		const quickStateChangeSpy = createSpy();
		markWisdomTeethMissingAction(quickStateChangeSpy);
		assert.strictEqual(quickStateChangeSpy.calls.length, 1);
		assert.deepStrictEqual(quickStateChangeSpy.calls[0], [
			[18, 28, 38, 48],
			"Missing",
			[],
		]);
	});
});
