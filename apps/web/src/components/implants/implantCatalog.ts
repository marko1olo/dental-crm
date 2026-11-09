/**
 * implantCatalog.ts — Единый канонический SSOT каталог имплантационных систем (DENTE CRM).
 * Реальные хирургические спецификации, протоколы сверления и ценовые сетки (Мандаты 8s, 8e, 8n).
 */

import { CANONICAL_IMPLANT_SYSTEMS } from "../dicom/implantCatalog";

export type ImplantBrand =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "ankylos"
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

export interface ImplantKitCost {
	readonly fixtureKopecks: number;
	readonly healingCapKopecks: number;
	readonly transferKopecks: number;
	readonly abutmentKopecks: number;
	readonly guidedSleeveKopecks: number;
	readonly totalKitKopecks: number;
	readonly totalRublesFormatted: string;
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
	ankylos: {
		id: "ankylos",
		name: "Ankylos",
		country: "Германия (Dentsply Sirona)",
		countryCode: "DE",
		popularLines: ["C/X", "TissueCare"],
		defaultHexColor: "#059669",
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

export const BRAND_KEY_MAP: Record<string, ImplantBrand> = {
	"Nobel Biocare": "nobel_biocare",
	Straumann: "straumann",
	Osstem: "osstem",
	Dentium: "dentium",
	Ankylos: "ankylos",
	"Astra Tech": "astra_tech",
	"MIS Implants": "mis",
	MIS: "mis",
};

export const BASE_PRICES: Record<ImplantBrand, { fixture: number; cap: number; transfer: number; abutment: number; sleeve: number }> = {
	straumann: { fixture: 3200000, cap: 450000, transfer: 380000, abutment: 850000, sleeve: 250000 },
	nobel_biocare: { fixture: 3500000, cap: 500000, transfer: 420000, abutment: 900000, sleeve: 250000 },
	osstem: { fixture: 1250000, cap: 220000, transfer: 200000, abutment: 450000, sleeve: 180000 },
	dentium: { fixture: 1450000, cap: 250000, transfer: 220000, abutment: 480000, sleeve: 180000 },
	ankylos: { fixture: 3300000, cap: 480000, transfer: 390000, abutment: 870000, sleeve: 250000 },
	astra_tech: { fixture: 3100000, cap: 460000, transfer: 400000, abutment: 880000, sleeve: 250000 },
	mis: { fixture: 1550000, cap: 240000, transfer: 210000, abutment: 460000, sleeve: 190000 },
};

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

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL GEOMETRY & CROSS-SECTION SPECIFICATIONS (Mandates 8l, 8s, 8e)
// ─────────────────────────────────────────────────────────────────────────────

export type ClinicalImplantBrandKey = "osstem" | "straumann" | "nobel_biocare" | "dentium" | "mis";

export interface ClinicalImplantBrandMeta {
	readonly key: ClinicalImplantBrandKey;
	readonly name: string;
	readonly country: string;
	readonly systemFamily: string;
	readonly descriptionRu: string;
	readonly defaultPlatformType: "internal_hex" | "cross_fit" | "conical";
}

export const CLINICAL_IMPLANT_BRANDS: readonly ClinicalImplantBrandMeta[] = [
	{
		key: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		systemFamily: "TS III SA / TS IV SA",
		descriptionRu: "Золотой стандарт с SA гидрофильной поверхностью и двойной микрорезьбой.",
		defaultPlatformType: "internal_hex",
	},
	{
		key: "straumann",
		name: "Straumann",
		country: "Швейцария",
		systemFamily: "BLX / BLT / Bone Level",
		descriptionRu: "Премиальный швейцарский сплав Roxolid с поверхностью SLActive/SLA.",
		defaultPlatformType: "cross_fit",
	},
	{
		key: "nobel_biocare",
		name: "Nobel Biocare",
		country: "Швейцария",
		systemFamily: "NobelActive / NobelParallel",
		descriptionRu: "Высокая первичная стабильность в кости D3–D4 для немедленной нагрузки.",
		defaultPlatformType: "conical",
	},
	{
		key: "dentium",
		name: "Dentium",
		country: "Южная Корея",
		systemFamily: "SuperLine / SimpleLine",
		descriptionRu: "Коническая форма с глубоким конусом Морзе и агрессивной самонарезающей резьбой.",
		defaultPlatformType: "internal_hex",
	},
	{
		key: "mis",
		name: "MIS Implants",
		country: "Израиль",
		systemFamily: "SEVEN / C1 / V3",
		descriptionRu: "Универсальный конический макродизайн с выраженной компрессионной резьбой.",
		defaultPlatformType: "internal_hex",
	},
] as const;

export const STANDARD_CLINICAL_DIAMETERS = [3.5, 4.0, 4.5, 5.0] as const;
export const STANDARD_CLINICAL_LENGTHS = [8.0, 10.0, 11.5, 13.0] as const;

export type StandardImplantDiameterMm = typeof STANDARD_CLINICAL_DIAMETERS[number];
export type StandardImplantLengthMm = typeof STANDARD_CLINICAL_LENGTHS[number];

export const IMPLANT_PLATFORM_COLORS: Record<number, { hex: string; nameRu: string }> = {
	3.5: { hex: "#eab308", nameRu: "Желтый (Narrow 3.5)" },
	4.0: { hex: "#10b981", nameRu: "Зеленый (Regular 4.0)" },
	4.5: { hex: "#06b6d4", nameRu: "Бирюзовый (Regular Wide 4.5)" },
	5.0: { hex: "#a855f7", nameRu: "Фиолетовый (Wide Molar 5.0)" },
};

export interface ClinicalImplantSpec {
	readonly id: string;
	readonly brand: ClinicalImplantBrandKey;
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly apicalTaperLengthMm: number;
	readonly safetyZoneMm: number;
	readonly priceKopecks: number;
	readonly articleNumber: string;
	readonly platformColorHex: string;
	readonly clinicalIndicationRu: string;
}

export function buildClinicalImplantSpec(
	brand: ClinicalImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
): ClinicalImplantSpec {
	const brandMeta = CLINICAL_IMPLANT_BRANDS.find((b) => b.key === brand) ?? CLINICAL_IMPLANT_BRANDS[0]!;
	const color = IMPLANT_PLATFORM_COLORS[diameterMm]?.hex ?? "#10b981";

	const apexDiameterMm = Number((diameterMm * 0.68).toFixed(1));
	const apicalTaperLengthMm = Math.min(3.0, Number((lengthMm * 0.28).toFixed(1)));

	const basePriceKopecks: Record<ClinicalImplantBrandKey, number> = {
		osstem: 1850000,
		straumann: 3850000,
		nobel_biocare: 3950000,
		dentium: 1900000,
		mis: 1950000,
	};

	const prefix: Record<ClinicalImplantBrandKey, string> = {
		osstem: "TS3S",
		straumann: "061.",
		nobel_biocare: "NB-",
		dentium: "FXT",
		mis: "MF7-",
	};

	const diamCode = Math.round(diameterMm * 10);
	const lenCode = Math.round(lengthMm * 10);
	const articleNumber = `${prefix[brand]}${diamCode}${lenCode}`;

	const indicationRu =
		diameterMm <= 3.5
			? "Узкий гребень, замещение резцов и премоляров при дефиците кости"
			: diameterMm <= 4.0
				? "Универсальный протокол для премоляров и моляров верхней и нижней челюсти"
				: diameterMm <= 4.5
					? "Широкий гребень моляров, немедленная нагрузка"
					: "Широкая костная площадка моляров нижней челюсти";

	return {
		id: `${brand}-d${diamCode}-l${lenCode}`,
		brand,
		brandName: brandMeta.name,
		lineName: brandMeta.systemFamily.split("/")[0]!.trim(),
		diameterMm,
		lengthMm,
		platformDiameterMm: diameterMm,
		apexDiameterMm,
		apicalTaperLengthMm,
		safetyZoneMm: 2.0,
		priceKopecks: basePriceKopecks[brand] ?? 2000000,
		articleNumber,
		platformColorHex: color,
		clinicalIndicationRu: indicationRu,
	};
}

export const CLINICAL_IMPLANT_LIBRARY: readonly ClinicalImplantSpec[] = (() => {
	const catalog: ClinicalImplantSpec[] = [];
	for (const brand of CLINICAL_IMPLANT_BRANDS) {
		for (const d of STANDARD_CLINICAL_DIAMETERS) {
			for (const l of STANDARD_CLINICAL_LENGTHS) {
				catalog.push(buildClinicalImplantSpec(brand.key, d, l));
			}
		}
	}
	return catalog;
})();

export function findClinicalImplant(
	brand: ClinicalImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
): ClinicalImplantSpec {
	const exact = CLINICAL_IMPLANT_LIBRARY.find(
		(i) => i.brand === brand && Math.abs(i.diameterMm - diameterMm) < 0.1 && Math.abs(i.lengthMm - lengthMm) < 0.1,
	);
	return exact ?? buildClinicalImplantSpec(brand, diameterMm, lengthMm);
}

export interface ClinicalImplantPose {
	readonly depthMm: number;
	readonly xOffsetMm: number;
	readonly angulationDeg: number;
}

export const DEFAULT_IMPLANT_POSE: ClinicalImplantPose = {
	depthMm: 0.5,
	xOffsetMm: 0.0,
	angulationDeg: 0.0,
};

export interface ImplantCrossSectionGeometry {
	readonly entryCenterMm: { x: number; y: number };
	readonly apexCenterMm: { x: number; y: number };
	readonly implantPolygonMm: readonly { x: number; y: number }[];
	readonly safetyZonePolygonMm: readonly { x: number; y: number }[];
	readonly centralAxisLineMm: [ { x: number; y: number }, { x: number; y: number } ];
	readonly platformWidthMm: number;
	readonly apexWidthMm: number;
	readonly totalLengthMm: number;
	readonly safetyMarginMm: number;
}

export function calculateImplantCrossSectionGeometry(
	implant: Pick<ClinicalImplantSpec, "diameterMm" | "lengthMm" | "platformDiameterMm" | "apexDiameterMm" | "apicalTaperLengthMm" | "safetyZoneMm">,
	pose: ClinicalImplantPose,
	crestReferenceMm: { x: number; y: number } = { x: 0, y: 0 },
): ImplantCrossSectionGeometry {
	const rad = (pose.angulationDeg * Math.PI) / 180.0;
	const sin = Math.sin(rad);
	const cos = Math.cos(rad);

	const dirX = sin;
	const dirY = cos;
	const perpX = cos;
	const perpY = -sin;

	const entryX = crestReferenceMm.x + pose.xOffsetMm;
	const entryY = crestReferenceMm.y + pose.depthMm;
	const apexX = entryX + dirX * implant.lengthMm;
	const apexY = entryY + dirY * implant.lengthMm;

	const taperStartY = implant.lengthMm - implant.apicalTaperLengthMm;
	const taperStartX = entryX + dirX * taperStartY;
	const taperStartYPos = entryY + dirY * taperStartY;

	const rPlat = implant.platformDiameterMm / 2.0;
	const rApex = implant.apexDiameterMm / 2.0;

	const pLeft = { x: entryX - perpX * rPlat, y: entryY - perpY * rPlat };
	const pRight = { x: entryX + perpX * rPlat, y: entryY + perpY * rPlat };
	const tRight = { x: taperStartX + perpX * rPlat, y: taperStartYPos + perpY * rPlat };
	const aRight = { x: apexX + perpX * rApex, y: apexY + perpY * rApex };
	const aLeft = { x: apexX - perpX * rApex, y: apexY - perpY * rApex };
	const tLeft = { x: taperStartX - perpX * rPlat, y: taperStartYPos - perpY * rPlat };

	const implantPolygonMm = [pLeft, pRight, tRight, aRight, aLeft, tLeft];

	const safety = implant.safetyZoneMm ?? 2.0;
	const rSafePlat = rPlat + safety;
	const rSafeApex = rApex + safety;
	const safeApexCenter = { x: apexX + dirX * safety, y: apexY + dirY * safety };

	const sPLeft = { x: entryX - perpX * rSafePlat, y: entryY - perpY * rSafePlat };
	const sPRight = { x: entryX + perpX * rSafePlat, y: entryY + perpY * rSafePlat };
	const sTRight = { x: taperStartX + perpX * rSafePlat, y: taperStartYPos + perpY * rSafePlat };
	const sARight = { x: apexX + perpX * rSafeApex, y: apexY + perpY * rSafeApex };
	const sApexTip = safeApexCenter;
	const sALeft = { x: apexX - perpX * rSafeApex, y: apexY - perpY * rSafeApex };
	const sTLeft = { x: taperStartX - perpX * rSafePlat, y: taperStartYPos - perpY * rSafePlat };

	const safetyZonePolygonMm = [sPLeft, sPRight, sTRight, sARight, sApexTip, sALeft, sTLeft];

	return {
		entryCenterMm: { x: entryX, y: entryY },
		apexCenterMm: { x: apexX, y: apexY },
		implantPolygonMm,
		safetyZonePolygonMm,
		centralAxisLineMm: [
			{ x: entryX, y: entryY },
			{ x: apexX + dirX * 1.5, y: apexY + dirY * 1.5 },
		],
		platformWidthMm: implant.platformDiameterMm,
		apexWidthMm: implant.apexDiameterMm,
		totalLengthMm: implant.lengthMm,
		safetyMarginMm: safety,
	};
}

export function evaluateImplantObstacleClearance(
	apexYMm: number,
	obstacleYMm: number | null | undefined,
	safetyZoneMm = 2.0,
): {
	readonly clearanceMm: number | null;
	readonly status: "safe" | "warning" | "danger" | "unmeasured";
	readonly statusLabelRu: string;
	readonly badgeColorClass: string;
} {
	if (obstacleYMm === null || obstacleYMm === undefined || !Number.isFinite(obstacleYMm)) {
		return {
			clearanceMm: null,
			status: "unmeasured",
			statusLabelRu: "Ориентир не размечен",
			badgeColorClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
		};
	}

	const clearanceMm = Number((obstacleYMm - apexYMm).toFixed(1));

	if (clearanceMm < 0.5) {
		return {
			clearanceMm,
			status: "danger",
			statusLabelRu: `ОПАСНО: вторжение в зону канала (${clearanceMm.toFixed(1)} мм < 0.5 мм)`,
			badgeColorClass: "bg-rose-950/80 text-rose-300 border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
		};
	}

	if (clearanceMm < safetyZoneMm) {
		return {
			clearanceMm,
			status: "warning",
			statusLabelRu: `Внимание: буфер ${clearanceMm.toFixed(1)} мм (менее зоны безопасности ${safetyZoneMm} мм)`,
			badgeColorClass: "bg-amber-950/80 text-amber-300 border-amber-500/80",
		};
	}

	return {
		clearanceMm,
		status: "safe",
		statusLabelRu: `Безопасно: ${clearanceMm.toFixed(1)} мм до препятствия (норма >= ${safetyZoneMm} мм)`,
		badgeColorClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/80",
	};
}
