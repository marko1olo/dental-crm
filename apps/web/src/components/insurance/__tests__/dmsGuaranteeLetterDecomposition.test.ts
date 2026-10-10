/**
 * dmsGuaranteeLetterDecomposition.test.ts — Verification suite for decomposed
 * DmsGuaranteeLetterModal facade and dmsGuaranteeLetter/* modular directory.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import {
	COMMON_DENTAL_ICD10_DIAGNOSES,
	DEFAULT_BILL_ITEMS_TO_SPLIT,
	DmsApprovedServicesMatrix,
	DmsCoverageSummaryBanner,
	DmsGuaranteeLetterModal,
	DmsGuaranteeModalFooter,
	DmsInsurerAndPolicyForm,
	EXPRESS_GUARANTEE_LETTER_PRESETS,
	FDI_ADULT_TEETH_LOWER,
	FDI_ADULT_TEETH_UPPER,
	QUICK_RUSSIAN_DMS_INSURER_CHIPS,
	fetchPatientGuaranteeLettersFromApi,
	getActiveBillItemsToSplit,
	mapBackendLetterToPatientGuaranteeLetter,
	saveGuaranteeLetterToApi,
} from "../DmsGuaranteeLetterModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const insuranceDir = path.resolve(__dirname, "..");
const decomposedDir = path.resolve(insuranceDir, "dmsGuaranteeLetter");

const RAW_EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]|⚡|🦷|⚠️|❌|✅|🚨|🔥|✓/u;

describe("DmsGuaranteeLetterModal Decomposition & Clinical Invariants", () => {
	it("1. Facade DmsGuaranteeLetterModal.tsx is strictly <= 120 lines and uses createPortal", () => {
		const facadePath = path.resolve(insuranceDir, "DmsGuaranteeLetterModal.tsx");
		const content = fs.readFileSync(facadePath, "utf-8");
		const lineCount = content.split("\n").length;

		assert.ok(
			lineCount <= 120,
			`Facade DmsGuaranteeLetterModal.tsx must be <= 120 lines, got ${lineCount}`,
		);
		assert.ok(
			content.includes("createPortal(modalContent, document.body)"),
			"Facade must mount modal via createPortal(..., document.body)",
		);
		assert.ok(!RAW_EMOJI_REGEX.test(content), "Facade must contain 0 raw emojis");
	});

	it("2. Decomposed modules exist, are <= 800 lines each, and contain 0 raw emojis", () => {
		const requiredFiles = [
			"types.ts",
			"useDmsGuaranteeLetterState.ts",
			"DmsCoverageSummaryBanner.tsx",
			"DmsInsurerAndPolicyForm.tsx",
			"DmsApprovedServicesMatrix.tsx",
			"DmsGuaranteeModalFooter.tsx",
			"index.ts",
		];

		for (const file of requiredFiles) {
			const fullPath = path.resolve(decomposedDir, file);
			assert.ok(fs.existsSync(fullPath), `Module ${file} must exist`);
			const content = fs.readFileSync(fullPath, "utf-8");
			const lines = content.split("\n").length;
			assert.ok(lines <= 800, `Module ${file} must be <= 800 lines, got ${lines}`);
			assert.ok(
				!RAW_EMOJI_REGEX.test(content),
				`Module ${file} must be free of raw emojis`,
			);
		}
	});

	it("3. Preserves 100% of public exports and subcomponents", () => {
		assert.equal(typeof DmsGuaranteeLetterModal, "function");
		assert.equal(typeof DmsCoverageSummaryBanner, "function");
		assert.equal(typeof DmsInsurerAndPolicyForm, "function");
		assert.equal(typeof DmsApprovedServicesMatrix, "function");
		assert.equal(typeof DmsGuaranteeModalFooter, "function");
		assert.equal(typeof getActiveBillItemsToSplit, "function");
		assert.equal(typeof fetchPatientGuaranteeLettersFromApi, "function");
		assert.equal(typeof saveGuaranteeLetterToApi, "function");
		assert.equal(typeof mapBackendLetterToPatientGuaranteeLetter, "function");
		assert.ok(Array.isArray(COMMON_DENTAL_ICD10_DIAGNOSES));
		assert.ok(Array.isArray(FDI_ADULT_TEETH_UPPER));
		assert.ok(Array.isArray(FDI_ADULT_TEETH_LOWER));
		assert.ok(Array.isArray(DEFAULT_BILL_ITEMS_TO_SPLIT));
		assert.ok(Array.isArray(EXPRESS_GUARANTEE_LETTER_PRESETS));
		assert.equal(QUICK_RUSSIAN_DMS_INSURER_CHIPS.length, 6);
	});

	it("4. Renders all decomposed sections, top 6 Russian insurers, and 0 disabled buttons (Mandate 8e)", () => {
		const html = renderToString(
			React.createElement(DmsGuaranteeLetterModal, {
				isOpen: true,
				onClose: () => {},
				patient: {
					id: "pat-dms-1",
					fullName: "Соколова Анна Викторовна",
					birthDate: "1990-04-15",
					policyNumber: "СГЗ-2026-998811",
				},
			}),
		);

		assert.ok(html.includes("dms-coverage-summary-banner"));
		assert.ok(html.includes("dms-insurer-policy-form"));
		assert.ok(html.includes("dms-approved-teeth-selector"));
		assert.ok(html.includes("dms-guarantee-modal-footer"));

		for (const insurerName of [
			"СОГАЗ",
			"Ингосстрах",
			"РЕСО-Гарантия",
			"АльфаСтрахование",
			"ВСК",
			"Согласие",
		]) {
			assert.ok(html.includes(insurerName), `Must render 1-click insurer ${insurerName}`);
		}

		assert.ok(html.includes("Сохранить гарантийное письмо"));
		assert.ok(html.includes("Привязать к текущему визиту"));
		assert.ok(html.includes("Отправить запрос на согласование"));
		assert.ok(!html.includes("disabled="), "Must not render disabled buttons (Mandate 8e)");
	});
});
