import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateBactericidalLampResource,
	calculateSessionHours,
	calculateCumulativeOperatingHours,
	calculateExposureAndVentilationNorm,
	bactericidalAutopilotBodySchema,
	morningShiftBodySchema,
	eveningShiftBodySchema,
} from "../../routes/sanpin/bactericidalRoutes.js";
import {
	evaluateAutoclaveCycle,
	generateSterilizationBarcode,
	computeSterilizationExpiration,
	normalizeSterilizationBody,
	sanpinCycleCreateSchema,
	sterilizationShiftBatchSchema,
} from "../../routes/sanpin/sterilizationRoutes.js";

describe("SanPiN 2.1.3684-21 & R 3.5.1904-04 Bactericidal Decomposed Engine", () => {
	it("evaluates quartz/recirculator lamp wear resource across wear thresholds", () => {
		// New lamp: 0h of 8000h
		const newLamp = calculateBactericidalLampResource(0, 8000);
		assert.equal(newLamp.status, "normal");
		assert.equal(newLamp.remainingHours, 8000);
		assert.equal(newLamp.isCritical, false);

		// Operational lamp: 5000h of 8000h
		const midLamp = calculateBactericidalLampResource(5000, 8000);
		assert.equal(midLamp.status, "normal");
		assert.equal(midLamp.remainingHours, 3000);
		assert.equal(midLamp.isCritical, false);

		// Warning threshold: 7300h of 8000h (< 10% remaining)
		const warnLamp = calculateBactericidalLampResource(7300, 8000);
		assert.equal(warnLamp.status, "warning_replace_soon");
		assert.equal(warnLamp.remainingHours, 700);
		assert.equal(warnLamp.isCritical, false);
		assert.match(warnLamp.warningMessage ?? "", /Запланируйте закупку/);

		// Exhausted/critical threshold: 8050h of 8000h
		const expiredLamp = calculateBactericidalLampResource(8050, 8000);
		assert.equal(expiredLamp.status, "expired_replace_now");
		assert.equal(expiredLamp.remainingHours, 0);
		assert.equal(expiredLamp.isCritical, true);
		assert.match(expiredLamp.warningMessage ?? "", /Эксплуатация.*запрещена/i);
	});

	it("computes session hours and cumulative operating hours with precision", () => {
		const sessionH = calculateSessionHours(45);
		assert.equal(sessionH, 0.75);

		const cumulative = calculateCumulativeOperatingHours(7200.5, 90);
		assert.equal(cumulative, 7202);
	});

	it("calculates SanPiN exposure and ventilation norms per room volume", () => {
		// 50m³ room with 100m³/h recirculator productivity
		const norm = calculateExposureAndVentilationNorm(50, 100);
		assert.equal(norm.recommendedMinutes, 60);
		assert.equal(norm.requiredAirExchanges, 2);
		assert.equal(norm.ventilationAirVolumeM3, 100);
	});

	it("validates bactericidal request payloads with Zod schemas", () => {
		const validAutopilot = bactericidalAutopilotBodySchema.safeParse({
			equipmentId: "equip-recirc-1",
			durationMinutes: 30,
			operatingMode: "morning_clean",
		});
		assert.equal(validAutopilot.success, true);

		const invalidAutopilot = bactericidalAutopilotBodySchema.safeParse({
			equipmentId: "equip-recirc-1",
			durationMinutes: "invalid-string",
		});
		assert.equal(invalidAutopilot.success, false);

		const validMorning = morningShiftBodySchema.safeParse({
			date: "2026-10-12",
			equipmentId: "equip-recirc-1",
			notes: "Утренняя смена",
		});
		assert.equal(validMorning.success, true);

		const validEvening = eveningShiftBodySchema.safeParse({
			date: "2026-10-12",
			shiftHours: 8,
			equipmentId: "equip-recirc-1",
			notes: "Вечерняя смена закрыта",
		});
		assert.equal(validEvening.success, true);
	});
});

