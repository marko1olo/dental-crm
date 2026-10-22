import { describe, it } from "node:test";
import assert from "node:assert/strict";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeDefined: () => assert.notEqual(actual, undefined),
});

import {
	validateLabOrderInput,
	isValidVitaShade,
	type LabOrderValidationInput,
} from "../orderSaveModules/labOrderValidator";

describe("dentalLabOrderValidator", () => {
	it("validates VITA shades correctly (Classical, Bleach, 3D-Master)", () => {
		expect(isValidVitaShade("A1")).toBe(true);
		expect(isValidVitaShade("A2")).toBe(true);
		expect(isValidVitaShade("A3.5")).toBe(true);
		expect(isValidVitaShade("B3")).toBe(true);
		expect(isValidVitaShade("C2")).toBe(true);
		expect(isValidVitaShade("D4")).toBe(true);
		expect(isValidVitaShade("BL1")).toBe(true);
		expect(isValidVitaShade("OM2")).toBe(true);
		expect(isValidVitaShade("2M2")).toBe(true);
		expect(isValidVitaShade("3L1.5")).toBe(true);
		expect(isValidVitaShade("")).toBe(false);
		expect(isValidVitaShade(null)).toBe(false);
		expect(isValidVitaShade("X")).toBe(false);
	});

	it("passes validation with valid form data and calculates SLA risk", () => {
		const input: LabOrderValidationInput = {
			patientId: "pat-100",
			patientName: "Алексеев Владимир Сергеевич",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов А.И.",
			selectedTeeth: [16, 17],
			constructionType: "single_crown",
			material: "zirconia",
			shadeFinal: "A2",
			dueDate: "2026-10-20",
			scheduledVisitDate: "2026-10-22",
			totalLabPriceRub: 14000,
		};
		const result = validateLabOrderInput(input);
		expect(result.isValid).toBe(true);
		expect(result.errors.length).toBe(0);
		expect(result.slaRisk).toBeDefined();
	});

	it("fails validation when patient name or teeth/jawScope are missing", () => {
		const inputNoPatient: LabOrderValidationInput = {
			patientName: "",
			selectedTeeth: [16],
			constructionType: "single_crown",
			material: "zirconia",
		};
		const res1 = validateLabOrderInput(inputNoPatient);
		expect(res1.isValid).toBe(false);

		const inputNoTeeth: LabOrderValidationInput = {
			patientName: "Иванов И.И.",
			selectedTeeth: [],
			jawScope: null,
			constructionType: "single_crown",
			material: "zirconia",
		};
		const res2 = validateLabOrderInput(inputNoTeeth);
		expect(res2.isValid).toBe(false);
	});

	it("handles jawScope, invalid teeth, and SLA overdue warnings", () => {
		const inputJaw: LabOrderValidationInput = {
			patientName: "Иванов И.И.",
			selectedTeeth: [],
			jawScope: "upper",
			constructionType: "all_on_arch",
			material: "zirconia",
		};
		expect(validateLabOrderInput(inputJaw).isValid).toBe(true);

		const inputInvalidFdi: LabOrderValidationInput = {
			patientName: "Иванов И.И.",
			selectedTeeth: [99],
			constructionType: "single_crown",
			material: "zirconia",
		};
		expect(validateLabOrderInput(inputInvalidFdi).isValid).toBe(false);

		const inputConflict: LabOrderValidationInput = {
			patientName: "Иванов И.И.",
			selectedTeeth: [21],
			constructionType: "single_crown",
			material: "zirconia",
			dueDate: "2026-10-25",
			scheduledVisitDate: "2026-10-20",
		};
		const resConflict = validateLabOrderInput(inputConflict);
		expect(resConflict.isValid).toBe(true);
		expect(resConflict.slaRisk).toBe("breached_overdue");
	});
});
