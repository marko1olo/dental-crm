/**
 * canonicalCatalogQueries.ts — Поиск, фильтрация и расчет глубины сверления (Мандат 8b).
 */

import type {
	CanonicalImplantBrandKey,
	CanonicalImplantFixture,
	GuidedSurgeryKitSpec,
	ImplantConnectionHexType,
	SleeveDrillCalculation,
} from "./canonicalCatalogTypes";
import { CANONICAL_IMPLANT_CATALOG } from "./canonicalCatalogBuilder";
import { SURGICAL_KITS } from "./canonicalSurgicalKits";

export function getCanonicalFixturesByBrand(brandKey: CanonicalImplantBrandKey): CanonicalImplantFixture[] {
	return CANONICAL_IMPLANT_CATALOG.filter((f) => f.brandKey === brandKey);
}

export function getLinesForBrand(brandKey: CanonicalImplantBrandKey): string[] {
	const list = getCanonicalFixturesByBrand(brandKey);
	return Array.from(new Set(list.map((f) => f.lineName)));
}

export function findCanonicalFixture(
	brandKey: CanonicalImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
	lineName?: string,
): CanonicalImplantFixture | undefined {
	return CANONICAL_IMPLANT_CATALOG.find(
		(f) =>
			f.brandKey === brandKey &&
			(!lineName || f.lineName.toLowerCase().includes(lineName.toLowerCase())) &&
			Math.abs(f.diameterMm - diameterMm) <= 0.15 &&
			Math.abs(f.lengthMm - lengthMm) <= 0.3,
	);
}

export function filterCanonicalCatalog(criteria: {
	readonly brandKey?: CanonicalImplantBrandKey;
	readonly minDiameter?: number;
	readonly maxDiameter?: number;
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly hexType?: ImplantConnectionHexType;
	readonly isTapered?: boolean;
}): CanonicalImplantFixture[] {
	return CANONICAL_IMPLANT_CATALOG.filter((f) => {
		if (criteria.brandKey && f.brandKey !== criteria.brandKey) return false;
		if (criteria.minDiameter && f.diameterMm < criteria.minDiameter - 0.05) return false;
		if (criteria.maxDiameter && f.diameterMm > criteria.maxDiameter + 0.05) return false;
		if (criteria.minLength && f.lengthMm < criteria.minLength - 0.05) return false;
		if (criteria.maxLength && f.lengthMm > criteria.maxLength + 0.05) return false;
		if (criteria.hexType && f.hexType !== criteria.hexType) return false;
		if (criteria.isTapered !== undefined && f.isTapered !== criteria.isTapered) return false;
		return true;
	});
}

export function calculateDrillDepth(
	implantLengthMm: number,
	sleeveOffsetMm = 9.0,
	kit?: GuidedSurgeryKitSpec,
): SleeveDrillCalculation {
	const kitSpec = kit ?? SURGICAL_KITS.osstem_oneguide!;
	const offset = sleeveOffsetMm > 0 ? sleeveOffsetMm : kitSpec.defaultOffsetMm;
	const drillTotal = Number((implantLengthMm + offset).toFixed(1));

	return {
		implantLengthMm,
		sleeveOffsetMm: offset,
		drillTotalLengthMm: drillTotal,
		kitName: kitSpec.kitName,
		sleeveDiameterMm: kitSpec.sleeveDiameterMm,
		sleeveHeightMm: kitSpec.sleeveHeightMm,
		drillStopSummaryRu: `Фреза L=${drillTotal} мм (имплантат ${implantLengthMm} мм + офсет втулки ${offset} мм)`,
	};
}
