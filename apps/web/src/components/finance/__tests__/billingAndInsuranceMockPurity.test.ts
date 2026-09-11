/**
 * billingAndInsuranceMockPurity.test.ts — Mock Purity Verification Suite Wave 107
 * Confirms total eradication of synthetic 'Иванов Иван Иванович' fallback mocks across:
 * 1. PatientBillingModal.tsx
 * 2. InsurancePreAuthModal.tsx
 * 3. FamilyWalletModal.tsx
 * 4. BankInstallmentQrModal.tsx
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientBillingModal } from "../PatientBillingModal";
import { FamilyWalletModal } from "../FamilyWalletModal";
import { InsurancePreAuthModal } from "../../insurance/InsurancePreAuthModal";
import { BankInstallmentQrModal } from "../../payments/BankInstallmentQrModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../../../..");

describe("Wave 107: Billing, Insurance & Family Wallet Mock Purity", () => {
	const targetFiles = [
		{
			name: "PatientBillingModal.tsx",
			relPath: "src/components/finance/PatientBillingModal.tsx",
		},
		{
			name: "InsurancePreAuthModal.tsx",
			relPath: "src/components/insurance/InsurancePreAuthModal.tsx",
		},
		{
			name: "FamilyWalletModal.tsx",
			relPath: "src/components/finance/FamilyWalletModal.tsx",
		},
		{
			name: "BankInstallmentQrModal.tsx",
			relPath: "src/components/payments/BankInstallmentQrModal.tsx",
		},
	];

	for (const target of targetFiles) {
		it(`Source code purity: ${target.name} must NOT contain synthetic clown name 'Иванов Иван Иванович'`, () => {
			const absPath = path.resolve(webRoot, target.relPath);
			assert.ok(fs.existsSync(absPath), `File must exist at ${absPath}`);
			const content = fs.readFileSync(absPath, "utf-8");
			assert.equal(
				content.includes("Иванов Иван Иванович"),
				false,
				`File ${target.name} must NOT contain 'Иванов Иван Иванович'`,
			);
		});
	}

	it("PatientBillingModal: renders without synthetic patient mock fallback when patient is empty", () => {
		const html = renderToString(
			React.createElement(PatientBillingModal, {
				isOpen: true,
				onClose: () => {},
				patient: { id: "pat-clean", fullName: "" },
			}),
		);
		assert.ok(!html.includes("Иванов Иван Иванович"), "Rendered HTML must not contain synthetic patient name");
	});

	it("InsurancePreAuthModal: renders without synthetic patient mock fallback", () => {
		const html = renderToString(
			React.createElement(InsurancePreAuthModal, {
				isOpen: true,
				onClose: () => {},
				patient: { id: "pat-ins", fullName: "" },
			}),
		);
		assert.ok(!html.includes("Иванов Иван Иванович"), "Rendered HTML must not contain synthetic patient name");
	});

	it("FamilyWalletModal: renders with clean default empty state without synthetic Ivanov family members", () => {
		const html = renderToString(
			React.createElement(FamilyWalletModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);
		assert.ok(!html.includes("Иванов Иван Иванович"), "Rendered HTML must not contain synthetic Ivanov head payer");
		assert.ok(!html.includes("Семья Ивановых"), "Rendered HTML must not contain synthetic Ivanov family name");
		assert.ok(!html.includes("Иванова Елена Сергеевна"), "Rendered HTML must not contain mock spouse");
		assert.ok(!html.includes("Иванов Михаил Иванович"), "Rendered HTML must not contain mock child");
	});

	it("BankInstallmentQrModal: renders with clean default patient without synthetic mock name", () => {
		const html = renderToString(
			React.createElement(BankInstallmentQrModal, {
				isOpen: true,
				onClose: () => {},
				stageAmountKopecks: 5000000,
			}),
		);
		assert.ok(!html.includes("Иванов Иван Иванович"), "Rendered HTML must not contain synthetic patient name");
	});
});
