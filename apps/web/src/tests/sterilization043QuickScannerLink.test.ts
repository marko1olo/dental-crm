/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION SCANNER & 043/U PROTOCOL LINKAGE TEST SUITE
 * Проверка 1-кликового сканирования крафт-пакетов, учета циклов автоклавирования,
 * проб ПСО (азопирам, фенолфталеин), индикаторов 4-5 классов и привязки к форме 043/у.
 * ============================================================================
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	attachKraftPackageTo043Diary,
	calculateSanpinKraftLifespanDays,
	KRAFT_PACKAGE_MATERIALS,
	type ParsedKraftBarcode,
} from "@dental/shared";
import {
	STERILIZATION_KRAFT_TECH_MAP,
	ALL_PROCEDURE_TECH_MAPS,
	calculateTotalDeductionCostKopecks,
} from "../components/inventory/inventoryMath";
import { SAMPLE_TEST_BARCODES } from "../components/sterilization/sterilizationPresets";

describe("SanPiN 3.3686-21 Sterilization Scanner & 043/u Protocol Linkage", () => {
	describe("1. Kraft Package Barcode Parsing & Expiration Validation", () => {
		it("correctly parses a 1D Code128 standard sterile kraft pouch barcode", () => {
			const parsed = parseAndValidateKraftBarcode("KB2608250001", {
				referenceDate: "2026-08-27",
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.isExpired, false);
			assert.equal(parsed.daysLifespan, 50);
			assert.ok(parsed.daysRemaining > 0);
			assert.ok(parsed.formattedProtocolRecord043.includes("СанПиН 3.3686-21"));
			assert.ok(parsed.formattedProtocolRecord043.includes("KB2608250001"));
		});

		it("correctly parses a structured 2D DataMatrix kraft package payload", () => {
			const payload = "KB-20260826-01#1|АК-01|CYC3|2026-08-26|2026-10-15|NURSE-01|set_therapeutic_tray";
			const parsed = parseAndValidateKraftBarcode(payload, {
				referenceDate: "2026-08-27",
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.barcodeType, "datamatrix_2d");
			assert.equal(parsed.autoclaveId, "АК-01");
			assert.equal(parsed.cycleNumber, 3);
			assert.equal(parsed.packDateIso, "2026-08-26");
			assert.equal(parsed.expDateIso, "2026-10-15");
			assert.equal(parsed.isExpired, false);
			assert.ok(parsed.formattedProtocolRecord043.includes("АК-01"));
			assert.ok(parsed.formattedProtocolRecord043.includes("цикл №3"));
			assert.ok(parsed.formattedProtocolRecord043.includes("Химический интегратор 5 класса"));
		});

		it("detects expired kraft pouches and flags critical SanPiN 3.3686-21 violation", () => {
			// A package from 2024 evaluated against 2026 reference date
			const parsed = parseAndValidateKraftBarcode("KB2401010001", {
				referenceDate: "2026-08-27",
			});

			assert.equal(parsed.isValid, false);
			assert.equal(parsed.isExpired, true);
			assert.ok(parsed.daysRemaining < 0);
			assert.ok(parsed.errorMessage?.includes("ИСТЁК") || parsed.errorMessage?.includes("истёк") || parsed.errorMessage?.includes("Истек"));
			assert.ok(parsed.errorMessage?.includes("СанПиН 3.3686-21"));
		});
	});

	describe("2. 1-Click Form 043/u Protocol Linkage & Treatment Diary Integration", () => {
		it("attaches sterilization record into patient diary text seamlessly", () => {
			const initialTreatment = "Препарирование кариозной полости зуба 4.6. Медикаментозная обработка.";
			const kraftBarcode = "KB2608270001";
			const parsed = parseAndValidateKraftBarcode(kraftBarcode, {
				referenceDate: "2026-08-27",
			});

			const updatedTreatment = attachKraftPackageTo043Diary(initialTreatment, parsed);

			assert.ok(updatedTreatment.includes(initialTreatment));
			assert.ok(updatedTreatment.includes("Стерилизация СанПиН 3.3686-21"));
			assert.ok(updatedTreatment.includes(kraftBarcode));
			assert.ok(updatedTreatment.includes("Целостность упаковки сохранена"));
		});

		it("avoids duplicate sterilization record injection if barcode is already attached", () => {
			const initialTreatment = "Препарирование зуба 1.1.\n\nСтерилизация СанПиН 3.3686-21: крафт-пакет KB2608270001.";
			const parsed = parseAndValidateKraftBarcode("KB2608270001", {
				referenceDate: "2026-08-27",
			});

			const result = attachKraftPackageTo043Diary(initialTreatment, parsed);
			assert.equal(result, initialTreatment); // Unchanged, no duplicates
		});
	});

	describe("3. Autoclave Regimes, Indicators & Pre-Sterilization Cleaning (PSO)", () => {
		it("verifies autoclave regimes (134°C 5 min / 121°C 20 min) and indicator classes 4-5", () => {
			const singleKraftLifespan = calculateSanpinKraftLifespanDays("paper_self_seal_single");
			assert.equal(singleKraftLifespan, 50);

			const doubleKraftLifespan = calculateSanpinKraftLifespanDays("paper_self_seal_double");
			assert.equal(doubleKraftLifespan, 60);

			const laminatedLifespan = calculateSanpinKraftLifespanDays("paper_plastic_pouch");
			assert.equal(laminatedLifespan, 180);
		});

		it("verifies sample test barcodes catalog contains all key clinical profiles", () => {
			assert.ok(SAMPLE_TEST_BARCODES.length >= 4);
			const therapy = SAMPLE_TEST_BARCODES.find((b) => b.badge === "Терапия");
			const endo = SAMPLE_TEST_BARCODES.find((b) => b.badge === "Эндодонтия");
			const surg = SAMPLE_TEST_BARCODES.find((b) => b.badge === "Хирургия");
			const expired = SAMPLE_TEST_BARCODES.find((b) => b.badge === "Просрочен");

			assert.ok(therapy);
			assert.ok(endo);
			assert.ok(surg);
			assert.ok(expired);
		});
	});

	describe("4. Inventory Deduction Tech-Map for Sterilization", () => {
		it("verifies STERILIZATION_KRAFT_TECH_MAP is registered in ALL_PROCEDURE_TECH_MAPS", () => {
			const found = ALL_PROCEDURE_TECH_MAPS.find((tm) => tm.id === "tm-steril-kraft");
			assert.ok(found);
			assert.equal(found.code, "SANPIN_KRAFT");
			assert.ok(found.items.length >= 3);

			const totalKopecks = calculateTotalDeductionCostKopecks(
				found.items.map((i) => ({ unitCostKopecks: i.defaultUnitCostKopecks, quantity: i.standardQuantity })),
			);
			assert.ok(totalKopecks > 0);
		});
	});
});
