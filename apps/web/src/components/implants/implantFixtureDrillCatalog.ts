/**
 * implantFixtureDrillCatalog.ts — Каталог имплантатов (Fixtures), протоколы сверления и расчет стоимости наборов (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts по Мандатам 8b и 8zi.
 */

import { formatKopecksToRub } from "@dental/shared";
import type { ImplantBrand, PlatformType } from "./implantBrandTypes";
import { BRAND_KEY_MAP } from "./implantBrandTypes";
import {
	CANONICAL_IMPLANT_SYSTEMS,
	findImplantSystem,
	resolveNormalizedBrand,
} from "./implantCatalogData";

export interface DrillStep {
	readonly stepNumber: number;
	readonly drillName: string;
	readonly diameterMm: number;
	readonly targetRpm: number;
	readonly maxRpm: number;
	readonly irrigation: "copious_sterile_saline" | "moderate_sterile_saline";
	readonly depthGuide: string;
	readonly isBoneDenseOnly?: boolean;
	readonly isBoneSoftOptional?: boolean;
}

export interface GuidedSleeveSpec {
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly offsetMm: number;
	readonly sleeveArticle: string;
}

export interface ImplantFixture {
	readonly id: string;
	readonly brand: ImplantBrand;
	readonly brandName: string;
	readonly brandCountry: string;
	readonly line: string;
	readonly lineDescription: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformType: PlatformType;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly surfaceTreatment: string;
	readonly surfaceDescription: string;
	readonly articleNumber: string;
	readonly guidedSleeve: GuidedSleeveSpec;
	readonly drillSequence: readonly DrillStep[];
	readonly fixturePriceKopecks: number;
	readonly healingCapPriceKopecks: number;
	readonly transferPriceKopecks: number;
	readonly standardAbutmentPriceKopecks: number;
	readonly guidedSleevePriceKopecks: number;
}

export interface ImplantKitCost {
	readonly fixtureKopecks: number;
	readonly healingCapKopecks: number;
	readonly transferKopecks: number;
	readonly abutmentKopecks: number;
	readonly guidedSleeveKopecks: number;
	readonly totalKitKopecks: number;
	readonly totalRublesFormatted: string;
}

export const BASE_PRICES: Record<ImplantBrand, { fixture: number; cap: number; transfer: number; abutment: number; sleeve: number }> = {
	straumann: { fixture: 3200000, cap: 450000, transfer: 380000, abutment: 850000, sleeve: 250000 },
	nobel_biocare: { fixture: 3500000, cap: 500000, transfer: 420000, abutment: 900000, sleeve: 250000 },
	osstem: { fixture: 1250000, cap: 220000, transfer: 200000, abutment: 450000, sleeve: 180000 },
	dentium: { fixture: 1450000, cap: 250000, transfer: 220000, abutment: 480000, sleeve: 180000 },
	ankylos: { fixture: 3300000, cap: 480000, transfer: 390000, abutment: 870000, sleeve: 250000 },
	astra_tech: { fixture: 3100000, cap: 460000, transfer: 400000, abutment: 880000, sleeve: 250000 },
	mis: { fixture: 1550000, cap: 240000, transfer: 210000, abutment: 460000, sleeve: 190000 },
};

