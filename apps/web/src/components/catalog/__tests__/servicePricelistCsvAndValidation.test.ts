import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	detectCategoryFrom804nCode,
	detectCategoryFromServiceCode,
	exportPricelistToCsv,
	importPricelistFromCsv,
	isValidOrder804nCode,
	isValidStatutoryCode,
	UTF8_BOM,
} from "../pricelist/servicePricelistEngine";
import {
	BASELINE_PRICELIST_SERVICES,
	CANONICAL_SERVICE_PRESETS,
	type ServicePricelistItem,
} from "../pricelist/servicePricelistPresets";

describe("Service Pricelist Engine: CSV & Validation Tests", () => {
	const sampleService: ServicePricelistItem = {
		id: "test-srv-1",
		code804n: "A16.07.002.001",
		statutoryTitle804n: "Восстановление зуба пломбой",
		commercialTitle: "Лечение кариеса эмали/дентина",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		estimatedDurationMin: 45,
		icd10Indications: ["K02.0", "K02.1"],
		vatRate: 0,
		vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
		isActive: true,
		isArchived: false,
		tags: ["терапия", "пломба"],
	};

	describe("RFC 4180 CSV Import/Export without Data Loss", () => {
		it("exports catalog to CSV with UTF-8 BOM", () => {
			const csv = exportPricelistToCsv([sampleService]);
			assert.ok(csv.startsWith(UTF8_BOM));
			assert.ok(csv.includes("A16.07.002.001"));
			assert.ok(csv.includes("Лечение кариеса"));
			assert.ok(csv.includes("4500"));
		});

		it("imports valid CSV records", () => {
			const csvData = [
				"Код услуги;Наименование;Цена;Категория;Специальность",
				"A16.07.002;Пломба световая;3500;Терапия;Терапевт",
				"A16.07.001;Удаление зуба;2500;Хирургия;Хирург",
			].join("\r\n");

			const res = importPricelistFromCsv(csvData);
			assert.equal(res.validItems.length, 2);
			assert.equal(res.invalidRows.length, 0);
			assert.equal(res.validItems[0]?.basePriceRub, 3500);
			assert.equal(res.validItems[0]?.category, "therapy");
			assert.equal(res.validItems[1]?.basePriceRub, 2500);
			assert.equal(res.validItems[1]?.category, "surgery");
		});

		it("allows multiple distinct services with the same Minzdrav 804n code", () => {
			const csvData = [
				"Код услуги;Наименование;Цена;Категория",
				"A16.07.002;Лечение кариеса 1 поверхности;3000;Терапия",
				"A16.07.002;Лечение кариеса 2 поверхностей;4200;Терапия",
				"A16.07.002;Эстетическая реставрация зуба;6500;Терапия",
			].join("\r\n");

			const res = importPricelistFromCsv(csvData);
			assert.equal(res.validItems.length, 3);
			const ids = new Set(res.validItems.map((i) => i.id));
			assert.equal(ids.size, 3);
		});
	});

	describe("Statutory Code Validation and Category Detection", () => {
		it("validates statutory standard syntax", () => {
			assert.ok(isValidStatutoryCode("A16.07.002"));
			assert.ok(isValidStatutoryCode("A16.07.002.001"));
			assert.ok(isValidStatutoryCode("B01.065.001"));
			assert.ok(isValidStatutoryCode("A06.07.007"));
			assert.equal(isValidStatutoryCode("INVALID_CODE"), false);
			assert.ok(isValidOrder804nCode("A16.07.002"));
		});

		it("detects category automatically from service code prefix", () => {
			assert.equal(detectCategoryFromServiceCode("A16.07.002"), "therapy");
			assert.equal(detectCategoryFromServiceCode("A16.07.001"), "surgery");
			assert.equal(detectCategoryFromServiceCode("A16.07.006"), "orthopedics");
			assert.equal(detectCategoryFromServiceCode("A16.07.047"), "orthodontics");
			assert.equal(detectCategoryFromServiceCode("A16.07.051"), "hygiene");
			assert.equal(detectCategoryFromServiceCode("A06.07.007"), "radiology");
			assert.equal(detectCategoryFromServiceCode("B01.065.001"), "consultation");
			assert.equal(detectCategoryFromServiceCode("PKG-CHECKUP"), "package");
			assert.equal(detectCategoryFrom804nCode("A16.07.002"), "therapy");
		});
	});

	describe("Canonical Presets Sanity Check", () => {
		it("canonical presets has at least 45 services", () => {
			assert.ok(CANONICAL_SERVICE_PRESETS.length >= 45);
		});

		it("baseline pricelist has at least 25 canonical services", () => {
			assert.ok(BASELINE_PRICELIST_SERVICES.length >= 25);
			for (const srv of BASELINE_PRICELIST_SERVICES) {
				const code = srv.statutoryCode || srv.code804n;
				assert.ok(code, `Service ${srv.id} missing code`);
				assert.ok(srv.commercialTitle, `Service ${srv.id} missing commercialTitle`);
				assert.ok(srv.basePriceRub >= 0, `Service ${srv.id} price negative`);
				assert.equal(srv.vatRate, 0, `Medical service must have VAT 0%`);
			}
		});
	});
});
