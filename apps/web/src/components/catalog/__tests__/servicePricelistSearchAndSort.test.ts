import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	getClinicalSynonyms,
	searchPricelistItems,
	sortPricelistItems,
} from "../pricelist/servicePricelistEngine";
import type { ServicePricelistItem } from "../pricelist/servicePricelistPresets";

describe("Service Pricelist Engine: Search & Sort Tests", () => {
	const sampleService: ServicePricelistItem = {
		id: "test-srv-1",
		code804n: "A16.07.002.001",
		statutoryTitle804n: "Восстановление зуба пломбой I, V, VI класс по Блэку",
		commercialTitle: "Лечение кариеса эмали/дентина (композит светового отверждения)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		materialCostRub: 900,
		labCostRub: 0,
		estimatedDurationMin: 45,
		icd10Indications: ["K02.0", "K02.1"],
		vatRate: 0,
		vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
		isActive: true,
		isArchived: false,
		tags: ["терапия", "пломба"],
	};

	const catalog: ServicePricelistItem[] = [
		sampleService,
		{
			id: "test-srv-2",
			code804n: "A16.07.008.001",
			statutoryTitle804n: "Пломбирование корневого канала зуба пастой",
			commercialTitle: "Эндодонтическое лечение пульпита (1 канал)",
			category: "therapy",
			specialty: "therapist",
			basePriceRub: 6000,
			basePriceKopecks: 600000,
			estimatedDurationMin: 60,
			icd10Indications: ["K04.0"],
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			isActive: true,
			isArchived: false,
			tags: ["эндодонтия", "пульпит"],
		},
		{
			id: "test-srv-3",
			code804n: "A06.07.007",
			statutoryTitle804n: "Прицельная внутриротовая контактная рентгенография",
			commercialTitle: "Радиовизиография прицельная (RVG снимок)",
			category: "radiology",
			specialty: "radiologist",
			basePriceRub: 500,
			basePriceKopecks: 50000,
			estimatedDurationMin: 10,
			icd10Indications: [],
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			isActive: true,
			isArchived: false,
			tags: ["снимок", "рентген"],
		},
	];

	describe("Clinical Search & Synonym Expansion", () => {
		it("finds therapy service by Order 804n code", () => {
			const res = searchPricelistItems(catalog, "A16.07.002");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.id, "test-srv-1");
		});

		it('finds radiology service by synonym "снимок" or "рентген"', () => {
			const res = searchPricelistItems(catalog, "снимок");
			assert.equal(res.length, 1);
			assert.equal(res[0]?.id, "test-srv-3");
		});

		it("expands clinical synonyms correctly", () => {
			const syns = getClinicalSynonyms("кариес");
			assert.ok(syns.includes("пломб"));
			assert.ok(syns.includes("a16.07.002"));
		});
	});

	describe("Sorting Catalog Items", () => {
		const items: ServicePricelistItem[] = [
			{ ...sampleService, id: "1", code804n: "B01.065.001", basePriceRub: 1000, commercialTitle: "Консультация" },
			{ ...sampleService, id: "2", code804n: "A16.07.001", basePriceRub: 3500, commercialTitle: "Удаление зуба" },
			{ ...sampleService, id: "3", code804n: "A16.07.054", basePriceRub: 35000, commercialTitle: "Имплантация Osstem" },
		];

		it("sorts by price ascending and descending", () => {
			const asc = sortPricelistItems(items, "price", "asc", "standard");
			assert.equal(asc[0]?.id, "1");
			assert.equal(asc[2]?.id, "3");

			const desc = sortPricelistItems(items, "price", "desc", "standard");
			assert.equal(desc[0]?.id, "3");
			assert.equal(desc[2]?.id, "1");
		});

		it("sorts by statutory Order 804n code", () => {
			const asc = sortPricelistItems(items, "code", "asc", "standard");
			assert.equal(asc[0]?.code804n, "A16.07.001");
			assert.equal(asc[2]?.code804n, "B01.065.001");
		});
	});
});
