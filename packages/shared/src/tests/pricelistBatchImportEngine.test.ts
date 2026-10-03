/**
 * DENTE Dental CRM — Unit & Regression Tests for Universal Tabular Price List Import & Deduplication
 *
 * Covers:
 * 1. Vendor signatures: IDENT, DentalPRO, iStom, 1C:Медицина, Generic solo-doctor sheet.
 * 2. Header row detection with skipped preamble rows (metadata/clinic headers).
 * 3. Exact kopeck price normalization ("1 500,50 руб", "1 500-00", "от 2500", "бесплатно", "договорная", negative).
 * 4. Deduplication & collision strategies: update_existing, skip_duplicates, create_new.
 * 5. Zero-Mock Statutory 804n Invariant: NO fake A16.07.999.xxx codes!
 * 6. Actionable error reporting with 1-based row numbers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	analyzeTabularPricelist,
	autoMapColumns,
	crossReferenceTabularRow,
	detectVendorSignature,
	findHeaderRowIndex,
	normalizePricelistPrice,
	normalizeServiceCategoryName,
	type ServiceCatalogItem,
} from "../index.js";

describe("Universal Tabular Price List Import & Deduplication Engine", () => {
	describe("1. Robust Price Normalizer (Exact Kopecks)", () => {
		it("correctly parses standard Russian price strings with rubles and kopecks", () => {
			const res1 = normalizePricelistPrice("1 500,50 руб");
			assert.equal(res1.success, true);
			assert.equal(res1.priceRub, 1500.50);
			assert.equal(res1.priceKopecks, 150050);

			const res2 = normalizePricelistPrice("4500.75 ₽");
			assert.equal(res2.success, true);
			assert.equal(res2.priceRub, 4500.75);
			assert.equal(res2.priceKopecks, 450075);
		});

		it("handles Soviet/Russian accounting '1500-00' notation", () => {
			const res = normalizePricelistPrice("1 500-00");
			assert.equal(res.success, true);
			assert.equal(res.priceRub, 1500.00);
			assert.equal(res.priceKopecks, 150000);
		});

		it("handles 'от 2 500 руб' prefixed prices", () => {
			const res = normalizePricelistPrice("от 2 500 руб");
			assert.equal(res.success, true);
			assert.equal(res.priceRub, 2500.00);
			assert.equal(res.priceKopecks, 250000);
		});

		it("handles 'бесплатно' and 'по гарантии' as 0.00 rubles", () => {
			const resFree = normalizePricelistPrice("бесплатно");
			assert.equal(resFree.success, true);
			assert.equal(resFree.priceRub, 0);
			assert.equal(resFree.priceKopecks, 0);
			assert.equal(resFree.isWarrantyOrFree, true);

			const resWarranty = normalizePricelistPrice("по гарантии");
			assert.equal(resWarranty.success, true);
			assert.equal(resWarranty.priceRub, 0);
			assert.equal(resWarranty.isWarrantyOrFree, true);
		});

		it("rejects 'договорная' with clear Russian actionable message", () => {
			const res = normalizePricelistPrice("договорная");
			assert.equal(res.success, false);
			assert.match(res.error || "", /договорная.*укажите фиксированную сумму/i);
		});

		it("rejects negative prices strictly", () => {
			const res = normalizePricelistPrice("-500 руб");
			assert.equal(res.success, false);
			assert.match(res.error || "", /не может быть отрицательной/i);
		});

		it("rejects non-numeric garbage", () => {
			const res = normalizePricelistPrice("непонятно");
			assert.equal(res.success, false);
			assert.match(res.error || "", /не удалось распознать цену/i);
		});
	});

	describe("2. Vendor Signatures & Column Auto-Mapping", () => {
		it("detects IDENT table format and maps columns", () => {
			const headers = ["Артикул", "Группа", "Наименование", "Цена", "Себестоимость", "Гарантия"];
			const vendor = detectVendorSignature(headers);
			assert.equal(vendor, "ident");

			const mapping = autoMapColumns(headers);
			assert.equal(mapping.codeCol, 0);
			assert.equal(mapping.categoryCol, 1);
			assert.equal(mapping.titleCol, 2);
			assert.equal(mapping.priceCol, 3);
			assert.equal(mapping.costCol, 4);
			assert.equal(mapping.warrantyCol, 5);
		});

		it("detects DentalPRO table format and maps columns", () => {
			const headers = ["Код", "Категория", "Услуга", "Стоимость", "Себестоимость", "Время"];
			const vendor = detectVendorSignature(headers);
			assert.equal(vendor, "dentalpro");

			const mapping = autoMapColumns(headers);
			assert.equal(mapping.codeCol, 0);
			assert.equal(mapping.categoryCol, 1);
			assert.equal(mapping.titleCol, 2);
			assert.equal(mapping.priceCol, 3);
			assert.equal(mapping.costCol, 4);
			assert.equal(mapping.durationCol, 5);
		});

		it("detects iStom table format and maps columns", () => {
			const headers = ["Код услуги", "Раздел", "Наименование услуги", "Тариф", "Гарантия"];
			const vendor = detectVendorSignature(headers);
			assert.equal(vendor, "istom");

			const mapping = autoMapColumns(headers);
			assert.equal(mapping.codeCol, 0);
			assert.equal(mapping.categoryCol, 1);
			assert.equal(mapping.titleCol, 2);
			assert.equal(mapping.priceCol, 3);
			assert.equal(mapping.warrantyCol, 4);
		});

		it("detects 1C:Медицина table format and maps columns", () => {
			const headers = ["КодНоменклатуры", "Номенклатура", "ГруппаНоменклатуры", "Цена"];
			const vendor = detectVendorSignature(headers);
			assert.equal(vendor, "1c_medicina");

			const mapping = autoMapColumns(headers);
			assert.equal(mapping.codeCol, 0);
			assert.equal(mapping.titleCol, 1);
			assert.equal(mapping.categoryCol, 2);
			assert.equal(mapping.priceCol, 3);
		});
	});

	describe("3. Preamble Header Skipping & Full Tabular Analysis", () => {
		it("skips doctor spreadsheet header metadata and parses data rows", () => {
			const rows = [
				["Стоматологическая клиника «Денте»", "", ""],
				["Прейскурант услуг на 2026 год", "", ""],
				["", "", ""],
				["Код", "Наименование услуги", "Цена (руб)"],
				["TH-01", "Лечение поверхностного кариеса", "3 500,00"],
				["TH-02", "Эндодонтическое лечение пульпита", "7 200,00"],
				["SG-01", "Сложное удаление зуба мудрости", "5 000,00"],
			];

			const headerIdx = findHeaderRowIndex(rows);
			assert.equal(headerIdx, 3);

			const analysis = analyzeTabularPricelist({ rows });
			assert.equal(analysis.totalRows, 3);
			assert.equal(analysis.validRowsCount, 3);
			assert.equal(analysis.errorRowsCount, 0);
			assert.equal(analysis.allRows[0]?.commercialTitle, "Лечение поверхностного кариеса");
			assert.equal(analysis.allRows[0]?.priceRub, 3500);
			assert.equal(analysis.allRows[0]?.priceKopecks, 350000);
			assert.equal(analysis.allRows[0]?.category, "therapy");
			// ZERO MOCKS: must have valid statutory code, NOT A16.07.999.xxx
			assert.equal(analysis.allRows[0]?.order804nCode, "A16.07.002");
		});

		it("flags bad rows and captures 1-based row numbers with actionable errors", () => {
			const rows = [
				["Код", "Наименование", "Цена"],
				["001", "Консультация ортодонта", "1000"],
				["002", "", "2500"], // missing title
				["003", "Установка винира E.max", "договорная"], // bad price
				["004", "Профгигиена полости рта", "4 000,00"],
			];

			const analysis = analyzeTabularPricelist({ rows });
			assert.equal(analysis.totalRows, 4);
			assert.equal(analysis.validRowsCount, 2);
			assert.equal(analysis.errorRowsCount, 2);
			assert.equal(analysis.errors.length, 2);

			assert.equal(analysis.errors[0]?.rowNumber, 3); // 1-based Excel row 3
			assert.equal(analysis.errors[0]?.field, "title");

			assert.equal(analysis.errors[1]?.rowNumber, 4); // 1-based Excel row 4
			assert.equal(analysis.errors[1]?.field, "price");
		});
	});

	describe("4. Deduplication & Collision Strategies", () => {
		const existingCatalog: ServiceCatalogItem[] = [
			{
				id: "svc-1",
				organizationId: "dce70000-f06e-4c07-8ac1-e23698670001",
				code: "TH-01",
				title: "Лечение кариеса пломбой",
				aliases: [],
				category: "therapy",
				specialty: "therapist",
				basePriceRub: 3000,
				durationMinutes: 45,
				taxDeductible: true,
				active: true,
			},
			{
				id: "svc-2",
				organizationId: "dce70000-f06e-4c07-8ac1-e23698670001",
				code: "HY-01",
				title: "Профессиональная гигиена AirFlow",
				aliases: [],
				category: "hygiene",
				specialty: "hygienist",
				basePriceRub: 4500,
				durationMinutes: 60,
				taxDeductible: true,
				active: true,
			},
		];

		it("detects exact match with same price as 'identical'", () => {
			const res = crossReferenceTabularRow("HY-01", "Профессиональная гигиена AirFlow", 450000, existingCatalog);
			assert.equal(res.action, "identical");
			assert.equal(res.matchedId, "svc-2");
		});

		it("detects price change on existing code as 'update_existing'", () => {
			const res = crossReferenceTabularRow("TH-01", "Лечение кариеса пломбой", 350000, existingCatalog);
			assert.equal(res.action, "update_existing");
			assert.equal(res.matchedId, "svc-1");
			assert.equal(res.matchedPriceRub, 3000);
		});

		it("detects new service as 'create_new'", () => {
			const res = crossReferenceTabularRow("SG-99", "Резекция верхушки корня зуба", 800000, existingCatalog);
			assert.equal(res.action, "create_new");
			assert.equal(res.matchedId, undefined);
		});
	});
});
