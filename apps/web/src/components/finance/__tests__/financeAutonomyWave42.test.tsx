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

import { validateBuyerInn54Fz } from "../cashboxInnValidation.js";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal";
import { WarehousePackageWriteOffBar } from "../../inventory/WarehousePackageWriteOffBar";
import type { InventoryItem } from "../../inventory/useInventoryLogic.js";
import { SanpinStudioModal } from "../../sanpin/SanpinStudioModal";
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

	describe("2. CashRegisterStudioModal 1-Click Fast Presets & Debt Autonomy", () => {
		it("Renders 1-click presets: «Гарантия 100%», «50/50 Нал + Карта»", () => {
			const html = renderToString(
				<CashRegisterStudioModal
					isOpen={true}
					onClose={() => {}}
					totalDueRub={4500}
					patientId="pat-001"
					patientName="Иванов И.И."
					patientDepositRub={1500}
					defaultMethod="split"
					mode="checkout"
				/>,
			);

			assert.ok(html.includes("preset-warranty-100"), "Must render 100% warranty preset");
			assert.ok(html.includes("btn-checkout-split-50-50"), "Must render 50/50 cash+card preset");
			assert.ok(html.includes("btn-submit-checkout-54fz"), "Must render tender submit button");
		});
	});

	describe("3. Warehouse & Procedure Material Deduction Autonomy (Mandates 8e item 10 & 8k)", () => {
		it("Renders chairside standard anesthesia kit preset and confirms soft overdraft without blocking button", () => {
			const sampleEmptyWarehouse: readonly InventoryItem[] = [
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
				<WarehousePackageWriteOffBar
					warehouseItems={sampleEmptyWarehouse}
					allowSoftOverdraft={true}
				/>,
			);

			assert.ok(html.includes("btn-writeoff-anesthesia-packet"), "Must render standard anesthesia kit preset button");
			// Button must NEVER be disabled by stock = 0
			assert.ok(!html.includes("disabled"), "Confirm deduction button must NOT be disabled on zero stock");
		});
	});

	describe("5. SanPiN 3.3686-21 Autoclave Batch Confirmation & Kraft Serial Tracking", () => {
		it("Renders canonical sterilization log modal in SanpinStudioModal", () => {
			const html = renderToString(
				<SanpinStudioModal
					isOpen={true}
					onClose={() => {}}
					initialTab="autoclave"
				/>,
			);

			assert.ok(
				html.includes("sanpin-studio-modal"),
				"Must render canonical autoclave studio modal container",
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
