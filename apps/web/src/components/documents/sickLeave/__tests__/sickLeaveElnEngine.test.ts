import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	computeElnCheckDigit,
	validateElnNumber,
	generateElnNumber,
	validateSickLeaveDuration,
	ELN_MOD11_WEIGHTS,
	type SickLeaveFormState,
} from "../sickLeaveElnEngine";

describe("Statutory ELN Engine: MOD 11 Checksum, Verification & Deterministic Generation", () => {
	describe("1. computeElnCheckDigit (SFR / FSS EIIS Socstrakh Algorithm)", () => {
		it("has exactly 11 regulatory weights conforming to MOD 11 specification", () => {
			assert.equal(ELN_MOD11_WEIGHTS.length, 11);
			assert.deepEqual([...ELN_MOD11_WEIGHTS], [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
		});

		it("throws an error if fewer than 11 digits are passed", () => {
			assert.throws(
				() => computeElnCheckDigit("9991234567"),
				/ELN check digit calculation requires at least 11 digits/
			);
		});

		it("correctly computes weighted check digit for known prefixes", () => {
			// Test known 11-digit vector:
			// '99900000001':
			// 9*3 + 9*7 + 9*2 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 1*8 = 27 + 63 + 18 + 8 = 116
			// 116 % 11 = 6. Expected check digit: 6
			assert.equal(computeElnCheckDigit("99900000001"), 6);

			// Test vector:
			// '99900000009':
			// 9*3 + 9*7 + 9*2 + 9*8 = 108 + 72 = 180.
			// 180 % 11 = 180 - 11*16 = 180 - 176 = 4.
			assert.equal(computeElnCheckDigit("99900000009"), 4);
		});

		it("cleans non-digit characters before calculating checksum", () => {
			const cleanRes = computeElnCheckDigit("999-0000-0001");
			assert.equal(cleanRes, 6);
		});
	});

	describe("2. validateElnNumber (Regulatory FFLC check)", () => {
		it("validates correct 12-digit ELN with matching check digit", () => {
			const validEln = "999000000016";
			assert.equal(validateElnNumber(validEln), true);
		});

		it("rejects ELN with tampered check digit", () => {
			const tamperedEln = "999000000017"; // check digit should be 6, not 7
			assert.equal(validateElnNumber(tamperedEln), false);
		});

		it("rejects ELN with invalid length or non-digit characters", () => {
			assert.equal(validateElnNumber("9990000001"), false); // 10 digits
			assert.equal(validateElnNumber("9990000000166"), false); // 13 digits
			assert.equal(validateElnNumber(""), false);
			assert.equal(validateElnNumber("ABCDEFGHIJKL"), false);
		});
	});

	describe("3. generateElnNumber (Deterministic Generator without Math.random)", () => {
		it("generates a strictly 12-digit ELN conforming to validateElnNumber", () => {
			for (let i = 0; i < 50; i++) {
				const eln = generateElnNumber("999");
				assert.equal(eln.length, 12, `ELN must be 12 digits: ${eln}`);
				assert.ok(eln.startsWith("999"), `ELN must start with prefix 999: ${eln}`);
				assert.equal(validateElnNumber(eln), true, `Generated ELN must pass check digit: ${eln}`);
			}
		});

		it("supports explicit sequence number parameter", () => {
			const elnSeq1 = generateElnNumber("999", 1);
			assert.equal(elnSeq1, "999000000016");
			assert.equal(validateElnNumber(elnSeq1), true);

			const elnSeq42 = generateElnNumber("770", 42);
			assert.ok(elnSeq42.startsWith("77000000042"));
			assert.equal(elnSeq42.length, 12);
			assert.equal(validateElnNumber(elnSeq42), true);
		});

		it("generates monotonic unique sequences across consecutive calls", () => {
			const eln1 = generateElnNumber("999");
			const eln2 = generateElnNumber("999");
			assert.notEqual(eln1, eln2, "Consecutive generated numbers must be distinct");
			assert.equal(validateElnNumber(eln1), true);
			assert.equal(validateElnNumber(eln2), true);
		});
	});

	describe("4. validateSickLeaveDuration Integration with MOD 11 Checksum", () => {
		const baseForm: SickLeaveFormState = {
			elnNumber: generateElnNumber("999", 100),
			issueDate: "2026-09-01",
			isDuplicate: false,
			reasonCode: "01",
			regimeType: "ambulatory",
			icd10Code: "K04.0",
			diagnosisText: "Острый пульпит зуба 3.6",
			periods: [
				{
					id: "p1",
					dateFrom: "2026-09-01",
					dateTo: "2026-09-05",
					doctorSpecialty: "Врач-стоматолог-терапевт",
					doctorFio: "Ковалева Н.С.",
					doctorSnils: "123-456-789 00",
					doctorRole: "attending",
				},
			],
			closingCode: "31",
			workResumeDate: "2026-09-06",
			isVkRequired: false,
			organizationName: "ООО «ДЕНТЕ КЛИНИК»",
			organizationOgrn: "1187746123456",
			organizationAddress: "г. Москва",
			medicalLicenceNumber: "ЛО-77-01-020894",
		};

		it("produces no checksum warnings for valid generated ELN", () => {
			const result = validateSickLeaveDuration(baseForm);
			assert.equal(result.isValid, true);
			assert.ok(
				!result.warnings.some((w) => w.includes("Контрольный разряд номера ЭЛН не совпадает")),
				"Must not emit checksum warning for valid ELN"
			);
		});

		it("warns about invalid checksum when ELN number has mismatched check digit", () => {
			const invalidForm: SickLeaveFormState = {
				...baseForm,
				elnNumber: "999000000010", // Check digit should be 6
			};
			const result = validateSickLeaveDuration(invalidForm);
			assert.ok(
				result.warnings.some((w) => w.includes("Контрольный разряд номера ЭЛН не совпадает")),
				"Must emit warning when check digit is mismatched"
			);
		});
	});
});
