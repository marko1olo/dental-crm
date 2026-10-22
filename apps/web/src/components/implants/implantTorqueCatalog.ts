/**
 * implantTorqueCatalog.ts — Единый канонический SSOT каталог спецификаций торка, отверток и Ti-Base (Мандаты 8e, 8n).
 * Консолидирует спецификации ведущих имплантационных систем без дублирующих файлов.
 */

export type ImplantTorqueBrand =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "ankylos"
	| "astra_tech"
	| "megagen"
	| "mis";

export type ProstheticComponentType =
	| "final_prosthetic_screw"
	| "lab_tryin_screw"
	| "healing_abutment"
	| "straight_ti_base"
	| "angled_asc_ti_base"
	| "multi_unit_abutment"
	| "multi_unit_bridge_screw"
	| "locator_ball_attachment"
	| "custom_titanium_abutment";

export type ConnectionEngagement = "engaging" | "non_engaging";

export interface TiBaseCatalogItem {
	readonly id: string;
	readonly brand: ImplantTorqueBrand;
	readonly brandName: string;
	readonly lineName: string;
	readonly article: string;
	readonly nameRu: string;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly gingivalCuffHeightMm: number;
	readonly chimneyPostHeightMm: number;
	readonly engagement: ConnectionEngagement;
	readonly maxAscAngleDeg: number;
	readonly recommendedTorqueNcm: number;
	readonly screwdriverType: string;
	readonly priceKopecks: number;
}

export interface BrandTorqueSpec {
	readonly brand: ImplantTorqueBrand;
	readonly brandName: string;
	readonly countryRu: string;
	readonly screwdriverDefault: string;
	readonly screwdriverAsc?: string | undefined;
	readonly torqueFinalScrewNcm: number;
	readonly torqueNarrowScrewNcm?: number | undefined;
	readonly torqueMultiUnitAbutmentNcm: number;
	readonly torqueMultiUnitBridgeScrewNcm: number;
	readonly torqueLocatorNcm: number;
	readonly torqueHealingCapNcm: number;
	readonly torqueLabScrewNcm: number;
	readonly connectionSafetyNotes: string;
}

/**
 * Канонический реестр заводских спецификаций торка и отверток ведущих имплантационных систем (SSOT).
 */
