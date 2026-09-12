/**
 * DENTAL IMPLANT TORQUE SPECIFICATIONS & PROSTHETIC ABUTMENT CATALOG
 *
 * Provides factory-recommended torque values (25-35 N·cm), screwdriver driver standards,
 * and comprehensive prosthetic component metadata across world-leading implant brands:
 * 1. Straumann (CrossFit®, TorcFit™, SynOcta®)
 * 2. Nobel Biocare (Conical Connection NP/RP/WP, Tri-Channel)
 * 3. Osstem (11° Morse Taper Mini/Regular)
 * 4. Dentium (SuperLine / SimpleLine II)
 * 5. Astra Tech (OsseoSpeed EV Conical Seal Design)
 * 6. MegaGen (AnyRidge / AnyOne)
 *
 * All pricing is kopeck-exact (1 RUB = 100 kopecks).
 */

export type ImplantTorqueBrand =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "astra_tech"
	| "megagen";

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
	readonly screwdriverAsc?: string;
	readonly torqueFinalScrewNcm: number;
	readonly torqueNarrowScrewNcm?: number;
	readonly torqueMultiUnitAbutmentNcm: number;
	readonly torqueMultiUnitBridgeScrewNcm: number;
	readonly torqueLocatorNcm: number;
	readonly torqueHealingCapNcm: number;
	readonly torqueLabScrewNcm: number;
	readonly connectionSafetyNotes: string;
}

// ─── TORQUE SPECIFICATIONS BY BRAND ──────────────────────────────────────────

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
		connectionSafetyNotes:
			"CrossFit® и TorcFit™ затягивать динамометрическим ключом на 35 N·cm. Винты мостовидных протезов Multi-Unit строго 15 N·cm во избежание деформации конуса.",
	},
	nobel_biocare: {
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		countryRu: "Швейцария / Швеция",
		screwdriverDefault: "Unigrip™",
		screwdriverAsc: "Omnigrip™ (Angled Screw Channel up to 25°)",
		torqueFinalScrewNcm: 35,
		torqueNarrowScrewNcm: 15,
		torqueMultiUnitAbutmentNcm: 35,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 35,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes:
			"Conical Connection NP/RP/WP затягивать 35 N·cm отверткой Unigrip. Для шахты ASC под углом до 25° использовать только оригинальную сферическую отвертку Omnigrip.",
	},
	osstem: {
		brand: "osstem",
		brandName: "Osstem",
		countryRu: "Южная Корея",
		screwdriverDefault: "Hex 1.2 mm / Torx",
		screwdriverAsc: "Osstem Angled Channel Driver",
		torqueFinalScrewNcm: 30,
		torqueNarrowScrewNcm: 20,
		torqueMultiUnitAbutmentNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 30,
		torqueHealingCapNcm: 10,
		torqueLabScrewNcm: 10,
		connectionSafetyNotes:
			"TS III Regular platform: 30 N·cm. Платформа Mini (Ø3.5): строго не более 20 N·cm во избежание срыва резьбы шейки имплантата.",
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
		connectionSafetyNotes:
			"SuperLine и SimpleLine II: винт абатмента фиксируется моментом 30 N·cm шестигранником 1.27 мм. Винты протезных колпачков 15 N·cm.",
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
		connectionSafetyNotes:
			"OsseoSpeed EV Conical Seal: стандартная затяжка винта 25 N·cm (кроме платформы 3.0 XS = 15 N·cm). Превышение 25 N·cm может вызвать заклинивание конуса.",
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
		connectionSafetyNotes:
			"AnyRidge 5° Morse Taper: клинический винт 35 N·cm. Обеспечивает cold-welding эффект конусного соединения с защитой от микроподвижности.",
	},
};

// ─── PROSTHETIC TI-BASE & ABUTMENT CATALOG ───────────────────────────────────

