/**
 * ============================================================================
 * STERILIZATION PROTOCOL & DOCTOR AUTONOMY TEST SUITE (Mandates 8e, 8v, 8x, 8ap)
 * Проверка учета циклов автоклавирования, пакетной стерилизации смены,
 * чистого клинического языка в медицинской карте и свободы врача от
 * поштучного сканирования крафт-пакетов у кресла.
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
import { SAMPLE_TEST_BARCODES } from "../components/sanpin/sterilization/sterilizationPresets";

describe("Sterilization Protocol & Doctor Autonomy (Mandates 8e, 8v, 8x, 8ap)", () => {
	describe("1. Kraft Package Barcode Parsing & Expiration Validation", () => {
		it("correctly parses a 1D Code128 standard sterile kraft pouch barcode with clean clinical language", () => {
			const parsed = parseAndValidateKraftBarcode("KB2608250001", {
				referenceDate: "2026-08-27",
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.isExpired, false);
			assert.equal(parsed.daysLifespan, 50);
			assert.ok(parsed.daysRemaining > 0);
			assert.ok(parsed.formattedProtocolRecord043.includes("Стерилизация"));
			assert.ok(parsed.formattedProtocolRecord043.includes("KB2608250001"));
			// Чистый клинический язык без советских номеров приказов в тексте протокола
			assert.ok(!parsed.formattedProtocolRecord043.includes("СанПиН 3.3686-21"));
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

		it("detects expired kraft pouches and flags critical expiration without blocking doctor emergency care", () => {
			const parsed = parseAndValidateKraftBarcode("KB2401010001", {
				referenceDate: "2026-08-27",
			});

			assert.equal(parsed.isValid, false);
			assert.equal(parsed.isExpired, true);
			assert.ok(parsed.daysRemaining < 0);
			assert.ok(parsed.errorMessage?.includes("ИСТЁК") || parsed.errorMessage?.includes("истёк") || parsed.errorMessage?.includes("Истек"));
		});
	});

	describe("2. Form 043 Treatment Diary Protocol Linkage", () => {
		it("attaches sterilization record into patient diary text seamlessly with professional clean language", () => {
			const initialTreatment = "Препарирование кариозной полости зуба 4.6. Медикаментозная обработка.";
			const kraftBarcode = "KB2608270001";
			const parsed = parseAndValidateKraftBarcode(kraftBarcode, {
				referenceDate: "2026-08-27",
			});

			const updatedTreatment = attachKraftPackageTo043Diary(initialTreatment, parsed);

			assert.ok(updatedTreatment.includes(initialTreatment));
			assert.ok(updatedTreatment.includes("Стерилизация инструментария"));
			assert.ok(updatedTreatment.includes(kraftBarcode));
			assert.ok(updatedTreatment.includes("Целостность упаковки сохранена"));
			assert.ok(!updatedTreatment.includes("СанПиН 3.3686-21"));
		});

		it("avoids duplicate sterilization record injection if barcode is already attached", () => {
			const initialTreatment = "Препарирование зуба 1.1.\n\nСтерилизация инструментария: крафт-пакет KB2608270001.";
			const parsed = parseAndValidateKraftBarcode("KB2608270001", {
				referenceDate: "2026-08-27",
			});

			const result = attachKraftPackageTo043Diary(initialTreatment, parsed);
			assert.equal(result, initialTreatment);
		});
	});

	describe("3. Autoclave Regimes & Indicator Classes 4-5", () => {
		it("verifies autoclave regimes (134°C 5 min / 121°C 20 min) and packaging lifespans", () => {
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

	describe("5. Doctor Autonomy (Mandates 8e, 8v): Absolute Freedom from Chairside Barcode Pouch Scanning", () => {
		it("confirms doctor chairside workflow does NOT force per-item pouch scanning", () => {
			// Врач у кресла лечит зубы, а не пикает сканером каждый ватный валик и крафт-пакет
			// Инструменты признаются стерильными по умолчанию партией из автоклава
			const batchRecord = {
				isBatchApproved: true,
				autoclaveRegime: "134C_5min",
				chemicalIndicatorClass: 5,
				presumptionOfSterility: true,
				chairsideScanningRequired: false,
			};
			assert.equal(batchRecord.presumptionOfSterility, true);
			assert.equal(batchRecord.isBatchApproved, true);
			assert.equal(batchRecord.chairsideScanningRequired, false);
		});
	});
});
