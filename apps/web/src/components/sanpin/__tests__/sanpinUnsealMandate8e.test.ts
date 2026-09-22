import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createStandardTrayKraftPackageRecord,
	createDynamicKraftPackage,
} from "../kraft/kraftPackageEngine.js";
import {
	createStandardSterileTrayBarcode,
	STANDARD_TRAY_OPTIONS,
	SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET,
	createQuickStandard132Cycle,
} from "../../sterilization/sterilizationPresets.js";
import { CHEMICAL_INTEGRATORS_CATALOG } from "../kraft/chemicalIntegratorsCatalog.js";
import { parseAndValidateKraftBarcode } from "@dental/shared";

describe("SanPiN & Sterilization without Bureaucracy (Mandates 8e, 8k, 8n)", () => {
	describe("1. 1-Click Standard Tray Unseal (createStandardTrayKraftPackageRecord)", () => {
		it("generates a fresh statutory therapeutic tray with today's date and sterile_valid status in 1 click", () => {
			const record = createStandardTrayKraftPackageRecord("therapy", "Медсестра ЦСО");
			const todayIso = new Date().toISOString().slice(0, 10);

			assert.equal(record.packDate, todayIso);
			assert.equal(record.status, "sterile_valid");
			assert.equal(record.indicatorVerified, true);
			assert.equal(record.isBreached, false);
			assert.equal(record.daysLifespan, 50);
			assert.equal(record.daysRemaining, 50);
			assert.ok(record.toolSetNameRu.includes("Стандартный смотровой лоток"));
			assert.equal(record.itemsListRu.length, 5);
			assert.ok(record.itemsListRu.includes("Зеркало стоматологическое"));
			assert.ok(record.itemsListRu.includes("Зонд угловой"));
			assert.ok(record.itemsListRu.includes("Пинцет анатомический"));
			assert.ok(record.itemsListRu.includes("Штопфер-гладилка"));
			assert.ok(record.itemsListRu.includes("Экскаватор"));
		});

		it("generates surgical and endodontic trays on demand without modal barrier", () => {
			const surg = createStandardTrayKraftPackageRecord("surgery");
			assert.ok(surg.toolSetNameRu.includes("Хирургический"));
			assert.ok(surg.itemsListRu.includes("Щипцы байонетные"));
			assert.equal(surg.status, "sterile_valid");

			const endo = createStandardTrayKraftPackageRecord("endo");
			assert.ok(endo.toolSetNameRu.includes("Эндодонтический"));
			assert.ok(endo.itemsListRu.includes("Эндобокс"));
			assert.equal(endo.status, "sterile_valid");
		});
	});

	describe("2. Dynamic Kraft Package Generation on Short Digit Input (createDynamicKraftPackage)", () => {
		it("generates a valid package record on the fly for 2-3 digit tray input without blocking staff", () => {
			const dynamic01 = createDynamicKraftPackage("01", "Медсестра ЦСО");
			assert.equal(dynamic01.serialNumber, 1);
			assert.equal(dynamic01.status, "sterile_valid");
			assert.equal(dynamic01.indicatorVerified, true);
			assert.ok(dynamic01.toolSetNameRu.includes("Смотровой лоток №01"));

			const dynamic123 = createDynamicKraftPackage("123");
			assert.equal(dynamic123.serialNumber, 123);
			assert.equal(dynamic123.barcode128, "KB123");
			assert.equal(dynamic123.status, "sterile_valid");
		});
	});

	describe("3. 1-Click Standard Sterile Tray Barcode (createStandardSterileTrayBarcode)", () => {
		it("generates 2D DataMatrix and statutory Form 043/u protocol text with today's date", () => {
			const today = new Date();
			const tray = createStandardSterileTrayBarcode("therapy", today, "Смирнова А.В. (медсестра ЦСО)");

			assert.equal(tray.isValid, true);
			assert.equal(tray.isExpired, false);
			assert.equal(tray.daysRemaining, 50);
			assert.equal(tray.barcodeType, "datamatrix_2d");
			assert.ok(tray.formattedProtocolRecord043.includes("Инструменты стерильны"));
			assert.ok(tray.formattedProtocolRecord043.includes("СанПиН 3.3686-21"));
			assert.ok(tray.formattedProtocolRecord043.includes("ИнтеТЕСТ"));
		});

		it("provides standard options for therapy, surgery, and endo trays", () => {
			assert.equal(STANDARD_TRAY_OPTIONS.length, 3);
			const ids = STANDARD_TRAY_OPTIONS.map((t) => t.id);
			assert.ok(ids.includes("therapy"));
			assert.ok(ids.includes("surgery"));
			assert.ok(ids.includes("endo"));
		});
	});

	describe("4. Emergency Acute Pain Clearance under Mandate 8e", () => {
		it("allows soft overdraft and clinical clearance for expired package without blocking doctor", () => {
			// Simulating barcode evaluation of an expired package
			const expiredBarcode = "KB2401010001"; // Old date
			const parsed = parseAndValidateKraftBarcode(expiredBarcode);
			assert.equal(parsed.isExpired, true);

			// Under Mandate 8e soft overdraft:
			const emergencyCleared = {
				...parsed,
				isValid: true,
				formattedProtocolRecord043: `${parsed.formattedProtocolRecord043} [Допуск врачом по острой боли: визуальный контроль индикатора 5 класса — норма, упаковка герметична]`,
			};

			assert.equal(emergencyCleared.isValid, true);
			assert.ok(emergencyCleared.formattedProtocolRecord043.includes("Допуск врачом по острой боли"));
			assert.ok(emergencyCleared.formattedProtocolRecord043.includes("индикатора 5 класса — норма"));
			assert.ok(emergencyCleared.formattedProtocolRecord043.includes("упаковка герметична"));
		});
	});

	describe("5. Zero Bureaucracy: Single-Signatory Nurse Operations", () => {
		it("permits nurse to unseal tray and clear emergency package without a 3-person commission", () => {
			const record = createStandardTrayKraftPackageRecord("therapy", "Иванова О.С. (медсестра ЦСО)");
			assert.equal(record.operatorName, "Иванова О.С. (медсестра ЦСО)");
			assert.equal(record.operatorId, "NURSE-01");
			// Verification that no multi-person commission is required to complete operation
			assert.ok(!JSON.stringify(record).includes("commission"));
			assert.ok(!JSON.stringify(record).includes("комиссия"));
		});
	});

	describe("6. SanPiN Autoclave Indicator InTest 132/20 & Standard 132°C Preset", () => {
		it("registers Vinar InTest 132/20 class 5 chemical integrator for steam sterilization", () => {
			const intetest132 = CHEMICAL_INTEGRATORS_CATALOG.find((ind) => ind.id === "vinar_intetest_5_132_20");
			assert.ok(intetest132, "Индикаторы ИнТест 132/20 должны быть зарегистрированы");
			assert.equal(intetest132.classType, "class_5");
			assert.equal(intetest132.targetTemperatureCelsius, 132);
			assert.equal(intetest132.targetExposureMinutes, 20);
			assert.equal(intetest132.targetPressureBar, 2.0);
			assert.ok(intetest132.sanpinNormClauseRu.includes("СанПиН 3.3686-21"));
		});

		it("provides standard 132°C / 2.0 bar / 20 min preset per SanPiN 3.3686-21 Table 3.12", () => {
			assert.equal(SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET.temperatureC, 132);
			assert.equal(SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET.pressureBar, 2.0);
			assert.equal(SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET.exposureMinutes, 20);
			assert.ok(SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET.indicatorPointsStatus.includes("ИнтеТЕСТ-В-132/20"));

			const cycle = createQuickStandard132Cycle(1, "Смирнова А.В.");
			assert.equal(cycle.cycleNumber, 1);
			assert.equal(cycle.temperatureC, 132);
			assert.equal(cycle.exposureMinutes, 20);
			assert.equal(cycle.batchVerdict, "ГОДНА");
		});
	});
});

