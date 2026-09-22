/**
 * apps/web/src/components/implants/implantCatalog.ts
 *
 * DENTAL IMPLANT SYSTEM LIBRARY & SURGICAL SPECIFICATIONS
 * Canonical delegate backed by dicom/implantCatalog.ts (Mandates 8s, 8e, 8n).
 *
 * Consolidates 1012-line duplicate catalog into a sleek, modular SSOT engine.
 * Supported Systems: Nobel Biocare, Straumann, Osstem, Dentium, Astra Tech.
 * All pricing is stored in kopeck-exact integers (1 RUB = 100 kopecks).
 */

import {
	CANONICAL_IMPLANT_SYSTEMS,
	type ImplantSystemSpec,
	type ImplantModelSize,
	type ImplantPlatformInfo,
} from "../dicom/implantCatalog";

export type ImplantBrand =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "astra_tech"
	| "mis";

export type PlatformType = "conical" | "internal_hex" | "external_hex";

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

export interface BrandMetadata {
	readonly id: ImplantBrand;
	readonly name: string;
	readonly country: string;
	readonly countryCode: string;
	readonly popularLines: readonly string[];
	readonly defaultHexColor: string;
}

export const IMPLANT_BRANDS_METADATA: Record<ImplantBrand, BrandMetadata> = {
	straumann: {
		id: "straumann",
		name: "Straumann",
		country: "Швейцария",
		countryCode: "CH",
		popularLines: ["Bone Level Tapered BLT", "BLX"],
		defaultHexColor: "#0284c7",
	},
	nobel_biocare: {
		id: "nobel_biocare",
		name: "Nobel Biocare",
		country: "Швейцария / Швеция",
		countryCode: "CH/SE",
		popularLines: ["NobelActive", "NobelReplace CC"],
		defaultHexColor: "#e11d48",
	},
	osstem: {
		id: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		countryCode: "KR",
		popularLines: ["TS III SA", "TS III CA"],
		defaultHexColor: "#16a34a",
	},
	dentium: {
		id: "dentium",
		name: "Dentium",
		country: "Южная Корея",
		countryCode: "KR",
		popularLines: ["SuperLine", "SimpleLine II"],
		defaultHexColor: "#f59e0b",
	},
	astra_tech: {
		id: "astra_tech",
		name: "Astra Tech",
		country: "Швеция",
		countryCode: "SE",
		popularLines: ["OsseoSpeed EV"],
		defaultHexColor: "#8b5cf6",
	},
	mis: {
		id: "mis",
		name: "MIS Implants",
		country: "Израиль",
		countryCode: "IL",
		popularLines: ["SEVEN", "V3", "C1"],
		defaultHexColor: "#a855f7",
	},
};

const BRAND_KEY_MAP: Record<string, ImplantBrand> = {
	"Nobel Biocare": "nobel_biocare",
	Straumann: "straumann",
	Osstem: "osstem",
	Dentium: "dentium",
	"Astra Tech": "astra_tech",
	"MIS Implants": "mis",
	MIS: "mis",
};

const BASE_PRICES: Record<ImplantBrand, { fixture: number; cap: number; transfer: number; abutment: number; sleeve: number }> = {
	straumann: { fixture: 3200000, cap: 450000, transfer: 380000, abutment: 850000, sleeve: 250000 },
	nobel_biocare: { fixture: 3500000, cap: 500000, transfer: 420000, abutment: 900000, sleeve: 250000 },
	osstem: { fixture: 1250000, cap: 220000, transfer: 200000, abutment: 450000, sleeve: 180000 },
	dentium: { fixture: 1450000, cap: 250000, transfer: 220000, abutment: 480000, sleeve: 180000 },
	astra_tech: { fixture: 3100000, cap: 460000, transfer: 400000, abutment: 880000, sleeve: 250000 },
	mis: { fixture: 1550000, cap: 240000, transfer: 210000, abutment: 460000, sleeve: 190000 },
};

function createFixtures(): ImplantFixture[] {
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
						drillName: `Формирующее сверло Ø${(size.diameterMm - 0.5).toFixed(1)}`,
						diameterMm: Math.max(2.5, size.diameterMm - 0.5),
						targetRpm: 600,
						maxRpm: 800,
						irrigation: "copious_sterile_saline",
						depthGuide: `${len} мм`,
					},
				];

				if (size.diameterMm >= 4.0) {
					drillSequence.push({
						stepNumber: 3,
						drillName: `Финальное кортикальное сверло Ø${size.diameterMm.toFixed(1)}`,
						diameterMm: size.diameterMm,
						targetRpm: 400,
						maxRpm: 500,
						irrigation: "copious_sterile_saline",
						depthGuide: `${len} мм`,
						isBoneDenseOnly: true,
					});
				}

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
					drillSequence,
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

// ─── QUERY & HELPER UTILITIES ───────────────────────────────────────────────

export function getFixturesByBrand(brand: ImplantBrand): ImplantFixture[] {
	return IMPLANT_CATALOG.filter((f) => f.brand === brand);
}

export function getLinesByBrand(brand: ImplantBrand): string[] {
	const fixtures = getFixturesByBrand(brand);
	return Array.from(new Set(fixtures.map((f) => f.line)));
}

export function getAvailableDiameters(brand: ImplantBrand, line?: string): number[] {
	const filtered = IMPLANT_CATALOG.filter(
		(f) => f.brand === brand && (!line || f.line === line),
	);
	return Array.from(new Set(filtered.map((f) => f.diameterMm))).sort((a, b) => a - b);
}

export function getAvailableLengths(brand: ImplantBrand, line?: string, diameter?: number): number[] {
	const filtered = IMPLANT_CATALOG.filter(
		(f) =>
			f.brand === brand &&
			(!line || f.line === line) &&
			(diameter === undefined || f.diameterMm === diameter),
	);
	return Array.from(new Set(filtered.map((f) => f.lengthMm))).sort((a, b) => a - b);
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

export interface ImplantKitCost {
	readonly fixtureKopecks: number;
	readonly healingCapKopecks: number;
	readonly transferKopecks: number;
	readonly abutmentKopecks: number;
	readonly guidedSleeveKopecks: number;
	readonly totalKitKopecks: number;
	readonly totalRublesFormatted: string;
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

	const rubles = totalKitKopecks / 100;
	const formatted = `${rubles.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;

	return {
		fixtureKopecks,
		healingCapKopecks,
		transferKopecks,
		abutmentKopecks,
		guidedSleeveKopecks,
		totalKitKopecks,
		totalRublesFormatted: formatted,
	};
}
