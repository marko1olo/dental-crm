/**
 * dmsGuaranteeLetterDecomposition.test.ts — Verification suite for Insurance & DMS SSOT.
 * Mandates: 8e (Autonomy), 8b (Sweet Spot), 8l (Integer kopecks), 8am, 8x.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
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
import {
	calculateDmsCoPaymentSplit,
	formatCurrencyKopecks,
	formatCurrencyRub,
	RUSSIAN_DMS_INSURERS,
	rubToKopecks,
	kopecksToRub,
} from "../insuranceData";
import { InsuranceWorkspaceModal } from "../InsuranceWorkspaceModal";
import { InsuranceBillSplitCard } from "../InsuranceBillSplitCard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const insuranceDir = path.resolve(__dirname, "..");

const RAW_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]|⚡|🦷|⚠️|❌|✅|🚨|🔥|✓/u;

describe("Insurance & Russian DMS SSOT Architecture & Clinical Invariants", () => {
	it("1. Canonical modules are in healthy sweet spot range (200-450 lines)", () => {
		const studioPath = path.resolve(insuranceDir, "DmsStudioModal.tsx");
		const catalogPath = path.resolve(insuranceDir, "dmsCatalogData.ts");

		const studioLines = fs.readFileSync(studioPath, "utf-8").split("\n").length;
		const catalogLines = fs.readFileSync(catalogPath, "utf-8").split("\n").length;

		assert.ok(studioLines >= 380 && studioLines <= 480, `DmsStudioModal sweet spot 380-480 lines, got ${studioLines}`);
		assert.ok(catalogLines >= 280 && catalogLines <= 350, `dmsCatalogData sweet spot 280-350 lines, got ${catalogLines}`);
	});

	it("2. Preserves 100% of public exports and Russian DMS top insurers", () => {
		assert.equal(typeof DmsGuaranteeLetterModal, "function");
		assert.equal(typeof InsuranceWorkspaceModal, "function");
		assert.equal(typeof InsuranceBillSplitCard, "function");
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

	it("3. Integer kopeck split math holds strict balance invariant (Mandates 8l, 8n)", () => {
		const items = [
			{ id: "1", serviceCode: "A16.07.002.001", serviceName: "Пломба", quantity: 1, unitPriceKopecks: 450000 },
			{ id: "2", serviceCode: "A16.07.030.002", serviceName: "Эндодонтия", quantity: 1, unitPriceKopecks: 580000 },
			{ id: "3", serviceCode: "A16.07.050", serviceName: "Отбеливание", quantity: 1, unitPriceKopecks: 2600000, isExcluded: true },
		];
		const split = calculateDmsCoPaymentSplit(items, {
			guaranteeLetter: {
				id: "g1",
				letterNumber: "ГП-1",
				patientFullName: "Пациент",
				issueDate: "2026-08-01",
				validUntil: "2026-12-31",
				maxApprovedAmountKopecks: 800000,
			},
			franchisePercent: 20,
		});

		assert.equal(split.totalBillKopecks, 3630000);
		assert.equal(split.integrityInvariantHolds, true);
		assert.equal(split.totalInsuranceCoveredKopecks + split.totalPatientOutOfPocketKopecks, split.totalBillKopecks);
	});

	it("4. Renders without disabled buttons, top Russian insurers, and clinical dates (Mandate 8e)", () => {
		const html = renderToString(
			React.createElement(InsuranceWorkspaceModal, {
				isOpen: true,
				onClose: () => {},
				patient: { id: "pat-dms-1", fullName: "Соколова Анна Викторовна", birthDate: "15.04.1990", policyNumber: "СГЗ-2026-998811" },
			}),
		);
		assert.ok(html.includes("15.04.1990"), "Must render Russian clinical date 15.04.1990");
		assert.ok(html.includes("Актив"), "Must render active badge");
		assert.ok(!html.includes("disabled="), "Must not render disabled buttons (Mandate 8e)");

		for (const insurerName of ["СОГАЗ", "Ингосстрах", "РЕСО-Гарантия", "АльфаСтрахование", "ВСК", "Согласие"]) {
			assert.ok(html.includes(insurerName), `Must render 1-click insurer ${insurerName}`);
		}
	});
});
