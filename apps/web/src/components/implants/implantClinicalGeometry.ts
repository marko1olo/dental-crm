/**
 * implantClinicalGeometry.ts — Клиническая геометрия, кросс-секции имплантатов для рентгенологии/DICOM и расчет буферов безопасности (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts по Мандатам 8b и 8zi.
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
	const defaultBrandMeta: ClinicalImplantBrandMeta = CLINICAL_IMPLANT_BRANDS[0] ?? {
		key: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		systemFamily: "TS III SA / TS IV SA",
		descriptionRu: "Золотой стандарт с SA гидрофильной поверхностью и двойной микрорезьбой.",
		defaultPlatformType: "internal_hex",
	};
	const brandMeta = CLINICAL_IMPLANT_BRANDS.find((b) => b.key === brand) ?? defaultBrandMeta;
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
		lineName: (brandMeta.systemFamily.split("/")[0] ?? brandMeta.systemFamily).trim(),
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
	readonly centralAxisLineMm: [{ x: number; y: number }, { x: number; y: number }];
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
			badgeColorClass: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]",
		};
	}

	const clearanceMm = Number((obstacleYMm - apexYMm).toFixed(1));

	if (clearanceMm < 0.5) {
		return {
			clearanceMm,
			status: "danger",
			statusLabelRu: `ОПАСНО: вторжение в зону канала (${clearanceMm.toFixed(1)} мм < 0.5 мм)`,
			badgeColorClass: "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/30",
		};
	}

	if (clearanceMm < safetyZoneMm) {
		return {
			clearanceMm,
			status: "warning",
			statusLabelRu: `Внимание: буфер ${clearanceMm.toFixed(1)} мм (менее зоны безопасности ${safetyZoneMm} мм)`,
			badgeColorClass: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/30",
		};
	}

	return {
		clearanceMm,
		status: "safe",
		statusLabelRu: `Безопасно: ${clearanceMm.toFixed(1)} мм до препятствия (норма >= ${safetyZoneMm} мм)`,
		badgeColorClass: "bg-[var(--primary-subtle,var(--paper-soft))] text-[var(--primary)] border-[var(--primary)]/30",
	};
}
