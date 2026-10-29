/**
 * implantTorqueCatalog.ts — Единый канонический SSOT каталог спецификаций торка, отверток и Ti-Base (DENTE CRM).
 * Предотвращает поломку винтов и гарантирует клиническую точность фиксации (Мандаты 8b, 8e, 8n).
 */

export type ImplantTorqueBrand =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "ankylos"
	| "astra_tech"
	| "mis";

export type ProstheticComponentType =
	| "fixture_insertion"
	| "cover_screw"
	| "healing_abutment"
	| "multi_unit_straight"
	| "multi_unit_angled"
	| "multi_unit_bridge_screw"
	| "ti_base_screw"
	| "custom_abutment_screw"
	| "locator_abutment"
	| "ball_attachment";

export type ConnectionEngagement = "engaging" | "non_engaging";

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

export interface BrandTorqueSpec {
	readonly brand: ImplantTorqueBrand;
	readonly brandName: string;
	readonly screwdriverDefault: string;
	readonly screwdriverAliasRu: string;
	readonly torqueFinalScrewNcm: number;
	readonly torqueMultiUnitBodyNcm: number;
	readonly torqueMultiUnitBridgeScrewNcm: number;
	readonly torqueCoverScrewNcm: number;
	readonly torqueHealingAbutmentNcm: number;
	readonly maxSafeTorqueNcm: number;
	readonly minInsertionTorqueNcm: number;
	readonly connectionSafetyNotes: string;
}

export const IMPLANT_TORQUE_SPECS: Record<ImplantTorqueBrand, BrandTorqueSpec> = {
	straumann: {
		brand: "straumann",
		brandName: "Straumann",
		screwdriverDefault: "SCS (Screw Carrying System)",
		screwdriverAliasRu: "Отвертка Straumann SCS (звездочка)",
		torqueFinalScrewNcm: 35,
		torqueMultiUnitBodyNcm: 35,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 45,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое соединение CrossFit 15°. Затяжка винта Ti-Base строго 35 Н·см.",
	},
	nobel_biocare: {
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		screwdriverDefault: "Unigrip",
		screwdriverAliasRu: "Отвертка Nobel Unigrip (лепестковая)",
		torqueFinalScrewNcm: 35,
		torqueMultiUnitBodyNcm: 35,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 45,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое соединение Conical Connection. Мостовые винты строго 15 Н·см.",
	},
	osstem: {
		brand: "osstem",
		brandName: "Osstem",
		screwdriverDefault: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (Osstem)",
		torqueFinalScrewNcm: 30,
		torqueMultiUnitBodyNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 20,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 35,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Внутренний конус Морзе 11° с шестигранником. Не превышать 30 Н·см на абатментный винт.",
	},
	dentium: {
		brand: "dentium",
		brandName: "Dentium",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)",
		screwdriverAliasRu: "Шестигранник 1.27 мм (Dentium / Zimmer)",
		torqueFinalScrewNcm: 30,
		torqueMultiUnitBodyNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 35,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Конус 11° с шестигранником. Отвертка 1.27 мм взаимозаменяема с Zimmer/MIS.",
	},
	ankylos: {
		brand: "ankylos",
		brandName: "Ankylos",
		screwdriverDefault: "Hex 1.0 mm (TissueCare)",
		screwdriverAliasRu: "Шестигранник 1.0 мм (Ankylos)",
		torqueFinalScrewNcm: 15,
		torqueMultiUnitBodyNcm: 25,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 25,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Бескомпромиссный конус Морзе 5.7° без позиционера. Эффект холодной сварки: финальная затяжка строго 15 Н·см!",
	},
	astra_tech: {
		brand: "astra_tech",
		brandName: "Astra Tech",
		screwdriverDefault: "Hex 1.25 mm (OsseoSpeed EV)",
		screwdriverAliasRu: "Шестигранник Astra Tech EV (1.25 мм)",
		torqueFinalScrewNcm: 25,
		torqueMultiUnitBodyNcm: 25,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 30,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое самонаправляющееся соединение Conical Seal Design. Затяжка винта 25 Н·см.",
	},
	mis: {
		brand: "mis",
		brandName: "MIS Implants",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)",
		screwdriverAliasRu: "Шестигранник 1.27 мм (MIS / Zimmer)",
		torqueFinalScrewNcm: 30,
		torqueMultiUnitBodyNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 35,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое соединение C1 / V3 и внутренний шестигранник SEVEN. Финальная затяжка 30 Н·см.",
	},
};

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
		id: "dent-tb-sl-01",
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

export function getTorqueSpecsByBrand(brand: ImplantTorqueBrand | string): BrandTorqueSpec {
	const normalized = (brand || "osstem").toLowerCase() as ImplantTorqueBrand;
	return IMPLANT_TORQUE_SPECS[normalized] ?? IMPLANT_TORQUE_SPECS.osstem;
}

export function getRecommendedTorqueNcm(
	brand: ImplantTorqueBrand | string,
	component: ProstheticComponentType,
): number {
	const spec = getTorqueSpecsByBrand(brand);
	switch (component) {
		case "cover_screw":
			return spec.torqueCoverScrewNcm;
		case "healing_abutment":
			return spec.torqueHealingAbutmentNcm;
		case "multi_unit_bridge_screw":
			return spec.torqueMultiUnitBridgeScrewNcm;
		case "multi_unit_straight":
		case "multi_unit_angled":
			return spec.torqueMultiUnitBodyNcm;
		case "ti_base_screw":
		case "custom_abutment_screw":
		case "locator_abutment":
		case "ball_attachment":
			return spec.torqueFinalScrewNcm;
		case "fixture_insertion":
		default:
			return 35;
	}
}

export function getScrewdriverType(brand: ImplantTorqueBrand | string): string {
	return getTorqueSpecsByBrand(brand).screwdriverDefault;
}

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
