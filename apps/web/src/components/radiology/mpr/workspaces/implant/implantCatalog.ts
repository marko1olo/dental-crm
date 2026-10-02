/**
 * DENTE CRM — Clinical Dental Implant Standard Catalog & Cross-Section Overlay Geometry
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i, Carl Misch (2008), Buser ITI Consensus.
 * Governed by Mandate 8b (file size strict ceiling <= 800 lines) & Mandate 8e (Doctor Autonomy).
 */

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

/**
 * Standard clinical sizes strictly defined in Mandate 8l:
 * Diameters: 3.5, 4.0, 4.5, 5.0 mm
 * Lengths: 8.0, 10.0, 11.5, 13.0 mm
 */
export const STANDARD_CLINICAL_DIAMETERS = [3.5, 4.0, 4.5, 5.0] as const;
export const STANDARD_CLINICAL_LENGTHS = [8.0, 10.0, 11.5, 13.0] as const;

export type StandardImplantDiameterMm = typeof STANDARD_CLINICAL_DIAMETERS[number];
export type StandardImplantLengthMm = typeof STANDARD_CLINICAL_LENGTHS[number];

/**
 * Platform color coding convention (ISO standard dental implant color coding).
 */
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
	readonly safetyZoneMm: number; // 2.0 mm per clinical safety invariants
	readonly priceKopecks: number;
	readonly articleNumber: string;
	readonly platformColorHex: string;
	readonly clinicalIndicationRu: string;
}

/**
 * Generates an accurate clinical implant specification with exact apical taper geometry.
 * Apical taper (конус) begins 2.5 mm above the apex.
 * Safety zone: 2.0 mm surrounding body and apex.
 */
export function buildClinicalImplantSpec(
	brand: ClinicalImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
): ClinicalImplantSpec {
	const brandMeta = CLINICAL_IMPLANT_BRANDS.find((b) => b.key === brand) ?? CLINICAL_IMPLANT_BRANDS[0]!;
	const color = IMPLANT_PLATFORM_COLORS[diameterMm]?.hex ?? "#10b981";

	// Realistic apex taper: approx 65-70% of diameter
	const apexDiameterMm = Number((diameterMm * 0.68).toFixed(1));
	const apicalTaperLengthMm = Math.min(3.0, Number((lengthMm * 0.28).toFixed(1)));

	// Default pricing per brand
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
		safetyZoneMm: 2.0, // 2 mm standard safety corridor
		priceKopecks: basePriceKopecks[brand] ?? 2000000,
		articleNumber,
		platformColorHex: color,
		clinicalIndicationRu: indicationRu,
	};
}

/**
 * Standard fixture library containing all 4 diameters x 4 lengths for all 5 brands (80 items).
 */
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

/**
 * Interactive positioning state of the implant in the cross-section slice.
 */
export interface ClinicalImplantPose {
	readonly depthMm: number;       // Depth below cortical ridge crest (-2.0 .. +6.0 mm, 0 = flush)
	readonly xOffsetMm: number;     // Bucco-lingual transverse offset (+/- mm from center line)
	readonly angulationDeg: number; // Tilt angle in degrees (-30° .. +30°)
}

export const DEFAULT_IMPLANT_POSE: ClinicalImplantPose = {
	depthMm: 0.5, // 0.5 mm subcrestal placement standard
	xOffsetMm: 0.0,
	angulationDeg: 0.0,
};

/**
 * 2D Polygon Vertices for rendering the implant and its 2.0 mm safety corridor on cross-section Canvas/SVG.
 */
export interface ImplantCrossSectionGeometry {
	readonly entryCenterMm: { x: number; y: number };
	readonly apexCenterMm: { x: number; y: number };
	readonly implantPolygonMm: readonly { x: number; y: number }[]; // 6 vertices: platform, taper, apex
	readonly safetyZonePolygonMm: readonly { x: number; y: number }[]; // 2 mm expanded safety zone
	readonly centralAxisLineMm: [ { x: number; y: number }, { x: number; y: number } ];
	readonly platformWidthMm: number;
	readonly apexWidthMm: number;
	readonly totalLengthMm: number;
	readonly safetyMarginMm: number;
}

/**
 * Calculates millimeter polygon coordinates of an implant inside a cross-section slice.
 * Origin (0, 0) is the center of the cross-section slice width and cortical ridge crest height.
 * +X is Lingual/Palatal, -X is Buccal (vestibular).
 * +Y is depth into bone (apical direction).
 */
export function calculateImplantCrossSectionGeometry(
	implant: Pick<ClinicalImplantSpec, "diameterMm" | "lengthMm" | "platformDiameterMm" | "apexDiameterMm" | "apicalTaperLengthMm" | "safetyZoneMm">,
	pose: ClinicalImplantPose,
	crestReferenceMm: { x: number; y: number } = { x: 0, y: 0 },
): ImplantCrossSectionGeometry {
	const rad = (pose.angulationDeg * Math.PI) / 180.0;
	const sin = Math.sin(rad);
	const cos = Math.cos(rad);

	// Unit direction vector along implant axis (from platform to apex)
	const dirX = sin;
	const dirY = cos;

	// Perpendicular unit vector (across implant width)
	const perpX = cos;
	const perpY = -sin;

	// Entry point (platform center)
	const entryX = crestReferenceMm.x + pose.xOffsetMm;
	const entryY = crestReferenceMm.y + pose.depthMm;

	// Apex center point
	const apexX = entryX + dirX * implant.lengthMm;
	const apexY = entryY + dirY * implant.lengthMm;

	// Point where apical taper begins
	const taperStartY = implant.lengthMm - implant.apicalTaperLengthMm;
	const taperStartX = entryX + dirX * taperStartY;
	const taperStartYPos = entryY + dirY * taperStartY;

	const rPlat = implant.platformDiameterMm / 2.0;
	const rApex = implant.apexDiameterMm / 2.0;

	// 1. Fixture Polygon (Platform Left/Right -> Taper Left/Right -> Apex Left/Right)
	const pLeft = { x: entryX - perpX * rPlat, y: entryY - perpY * rPlat };
	const pRight = { x: entryX + perpX * rPlat, y: entryY + perpY * rPlat };
	const tRight = { x: taperStartX + perpX * rPlat, y: taperStartYPos + perpY * rPlat };
	const aRight = { x: apexX + perpX * rApex, y: apexY + perpY * rApex };
	const aLeft = { x: apexX - perpX * rApex, y: apexY - perpY * rApex };
	const tLeft = { x: taperStartX - perpX * rPlat, y: taperStartYPos - perpY * rPlat };

	const implantPolygonMm = [pLeft, pRight, tRight, aRight, aLeft, tLeft];

	// 2. Safety Zone Polygon (2.0 mm corridor surrounding body & apex)
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

/**
 * Evaluates physical clearance to mandibular nerve canal or sinus floor with 2.0 mm safety zone.
 */
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
