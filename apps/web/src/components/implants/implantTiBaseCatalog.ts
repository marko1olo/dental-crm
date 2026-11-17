/**
 * implantTiBaseCatalog.ts — Каталог титановых оснований (Ti-Base) для систем имплантации (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts по Мандатам 8b и 8zi.
 */

import type { ConnectionEngagement } from "./implantTorqueSpecs";
import type { ImplantTorqueBrand, NormalizedBrandId } from "./implantBrandTypes";

export interface TiBaseItemSSOT {
	readonly id: string;
	readonly brand: NormalizedBrandId;
	readonly line: string;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly gingivaHeightMm: number;
	readonly chimneyHeightMm: number;
	readonly articleNumber: string;
	readonly recommendedTorqueNcm: number;
	readonly screwdriverType: string;
}

export interface TiBaseCatalogItem {
	readonly id: string;
	readonly brand: ImplantTorqueBrand;
	readonly line: string;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly gingivaHeightMm: number;
	readonly chimneyHeightMm: number;
	readonly engagement: ConnectionEngagement;
	readonly articleNumber: string;
	readonly screwArticleNumber: string;
	readonly screwdriverType: string;
	readonly recommendedTorqueNcm: number;
	readonly scanBodyArticle: string;
	readonly priceKopecks: number;
}

export const TI_BASE_CATALOG_SSOT: readonly TiBaseItemSSOT[] = [
	{ id: "st-tb-nc-01", brand: "straumann", line: "BLX / Bone Level", platformName: "NC 3.3mm", platformDiameterMm: 3.3, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "022.0104", recommendedTorqueNcm: 35, screwdriverType: "SCS" },
	{ id: "st-tb-rc-01", brand: "straumann", line: "BLX / Bone Level", platformName: "RC 4.1mm", platformDiameterMm: 4.1, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "022.0106", recommendedTorqueNcm: 35, screwdriverType: "SCS" },
	{ id: "nb-tb-np-01", brand: "nobel_biocare", line: "NobelActive", platformName: "NP 3.5mm", platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "36838", recommendedTorqueNcm: 35, screwdriverType: "Unigrip" },
	{ id: "nb-tb-rp-01", brand: "nobel_biocare", line: "NobelActive", platformName: "RP 4.3mm", platformDiameterMm: 4.3, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "36839", recommendedTorqueNcm: 35, screwdriverType: "Unigrip" },
	{ id: "oss-tb-mini-01", brand: "osstem", line: "TS III", platformName: "Mini (M)", platformDiameterMm: 3.5, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "TBM3510", recommendedTorqueNcm: 30, screwdriverType: "Hex 1.2 mm" },
	{ id: "oss-tb-reg-01", brand: "osstem", line: "TS III", platformName: "Regular (R)", platformDiameterMm: 4.0, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "TBR4010", recommendedTorqueNcm: 30, screwdriverType: "Hex 1.2 mm" },
	{ id: "dt-tb-reg-01", brand: "dentium", line: "SuperLine", platformName: "Regular", platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "TLB4015", recommendedTorqueNcm: 30, screwdriverType: "Hex 1.27 mm" },
	{ id: "as-tb-ev-01", brand: "astra_tech", line: "OsseoSpeed EV", platformName: "Yellow 4.2", platformDiameterMm: 4.2, gingivaHeightMm: 1.5, chimneyHeightMm: 4.0, articleNumber: "25841", recommendedTorqueNcm: 25, screwdriverType: "Hex 1.25 mm" },
	{ id: "ar-tb-reg-01", brand: "anyridge", line: "AnyRidge", platformName: "Regular", platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "ARTB4015", recommendedTorqueNcm: 35, screwdriverType: "Hex 1.2 mm" },
	{ id: "ank-tb-cx-01", brand: "ankylos", line: "C/X", platformName: "Regular C/X", platformDiameterMm: 4.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.0, articleNumber: "31022510", recommendedTorqueNcm: 15, screwdriverType: "Hex 1.0 mm" },
];

