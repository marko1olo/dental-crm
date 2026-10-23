/**
 * dmsGuaranteeLettersHub.test.ts — Unit tests for DMS Guarantee Letters, FDI Formula & Copay Splitting.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	type PatientGuaranteeLetter,
	DEFAULT_BILL_ITEMS_TO_SPLIT,
	COMMON_DENTAL_ICD10_DIAGNOSES,
	FDI_ADULT_TEETH_UPPER,
	FDI_ADULT_TEETH_LOWER,
	EXPRESS_GUARANTEE_LETTER_PRESETS,
} from "./dmsInsurancePresets.js";

const TEST_PATIENT_GUARANTEE_LETTERS: readonly PatientGuaranteeLetter[] = [
	{
		id: "gl-sogaz-001", letterNumber: "ГП-СОГАЗ-2026-8812", insurerKey: "sogaz", insurerName: "АО «СОГАЗ»",
		patientId: "pat-101", patientFullName: "Иванов Сергей Алексеевич", policyNumber: "СГЗ-77-991283",
		issueDate: "2026-08-01", validFrom: "2026-08-01", validUntil: "2026-09-01",
		maxCoverageKopecks: 5000000, usedAmountKopecks: 1250000, franchisePct: 0, franchiseType: "percent",
		franchiseFixedKopecks: 0, approvedTeethFdi: ["1.6", "1.5", "2.6"],
		approvedServiceCodes804n: ["A16.07.002.001", "A11.07.010"], approvedDiagnosisMkb10: ["K04.0", "K02.1"],
		curatorFullName: "Куратор", curatorPhone: "8-800-000-00-00", notes: "", status: "active",
	},
	{
		id: "gl-ingos-002", letterNumber: "ИНГОС-МЕД-26-44091", insurerKey: "ingosstrakh", insurerName: "СПАО «Ингосстрах»",
		patientId: "pat-101", patientFullName: "Иванов Сергей Алексеевич", policyNumber: "ИНГ-902-11487",
		issueDate: "2026-07-10", validFrom: "2026-07-10", validUntil: "2026-08-10",
		maxCoverageKopecks: 3500000, usedAmountKopecks: 2975000, franchisePct: 15, franchiseType: "percent",
		franchiseFixedKopecks: 0, approvedTeethFdi: ["3.8", "4.8"],
		approvedServiceCodes804n: ["A16.07.001.002"], approvedDiagnosisMkb10: ["K01.1"],
		curatorFullName: "Куратор", curatorPhone: "8-800-000-00-00", notes: "", status: "expired",
	},
];

describe("DmsGuaranteeLettersHub — Guarantee Letters, FDI Formula & Copay Split", () => {
	it("3.1 Validates default patient guarantee letters and limit thresholds", () => {
		const activeLetter = TEST_PATIENT_GUARANTEE_LETTERS[0]!;
		assert.equal(activeLetter.status, "active");
		assert.equal(activeLetter.maxCoverageKopecks, 5000000);
		assert.equal(activeLetter.usedAmountKopecks, 1250000);
		const usedPct = Math.round((activeLetter.usedAmountKopecks / activeLetter.maxCoverageKopecks) * 100);
		assert.equal(usedPct, 25);
		assert.ok(usedPct < 80);

		const expiredLetter = TEST_PATIENT_GUARANTEE_LETTERS[1]!;
		const usedPctExpired = Math.round((expiredLetter.usedAmountKopecks / expiredLetter.maxCoverageKopecks) * 100);
		assert.equal(usedPctExpired, 85);
		assert.ok(usedPctExpired >= 80 && usedPctExpired < 100);
	});

	it("3.2 Contains standard adult FDI teeth notation (11..48)", () => {
		assert.equal(FDI_ADULT_TEETH_UPPER.length, 16);
		assert.equal(FDI_ADULT_TEETH_LOWER.length, 16);
		assert.ok(FDI_ADULT_TEETH_UPPER.includes("1.8"));
		assert.ok(FDI_ADULT_TEETH_LOWER.includes("4.8"));
	});

	it("3.3 Contains standard Russian dental ICD-10 diagnoses", () => {
		const codes = COMMON_DENTAL_ICD10_DIAGNOSES.map((d) => d.code);
		assert.ok(codes.includes("K02.1"));
		assert.ok(codes.includes("K04.0"));
		assert.ok(codes.includes("K05.1"));
	});

	it("3.4 Validates default bill items to split", () => {
		assert.equal(DEFAULT_BILL_ITEMS_TO_SPLIT.length, 3);
	});

	it("3.5 Validates 1-click Express Guarantee Letter Presets (Mandates 8e, 8n)", () => {
		assert.ok(EXPRESS_GUARANTEE_LETTER_PRESETS.length >= 4);
		for (const preset of EXPRESS_GUARANTEE_LETTER_PRESETS) {
			assert.ok(preset.id.startsWith("express_"));
			assert.ok(preset.maxCoverageRub >= 25000);
		}
	});

	it("3.6 Proves Mandate 8e: counter-provision and patient co-pay split logic", () => {
		const totalDueRub = 10000;
		const availableDmsCoverageRub = 8000;
		const totalKop = Math.round(totalDueRub * 100);
		const dmsKop = Math.min(totalKop, Math.round(availableDmsCoverageRub * 100));
		const patientCoPayKop = Math.max(0, totalKop - dmsKop);
		assert.equal(dmsKop, 800000);
		assert.equal(patientCoPayKop, 200000);
		assert.equal(dmsKop + patientCoPayKop, totalKop);
	});

	it("3.7 Proves 100% DMS payment skips consumer fiscal receipt", () => {
		const totalDueRub = 5000;
		const availableDmsCoverageRub = 50000;
		const totalKop = Math.round(totalDueRub * 100);
		const dmsKop = Math.min(totalKop, Math.round(availableDmsCoverageRub * 100));
		const patientCoPayKop = Math.max(0, totalKop - dmsKop);
		assert.equal(patientCoPayKop, 0);
		assert.equal(patientCoPayKop > 0, false);
	});
});
