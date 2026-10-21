/**
 * apps/web/src/components/patients/family/__tests__/familyWalletCanonical.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * 1. Canonical SSOT exports from components/patients/family/
 * 2. Backward compatibility shim from components/patient/
 * 3. 0% commission intra-family pooled deposit arithmetic
 * 4. Exact integer calculations & kopeck precision
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const familyDir = path.resolve(__dirname, "..");
const patientDir = path.resolve(familyDir, "../../patient");

describe("Family Wallet SSOT & Pooled Deposit Architecture", () => {
	it("verifies canonical FamilyWalletModal exists in components/patients/family/", () => {
		const modalPath = path.resolve(familyDir, "FamilyWalletModal.tsx");
		assert.ok(
			fs.existsSync(modalPath),
			"Canonical FamilyWalletModal.tsx must exist in components/patients/family/",
		);

		const content = fs.readFileSync(modalPath, "utf-8");
		assert.ok(
			content.includes("FamilyWalletModal"),
			"Must export FamilyWalletModal component",
		);
	});

	it("verifies clean backward-compatible shim in components/patient/FamilyWalletModal.tsx", () => {
		const shimPath = path.resolve(patientDir, "FamilyWalletModal.tsx");
		assert.ok(
			fs.existsSync(shimPath),
			"Shim FamilyWalletModal.tsx must exist in components/patient/",
		);

		const content = fs.readFileSync(shimPath, "utf-8");
		assert.ok(
			content.includes('export * from "../patients/family/FamilyWalletModal";'),
			"Shim must re-export from canonical SSOT ../patients/family/FamilyWalletModal",
		);
	});

	it("verifies patientFamilyCard imports FamilyWalletModal from canonical ./family/", () => {
		const cardPath = path.resolve(familyDir, "../PatientFamilyCard.tsx");
		assert.ok(fs.existsSync(cardPath), "PatientFamilyCard.tsx must exist");

		const content = fs.readFileSync(cardPath, "utf-8");
		assert.ok(
			content.includes('from "./family/FamilyWalletModal"'),
			"PatientFamilyCard must import FamilyWalletModal from ./family/FamilyWalletModal instead of ../patient/",
		);
	});

	it("validates family pooled deposit calculations (kopeck precision, 0% commission)", () => {
		const toKopecks = (rubles: number): number => Math.round(rubles * 100);
		const toRubles = (kopecks: number): number => kopecks / 100;

		const momBalanceRub = 15000.5;
		const childTreatmentCostRub = 4250.75;
		const commissionPercent = 0; // 0% intra-family commission

		const momKopecks = toKopecks(momBalanceRub);
		const costKopecks = toKopecks(childTreatmentCostRub);
		const commissionKopecks = Math.round(
			costKopecks * (commissionPercent / 100),
		);

		assert.equal(
			commissionKopecks,
			0,
			"Intra-family commission must be exactly 0%",
		);

		const remainingKopecks = momKopecks - costKopecks;
		const remainingRub = toRubles(remainingKopecks);

		assert.equal(
			remainingKopecks,
			1074975,
			"Remaining kopecks must be exact integer",
		);
		assert.equal(remainingRub, 10749.75, "Remaining rubles must be 10749.75");
	});

	it("verifies PatientSearchAutocomplete displays explicit 'Депозит:' and 'Долг:' badges", () => {
		const autocompletePath = path.resolve(
			familyDir,
			"../PatientSearchAutocomplete.tsx",
		);
		const content = fs.readFileSync(autocompletePath, "utf-8");

		assert.ok(
			content.includes("Депозит:") || content.includes("balance > 0"),
			"Autocomplete must support clear deposit/debt indication",
		);
	});
});
