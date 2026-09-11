/**
 * apps/web/src/components/finance/__tests__/financeAutonomyWave42.test.tsx
 *
 * Automated Regression & Autonomy Test Suite (Wave 42):
 * 1. 54-FZ Cashier Autonomy: Citizen INN is strictly optional and never blocks tender/receipt.
 * 2. 1-Click Payment Presets: «Гарантия 100%», «Без сдачи», «50/50 Нал + Карта», «Весь аванс/бонусы».
 * 3. Non-blocking Patient Debt: Negative balance or debt never disables fiscalization on tendered amount.
 * 4. Warehouse Chairside Dispense & Soft Overdraft: Stock = 0 warns but never blocks procedure/deduction.
 * 5. SanPiN 3.3686-21 Autoclave Batch: 1-click batch confirmation generates sequential Kraft packages and barcodes.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";

import { validateBuyerInn54Fz } from "../cashboxOperations";
import { PaymentModal } from "../PaymentModal";
import { FiscalReceiptModal } from "../FiscalReceiptModal";
import { ProcedureMaterialDeductionModal } from "../../inventory/ProcedureMaterialDeductionModal";
import { SterilizationJournalModal } from "../../sterilization/SterilizationJournalModal";
import {
	generateKraftBarcode,
	calculateKraftSterilityExpiration,
} from "../../sanpin/sterilizationSanpinEngine";

describe("Wave 42: Finance, Cashier, Warehouse & Sterilization Autonomy", () => {
	describe("1. 54-FZ Buyer INN Validation (Mandate 8e item 9 & FFD 1.2 Tag 1228)", () => {
		it("Physical person INN is strictly optional: empty string is valid and does not require INN", () => {
			const resEmpty = validateBuyerInn54Fz({ payerType: "physical_person", buyerInn: "" });
			assert.strictEqual(resEmpty.isValid, true);
			assert.strictEqual(resEmpty.isRequired, false);
			assert.strictEqual(resEmpty.errorRu, undefined);

			const resWhitespace = validateBuyerInn54Fz({ payerType: "physical_person", buyerInn: "   " });
			assert.strictEqual(resWhitespace.isValid, true);
			assert.strictEqual(resWhitespace.isRequired, false);
		});

		it("Physical person INN with 12 digits is valid and accepted", () => {
			const res12 = validateBuyerInn54Fz({ payerType: "physical_person", buyerInn: "770123456789" });
			assert.strictEqual(res12.isValid, true);
			assert.strictEqual(res12.isRequired, false);
			assert.strictEqual(res12.cleanInn, "770123456789");
			assert.strictEqual(res12.errorRu, undefined);
		});

		it("Legal entity (B2B) strictly requires 10-digit INN", () => {
			const resEmptyB2B = validateBuyerInn54Fz({ payerType: "legal_entity", buyerInn: "" });
			assert.strictEqual(resEmptyB2B.isValid, false);
			assert.strictEqual(resEmptyB2B.isRequired, true);
			assert.ok(resEmptyB2B.errorRu?.includes("обязателен"));

			const resValidB2B = validateBuyerInn54Fz({ payerType: "legal_entity", buyerInn: "7701234567" });
			assert.strictEqual(resValidB2B.isValid, true);
			assert.strictEqual(resValidB2B.cleanInn, "7701234567");
		});

		it("Individual entrepreneur (IP) strictly requires 12-digit INN", () => {
			const resEmptyIp = validateBuyerInn54Fz({ payerType: "individual_entrepreneur", buyerInn: "" });
			assert.strictEqual(resEmptyIp.isValid, false);
			assert.strictEqual(resEmptyIp.isRequired, true);

			const resValidIp = validateBuyerInn54Fz({ payerType: "individual_entrepreneur", buyerInn: "770123456789" });
			assert.strictEqual(resValidIp.isValid, true);
			assert.strictEqual(resValidIp.cleanInn, "770123456789");
		});
	});

	describe("2. PaymentModal 1-Click Fast Presets & Debt Autonomy", () => {
		it("Renders 1-click presets: «Гарантия 100%», «Без сдачи», «50/50 Нал + Карта», «Списать весь аванс/бонусы»", () => {
			const html = renderToString(
				<PaymentModal
					isOpen={true}
					onClose={() => {}}
					onSuccess={() => {}}
					amountRub={4500}
					patientId="pat-001"
					patientName="Иванов И.И."
					patientDepositRub={1500}
					defaultMethod="cash"
				/>,
			);

			assert.ok(html.includes("preset-warranty-100"), "Must render 100% warranty preset");
			assert.ok(html.includes("preset-exact-cash"), "Must render exact cash preset");
			assert.ok(html.includes("preset-full-card"), "Must render full card preset");
			assert.ok(html.includes("preset-50-50-cash-card"), "Must render 50/50 cash+card preset");
			assert.ok(html.includes("preset-spend-all-deposit-bonus"), "Must render spend all deposit preset");
			assert.ok(html.includes("btn-cash-submit"), "Must render cash tender submit button");
		});

		it("Renders non-blocking debt banner when patient has debt and does not disable submit button", () => {
			const html = renderToString(
				<PaymentModal
					isOpen={true}
					onClose={() => {}}
					onSuccess={() => {}}
					amountRub={3000}
					patientId="pat-002"
					patientName="Петров П.П."
					patientDebtRub={7500}
					defaultMethod="cash"
				/>,
			);

			assert.ok(html.includes("debt-autonomy-banner"), "Must render debt autonomy banner");
			assert.ok(html.includes("Долг не блокирует приём оплаты"), "Banner must explain debt autonomy");
			assert.ok(html.includes("7\u00a0500") || html.includes("7 500") || html.includes("7500"), "Must display debt amount");
			// Check that btn-cash-submit is not disabled
			assert.ok(html.includes("data-testid=\"btn-cash-submit\""), "Submit button must exist");
			assert.ok(!html.includes("data-testid=\"btn-cash-submit\" disabled"), "Submit button must not be disabled by debt");
		});
	});

	describe("3. FiscalReceiptModal 54-FZ Cashier Autonomy", () => {
		it("Renders FiscalReceiptModal with physical person INN optional hint and 1-click presets", () => {
			const html = renderToString(
				<FiscalReceiptModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-003"
					patientName="Сидорова С.С."
					totalDueRub={5000}
					patientDepositRub={2000}
				/>,
			);

			assert.ok(html.includes("fiscal-receipt-modal"), "Must render fiscal receipt modal");
			assert.ok(html.includes("Кассовый чек 54-ФЗ"), "Must render 54-FZ title");
			assert.ok(html.includes("preset-exact-cash"), "Must render exact cash preset");
			assert.ok(html.includes("preset-full-card"), "Must render full card preset");
			assert.ok(html.includes("preset-50-50-cash-card"), "Must render 50/50 preset");
			assert.ok(html.includes("preset-warranty-100"), "Must render warranty preset");
			assert.ok(html.includes("Не требуется для физлиц (54-ФЗ)"), "Must explicitly state INN not required for physical persons");
			assert.ok(html.includes("btn-fiscalize-receipt"), "Must render fiscalize receipt button");
			assert.ok(!html.includes("btn-fiscalize-receipt\" disabled"), "Fiscalize button must not be disabled by default");
		});

		it("Displays non-blocking debt banner in FiscalReceiptModal when patient debt exists", () => {
			const html = renderToString(
				<FiscalReceiptModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-004"
					patientName="Кузнецов К.К."
					totalDueRub={10000}
					patientDebtRub={4000}
				/>,
			);

			assert.ok(html.includes("debt-autonomy-banner"), "Must render debt banner");
			assert.ok(html.includes("Долг не блокирует фискализацию чека на фактически вносимую сумму"), "Banner must explain debt non-blocking");
		});
	});

	describe("4. Warehouse & Procedure Material Deduction Autonomy (Mandates 8e item 10 & 8k)", () => {
		it("Renders chairside standard anesthesia kit preset and confirms soft overdraft without blocking button", () => {
			const sampleEmptyWarehouse = [
				{
					id: "wh-anes-01",
					name: "Анестетик артикаиновый 4%",
					sku: "ART-4",
					unit: "карп.",
					stockQuantity: 0, // Stock is 0! Deficit!
					criticalThreshold: 10,
					unitCostRub: "220.00",
					updatedAt: "2026-08-01T00:00:00Z",
				},
			];

			const html = renderToString(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					warehouseItems={sampleEmptyWarehouse}
					initialTechMapCodes={["A16.07.004"]}
				/>,
			);

			assert.ok(html.includes("procedure-material-deduction-modal"), "Must render material deduction modal");
			assert.ok(
				html.includes("preset-btn-anesthesia") || html.includes("btn-dispense-standard-anesthesia-kit"),
				"Must render standard anesthesia kit preset button",
			);
			assert.ok(html.includes("confirm-deduction-btn"), "Must render confirm deduction button");
			// Button must NEVER be disabled by stock = 0
			assert.ok(!html.includes("data-testid=\"confirm-deduction-btn\" disabled"), "Confirm deduction button must NOT be disabled on zero stock");
		});
	});

	describe("5. SanPiN 3.3686-21 Autoclave Batch Confirmation & Kraft Serial Tracking", () => {
		it("Renders 1-click batch autoclave confirmation button in SterilizationJournalModal", () => {
			const html = renderToString(
				<SterilizationJournalModal
					isOpen={true}
					onClose={() => {}}
					initialTab="form257"
				/>,
			);

			assert.ok(
				html.includes("btn-confirm-autoclave-batch"),
				"Must render 1-click autoclave batch confirmation button",
			);
		});

		it("generateKraftBarcode generates valid statutory barcodes with sequential serial numbers", () => {
			const expiry = calculateKraftSterilityExpiration("2026-08-15", "kraft_heat_sealed");
			assert.strictEqual(expiry.daysLifespan, 50);

			const barcode1 = generateKraftBarcode({
				batchNumber: "AK01-260815-C1",
				serialNumber: 1,
				expDateIsoOrFormatted: expiry.expDateIso,
				sterilizerCode: "АК-01",
			});

			const barcode2 = generateKraftBarcode({
				batchNumber: "AK01-260815-C1",
				serialNumber: 2,
				expDateIsoOrFormatted: expiry.expDateIso,
				sterilizerCode: "АК-01",
			});

			assert.ok(barcode1.startsWith("DNT-"), "Barcode must have standard prefix");
			assert.ok(barcode1.includes("S001"), "Barcode 1 must have S001 serial");
			assert.ok(barcode2.includes("S002"), "Barcode 2 must have S002 serial");
			assert.notStrictEqual(barcode1, barcode2, "Barcodes must be strictly unique for each Kraft package");
		});
	});
});
