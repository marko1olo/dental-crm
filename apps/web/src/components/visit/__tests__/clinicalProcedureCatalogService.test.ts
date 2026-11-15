import { describe, expect, it } from "vitest";
import {
	inferProcedureServiceFromStamp,
	type CatalogLookupItem,
} from "../clinicalProcedureCatalogService";

describe("clinicalProcedureCatalogService (DEF-PRICE-03)", () => {
	it("uses default clinical price when catalog is empty or null", () => {
		const caries = inferProcedureServiceFromStamp("caries", 16);
		expect(caries).not.toBeNull();
		expect(caries?.code).toBe("A16.07.002");
		expect(caries?.priceRub).toBe(4500);

		const crown = inferProcedureServiceFromStamp("crown", 21);
		expect(crown).not.toBeNull();
		expect(crown?.priceRub).toBe(18000);
	});

	it("dynamically resolves price from custom catalog when provided by code match", () => {
		const customCatalog: CatalogLookupItem[] = [
			{
				id: "custom-caries",
				code: "A16.07.002",
				title: "Кариес премиум",
				basePriceRub: 5900,
			},
			{
				id: "custom-implant",
				code: "A16.07.054",
				title: "Имплантация Nobel",
				priceRub: 48000,
			},
		];

		const caries = inferProcedureServiceFromStamp("caries", 16, customCatalog);
		expect(caries).not.toBeNull();
		expect(caries?.priceRub).toBe(5900);

		const implant = inferProcedureServiceFromStamp("implant", 46, customCatalog);
		expect(implant).not.toBeNull();
		expect(implant?.priceRub).toBe(48000);
	});

	it("dynamically resolves price when price is stored in priceKopecks", () => {
		const customCatalog: CatalogLookupItem[] = [
			{
				id: "kopecks-pulpitis",
				code: "A16.07.030",
				title: "Пульпит",
				priceKopecks: 820000, // 8200 руб
			},
		];

		const pulpitis = inferProcedureServiceFromStamp("pulpitis", 36, customCatalog);
		expect(pulpitis).not.toBeNull();
		expect(pulpitis?.priceRub).toBe(8200);
	});

	it("falls back to default price if catalog item has invalid or zero price", () => {
		const customCatalog: CatalogLookupItem[] = [
			{
				id: "zero-caries",
				code: "A16.07.002",
				title: "Кариес 0 руб",
				basePriceRub: 0,
			},
		];

		const caries = inferProcedureServiceFromStamp("caries", 16, customCatalog);
		expect(caries).not.toBeNull();
		expect(caries?.priceRub).toBe(4500);
	});

	it("returns null for unknown stamps", () => {
		expect(inferProcedureServiceFromStamp("unknown_stamp", 11)).toBeNull();
	});
});