export const TI_BASE_CATALOG: readonly TiBaseCatalogItem[] = [
	{
		id: "st-tb-nc-01", brand: "straumann", line: "Bone Level", platformName: "NC (Narrow CrossFit)",
		platformDiameterMm: 3.3, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, engagement: "engaging",
		articleNumber: "022.0101", screwArticleNumber: "025.2901", screwdriverType: "SCS", recommendedTorqueNcm: 35,
		scanBodyArticle: "025.0001", priceKopecks: 850000,
	},
	{
		id: "st-tb-rc-01", brand: "straumann", line: "Bone Level", platformName: "RC (Regular CrossFit)",
		platformDiameterMm: 4.1, gingivaHeightMm: 1.5, chimneyHeightMm: 5.5, engagement: "engaging",
		articleNumber: "022.0102", screwArticleNumber: "025.4901", screwdriverType: "SCS", recommendedTorqueNcm: 35,
		scanBodyArticle: "025.0002", priceKopecks: 850000,
	},
	{
		id: "nb-tb-np-01", brand: "nobel_biocare", line: "NobelActive", platformName: "NP (Narrow Platform)",
		platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, engagement: "engaging",
		articleNumber: "36812", screwArticleNumber: "36818", screwdriverType: "Unigrip", recommendedTorqueNcm: 35,
		scanBodyArticle: "36850", priceKopecks: 900000,
	},
	{
		id: "nb-tb-rp-01", brand: "nobel_biocare", line: "NobelActive", platformName: "RP (Regular Platform)",
		platformDiameterMm: 4.3, gingivaHeightMm: 1.5, chimneyHeightMm: 5.5, engagement: "engaging",
		articleNumber: "36813", screwArticleNumber: "36819", screwdriverType: "Unigrip", recommendedTorqueNcm: 35,
		scanBodyArticle: "36851", priceKopecks: 900000,
	},
	{
		id: "oss-tb-m-01", brand: "osstem", line: "TS III", platformName: "Mini",
		platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, engagement: "engaging",
		articleNumber: "TBTS3M15", screwArticleNumber: "BSTSM", screwdriverType: "Hex 1.2 mm", recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-OSS-M", priceKopecks: 450000,
	},
	{
		id: "oss-tb-r-01", brand: "osstem", line: "TS III", platformName: "Regular",
		platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 5.5, engagement: "engaging",
		articleNumber: "TBTS3R15", screwArticleNumber: "BSTSR", screwdriverType: "Hex 1.2 mm", recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-OSS-R", priceKopecks: 450000,
	},
	{
		id: "dent-tb-sl-01", brand: "dentium", line: "SuperLine", platformName: "Standard",
		platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 5.0, engagement: "engaging",
		articleNumber: "TBAL4015", screwArticleNumber: "SBL30", screwdriverType: "Hex 1.27 mm", recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-DENT-STD", priceKopecks: 480000,
	},
	{
		id: "ank-tb-c-01", brand: "ankylos", line: "C/X", platformName: "Balance Base C/",
		platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.0, engagement: "non_engaging",
		articleNumber: "31022110", screwArticleNumber: "31022190", screwdriverType: "Hex 1.0 mm", recommendedTorqueNcm: 15,
		scanBodyArticle: "SB-ANK-BB", priceKopecks: 870000,
	},
];

export function getTiBasesByBrandAndPlatform(
	brand: ImplantTorqueBrand,
	platformName?: string,
): TiBaseCatalogItem[] {
	return TI_BASE_CATALOG.filter(
		(tb) => tb.brand === brand && (!platformName || tb.platformName.includes(platformName)),
	);
}

export function findTiBaseByArticle(articleNumber: string): TiBaseCatalogItem | undefined {
	return TI_BASE_CATALOG.find((tb) => tb.articleNumber === articleNumber);
}
