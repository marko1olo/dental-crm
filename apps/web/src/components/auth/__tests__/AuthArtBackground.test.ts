/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import { selectAuthArt, AuthArtItem } from "../authArtSelector";

describe("selectAuthArt", () => {
	const mockManifest: AuthArtItem[] = [
		{ pack: "nature", slot: "morning", avif: "a1", webp: "w1", lqip: "", dominantColor: "", width: 1, height: 1 },
		{ pack: "nature", slot: "morning", avif: "a2", webp: "w2", lqip: "", dominantColor: "", width: 1, height: 1 },
		{ pack: "nature", slot: "day", avif: "a3", webp: "w3", lqip: "", dominantColor: "", width: 1, height: 1 },
		{ pack: "dental-epic", slot: "day", avif: "a4", webp: "w4", lqip: "", dominantColor: "", width: 1, height: 1 },
	];

	it("returns null if saveData is true", () => {
		const result = selectAuthArt(mockManifest, { pack: "nature", slot: "morning", saveData: true, reducedMotion: false });
		expect(result).toBeNull();
	});

	it("returns null if pack is empty", () => {
		const result = selectAuthArt(mockManifest, { pack: "anime", slot: "morning", saveData: false, reducedMotion: false });
		expect(result).toBeNull();
	});

	it("selects from the correct slot if it has >= 2 items", () => {
		const result = selectAuthArt(mockManifest, { pack: "nature", slot: "morning", saveData: false, reducedMotion: false });
		expect(result).not.toBeNull();
		expect(result?.slot).toBe("morning");
		expect(result?.pack).toBe("nature");
	});

	it("expands choice to the entire pack if the slot has < 2 items", () => {
		// dental-epic only has 1 item overall, which is 'day'. 
		// If we ask for 'night', it should fallback to the entire pack ('day').
		const result = selectAuthArt(mockManifest, { pack: "dental-epic", slot: "night", saveData: false, reducedMotion: false });
		expect(result).not.toBeNull();
		expect(result?.pack).toBe("dental-epic");
		expect(result?.slot).toBe("day"); // expanded to entire pack
	});

	it("works when slot has exactly 1 item and expands to pack (which only has that 1 item)", () => {
		const result = selectAuthArt(mockManifest, { pack: "nature", slot: "day", saveData: false, reducedMotion: false });
		// nature has 1 day item, but expands to all nature items (morning + day)
		expect(result).not.toBeNull();
		expect(result?.pack).toBe("nature");
	});
});
