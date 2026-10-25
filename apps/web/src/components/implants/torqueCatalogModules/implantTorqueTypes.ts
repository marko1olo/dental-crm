/**
 * implantTorqueTypes.ts — Базовые типы данных каталога спецификаций торка, отверток и Ti-Base (Мандаты 8e, 8n).
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