export const TI_BASE_CATALOG: readonly TiBaseCatalogItem[] = [
	// STRAUMANN
	{
		id: "st-tb-nc-01",
		brand: "straumann",
		brandName: "Straumann",
		lineName: "Variobase for Crown NC (Narrow CrossFit)",
		article: "022.0104",
		nameRu: "Variobase NC Ø3.3 десна 1.0 мм / шахта 5.5 мм (индексированный)",
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
		lineName: "Variobase for Crown RC (Regular CrossFit)",
		article: "022.0106",
		nameRu: "Variobase RC Ø4.1/4.8 десна 1.5 мм / шахта 5.5 мм (индексированный)",
		platformName: "RC (Regular CrossFit)",
		platformDiameterMm: 4.1,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 35,
		screwdriverType: "SCS / Angled SCS",
		priceKopecks: 680000,
	},
	{
		id: "st-tb-rc-03",
		brand: "straumann",
		brandName: "Straumann",
		lineName: "Variobase for Crown RC Deep Cuff",
		article: "022.0108",
		nameRu: "Variobase RC Ø4.1 десна 2.5 мм / шахта 5.5 мм (индексированный)",
		platformName: "RC (Regular CrossFit)",
		platformDiameterMm: 4.1,
		gingivalCuffHeightMm: 2.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 35,
		screwdriverType: "SCS",
		priceKopecks: 720000,
	},
	{
		id: "st-tb-blx-04",
		brand: "straumann",
		brandName: "Straumann",
		lineName: "BLX Variobase TorcFit",
		article: "062.4102",
		nameRu: "BLX Variobase RB/WB Ø3.75-4.5 десна 1.5 мм (индексированный)",
		platformName: "TorcFit RB/WB",
		platformDiameterMm: 4.0,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 35,
		screwdriverType: "TorcFit Driver",
		priceKopecks: 750000,
	},

	// NOBEL BIOCARE
	{
		id: "nb-tb-np-01",
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		lineName: "NobelProcera ASC Abutment NP",
		article: "38841",
		nameRu: "ASC Ti-Base Conical Connection NP Ø3.5 десна 1.5 мм (шахта до 25°)",
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
		lineName: "NobelProcera ASC Abutment RP",
		article: "38842",
		nameRu: "ASC Ti-Base Conical Connection RP Ø4.3/5.0 десна 1.5 мм (шахта до 25°)",
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
		id: "nb-tb-rp-03",
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		lineName: "NobelProcera ASC Abutment RP High Cuff",
		article: "38843",
		nameRu: "ASC Ti-Base Conical Connection RP Ø4.3 десна 3.0 мм (шахта до 25°)",
		platformName: "CC RP (4.3 mm)",
		platformDiameterMm: 4.3,
		gingivalCuffHeightMm: 3.0,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 35,
		screwdriverType: "Omnigrip™",
		priceKopecks: 820000,
	},

	// OSSTEM
	{
		id: "os-tb-mini-01",
		brand: "osstem",
		brandName: "Osstem",
		lineName: "TS Custom Ti-Base Mini",
		article: "TBA3509M",
		nameRu: "Ti-Base TS Mini Ø3.5 десна 0.9 мм / шахта 5.5 мм (Hex)",
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
		nameRu: "Ti-Base TS Regular Ø4.5 десна 1.5 мм / шахта 5.5 мм (Hex)",
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
		id: "os-tb-reg-03",
		brand: "osstem",
		brandName: "Osstem",
		lineName: "TS Custom Ti-Base Regular High Cuff",
		article: "TBA4525R",
		nameRu: "Ti-Base TS Regular Ø4.5 десна 2.5 мм / шахта 5.5 мм (Hex)",
		platformName: "Regular (4.0/4.5 mm)",
		platformDiameterMm: 4.5,
		gingivalCuffHeightMm: 2.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 30,
		screwdriverType: "Hex 1.2 mm",
		priceKopecks: 410000,
	},

	// DENTIUM
	{
		id: "dt-tb-sl-01",
		brand: "dentium",
		brandName: "Dentium",
		lineName: "SuperLine Ti-Base Link",
		article: "TLH4015",
		nameRu: "Ti-Base Link SuperLine Ø4.0 десна 1.5 мм / шахта 5.5 мм (Hex)",
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
		id: "dt-tb-sl-02",
		brand: "dentium",
		brandName: "Dentium",
		lineName: "SuperLine Ti-Base Link Deep",
		article: "TLH4525",
		nameRu: "Ti-Base Link SuperLine Ø4.5 десна 2.5 мм / шахта 5.5 мм (Hex)",
		platformName: "SuperLine Conical Hex",
		platformDiameterMm: 4.5,
		gingivalCuffHeightMm: 2.5,
		chimneyPostHeightMm: 5.5,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 30,
		screwdriverType: "Hex 1.27 mm",
		priceKopecks: 390000,
	},

	// ASTRA TECH
	{
		id: "at-tb-ev-01",
		brand: "astra_tech",
		brandName: "Astra Tech",
		lineName: "Ti-Base EV Aqua 3.6",
		article: "25821",
		nameRu: "Ti-Base EV Aqua Ø3.6 десна 1.5 мм (индексированный Conical)",
		platformName: "EV Aqua 3.6",
		platformDiameterMm: 3.6,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 25,
		screwdriverType: "Hex EV (1.26 mm)",
		priceKopecks: 710000,
	},
	{
		id: "at-tb-ev-02",
		brand: "astra_tech",
		brandName: "Astra Tech",
		lineName: "Ti-Base EV Lilac 4.2",
		article: "25823",
		nameRu: "Ti-Base EV Lilac Ø4.2 десна 1.5 мм (индексированный Conical)",
		platformName: "EV Lilac 4.2",
		platformDiameterMm: 4.2,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 25,
		recommendedTorqueNcm: 25,
		screwdriverType: "Hex EV (1.26 mm)",
		priceKopecks: 710000,
	},

	// MEGAGEN
	{
		id: "mg-tb-ar-01",
		brand: "megagen",
		brandName: "MegaGen",
		lineName: "AnyRidge Ti-Base Link",
		article: "ARTB4015",
		nameRu: "AnyRidge Ti-Base Ø4.0 десна 1.5 мм / шахта 5.0 мм (5° Conical)",
		platformName: "AnyRidge Regular",
		platformDiameterMm: 4.0,
		gingivalCuffHeightMm: 1.5,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 35,
		screwdriverType: "Meg-Torq / Hex 1.2 mm",
		priceKopecks: 420000,
	},
	{
		id: "mg-tb-ar-02",
		brand: "megagen",
		brandName: "MegaGen",
		lineName: "AnyRidge Ti-Base Link Wide",
		article: "ARTB5025",
		nameRu: "AnyRidge Ti-Base Ø5.0 десна 2.5 мм / шахта 5.0 мм (5° Conical)",
		platformName: "AnyRidge Wide",
		platformDiameterMm: 5.0,
		gingivalCuffHeightMm: 2.5,
		chimneyPostHeightMm: 5.0,
		engagement: "engaging",
		maxAscAngleDeg: 20,
		recommendedTorqueNcm: 35,
		screwdriverType: "Meg-Torq / Hex 1.2 mm",
		priceKopecks: 450000,
	},
];

// ─── QUERY HELPERS ───────────────────────────────────────────────────────────

/**
 * Retrieves brand torque specifications.
 */
export function getTorqueSpecsByBrand(brand: ImplantTorqueBrand): BrandTorqueSpec {
	return IMPLANT_TORQUE_SPECS[brand] ?? IMPLANT_TORQUE_SPECS.straumann;
}

/**
 * Calculates recommended torque in N·cm for a specific component and platform.
 */
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

/**
 * Determines screwdriver type based on brand and whether angled screw channel (ASC) is enabled.
 */
export function getScrewdriverType(brand: ImplantTorqueBrand, isAngledAsc?: boolean): string {
	const spec = getTorqueSpecsByBrand(brand);
	if (isAngledAsc && spec.screwdriverAsc) {
		return spec.screwdriverAsc;
	}
	return spec.screwdriverDefault;
}

/**
 * Finds matching Ti-Base items by brand and platform diameter with tolerance.
 */
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

/**
 * Looks up Ti-Base by catalog article number.
 */
export function findTiBaseByArticle(article: string): TiBaseCatalogItem | undefined {
	return TI_BASE_CATALOG.find((item) => item.article.toLowerCase() === article.toLowerCase());
}
