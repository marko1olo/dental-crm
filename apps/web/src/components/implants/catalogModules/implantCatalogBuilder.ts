/**
 * implantCatalogBuilder.ts — Сборщик каталога имплантатов из канонических спецификаций DICOM.
 */

import { CANONICAL_IMPLANT_SYSTEMS } from "../../dicom/implantCatalog";
import type { ImplantFixture, PlatformType, DrillStep } from "./implantCatalogTypes";
import { BRAND_KEY_MAP, BASE_PRICES } from "./implantCatalogBrands";

function buildDrillSequence(sizeDiameter: number, len: number): DrillStep[] {
	const drillSequence: DrillStep[] = [
		{
			stepNumber: 1,
			drillName: "Пилотное сверло Ø2.0",
			diameterMm: 2.0,
			targetRpm: 800,
			maxRpm: 1200,
			irrigation: "copious_sterile_saline",
			depthGuide: `${len} мм`,
		},
		{
			stepNumber: 2,
			drillName: `Формирующее сверло Ø${(sizeDiameter - 0.5).toFixed(1)}`,
			diameterMm: Math.max(2.5, sizeDiameter - 0.5),
			targetRpm: 600,
			maxRpm: 800,
			irrigation: "copious_sterile_saline",
			depthGuide: `${len} мм`,
		},
	];

	if (sizeDiameter >= 4.0) {
		drillSequence.push({
			stepNumber: 3,
			drillName: `Финальное кортикальное сверло Ø${sizeDiameter.toFixed(1)}`,
			diameterMm: sizeDiameter,
			targetRpm: 400,
			maxRpm: 500,
			irrigation: "copious_sterile_saline",
			depthGuide: `${len} мм`,
			isBoneDenseOnly: true,
		});
	}

	return drillSequence;
}

export function createFixtures(): ImplantFixture[] {
	const catalog: ImplantFixture[] = [];

	for (const sys of CANONICAL_IMPLANT_SYSTEMS) {
		const brandKey = BRAND_KEY_MAP[sys.brand];
		if (!brandKey) continue;

		const prices = BASE_PRICES[brandKey];
		const isConical = sys.primaryStabilityDesign.toLowerCase().includes("конич");
		const platformType: PlatformType = isConical ? "conical" : "internal_hex";

		for (const size of sys.sizes) {
			for (const len of size.lengthsMm) {
				const id = `${brandKey}-${sys.line.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${size.diameterMm.toFixed(1)}-${len.toFixed(1)}`;
				const article = `${brandKey.toUpperCase().slice(0, 3)}-${Math.round(size.diameterMm * 10)}${Math.round(len * 10)}`;

				catalog.push({
					id,
					brand: brandKey,
					brandName: sys.brand,
					brandCountry: sys.country,
					line: sys.line,
					lineDescription: sys.descriptionRu,
					diameterMm: size.diameterMm,
					lengthMm: len,
					platformType,
					platformName: size.platform.labelRu,
					platformDiameterMm: size.diameterMm,
					apexDiameterMm: Number((size.diameterMm * 0.65).toFixed(1)),
					surfaceTreatment: "SLA / Nanostructured bioactive surface",
					surfaceDescription: "Пескоструйная обработка и кислотное травление для ускоренной остеоинтеграции",
					articleNumber: article,
					guidedSleeve: {
						sleeveDiameterMm: sys.sleeveDiameterMm,
						sleeveHeightMm: sys.sleeveHeightMm,
						offsetMm: sys.drillOffsetDefaultMm,
						sleeveArticle: `SLV-${article}`,
					},
					drillSequence: buildDrillSequence(size.diameterMm, len),
					fixturePriceKopecks: prices.fixture,
					healingCapPriceKopecks: prices.cap,
					transferPriceKopecks: prices.transfer,
					standardAbutmentPriceKopecks: prices.abutment,
					guidedSleevePriceKopecks: prices.sleeve,
				});
			}
		}
	}

	return catalog;
}

export const IMPLANT_CATALOG: readonly ImplantFixture[] = Object.freeze(createFixtures());
