import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	AutoclaveSterilizationService,
	type SterilizationCycleInput,
} from "./AutoclaveSterilizationService.js";

describe("AutoclaveSterilizationService — SanPiN 3.3686-21 Sterilization & Barcodes", () => {
	test("1. Mode Parameters according to SanPiN standards", () => {
		const steam134 = AutoclaveSterilizationService.getModeParameters("steam_134");
		assert.equal(steam134.tempC, 134);
		assert.equal(steam134.pressureBar, 2.1);
		assert.equal(steam134.durationMin, 5);

		const steam121 = AutoclaveSterilizationService.getModeParameters("steam_121");
		assert.equal(steam121.tempC, 121);
		assert.equal(steam121.pressureBar, 1.1);
		assert.equal(steam121.durationMin, 20);

		const dryHeat = AutoclaveSterilizationService.getModeParameters("dry_heat_180");
		assert.equal(dryHeat.tempC, 180);
		assert.equal(dryHeat.pressureBar, null);
		assert.equal(dryHeat.durationMin, 60);
	});

	test("2. Packaging Shelf Life calculation", () => {
		assert.equal(AutoclaveSterilizationService.getPackagingShelfLifeDays("craft_pouch_sealed"), 50);
		assert.equal(AutoclaveSterilizationService.getPackagingShelfLifeDays("craft_pouch_clipped"), 20);
		assert.equal(AutoclaveSterilizationService.getPackagingShelfLifeDays("combination_roll"), 180);
		assert.equal(AutoclaveSterilizationService.getPackagingShelfLifeDays("crepe_paper_double"), 21);
	});

	test("3. Barcode format generation STER-<CYCLE>-<YYYYMMDD>-<TRAY>", () => {
		const fixedDate = new Date("2026-08-16T10:00:00Z");
		const barcode = AutoclaveSterilizationService.generateBarcode(42, fixedDate, "TRAY-SURGERY-01");
		assert.equal(barcode, "STER-42-20260816-TRAY-SURGERY-01");
	});

	test("4. Tray sterility validation and expiration status", () => {
		const now = new Date("2026-08-16T12:00:00Z");

		// Valid sterile (10 days remaining)
		const future10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
		const check1 = AutoclaveSterilizationService.checkTraySterility(future10, now);
		assert.equal(check1.isSterile, true);
		assert.equal(check1.status, "sterile");

		// Expiring soon (2 days remaining)
		const future2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
		const check2 = AutoclaveSterilizationService.checkTraySterility(future2, now);
		assert.equal(check2.isSterile, true);
		assert.equal(check2.status, "expiring_soon");

		// Expired (-1 day)
		const past1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
		const check3 = AutoclaveSterilizationService.checkTraySterility(past1, now);
		assert.equal(check3.isSterile, false);
		assert.equal(check3.status, "expired");
	});

	test("5. Sterilization cycle processing with valid inputs", () => {
		const input: SterilizationCycleInput = {
			organizationId: "org-1",
			deviceName: "Melag Vacuklav 43B+",
			cycleNumber: 154,
			mode: "steam_134",
			operatorId: "nurse-101",
			packagingType: "combination_roll",
			trayId: "TRAY-IMPLANT-07",
			trayDescription: "Хирургический набор Dentium SuperLine",
			indicatorClass: "class_5_integrator",
			indicatorPassed: true,
			bowieDickPassed: true,
			vacuumLeakTestPassed: true,
			cycleDate: new Date("2026-08-16T08:00:00Z"),
		};

		const record = AutoclaveSterilizationService.processSterilizationCycle(input);
		assert.equal(record.isValid, true);
		assert.equal(record.validationErrors.length, 0);
		assert.equal(record.barcode, "STER-154-20260816-TRAY-IMPLANT-07");
		assert.equal(record.targetTemperatureC, 134);
		assert.equal(record.targetPressureBar, 2.1);
		assert.equal(record.exposureDurationMinutes, 5);
		// 180 days shelf life
		const expectedExpiry = new Date(input.cycleDate!.getTime() + 180 * 24 * 60 * 60 * 1000);
		assert.equal(record.expiresAt.toISOString(), expectedExpiry.toISOString());
	});

	test("6. Sterilization cycle processing detects indicator and vacuum test failures", () => {
		const failedInput: SterilizationCycleInput = {
			organizationId: "org-1",
			deviceName: "Euronda E9",
			cycleNumber: 155,
			mode: "steam_134",
			operatorId: "nurse-101",
			packagingType: "craft_pouch_sealed",
			trayId: "TRAY-THERAPY-02",
			trayDescription: "Терапевтический лоток",
			indicatorClass: "class_4_multivariable",
			indicatorPassed: false, // Failed!
			bowieDickPassed: false, // Failed!
			vacuumLeakTestPassed: false, // Failed!
		};

		const record = AutoclaveSterilizationService.processSterilizationCycle(failedInput);
		assert.equal(record.isValid, false);
		assert.equal(record.validationErrors.length, 3);
	});
});
