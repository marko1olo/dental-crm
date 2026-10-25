/**
 * tiBaseCatalogData.ts — Каталог титановых оснований (Ti-Base) ведущих брендов (SSOT).
 */
import type { TiBaseCatalogItem } from "./implantTorqueTypes";

export const TI_BASE_CATALOG: readonly TiBaseCatalogItem[] = [
	{
		id: "st-tb-nc-01", brand: "straumann", brandName: "Straumann", lineName: "Variobase NC",
		article: "022.0104", nameRu: "Variobase NC Ø3.3 десна 1.0 мм / шахта 5.5 мм", platformName: "NC (Narrow CrossFit)",
		platformDiameterMm: 3.3, gingivalCuffHeightMm: 1.0, chimneyPostHeightMm: 5.5,
		engagement: "engaging", maxAscAngleDeg: 20, recommendedTorqueNcm: 35, screwdriverType: "SCS", priceKopecks: 680000,
	},
	{
		id: "st-tb-rc-02", brand: "straumann", brandName: "Straumann", lineName: "Variobase RC",
		article: "022.0106", nameRu: "Variobase RC Ø4.1/4.8 десна 1.5 мм / шахта 5.5 мм", platformName: "RC (Regular CrossFit)",
		platformDiameterMm: 4.1, gingivalCuffHeightMm: 1.5, chimneyPostHeightMm: 5.5,
		engagement: "engaging", maxAscAngleDeg: 25, recommendedTorqueNcm: 35, screwdriverType: "SCS", priceKopecks: 680000,
	},
	{
		id: "nb-tb-np-01", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelProcera ASC NP",
		article: "38841", nameRu: "ASC Ti-Base CC NP Ø3.5 десна 1.5 мм", platformName: "CC NP (3.5 mm)",
		platformDiameterMm: 3.5, gingivalCuffHeightMm: 1.5, chimneyPostHeightMm: 5.0,
		engagement: "engaging", maxAscAngleDeg: 25, recommendedTorqueNcm: 35, screwdriverType: "Omnigrip™", priceKopecks: 790000,
	},
	{
		id: "nb-tb-rp-02", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelProcera ASC RP",
		article: "38842", nameRu: "ASC Ti-Base CC RP Ø4.3/5.0 десна 1.5 мм", platformName: "CC RP (4.3 mm)",
		platformDiameterMm: 4.3, gingivalCuffHeightMm: 1.5, chimneyPostHeightMm: 5.0,
		engagement: "engaging", maxAscAngleDeg: 25, recommendedTorqueNcm: 35, screwdriverType: "Omnigrip™", priceKopecks: 790000,
	},
	{
		id: "os-tb-mini-01", brand: "osstem", brandName: "Osstem", lineName: "TS Custom Ti-Base Mini",
		article: "TBA3509M", nameRu: "Ti-Base TS Mini Ø3.5 десна 0.9 мм / шахта 5.5 мм", platformName: "Mini (3.5 mm)",
		platformDiameterMm: 3.5, gingivalCuffHeightMm: 0.9, chimneyPostHeightMm: 5.5,
		engagement: "engaging", maxAscAngleDeg: 20, recommendedTorqueNcm: 20, screwdriverType: "Hex 1.2 mm", priceKopecks: 380000,
	},
	{
		id: "os-tb-reg-02", brand: "osstem", brandName: "Osstem", lineName: "TS Custom Ti-Base Regular",
		article: "TBA4515R", nameRu: "Ti-Base TS Regular Ø4.5 десна 1.5 мм / шахта 5.5 мм", platformName: "Regular (4.0/4.5 mm)",
		platformDiameterMm: 4.5, gingivalCuffHeightMm: 1.5, chimneyPostHeightMm: 5.5,
		engagement: "engaging", maxAscAngleDeg: 20, recommendedTorqueNcm: 30, screwdriverType: "Hex 1.2 mm", priceKopecks: 380000,
	},
	{
		id: "dt-tb-sl-01", brand: "dentium", brandName: "Dentium", lineName: "SuperLine Ti-Base Link",
		article: "TLH4015", nameRu: "Ti-Base Link SuperLine Ø4.0 десна 1.5 мм", platformName: "SuperLine Conical Hex",
		platformDiameterMm: 4.0, gingivalCuffHeightMm: 1.5, chimneyPostHeightMm: 5.5,
		engagement: "engaging", maxAscAngleDeg: 20, recommendedTorqueNcm: 30, screwdriverType: "Hex 1.27 mm", priceKopecks: 360000,
	},
	{
		id: "ak-tb-cx-01", brand: "ankylos", brandName: "Ankylos", lineName: "Ankylos Ti-Base C/X",
		article: "31022510", nameRu: "Ti-Base Ankylos C/X десна 1.5 мм", platformName: "TissueCare C/X",
		platformDiameterMm: 3.5, gingivalCuffHeightMm: 1.5, chimneyPostHeightMm: 5.0,
		engagement: "engaging", maxAscAngleDeg: 20, recommendedTorqueNcm: 15, screwdriverType: "Hex 1.0 mm", priceKopecks: 720000,
	},
];