export const IMPLANT_TORQUE_SPECS: Record<ImplantTorqueBrand, BrandTorqueSpec> = {
	straumann: {
		brand: "straumann",
		brandName: "Straumann",
		countryRu: "Швейцария",
		screwdriverDefault: "SCS (SynOcta Screwdriver)",
		screwdriverAsc: "TorcFit Driver / Angled SCS",
		torqueFinalScrewNcm: 35,
		torqueNarrowScrewNcm: 35,
		torqueMultiUnitAbutmentNcm: 35,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 35,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 15,
		connectionSafetyNotes: "CrossFit® / TorcFit™ затягивать 35 Н·см. Винты Multi-Unit строго 15 Н·см.",
	},
	nobel_biocare: {
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		countryRu: "Швейцария / Швеция",
		screwdriverDefault: "Unigrip™",
		screwdriverAsc: "Omnigrip™ (ASC до 25°)",
		torqueFinalScrewNcm: 35,
		torqueNarrowScrewNcm: 15,
		torqueMultiUnitAbutmentNcm: 35,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 35,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes: "Conical Connection затягивать 35 Н·см отверткой Unigrip.",
	},
	osstem: {
		brand: "osstem",
		brandName: "Osstem",
		countryRu: "Южная Корея",
		screwdriverDefault: "Hex 1.2 mm / Torx",
		screwdriverAsc: "Osstem Angled Driver",
		torqueFinalScrewNcm: 30,
		torqueNarrowScrewNcm: 20,
		torqueMultiUnitAbutmentNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 30,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes: "TS III Regular: 30 Н·см. Платформа Mini (Ø3.5): строго 20 Н·см.",
	},
	dentium: {
		brand: "dentium",
		brandName: "Dentium",
		countryRu: "Южная Корея",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)",
		screwdriverAsc: "Dentium ASC Ball Hex Driver",
		torqueFinalScrewNcm: 30,
		torqueNarrowScrewNcm: 30,
		torqueMultiUnitAbutmentNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 30,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes: "SuperLine / SimpleLine II: винт абатмента 30 Н·см шестигранником 1.27 мм.",
	},
	ankylos: {
		brand: "ankylos",
		brandName: "Ankylos (C/X)",
		countryRu: "Германия (Dentsply Sirona)",
		screwdriverDefault: "Hex 1.0 mm (Ankylos Screwdriver)",
		screwdriverAsc: "Ankylos Smart Driver",
		torqueFinalScrewNcm: 15,
		torqueNarrowScrewNcm: 15,
		torqueMultiUnitAbutmentNcm: 25,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 25,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes:
			"TissueCare Connection (конус Морзе 5.7°): стандартная затяжка винта 15 Н·см отверткой 1.0 мм. Эффект холодной сварки обеспечивает бактериальную герметичность.",
	},
	astra_tech: {
		brand: "astra_tech",
		brandName: "Astra Tech (EV)",
		countryRu: "Швеция",
		screwdriverDefault: "Hex EV Driver (1.26 mm)",
		screwdriverAsc: "Astra Tech Angled Smart Driver",
		torqueFinalScrewNcm: 25,
		torqueNarrowScrewNcm: 15,
		torqueMultiUnitAbutmentNcm: 25,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 25,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes: "OsseoSpeed EV Conical Seal: стандартная затяжка винта 25 Н·см.",
	},
	megagen: {
		brand: "megagen",
		brandName: "MegaGen",
		countryRu: "Южная Корея",
		screwdriverDefault: "Meg-Torq / Hex 1.2 mm",
		screwdriverAsc: "MegaGen ASC Ball Driver",
		torqueFinalScrewNcm: 35,
		torqueNarrowScrewNcm: 25,
		torqueMultiUnitAbutmentNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 35,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes: "AnyRidge 5° Morse Taper: клинический винт 35 Н·см.",
	},
	mis: {
		brand: "mis",
		brandName: "MIS Implants",
		countryRu: "Израиль",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)",
		screwdriverAsc: "MIS Angled Screw Channel Driver",
		torqueFinalScrewNcm: 30,
		torqueNarrowScrewNcm: 25,
		torqueMultiUnitAbutmentNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 30,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes: "MIS SEVEN, C1, V3: момент затяжки клинического винта 30 Н·см.",
	},
};

/**
 * Каталог титановых оснований (Ti-Base) ведущих брендов.
 */
