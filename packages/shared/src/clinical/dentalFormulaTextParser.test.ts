/**
 * packages/shared/src/clinical/dentalFormulaTextParser.test.ts
 *
 * Unit tests for Dental Formula Shorthand Parser & Safe Sanitation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	parseDentalFormulaShorthand,
	resolveSafeSanitationTargets,
	isSurgicalOrProstheticState,
	FRONTAL_HYGIENE_SECTOR_ADULT,
} from "./dentalFormulaTextParser.js";

describe("dentalFormulaTextParser SSOT Suite", () => {
	it("1. Parses standard Russian dental shorthand (16к 25п 36о)", () => {
		const res = parseDentalFormulaShorthand("16к 25п 36о");
		assert.equal(res.hasMatches, true);
		assert.equal(res.items.length, 3);

		const item16 = res.items.find((i) => i.toothNumber === 16);
		assert.ok(item16);
		assert.equal(item16.state, "Caries");

		const item25 = res.items.find((i) => i.toothNumber === 25);
		assert.ok(item25);
		assert.equal(item25.state, "Filled");

		const item36 = res.items.find((i) => i.toothNumber === 36);
		assert.ok(item36);
		assert.equal(item36.state, "Missing");
	});

	it("2. Parses multi-letter Russian codes (47пт 14кр 26и 11зд 48р)", () => {
		const res = parseDentalFormulaShorthand("47пт 14кр 26и 11зд 48р");
		assert.equal(res.items.length, 5);

		assert.equal(res.items.find((i) => i.toothNumber === 47)?.state, "Pulpitis");
		assert.equal(res.items.find((i) => i.toothNumber === 14)?.state, "Crown");
		assert.equal(res.items.find((i) => i.toothNumber === 26)?.state, "Implant");
		assert.equal(res.items.find((i) => i.toothNumber === 11)?.state, "Healthy");
		assert.equal(res.items.find((i) => i.toothNumber === 48)?.state, "Root");
	});

	it("3. Handles delimiters: commas, spaces, dashes (16-к, 25-п; 36-0)", () => {
		const res = parseDentalFormulaShorthand("16-к, 25-п; 36-0");
		assert.equal(res.items.length, 3);
		assert.equal(res.items.find((i) => i.toothNumber === 16)?.state, "Caries");
		assert.equal(res.items.find((i) => i.toothNumber === 25)?.state, "Filled");
		assert.equal(res.items.find((i) => i.toothNumber === 36)?.state, "Missing");
	});

	it("4. Parses ranges (13-23зд)", () => {
		const res = parseDentalFormulaShorthand("13-23зд");
		assert.equal(res.items.length, 6);
		const expected = [13, 12, 11, 21, 22, 23];
		for (const t of expected) {
			assert.equal(res.items.find((i) => i.toothNumber === t)?.state, "Healthy");
		}
	});

	it("5. Handles separated pairs (16 кариес 25 пломба 36 отсутствует)", () => {
		const res = parseDentalFormulaShorthand("16 кариес 25 пломба 36 отсутствует");
		assert.equal(res.items.length, 3);
		assert.equal(res.items.find((i) => i.toothNumber === 16)?.state, "Caries");
		assert.equal(res.items.find((i) => i.toothNumber === 25)?.state, "Filled");
		assert.equal(res.items.find((i) => i.toothNumber === 36)?.state, "Missing");
	});

	it("6. Safe Sanitation prevents overwriting surgical and prosthetic statuses", () => {
		assert.equal(isSurgicalOrProstheticState("Missing"), true);
		assert.equal(isSurgicalOrProstheticState("Implant"), true);
		assert.equal(isSurgicalOrProstheticState("Crown"), true);
		assert.equal(isSurgicalOrProstheticState("Caries"), false);
		assert.equal(isSurgicalOrProstheticState("Pulpitis"), false);
		assert.equal(isSurgicalOrProstheticState("Healthy"), false);

		const allTeeth = [16, 17, 36, 46, 11, 21];
		const states = new Map<number, string>([
			[16, "Caries"],
			[17, "Pulpitis"],
			[36, "Missing"], // Surgical: must be preserved!
			[46, "Implant"], // Surgical: must be preserved!
			[11, "Crown"],   // Prosthetic: must be preserved!
			[21, "Healthy"],
		]);

		const { sanitizedTargets, preservedSurgicalCount, preservedTeeth } = resolveSafeSanitationTargets(allTeeth, states);

		assert.equal(preservedSurgicalCount, 3);
		assert.deepEqual(preservedTeeth.sort(), [11, 36, 46]);
		assert.deepEqual(sanitizedTargets.sort(), [16, 17, 21]);
	});

	it("7. Verifies frontal hygiene sector teeth constants", () => {
		assert.equal(FRONTAL_HYGIENE_SECTOR_ADULT.length, 12);
		assert.ok(FRONTAL_HYGIENE_SECTOR_ADULT.includes(13));
		assert.ok(FRONTAL_HYGIENE_SECTOR_ADULT.includes(23));
		assert.ok(FRONTAL_HYGIENE_SECTOR_ADULT.includes(43));
		assert.ok(FRONTAL_HYGIENE_SECTOR_ADULT.includes(33));
	});
});
