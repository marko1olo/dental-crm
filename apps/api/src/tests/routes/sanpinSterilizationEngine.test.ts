import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SanPiNSterilizationEngine } from "@dental/shared";
import {
	resolveConsumablesToDeduct,
	resolveSterilizationConsumableItems,
} from "../../routes/sanpin/sterilizationModules/sterilizationStockDeduction.js";

describe("SanPiN 3.3686-21 Central Sterilization & PSO Quality Engine", () => {
	it("computes minimum sample size for PSO cleaning per SanPiN norms (>= 1% and min 3)", () => {
		assert.equal(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(50), 3);
		assert.equal(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(200), 3);
		assert.equal(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(450), 5);
		assert.equal(
			SanPiNSterilizationEngine.computeMinimumPsoSampleSize(1000),
			10,
		);
	});

	it("rejects PSO batches with insufficient sample size or positive chemical reactions", () => {
		const evalSample = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			2,
			true,
			true,
		);
		assert.equal(evalSample.isBatchApproved, false);
		assert.match(
			evalSample.rejectionReason ?? "",
			/Недостаточный объем выборки/,
		);

		const evalAzopyram = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			5,
			false,
			true,
		);
		assert.equal(evalAzopyram.isBatchApproved, false);
		assert.match(evalAzopyram.rejectionReason ?? "", /азопирамовая проба/);

		const evalPhenol = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			5,
			true,
			false,
		);
		assert.equal(evalPhenol.isBatchApproved, false);
		assert.match(evalPhenol.rejectionReason ?? "", /фенолфталеиновая проба/);

		const evalValid = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			5,
			true,
			true,
		);
		assert.equal(evalValid.isBatchApproved, true);
		assert.equal(evalValid.rejectionReason, null);
	});

	it("validates steam and dry heat autoclave cycles against physical critical parameters", () => {
		const steam134 = SanPiNSterilizationEngine.validateAutoclaveCycle({
			cycleMode: "B",
			temperatureCelsius: 134.5,
			pressureBar: 2.15,
			durationMin: 5,
			passedIndicator: true,
		});
		assert.equal(steam134.isValid, true);
		assert.equal(steam134.status, "passed");

		const steamLowPressure = SanPiNSterilizationEngine.validateAutoclaveCycle({
			cycleMode: "B",
			temperatureCelsius: 134,
			pressureBar: 1.6,
			durationMin: 5,
			passedIndicator: true,
		});
		assert.equal(steamLowPressure.isValid, false);
		assert.match(
			steamLowPressure.reasons[0] ?? "",
			/Недостаточное давление пара/,
		);

		const dryHeat180 = SanPiNSterilizationEngine.validateAutoclaveCycle({
			cycleMode: "dry_heat_180",
			temperatureCelsius: 180,
			durationMin: 60,
			passedIndicator: true,
		});
		assert.equal(dryHeat180.isValid, true);
		assert.equal(dryHeat180.status, "passed");
	});

	it("generates deterministic traceability barcodes with sanitized tray code and ISO expiration date", () => {
		const barcode = SanPiNSterilizationEngine.generateSterilizationBarcode({
			cycleId: "CYC-204",
			trayCode: "TRAY/SURGERY 01",
			expiryDate: new Date("2026-11-15T12:00:00Z"),
		});
		assert.equal(barcode, "DNT-STER-CYC-204-TRAYSURGERY01-20261115");
	});

	it("deducts exactly 1 indicator per autoclave chamber cycle regardless of batch pouch count", () => {
		// Shift batch of 12 pouches
		const items12 = resolveConsumablesToDeduct(12);
		assert.equal(items12.length, 2);
		const pouch12 = items12.find((i) => i.name.includes("Крафт-пакеты") || i.name.includes("Пакеты"));
		const indicator12 = items12.find((i) => i.name.includes("Индикаторы"));
		assert.ok(pouch12, "Pouch item must be present");
		assert.ok(indicator12, "Indicator item must be present");
		assert.equal(pouch12?.qty, 12, "Must deduct exactly 12 pouches");
		assert.equal(indicator12?.qty, 1, "Must deduct strictly 1 indicator per chamber cycle (no over-deduction)!");

		// Shift batch of 27 pouches
		const items27 = resolveSterilizationConsumableItems(27);
		assert.equal(items27.length, 2);
		const pouch27 = items27[0];
		const indicator27 = items27[1];
		assert.equal(pouch27?.qty, 27, "Must deduct 27 pouches for the shift");
		assert.equal(indicator27?.qty, 1, "Must deduct strictly 1 indicator on chamber load (MANDATE 8v / Soft Stock)");

		// Heat-sealed and Class 6 indicator
		const itemsHeatSealedClass6 = resolveConsumablesToDeduct(50, "kraft_heat_sealed", "class6_emulator");
		assert.equal(itemsHeatSealedClass6[0]?.qty, 50);
		assert.equal(itemsHeatSealedClass6[1]?.qty, 1);
		assert.ok(itemsHeatSealedClass6[1]?.name.includes("6 класс"));
	});
});
