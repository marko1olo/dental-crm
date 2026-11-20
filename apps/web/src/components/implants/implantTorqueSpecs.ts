/**
 * implantTorqueSpecs.ts — Спецификации торка, допустимые пределы и отвертки для систем имплантации (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts по Мандатам 8b и 8zi.
 */

import type { ImplantTorqueBrand } from "./implantBrandTypes";
import { findImplantSystem } from "./implantCatalogData";

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

export function getTorqueSpecsByBrand(brand: ImplantTorqueBrand | string): BrandTorqueSpec {
	const normalized = (brand || "osstem").toLowerCase() as ImplantTorqueBrand;
	return IMPLANT_TORQUE_SPECS[normalized] ?? IMPLANT_TORQUE_SPECS.osstem;
}

export function getRecommendedTorqueNcm(
	brand: ImplantTorqueBrand | string,
	component: ProstheticComponentType | "insertion" | "final_screw" | "cover_screw" = "insertion",
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
		case "final_screw":
		case "ti_base_screw":
		case "custom_abutment_screw":
		case "locator_abutment":
		case "ball_attachment":
			return spec.torqueFinalScrewNcm;
		case "fixture_insertion":
		case "insertion":
		default:
			return findImplantSystem(brand).defaultTorqueNcm;
	}
}

export function getScrewdriverType(brand: string): string {
	return getTorqueSpecsByBrand(brand).screwdriverDefault;
}
