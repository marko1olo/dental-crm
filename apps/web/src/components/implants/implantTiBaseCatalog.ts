/**
 * implantTiBaseCatalog.ts — Каталог титановых оснований (Ti-Base) для систем имплантации (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts по Мандатам 8b и 8zi.
 */

import type { ConnectionEngagement } from "./implantTorqueSpecs";
import type { ImplantBrand, ImplantTorqueBrand, NormalizedBrandId } from "./implantBrandTypes";

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
	readonly brand: NormalizedBrandId | ImplantBrand;
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

export const TI_BASE_CATALOG: readonly TiBaseCatalogItem[] = [
	{
		id: "st-tb-nc-01",
		brand: "straumann",
		line: "Bone Level",
		platformName: "NC (Narrow CrossFit)",
		platformDiameterMm: 3.3,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 4.5,
		engagement: "engaging",
		articleNumber: "022.0101",
		screwArticleNumber: "025.2901",
		screwdriverType: "SCS",
		recommendedTorqueNcm: 35,
		scanBodyArticle: "025.0001",
		priceKopecks: 850000,
	},
	{
		id: "st-tb-rc-01",
		brand: "straumann",
		line: "Bone Level",
		platformName: "RC (Regular CrossFit)",
		platformDiameterMm: 4.1,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 5.5,
		engagement: "engaging",
		articleNumber: "022.0102",
		screwArticleNumber: "025.4901",
		screwdriverType: "SCS",
		recommendedTorqueNcm: 35,
		scanBodyArticle: "025.0002",
		priceKopecks: 850000,
	},
	{
		id: "nb-tb-np-01",
		brand: "nobel_biocare",
		line: "NobelActive",
		platformName: "NP (Narrow Platform)",
		platformDiameterMm: 3.5,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 4.5,
		engagement: "engaging",
		articleNumber: "36812",
		screwArticleNumber: "36818",
		screwdriverType: "Unigrip",
		recommendedTorqueNcm: 35,
		scanBodyArticle: "36850",
		priceKopecks: 900000,
	},
	{
		id: "nb-tb-rp-01",
		brand: "nobel_biocare",
		line: "NobelActive",
		platformName: "RP (Regular Platform)",
		platformDiameterMm: 4.3,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 5.5,
		engagement: "engaging",
		articleNumber: "36813",
		screwArticleNumber: "36819",
		screwdriverType: "Unigrip",
		recommendedTorqueNcm: 35,
		scanBodyArticle: "36851",
		priceKopecks: 900000,
	},
	{
		id: "oss-tb-m-01",
		brand: "osstem",
		line: "TS III",
		platformName: "Mini",
		platformDiameterMm: 3.5,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 4.5,
		engagement: "engaging",
		articleNumber: "TBTS3M15",
		screwArticleNumber: "BSTSM",
		screwdriverType: "Hex 1.2 mm",
		recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-OSS-M",
		priceKopecks: 450000,
	},
	{
		id: "oss-tb-r-01",
		brand: "osstem",
		line: "TS III",
		platformName: "Regular",
		platformDiameterMm: 4.0,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 5.5,
		engagement: "engaging",
		articleNumber: "TBTS3R15",
		screwArticleNumber: "BSTSR",
		screwdriverType: "Hex 1.2 mm",
		recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-OSS-R",
		priceKopecks: 450000,
	},
	{
		id: "dt-tb-reg-01",
		brand: "dentium",
		line: "SuperLine",
		platformName: "Standard",
		platformDiameterMm: 4.0,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 5.0,
		engagement: "engaging",
		articleNumber: "TBAL4015",
		screwArticleNumber: "SBL30",
		screwdriverType: "Hex 1.27 mm",
		recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-DENT-STD",
		priceKopecks: 480000,
	},
	{
		id: "as-tb-ev-01",
		brand: "astra_tech",
		line: "OsseoSpeed EV",
		platformName: "Yellow 4.2",
		platformDiameterMm: 4.2,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 4.0,
		engagement: "engaging",
		articleNumber: "25841",
		screwArticleNumber: "25849",
		screwdriverType: "Hex 1.25 mm",
		recommendedTorqueNcm: 25,
		scanBodyArticle: "SB-AST-EV42",
		priceKopecks: 820000,
	},
	{
		id: "ar-tb-reg-01",
		brand: "anyridge",
		line: "AnyRidge",
		platformName: "Regular",
		platformDiameterMm: 4.0,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 4.5,
		engagement: "engaging",
		articleNumber: "ARTB4015",
		screwArticleNumber: "ARS30",
		screwdriverType: "Hex 1.2 mm",
		recommendedTorqueNcm: 35,
		scanBodyArticle: "SB-AR-40",
		priceKopecks: 520000,
	},
	{
		id: "ank-tb-c-01",
		brand: "ankylos",
		line: "C/X",
		platformName: "Balance Base C/",
		platformDiameterMm: 3.5,
		gingivaHeightMm: 1.5,
		chimneyHeightMm: 4.0,
		engagement: "non_engaging",
		articleNumber: "31022110",
		screwArticleNumber: "31022190",
		screwdriverType: "Hex 1.0 mm",
		recommendedTorqueNcm: 15,
		scanBodyArticle: "SB-ANK-BB",
		priceKopecks: 870000,
	},
];

/**
 * Единый канонический алиас SSOT (объединен в TI_BASE_CATALOG).
 */
export const TI_BASE_CATALOG_SSOT: readonly (TiBaseItemSSOT | TiBaseCatalogItem)[] = TI_BASE_CATALOG;

export function getTiBasesByBrandAndPlatform(
	brand: NormalizedBrandId | ImplantBrand,
	platformName?: string,
): TiBaseCatalogItem[] {
	return TI_BASE_CATALOG.filter(
		(tb) => tb.brand === brand && (!platformName || tb.platformName.includes(platformName)),
	);
}

export function findTiBaseByArticle(articleNumber: string): TiBaseCatalogItem | undefined {
	return TI_BASE_CATALOG.find((tb) => tb.articleNumber === articleNumber);
}
