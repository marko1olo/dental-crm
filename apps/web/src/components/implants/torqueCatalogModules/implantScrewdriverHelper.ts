/**
 * implantScrewdriverHelper.ts — Хелперы выбора торка, отверток и Ti-Base по платформе и типу компонента.
 */
import type {
	ImplantTorqueBrand,
	BrandTorqueSpec,
	ProstheticComponentType,
	TiBaseCatalogItem,
} from "./implantTorqueTypes";
import { IMPLANT_TORQUE_SPECS } from "./brandTorqueSpecs";
import { TI_BASE_CATALOG } from "./tiBaseCatalogData";

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
