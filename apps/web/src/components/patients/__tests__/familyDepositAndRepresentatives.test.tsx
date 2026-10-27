import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentFamilyDepositView } from "../../finance/modal/payment/PaymentFamilyDepositView";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patientsDir = path.resolve(__dirname, "..");

describe("Red Team Inquisitor: Family Deposit & Representatives", () => {
	it("1. PaymentFamilyDepositView displays exact 1-click CTA with family head and family balance", () => {
		const html = renderToStaticMarkup(
			React.createElement(PaymentFamilyDepositView, {
				patientDepositRub: 0,
				patientFamilyBalanceRub: 45000,
				familyHeadName: "Иванов И.И.",
				familyGroupName: "Семья Ивановых",
				totalDueRub: 12000,
				amountRub: "12000.00",
				isSubmittingDeposit: false,
				handleDepositOrPartialCombo: () => {},
				setSplitDepositRub: () => {},
				setSplitCardRub: () => {},
				setSplitCashRub: () => {},
				setSplitSbpRub: () => {},
				setActiveMethod: () => {},
			}),
		);

		assert.match(
			html,
			/Списать с семейного депозита \(Баланс семьи:\s*45\s*000\s*₽,\s*Глава:\s*Иванов И\.И\.\)/,
		);
		assert.ok(html.includes('data-testid="btn-pay-family-full"'));
		assert.ok(!html.includes('data-testid="btn-pay-family-full" disabled'));
	});

	it("2. PatientGeneralInfoTab embeds both PatientFamilyCard and PatientRepresentativesSection in family section", () => {
		const tabPath = path.resolve(patientsDir, "tabs/PatientGeneralInfoTab.tsx");
		const content = fs.readFileSync(tabPath, "utf-8");

		assert.ok(content.includes("<PatientFamilyCard"));
		assert.ok(content.includes("<PatientRepresentativesSection"));
		assert.ok(content.includes("usePatientFamilyLoader"));
	});
});