describe("SanPiN 3.3686-21 & Class B Sterilization Decomposed Engine", () => {
	it("evaluates Class B autoclave cycles against strict physical and indicator parameters", () => {
		// Valid Class B standard cycle: 134°C, 2.15 bar, 5 min, indicators OK
		const validCycle = evaluateAutoclaveCycle({
			temperatureCelsius: 134.2,
			pressureBar: 2.15,
			durationMin: 5,
			passedIndicator: true,
		});
		assert.equal(validCycle.isCompliant, true);
		assert.equal(validCycle.status, "passed");
		assert.equal(validCycle.deviationNotes.length, 0);

		// Valid Class B delicate cycle: 121°C, 1.15 bar, 20 min, indicators OK
		const delicateCycle = evaluateAutoclaveCycle({
			temperatureCelsius: 121.5,
			pressureBar: 1.15,
			durationMin: 20,
			passedIndicator: true,
		});
		assert.equal(delicateCycle.isCompliant, true);
		assert.equal(delicateCycle.status, "passed");

		// Sub-temperature failure (< 120°C)
		const lowTempCycle = evaluateAutoclaveCycle({
			temperatureCelsius: 115,
			pressureBar: 2.15,
			durationMin: 5,
			passedIndicator: true,
		});
		assert.equal(lowTempCycle.isCompliant, false);
		assert.equal(lowTempCycle.status, "failed");
		assert.ok(lowTempCycle.deviationNotes.some((n) => n.includes("низкая температура")));

		// Sub-pressure failure (< 2.0 bar for 134°C)
		const lowPressureCycle = evaluateAutoclaveCycle({
			temperatureCelsius: 134.5,
			pressureBar: 1.8,
			durationMin: 5,
			passedIndicator: true,
		});
		assert.equal(lowPressureCycle.isCompliant, false);
		assert.equal(lowPressureCycle.status, "failed");
		assert.ok(lowPressureCycle.deviationNotes.some((n) => n.includes("Давление")));

		// Indicator color failure (chemical indicator did not change color)
		const failedIndicator = evaluateAutoclaveCycle({
			temperatureCelsius: 134.5,
			pressureBar: 2.15,
			durationMin: 5,
			passedIndicator: false,
		});
		assert.equal(failedIndicator.isCompliant, false);
		assert.equal(failedIndicator.status, "failed");
		assert.ok(failedIndicator.deviationNotes.some((n) => n.includes("индикатор")));
	});

	it("generates deterministic kraft barcode per SanPiN traceability format", () => {
		const barcode = generateSterilizationBarcode(105);
		assert.match(barcode, /^DNT-STER-C105-\d{8}-[A-F0-9]{4}$/);
	});

	it("computes package sterility shelf-life expiration correctly", () => {
		const baseDate = new Date("2026-05-01T10:00:00.000Z");

		// Heat-sealed kraft pouch: returns a Date instance
		const kraftExp = computeSterilizationExpiration("kraft_heat_sealed", baseDate, "passed");
		assert.ok(kraftExp instanceof Date);
		assert.ok(kraftExp.getTime() > baseDate.getTime());

		// Failed cycle returns null
		const failedExp = computeSterilizationExpiration("kraft_heat_sealed", baseDate, "failed");
		assert.equal(failedExp, null);
	});

	it("validates sterilization and shift batch payloads with Zod schemas", () => {
		const validCycle = sanpinCycleCreateSchema.safeParse({
			cycleNumber: 12,
			autoclaveId: "auto-melag-1",
			temperatureCelsius: 134,
			pressureBar: 2.1,
			durationMinutes: 5,
			cycleType: "134_universal",
			packagingType: "kraft_heat_sealed",
			operatorName: "Сидорова В. В.",
		});
		assert.equal(validCycle.success, true);

		const validBatch = sterilizationShiftBatchSchema.safeParse({
			shiftDate: "2026-10-12",
			operatorName: "Сидорова В. В.",
			autoclaveId: "auto-melag-1",
			packages: [
				{
					packageType: "kraft_pouch",
					toolSetType: "therapy_exam",
					quantity: 5,
				},
			],
		});
		assert.equal(validBatch.success, true);

		const normalized = normalizeSterilizationBody({
			cycleNumber: 14,
			autoclaveId: "auto-euronda-2",
			actualTemperature: 134,
			actualPressure: 2.1,
			packagingType: "kraft_pouch",
		});
		assert.equal(normalized.cycleNumber, 14);
		assert.equal(normalized.autoclaveId, "auto-euronda-2");
		assert.equal(normalized.temperatureCelsius, 134);
		assert.equal(normalized.pressureBar, 2.1);
		assert.equal(normalized.packagingType, "kraft_heat_sealed");
	});
});