export const TI_BASE_CATALOG: readonly TiBaseCatalogItem[] = [
	{
		id: "st-tb-nc-01",
		brand: "straumann",
		brandName: "Straumann",
		lineName: "Variobase NC",
		article: "022.0104",
		nameRu: "Variobase NC Ø3.3 десна 1.0 мм / шахта 5.5 мм",
		platformName: "NC (Narrow CrossFit)",
		platformDiameterMm: 3.3,
		gingivalCuffHeightMm: 1.0,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 35,
		screwdriverType: "SCS",
		priceKopecks: 680000,
	},
	{
		id: "st-tb-rc-02",
		brand: "straumann",
		brandName: "Straumann",
		lineName: "Variobase RC",
		article: "022.0106",
		nameRu: "Variobase RC Ø4.1/4.8 десна 1.5 мм / шахта 5.5 мм",
		platformName: "RC (Regular CrossFit)",
		platformDiameterMm: 4.1,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 35,
		screwdriverType: "SCS",
		priceKopecks: 680000,
	},
	{
		id: "nb-tb-np-01",
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		lineName: "NobelProcera ASC NP",
		article: "38841",
		nameRu: "ASC Ti-Base CC NP Ø3.5 десна 1.5 мм",
		platformName: "CC NP (3.5 mm)",
		platformDiameterMm: 3.5,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 35,
		screwdriverType: "Omnigrip™",
		priceKopecks: 790000,
	},
	{
		id: "nb-tb-rp-02",
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		lineName: "NobelProcera ASC RP",
		article: "38842",
		nameRu: "ASC Ti-Base CC RP Ø4.3/5.0 десна 1.5 мм",
		platformName: "CC RP (4.3 mm)",
		platformDiameterMm: 4.3,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 35,
		screwdriverType: "Omnigrip™",
		priceKopecks: 790000,
	},
	{
		id: "os-tb-mini-01",
		brand: "osstem",
		brandName: "Osstem",
		lineName: "TS Custom Ti-Base Mini",
		article: "TBA3509M",
		nameRu: "Ti-Base TS Mini Ø3.5 десна 0.9 мм / шахта 5.5 мм",
		platformName: "Mini (3.5 mm)",
		platformDiameterMm: 3.5,
		gingivalCuffHeightMm: 0.9,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 20,
		screwdriverType: "Hex 1.2 mm",
		priceKopecks: 380000,
	},
	{
		id: "os-tb-reg-02",
		brand: "osstem",
		brandName: "Osstem",
		lineName: "TS Custom Ti-Base Regular",
		article: "TBA4515R",
		nameRu: "Ti-Base TS Regular Ø4.5 десна 1.5 мм / шахта 5.5 мм",
		platformName: "Regular (4.0/4.5 mm)",
		platformDiameterMm: 4.5,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 30,
		screwdriverType: "Hex 1.2 mm",
		priceKopecks: 380000,
	},
	{
		id: "dt-tb-sl-01",
		brand: "dentium",
		brandName: "Dentium",
		lineName: "SuperLine Ti-Base Link",
		article: "TLH4015",
		nameRu: "Ti-Base Link SuperLine Ø4.0 десна 1.5 мм",
		platformName: "SuperLine Conical Hex",
		platformDiameterMm: 4.0,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 30,
		screwdriverType: "Hex 1.27 mm",
		priceKopecks: 360000,
	},
	{
		id: "ak-tb-cx-01",
		brand: "ankylos",
		brandName: "Ankylos",
		lineName: "Ankylos Ti-Base C/X",
		article: "31022510",
		nameRu: "Ti-Base Ankylos C/X десна 1.5 мм",
		platformName: "TissueCare C/X",
		platformDiameterMm: 3.5,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 15,
		screwdriverType: "Hex 1.0 mm",
		priceKopecks: 720000,
	},
];

export function getTorqueSpecsByBrand(brand: ImplantTorqueBrand): BrandTorqueSpec {
	return IMPLANT_TORQUE_SPECS[brand] ?? IMPLANT_TORQUE_SPECS.straumann;
}

export function getRecommendedTorqueNcm(
	brand: ImplantTorqueBrand,
	componentType: ProstheticComponentType,
	platformDiameterMm?: number,
): number {
	const spec = getTorqueSpecsByBrand(brand);

	switch (componentType) {
		case "final_prosthetic_screw":
		case "straight_ti_base":
		case "angled_asc_ti_base":
		case "custom_titanium_abutment": {
			if (platformDiameterMm && platformDiameterMm <= 3.5 && spec.torqueNarrowScrewNcm) {
				return spec.torqueNarrowScrewNcm;
			}
			return spec.torqueFinalScrewNcm;
		}
		case "multi_unit_abutment":
			return spec.torqueMultiUnitAbutmentNcm;
		case "multi_unit_bridge_screw":
			return spec.torqueMultiUnitBridgeScrewNcm;
		case "locator_ball_attachment":
			return spec.torqueLocatorNcm;
		case "healing_abutment":
			return spec.torqueHealingCapNcm;
		case "lab_tryin_screw":
			return spec.torqueLabScrewNcm;
		default:
			return spec.torqueFinalScrewNcm;
	}
}

export function getScrewdriverType(brand: ImplantTorqueBrand, isAngledAsc?: boolean): string {
	const spec = getTorqueSpecsByBrand(brand);
	if (isAngledAsc && spec.screwdriverAsc) {
		return spec.screwdriverAsc;
	}
	return spec.screwdriverDefault;
}

export function getTiBasesByBrandAndPlatform(
	brand: ImplantTorqueBrand,
	platformDiameterMm: number,
): readonly TiBaseCatalogItem[] {
	const brandItems = TI_BASE_CATALOG.filter((item) => item.brand === brand);
	const matched = brandItems.filter(
		(item) => Math.abs(item.platformDiameterMm - platformDiameterMm) <= 0.45,
	);
	return matched.length > 0 ? matched : brandItems;
}

export function findTiBaseByArticle(article: string): TiBaseCatalogItem | undefined {
	return TI_BASE_CATALOG.find((item) => item.article.toLowerCase() === article.toLowerCase());
}
