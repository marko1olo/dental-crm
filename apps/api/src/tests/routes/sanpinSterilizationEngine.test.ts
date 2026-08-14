import { describe, expect, it } from "vitest";
import { SanPiNSterilizationEngine } from "@dental/shared";

describe("SanPiN 3.3686-21 Central Sterilization & PSO Quality Engine", () => {
	it("computes minimum sample size for PSO cleaning per SanPiN norms (>= 1% and min 3)", () => {
		expect(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(50)).toBe(3);
		expect(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(200)).toBe(3);
		expect(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(450)).toBe(5);
		expect(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(1000)).toBe(10);
	});

	it("rejects PSO batches with insufficient sample size or positive chemical reactions", () => {
		// Insufficient sample size
		const evalSample = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			2, // minimum required is 3
			true,
			true,
		);
		expect(evalSample.isBatchApproved).toBe(false);
		expect(evalSample.rejectionReason).toContain("Недостаточный объем выборки");

		// Positive Azopyram (blood traces detected)
		const evalAzopyram = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			5,
			false, // positive test (blood present)
			true,
		);
		expect(evalAzopyram.isBatchApproved).toBe(false);
		expect(evalAzopyram.rejectionReason).toContain("азопирамовая проба");

		// Positive Phenolphthalein (alkaline detergent residues detected)
		const evalPhenol = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			5,
			true,
			false, // positive test (detergent present)
		);
		expect(evalPhenol.isBatchApproved).toBe(false);
		expect(evalPhenol.rejectionReason).toContain("фенолфталеиновая проба");

		// 100% negative with adequate sample
		const evalValid = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
			200,
			5,
			true,
			true,
		);
		expect(evalValid.isBatchApproved).toBe(true);
		expect(evalValid.rejectionReason).toBeNull();
	});

	it("validates steam and dry heat autoclave cycles against physical critical parameters", () => {
		// Valid Steam 134°C B-cycle
		const steam134 = SanPiNSterilizationEngine.validateAutoclaveCycle({
			cycleMode: "B",
			temperatureCelsius: 134.5,
			pressureBar: 2.15,
			durationMin: 5,
			passedIndicator: true,
		});
		expect(steam134.isValid).toBe(true);
		expect(steam134.status).toBe("passed");

		// Invalid Steam 134°C (low pressure)
		const steamLowPressure = SanPiNSterilizationEngine.validateAutoclaveCycle({
			cycleMode: "B",
			temperatureCelsius: 134.0,
			pressureBar: 1.6, // required >= 2.0 bar
			durationMin: 5,
			passedIndicator: true,
		});
		expect(steamLowPressure.isValid).toBe(false);
		expect(steamLowPressure.reasons[0]).toContain("Недостаточное давление пара");

		// Valid Dry Heat 180°C (60 min)
		const dryHeat180 = SanPiNSterilizationEngine.validateAutoclaveCycle({
			cycleMode: "dry_heat_180",
			temperatureCelsius: 180.0,
			durationMin: 60,
			passedIndicator: true,
		});
		expect(dryHeat180.isValid).toBe(true);
		expect(dryHeat180.status).toBe("passed");
	});

	it("generates deterministic traceability barcodes with sanitized tray code and ISO expiration date", () => {
		const barcode = SanPiNSterilizationEngine.generateSterilizationBarcode({
			cycleId: "CYC-204",
			trayCode: "TRAY/SURGERY 01",
			expiryDate: new Date("2026-11-15T12:00:00Z"),
		});
		expect(barcode).toBe("DNT-STER-CYC-204-TRAYSURGERY01-20261115");
	});
});
