import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
	DEFAULT_CLINIC_LEGAL_INFO,
	filterForm257Records,
	createDefault5ChamberPoints,
	createForm257Record,
} from "../autoclaveLog/autoclaveLogEngine.js";
import {
	calculateAirDecontaminationDuration,
	calculateLampOperatingHours,
	exportBactericidalJournalToCsv,
	exportGeneralCleaningJournalToCsv,
} from "../journals/sanpinJournalsEngine.js";
import {
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	DENTAL_TOOL_SETS_CATALOG,
	CLINIC_AUTOCLAVE_UNITS,
	SANPIN_CHEMICAL_INDICATORS,
} from "../kraft/kraftPackagePresets.js";

describe("SanPiN 3.3686-21 — Component & Subsystem Integration", () => {
	describe("1. Bactericidal Fleet, Air Decontamination & General Cleaning Calculations", () => {
		it("calculates statutory air decontamination time for operating rooms (Class I, 99.9%)", () => {
			// Room: 60 m3, Recirculator: 100 m3/h, Target: 99.9% (K=6.9)
			const res = calculateAirDecontaminationDuration(60, 100, 99.9);
			assert.equal(res.airExchangesCount, 6.9);
			assert.equal(res.requiredDurationMinutes, 249); // (6.9 * 60 / 100) * 60 = 248.4 -> 249
			assert.equal(res.recommendedDurationMinutes, 255); // rounded to 15-min interval
		});

		it("calculates statutory air decontamination time for standard treatment rooms (Class II, 99%)", () => {
			// Room: 40 m3, Recirculator: 120 m3/h, Target: 99% (K=4.6)
			const res = calculateAirDecontaminationDuration(40, 120, 99);
			assert.equal(res.airExchangesCount, 4.6);
			assert.equal(res.requiredDurationMinutes, 92); // (4.6 * 40 / 120) * 60 = 92
			assert.equal(res.recommendedDurationMinutes, 105);
		});

		it("calculates lamp life exhaustion and triggers replacement alert past 8000 hours", () => {
			const resNormal = calculateLampOperatingHours(2000, 120, 8000);
			assert.equal(resNormal.lampStatus, "normal");
			assert.equal(resNormal.isCritical, false);
			assert.equal(resNormal.remainingHours, 5998);

			const resWarning = calculateLampOperatingHours(7250, 60, 8000);
			assert.equal(resWarning.lampStatus, "warning_replace_soon");
			assert.equal(resWarning.isCritical, false);

			const resExpired = calculateLampOperatingHours(7999, 120, 8000);
			assert.equal(resExpired.lampStatus, "expired_replace_now");
			assert.equal(resExpired.isCritical, true);
			assert.ok(resExpired.warningMessage?.includes("РЕСУРС ЛАМП ПОЛНОСТЬЮ ИСЧЕРПАН"));
			assert.ok(resExpired.warningMessage?.includes("запрещена"));
		});

		it("exports Bactericidal log and General cleaning log to standard CSV", () => {
			const csvBact = exportBactericidalJournalToCsv([
				{
					id: "sess-1",
					equipmentId: "eq-1",
					date: "2026-08-22",
					sessionStartTime: "08:00",
					sessionEndTime: "09:30",
					durationMinutes: 90,
					durationHours: 1.5,
					operatingMode: "pre_op_preparation",
					cumulativeHoursAfterSession: 2450.5,
					roomName: "Кабинет хирургии №1",
					deviceBrand: "ДЕЗАР-7",
					operatorStaffFullName: "Смирнова Е.В.",
				},
			]);
			assert.ok(csvBact.startsWith("\uFEFF"));
			assert.ok(csvBact.includes("ДЕЗАР-7"));
			assert.ok(csvBact.includes("Кабинет хирургии №1"));

			const csvClean = exportGeneralCleaningJournalToCsv([
				{
					id: "clean-1",
					roomType: "surgical",
					roomName: "Операционный блок",
					scheduledDate: "2026-08-22",
					actualDateTime: "2026-08-22T07:00:00.000Z",
					treatedAreaM2: 36,
					disinfectantName: "Аламинол 3%",
					activeIngredient: "ЧАС + глутаровый альдегид",
					solutionConcentrationPercent: 3.0,
					applicationMethodRu: "Двукратное протирание с интервалом 15 мин",
					exposureTimeMinutes: 60,
					uvIrradiationMinutes: 120,
					ventilationMinutes: 30,
					operatorStaffFullName: "Смирнова Е.В.",
					isInspectorVerified: true,
					status: "verified_by_inspector",
				},
			]);
			assert.ok(csvClean.startsWith("\uFEFF"));
			assert.ok(csvClean.includes("Операционный блок"));
			assert.ok(csvClean.includes("Аламинол 3%"));
		});
	});

	describe("2. Filtering, Search & Presets Catalog Verification", () => {
		it("filters Form 257 records by search query and sterilizer brand", () => {
			const pt = createDefault5ChamberPoints("intetest_v_134_5", true);
			const rec1 = createForm257Record({
				date: "2026-08-22",
				cycleNumber: 1,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: "steam_134_5min",
				sensors: { actualTemperatureCelsius: 134.5, actualPressureBar: 2.15, actualExposureMinutes: 5.0 },
				itemsDescriptionRu: "Хирургический лоток имплантации",
				packsCount: 4,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: pt,
				operatorStaffFullName: "Смирнова Е.В.",
			});

			const rec2 = createForm257Record({
				date: "2026-08-22",
				cycleNumber: 2,
				sterilizerId: "autoclave-euronda-e9-med",
				regimeId: "steam_121_20min",
				sensors: { actualTemperatureCelsius: 121.5, actualPressureBar: 1.15, actualExposureMinutes: 20.0 },
				itemsDescriptionRu: "Силиконовые слепочные ложки",
				packsCount: 8,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: pt,
				operatorStaffFullName: "Иванова А.А.",
			});

			const filteredMelag = filterForm257Records([rec1, rec2], {
				sterilizerId: "all",
				status: "all",
				searchQuery: "имплантации",
			});
			assert.equal(filteredMelag.length, 1);
			assert.equal(filteredMelag[0]!.id, rec1.id);

			const filteredEuronda = filterForm257Records([rec1, rec2], {
				sterilizerId: "all",
				status: "all",
				searchQuery: "Euronda",
			});
			assert.equal(filteredEuronda.length, 1);
			assert.equal(filteredEuronda[0]!.id, rec2.id);
		});

		it("verifies autoclave unit catalog presets and chamber volume limits", () => {
			assert.ok(CLINIC_AUTOCLAVE_UNITS.length >= 3);
			const melag = CLINIC_AUTOCLAVE_UNITS.find((u) => u.brandModelRu.includes("Melag"));
			assert.ok(melag);
			assert.equal(melag.chamberVolumeLiters, 22);
		});

		it("verifies dental tool set presets catalog", () => {
			assert.ok(DENTAL_TOOL_SETS_CATALOG.length >= 4);
			const therap = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === "set_therapeutic_tray");
			assert.ok(therap);
			assert.ok(therap.typicalItemsRu.some((i) => i.includes("Зеркало")));
			assert.ok(therap.typicalItemsRu.some((i) => i.includes("Зонд")));
		});
	});
});
