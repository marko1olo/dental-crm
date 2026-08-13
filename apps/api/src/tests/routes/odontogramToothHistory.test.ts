import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	FDI_TOOTH_NUMBER_MESSAGE,
	VALID_FDI_TOOTH_NUMBERS,
	isValidFdiToothNumber,
} from "@dental/shared";
import { CLINICAL_TOOTH_STATE_VALUES } from "../../routes/odontogram.js";
import { isToothReferenced } from "../../routes/toothHistory.js";

describe("FDI / ISO 3950 Dental Notation & State Taxonomy", () => {
	test("validates permanent tooth quadrants (11-18, 21-28, 31-38, 41-48)", () => {
		assert.equal(isValidFdiToothNumber(11), true);
		assert.equal(isValidFdiToothNumber(16), true);
		assert.equal(isValidFdiToothNumber(28), true);
		assert.equal(isValidFdiToothNumber(36), true);
		assert.equal(isValidFdiToothNumber(48), true);

		// Invalid numbers outside teeth quadrants
		assert.equal(isValidFdiToothNumber(19), false);
		assert.equal(isValidFdiToothNumber(20), false);
		assert.equal(isValidFdiToothNumber(49), false);
		assert.equal(isValidFdiToothNumber(50), false);
	});

	test("validates primary/deciduous tooth quadrants (51-55, 61-65, 71-75, 81-85)", () => {
		assert.equal(isValidFdiToothNumber(51), true);
		assert.equal(isValidFdiToothNumber(55), true);
		assert.equal(isValidFdiToothNumber(64), true);
		assert.equal(isValidFdiToothNumber(75), true);
		assert.equal(isValidFdiToothNumber(85), true);

		assert.equal(isValidFdiToothNumber(56), false);
		assert.equal(isValidFdiToothNumber(66), false);
		assert.equal(isValidFdiToothNumber(76), false);
		assert.equal(isValidFdiToothNumber(86), false);
	});

	test("validates supernumerary teeth (91-98)", () => {
		assert.equal(isValidFdiToothNumber(91), true);
		assert.equal(isValidFdiToothNumber(95), true);
		assert.equal(isValidFdiToothNumber(98), true);
		assert.equal(isValidFdiToothNumber(99), false);
	});

	test("includes comprehensive 21-state clinical tooth taxonomy", () => {
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Healthy"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Caries"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Pulpitis"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Periodontitis"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Root_Canal_Treated"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Crown"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Bridge"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Bridge_Abutment"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Implant"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Planned_Implant"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Missing"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Extracted"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Impacted"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Mobility_I"), true);
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.includes("Furcation_I"), true);
	});
});

describe("Tooth History Timeline Compound References Matching", () => {
	test("matches exact tooth string", () => {
		assert.equal(isToothReferenced("16", 16), true);
		assert.equal(isToothReferenced("16", 26), false);
	});

	test("matches compound comma-separated teeth ('16, 17', '11, 21')", () => {
		assert.equal(isToothReferenced("16, 17", 16), true);
		assert.equal(isToothReferenced("16, 17", 17), true);
		assert.equal(isToothReferenced("16, 17", 18), false);
	});

	test("matches tooth within clinical notes and ranges ('зубы 16-18')", () => {
		assert.equal(isToothReferenced("зубы 16-18", 16), true);
		assert.equal(isToothReferenced("зубы 16-18", 18), true);
		assert.equal(isToothReferenced("лечение зуба 46 (кариес)", 46), true);
	});

	test("does not false-positive match sub-numbers (e.g. 1 in 16)", () => {
		assert.equal(isToothReferenced("16", 1), false);
		assert.equal(isToothReferenced("116", 16), false);
	});
});
