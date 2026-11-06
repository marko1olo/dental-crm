import { describe, expect, it, vi } from "vitest";
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

		const quickStateChangeSpy = vi.fn();
		markIntactDentitionAction(
			() => allAdultTeeth,
			quickStateChangeSpy,
			undefined,
			mockTeethData,
		);

		expect(quickStateChangeSpy).toHaveBeenCalledTimes(1);
		const [targets, state] = quickStateChangeSpy.mock.calls[0]!;
		expect(state).toBe("Healthy");

		// Surgical teeth (36 Missing, 26 Implant, 14 Crown, 48 Root) must NOT be in targets!
		expect(targets).not.toContain(36);
		expect(targets).not.toContain(26);
		expect(targets).not.toContain(14);
		expect(targets).not.toContain(48);

		// Non-surgical teeth (like 16 Caries and remaining healthy teeth) must be in targets
		expect(targets).toContain(16);
		expect(targets).toContain(11);
		expect(targets).toContain(21);
		expect(targets.length).toBe(32 - 4); // 28 sanitized
	});

	it("2. Frontal hygiene applies calculus/plaque cleanup to frontal sector 13-23 and 33-43", () => {
		const quickStateChangeSpy = vi.fn();

		// Adult mode
		markFrontalHygieneAction(false, quickStateChangeSpy);
		expect(quickStateChangeSpy).toHaveBeenCalledWith(
			[...FRONTAL_HYGIENE_SECTOR_ADULT],
			"Healthy",
			[],
		);
		expect(quickStateChangeSpy.mock.calls[0]![0]).toHaveLength(12);

		// Pediatric mode
		quickStateChangeSpy.mockClear();
		markFrontalHygieneAction(true, quickStateChangeSpy);
		expect(quickStateChangeSpy).toHaveBeenCalledWith(
			[...FRONTAL_HYGIENE_SECTOR_PEDIATRIC],
			"Healthy",
			[],
		);
		expect(quickStateChangeSpy.mock.calls[0]![0]).toHaveLength(12);
	});

	it("3. Shorthand dental formula parser handles Russian dental notations", () => {
		const parsed = parseDentalFormulaShorthand("16к 25п 36о 13-23зд");
		expect(parsed.hasMatches).toBe(true);

		const tooth16 = parsed.items.find((t) => t.toothNumber === 16);
		expect(tooth16?.state).toBe("Caries");

		const tooth25 = parsed.items.find((t) => t.toothNumber === 25);
		expect(tooth25?.state).toBe("Filled");

		const tooth36 = parsed.items.find((t) => t.toothNumber === 36);
		expect(tooth36?.state).toBe("Missing");

		// Range 13..23 Healthy (6 teeth)
		const frontalTeeth = [13, 12, 11, 21, 22, 23];
		for (const fn of frontalTeeth) {
			const it = parsed.items.find((t) => t.toothNumber === fn);
			expect(it?.state).toBe("Healthy");
		}
	});

	it("4. Wisdom teeth missing action targets third molars (18, 28, 38, 48)", () => {
		const quickStateChangeSpy = vi.fn();
		markWisdomTeethMissingAction(quickStateChangeSpy);
		expect(quickStateChangeSpy).toHaveBeenCalledWith(
			[18, 28, 38, 48],
			"Missing",
			[],
		);
	});
});