export function buildDrillSequence(sizeDiameter: number, len: number): DrillStep[] {
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
	const systems = CANONICAL_IMPLANT_SYSTEMS || {};

	for (const sys of Object.values(systems)) {
		const brandKey: ImplantBrand = BRAND_KEY_MAP[sys.brandName] ?? (sys.id as ImplantBrand);
		const prices = BASE_PRICES[brandKey] ?? BASE_PRICES.osstem;
		const platformType: PlatformType = sys.connectionType === "conical" ? "conical" : "internal_hex";

		for (const diam of sys.diametersMm) {
			for (const len of sys.lengthsMm) {
				const id = `${brandKey}-${sys.lineName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${diam.toFixed(1)}-${len.toFixed(1)}`;
				const article = `${sys.defaultArticlePrefix || brandKey.toUpperCase().slice(0, 3)}-${Math.round(diam * 10)}${Math.round(len * 10)}`;

				catalog.push({
					id,
					brand: brandKey,
					brandName: sys.brandName,
					brandCountry: sys.countryRu,
					line: sys.lineName,
					lineDescription: sys.connectionDescription,
					diameterMm: diam,
					lengthMm: len,
					platformType,
					platformName: `${sys.brandName} Ø${diam.toFixed(1)} (${platformType})`,
					platformDiameterMm: diam,
					apexDiameterMm: Number((diam * 0.65).toFixed(1)),
					surfaceTreatment: "SLA / Nanostructured bioactive surface",
					surfaceDescription: "Пескоструйная обработка и кислотное травление для ускоренной остеоинтеграции",
					articleNumber: article,
					guidedSleeve: {
						sleeveDiameterMm: diam + 1.2,
						sleeveHeightMm: 5.0,
						offsetMm: 9.0,
						sleeveArticle: `SLV-${article}`,
					},
					drillSequence: buildDrillSequence(diam, len),
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

let _catalogCache: readonly ImplantFixture[] | null = null;

export function getImplantCatalog(): readonly ImplantFixture[] {
	if (!_catalogCache || _catalogCache.length === 0) {
		const fixtures = createFixtures();
		if (fixtures.length > 0) {
			_catalogCache = Object.freeze(fixtures);
		} else {
			return fixtures;
		}
	}
	return _catalogCache;
}

export const IMPLANT_CATALOG: readonly ImplantFixture[] = new Proxy([] as ImplantFixture[], {
	get(_target, prop, receiver) {
		const fixtures = getImplantCatalog();
		return Reflect.get(fixtures, prop, receiver);
	},
	has(_target, prop) {
		return Reflect.has(getImplantCatalog(), prop);
	},
	getOwnPropertyDescriptor(_target, prop) {
		return Reflect.getOwnPropertyDescriptor(getImplantCatalog(), prop);
	},
	ownKeys(_target) {
		return Reflect.ownKeys(getImplantCatalog());
	},
});

export function getFixturesByBrand(brand: ImplantBrand): ImplantFixture[] {
	return IMPLANT_CATALOG.filter((f) => f.brand === brand);
}

export function getLinesByBrand(brand: ImplantBrand): string[] {
	const fixtures = getFixturesByBrand(brand);
	return Array.from(new Set(fixtures.map((f) => f.line)));
}

export function getAvailableDiameters(brandOrKey: string, line?: string): readonly number[] {
	const brand = BRAND_KEY_MAP[brandOrKey] || resolveNormalizedBrand(brandOrKey);
	const fixtures = IMPLANT_CATALOG.filter(
		(f) => f.brand === brand && (!line || f.line === line),
	);
	if (fixtures.length > 0) {
		return Array.from(new Set(fixtures.map((f) => f.diameterMm))).sort((a, b) => a - b);
	}
	return findImplantSystem(brandOrKey).standardDiametersMm;
}

export function getAvailableLengths(brandOrKey: string, line?: string, diameter?: number): readonly number[] {
	const brand = BRAND_KEY_MAP[brandOrKey] || resolveNormalizedBrand(brandOrKey);
	const fixtures = IMPLANT_CATALOG.filter(
		(f) =>
			f.brand === brand &&
			(!line || f.line === line) &&
			(diameter === undefined || f.diameterMm === diameter),
	);
	if (fixtures.length > 0) {
		return Array.from(new Set(fixtures.map((f) => f.lengthMm))).sort((a, b) => a - b);
	}
	return findImplantSystem(brandOrKey).standardLengthsMm;
}

export function findFixture(id: string): ImplantFixture | undefined {
	return IMPLANT_CATALOG.find((f) => f.id === id);
}

export function findFixtureBySpecs(
	brand: ImplantBrand,
	line: string,
	diameterMm: number,
	lengthMm: number,
): ImplantFixture | undefined {
	return IMPLANT_CATALOG.find(
		(f) =>
			f.brand === brand &&
			f.line === line &&
			Math.abs(f.diameterMm - diameterMm) < 0.05 &&
			Math.abs(f.lengthMm - lengthMm) < 0.05,
	);
}

export function calculateKitPriceKopecks(
	fixture: ImplantFixture,
	options?: {
		includeHealingCap?: boolean;
		includeTransfer?: boolean;
		includeAbutment?: boolean;
		includeGuidedSleeve?: boolean;
	},
): ImplantKitCost {
	const includeHealing = options?.includeHealingCap ?? true;
	const includeTransfer = options?.includeTransfer ?? true;
	const includeAbutment = options?.includeAbutment ?? true;
	const includeSleeve = options?.includeGuidedSleeve ?? true;

	const fixtureKopecks = fixture.fixturePriceKopecks;
	const healingCapKopecks = includeHealing ? fixture.healingCapPriceKopecks : 0;
	const transferKopecks = includeTransfer ? fixture.transferPriceKopecks : 0;
	const abutmentKopecks = includeAbutment ? fixture.standardAbutmentPriceKopecks : 0;
	const guidedSleeveKopecks = includeSleeve ? fixture.guidedSleevePriceKopecks : 0;

	const totalKitKopecks =
		fixtureKopecks + healingCapKopecks + transferKopecks + abutmentKopecks + guidedSleeveKopecks;

	return {
		fixtureKopecks,
		healingCapKopecks,
		transferKopecks,
		abutmentKopecks,
		guidedSleeveKopecks,
		totalKitKopecks,
		totalRublesFormatted: formatKopecksToRub(totalKitKopecks),
	};
}
