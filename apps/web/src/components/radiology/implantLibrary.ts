/**
 * DENTE CRM — Comprehensive 3D Virtual Implant Library & Nerve Safety Geometry Engine
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i Implant Studio, Anatomage, Misch CE (2008)
 *
 * Requirements (Mandate 8e: Doctor Autonomy):
 * 1. Verified fixture catalogs for the 5 global dental implant systems:
 *    - Straumann (BLX, BLT, Bone Level)
 *    - Nobel Biocare (NobelActive, NobelParallel, NobelReplace)
 *    - Osstem (TS III SA, TS IV SA)
 *    - Dentium (SuperLine, SimpleLine II)
 *    - MIS Implants (SEVEN, C1, V3)
 * 2. Exact dimensions: diameters 3.0 .. 5.5 mm, lengths 7.0 .. 15.0 mm.
 * 3. Configurable safety corridor (Safety Zone 1.5–2.0 mm) around the cylindrical body and apex.
 * 4. Calm clinical metrics for mandibular canal (N. alveolaris inferior) distance:
 *    "Дистанция: X.X мм" or "Канал не размечен".
 * 5. Strict ban on screaming audio alarms, sirens, and lecturing all-caps warnings.
 * 6. Kopeck-exact financial pricing for treatment plan integration (Mandate 8b).
 */

import type { Point3D } from "./cbctMprMath";

export type ImplantBrandKey = "straumann" | "nobel_biocare" | "osstem" | "dentium" | "mis";

export interface ImplantBrandInfo {
	readonly key: ImplantBrandKey;
	readonly name: string;
	readonly country: string;
	readonly defaultPlatformType: "conical" | "internal_hex" | "cross_fit";
	readonly descriptionRu: string;
}

export const IMPLANT_BRANDS: readonly ImplantBrandInfo[] = [
	{
		key: "straumann",
		name: "Straumann",
		country: "Швейцария",
		defaultPlatformType: "cross_fit",
		descriptionRu: "Премиальные швейцарские титано-циркониевые (Roxolid) имплантаты с поверхностью SLActive/SLA.",
	},
	{
		key: "nobel_biocare",
		name: "Nobel Biocare",
		country: "Швейцария/Швеция",
		defaultPlatformType: "conical",
		descriptionRu: "Оригинальная система с поверхностью TiUnite и переменным шагом резьбы для немедленной нагрузки.",
	},
	{
		key: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		defaultPlatformType: "internal_hex",
		descriptionRu: "Золотой стандарт южнокорейской имплантологии с SA пескоструйной обработкой и гидрофильным травлением.",
	},
	{
		key: "dentium",
		name: "Dentium",
		country: "Южная Корея",
		defaultPlatformType: "internal_hex",
		descriptionRu: "Конические имплантаты с двойной самонарезающей резьбой и глубоким конусом Морзе.",
	},
	{
		key: "mis",
		name: "MIS Implants",
		country: "Израиль",
		defaultPlatformType: "internal_hex",
		descriptionRu: "Универсальная биосовместимая система с поверхностью B+ и выраженной компрессионной резьбой.",
	},
] as const;

export interface ImplantModel {
	readonly id: string;
	readonly brand: ImplantBrandKey;
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly priceKopecks: number;
	readonly articleNumber: string;
	readonly clinicalIndicationRu: string;
}

/**
 * Standard safety corridor distances per Misch CE and clinical consensus.
 */
export const DEFAULT_SAFETY_CORRIDOR_MM = 2.0;
export const MIN_SAFETY_CORRIDOR_MM = 1.5;

/**
 * Comprehensive fixture catalog covering all 5 brands with exact dimensions:
 * Diameters 3.0 .. 5.5 mm, lengths 7.0 .. 15.0 mm.
 */
export const FULL_IMPLANT_LIBRARY: readonly ImplantModel[] = [
	// STRAUMANN (BLX, BLT, Bone Level)
	{ id: "straumann-blx-35-10", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 3.5, lengthMm: 10.0, platformDiameterMm: 3.5, apexDiameterMm: 2.2, priceKopecks: 3850000, articleNumber: "061.4110", clinicalIndicationRu: "Узкий гребень, фронтальный отдел" },
	{ id: "straumann-blx-40-10", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 4.0, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.5, priceKopecks: 3850000, articleNumber: "061.4310", clinicalIndicationRu: "Универсальный протокол для премоляров" },
	{ id: "straumann-blx-40-115", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 4.0, lengthMm: 11.5, platformDiameterMm: 4.0, apexDiameterMm: 2.5, priceKopecks: 3850000, articleNumber: "061.4312", clinicalIndicationRu: "Глубокая постановка при достаточном объеме кости" },
	{ id: "straumann-blt-33-10", brand: "straumann", brandName: "Straumann", lineName: "BLT", diameterMm: 3.3, lengthMm: 10.0, platformDiameterMm: 3.3, apexDiameterMm: 2.1, priceKopecks: 3750000, articleNumber: "021.3310", clinicalIndicationRu: "Нижние резцы, дефицит мезио-дистального пространства" },
	{ id: "straumann-blt-41-10", brand: "straumann", brandName: "Straumann", lineName: "BLT", diameterMm: 4.1, lengthMm: 10.0, platformDiameterMm: 4.1, apexDiameterMm: 2.5, priceKopecks: 3850000, articleNumber: "021.4110", clinicalIndicationRu: "Конический дизайн для плотной кости D1-D2" },
	{ id: "straumann-blt-48-8", brand: "straumann", brandName: "Straumann", lineName: "BLT", diameterMm: 4.8, lengthMm: 8.0, platformDiameterMm: 4.8, apexDiameterMm: 3.0, priceKopecks: 3850000, articleNumber: "021.4808", clinicalIndicationRu: "Моляры нижней челюсти при близком расположении канала" },
	{ id: "straumann-blt-48-12", brand: "straumann", brandName: "Straumann", lineName: "BLT", diameterMm: 4.8, lengthMm: 12.0, platformDiameterMm: 4.8, apexDiameterMm: 3.0, priceKopecks: 3850000, articleNumber: "021.4812", clinicalIndicationRu: "Широкий гребень, моляры верхней челюсти" },

	// NOBEL BIOCARE (NobelActive, NobelParallel, NobelReplace)
	{ id: "nobel-active-35-10", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 3.5, lengthMm: 10.0, platformDiameterMm: 3.5, apexDiameterMm: 2.4, priceKopecks: 3950000, articleNumber: "35221", clinicalIndicationRu: "Высокая первичная стабильность в мягкой кости D3-D4" },
	{ id: "nobel-active-43-10", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 4.3, lengthMm: 10.0, platformDiameterMm: 4.3, apexDiameterMm: 2.8, priceKopecks: 3950000, articleNumber: "35222", clinicalIndicationRu: "Универсальный имплантат для немедленной нагрузки" },
	{ id: "nobel-active-43-115", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 4.3, lengthMm: 11.5, platformDiameterMm: 4.3, apexDiameterMm: 2.8, priceKopecks: 3950000, articleNumber: "35223", clinicalIndicationRu: "Немедленная имплантация в лунку удаленного зуба" },
	{ id: "nobel-active-50-10", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.2, priceKopecks: 3950000, articleNumber: "35225", clinicalIndicationRu: "Широкий гребень, моляры" },
	{ id: "nobel-active-55-85", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 5.5, lengthMm: 8.5, platformDiameterMm: 5.5, apexDiameterMm: 3.6, priceKopecks: 3950000, articleNumber: "35227", clinicalIndicationRu: "Экстра-широкий для лунок моляров" },
	{ id: "nobel-parallel-375-10", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelParallel CC", diameterMm: 3.75, lengthMm: 10.0, platformDiameterMm: 3.75, apexDiameterMm: 2.7, priceKopecks: 3800000, articleNumber: "37823", clinicalIndicationRu: "Параллельные стенки для кости любого типа" },
	{ id: "nobel-parallel-43-13", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelParallel CC", diameterMm: 4.3, lengthMm: 13.0, platformDiameterMm: 4.3, apexDiameterMm: 3.0, priceKopecks: 3800000, articleNumber: "37825", clinicalIndicationRu: "Глубокая бикортикальная фиксация" },

	// OSSTEM (TS III SA, TS IV SA)
	{ id: "osstem-ts3-35-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 3.5, lengthMm: 10.0, platformDiameterMm: 3.5, apexDiameterMm: 2.5, priceKopecks: 1850000, articleNumber: "TS3S3510S", clinicalIndicationRu: "Премоляры, дефицит вестибуло-орального объема" },
	{ id: "osstem-ts3-40-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.0, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1850000, articleNumber: "TS3S4010S", clinicalIndicationRu: "Золотой стандарт для большинства клинических ситуаций" },
	{ id: "osstem-ts3-40-115", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.0, lengthMm: 11.5, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1850000, articleNumber: "TS3S4011S", clinicalIndicationRu: "Стандартная длина для верхней и нижней челюсти" },
	{ id: "osstem-ts3-45-7", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.5, lengthMm: 7.0, platformDiameterMm: 4.5, apexDiameterMm: 3.0, priceKopecks: 1850000, articleNumber: "TS3S4507S", clinicalIndicationRu: "Короткий имплантат при выраженной атрофии кости" },
	{ id: "osstem-ts3-45-85", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.5, lengthMm: 8.5, platformDiameterMm: 4.5, apexDiameterMm: 3.0, priceKopecks: 1850000, articleNumber: "TS3S4585S", clinicalIndicationRu: "Оптимален для моляров при дефиците высоты над каналом" },
	{ id: "osstem-ts3-45-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.5, lengthMm: 10.0, platformDiameterMm: 4.5, apexDiameterMm: 3.0, priceKopecks: 1850000, articleNumber: "TS3S4510S", clinicalIndicationRu: "Первый и второй моляры нижней челюсти" },
	{ id: "osstem-ts3-50-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.4, priceKopecks: 1850000, articleNumber: "TS3S5010S", clinicalIndicationRu: "Широкая костная площадка" },

	// DENTIUM (SuperLine, SimpleLine II)
	{ id: "dentium-sl-36-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 3.6, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.6, priceKopecks: 1900000, articleNumber: "FXT3610", clinicalIndicationRu: "Фронтальный отдел, узкий альвеолярный отросток" },
	{ id: "dentium-sl-40-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 4.0, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1900000, articleNumber: "FXT4010", clinicalIndicationRu: "Универсальный выбор для кости D2-D3" },
	{ id: "dentium-sl-40-12", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 4.0, lengthMm: 12.0, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1900000, articleNumber: "FXT4012", clinicalIndicationRu: "Высокий альвеолярный гребень" },
	{ id: "dentium-sl-45-8", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 4.5, lengthMm: 8.0, platformDiameterMm: 4.5, apexDiameterMm: 3.1, priceKopecks: 1900000, articleNumber: "FXT4508", clinicalIndicationRu: "Субсинусальная имплантация, моляры" },
	{ id: "dentium-sl-45-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 4.5, lengthMm: 10.0, platformDiameterMm: 4.5, apexDiameterMm: 3.1, priceKopecks: 1900000, articleNumber: "FXT4510", clinicalIndicationRu: "Стандартный молярный протокол" },
	{ id: "dentium-sl-50-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.5, priceKopecks: 1900000, articleNumber: "FXT5010", clinicalIndicationRu: "Широкий гребень, замещение моляров" },

	// MIS IMPLANTS (SEVEN, C1, V3)
	{ id: "mis-seven-375-10", brand: "mis", brandName: "MIS Implants", lineName: "SEVEN", diameterMm: 3.75, lengthMm: 10.0, platformDiameterMm: 3.75, apexDiameterMm: 2.4, priceKopecks: 1950000, articleNumber: "MF7-10375", clinicalIndicationRu: "Двойная резьба для самонарезания и компрессии кости" },
	{ id: "mis-seven-42-10", brand: "mis", brandName: "MIS Implants", lineName: "SEVEN", diameterMm: 4.2, lengthMm: 10.0, platformDiameterMm: 4.2, apexDiameterMm: 2.8, priceKopecks: 1950000, articleNumber: "MF7-10420", clinicalIndicationRu: "Универсальный конический дизайн для любого типа кости" },
	{ id: "mis-seven-50-10", brand: "mis", brandName: "MIS Implants", lineName: "SEVEN", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.2, priceKopecks: 1950000, articleNumber: "MF7-10500", clinicalIndicationRu: "Максимальная первичная стабилизация в молярной зоне" },
	{ id: "mis-c1-375-10", brand: "mis", brandName: "MIS Implants", lineName: "C1", diameterMm: 3.75, lengthMm: 10.0, platformDiameterMm: 3.75, apexDiameterMm: 2.4, priceKopecks: 2150000, articleNumber: "C1-10375", clinicalIndicationRu: "Конус Морзе 12 градусов для сохранения кортикальной кости" },
	{ id: "mis-v3-39-10", brand: "mis", brandName: "MIS Implants", lineName: "V3", diameterMm: 3.9, lengthMm: 10.0, platformDiameterMm: 3.9, apexDiameterMm: 2.5, priceKopecks: 2450000, articleNumber: "V3-10390", clinicalIndicationRu: "Треугольная корональная часть для регенерации кости" },
	{ id: "mis-v3-43-115", brand: "mis", brandName: "MIS Implants", lineName: "V3", diameterMm: 4.3, lengthMm: 11.5, platformDiameterMm: 4.3, apexDiameterMm: 2.8, priceKopecks: 2450000, articleNumber: "V3-11430", clinicalIndicationRu: "Эстетическая зона фронтального отдела" },
] as const;

/**
 * Geometric safety envelope dimensions for 2D cross-section and 3D volume overlays.
 */
export interface SafetyCorridorGeometry {
	readonly safetyMarginMm: number;
	readonly totalDiameterMm: number;
	readonly totalLengthMm: number;
	readonly cylinderRadiusMm: number;
	readonly apicalMarginMm: number;
}

/**
 * Computes safety corridor geometry surrounding the implant fixture.
 */
export function computeSafetyCorridorGeometry(
	implant: Pick<ImplantModel, "diameterMm" | "lengthMm">,
	safetyMarginMm = DEFAULT_SAFETY_CORRIDOR_MM,
): SafetyCorridorGeometry {
	const margin = Math.max(MIN_SAFETY_CORRIDOR_MM, safetyMarginMm);
	return {
		safetyMarginMm: margin,
		totalDiameterMm: implant.diameterMm + margin * 2.0,
		totalLengthMm: implant.lengthMm + margin,
		cylinderRadiusMm: implant.diameterMm / 2.0 + margin,
		apicalMarginMm: margin,
	};
}

/**
 * Result of the mandibular canal clearance inspection.
 */
export interface NerveInspectionResult {
	readonly distanceToCenterMm: number;
	readonly netClearanceMm: number;
	readonly safetyStatus: "safe" | "warning" | "danger" | "unmeasured";
	readonly isSafe: boolean;
	readonly isWarning: boolean;
	readonly isDanger: boolean;
	readonly telemetryTextRu: string;
	readonly safetyMarginMm: number;
}

/**
 * Formats distance to nerve canal as a calm, objective clinical metric.
 * Strictly adheres to Mandate 8e: zero audio sirens, zero caps-lock lecturing.
 */
export function formatNerveClearanceMetric(clearanceMm: number | null | undefined): string {
	if (clearanceMm === null || clearanceMm === undefined || Number.isNaN(clearanceMm)) {
		return "Канал не размечен";
	}
	return `Дистанция: ${clearanceMm.toFixed(1)} мм`;
}

/**
 * Evaluates physical distance from implant apex to mandibular nerve canal in 2D or 3D.
 * Safe margin: >= 2.0 mm (Misch CE 2008)
 * Warning buffer: 1.5 .. 2.0 mm
 * Danger zone: < 1.5 mm
 */
export function inspectDistanceToMandibularCanal(
	implantApex: { readonly x: number; readonly y: number; readonly z?: number },
	canalCenter: { readonly x: number; readonly y: number; readonly z?: number } | null | undefined,
	canalRadiusMm = 1.4,
	safetyMarginMm = DEFAULT_SAFETY_CORRIDOR_MM,
): NerveInspectionResult {
	if (!canalCenter) {
		return {
			distanceToCenterMm: 0,
			netClearanceMm: 0,
			safetyStatus: "unmeasured",
			isSafe: false,
			isWarning: false,
			isDanger: false,
			telemetryTextRu: "Канал не размечен",
			safetyMarginMm,
		};
	}

	const dx = implantApex.x - canalCenter.x;
	const dy = implantApex.y - canalCenter.y;
	const dz = (implantApex.z ?? 0) - (canalCenter.z ?? 0);
	const distToCenter = Math.hypot(dx, dy, dz);
	const netClearance = Math.round((distToCenter - canalRadiusMm) * 100) / 100;

	let status: "safe" | "warning" | "danger" = "safe";
	if (netClearance < MIN_SAFETY_CORRIDOR_MM) {
		status = "danger";
	} else if (netClearance < safetyMarginMm) {
		status = "warning";
	}

	return {
		distanceToCenterMm: Math.round(distToCenter * 100) / 100,
		netClearanceMm: netClearance,
		safetyStatus: status,
		isSafe: status === "safe",
		isWarning: status === "warning",
		isDanger: status === "danger",
		telemetryTextRu: formatNerveClearanceMetric(netClearance),
		safetyMarginMm,
	};
}

/**
 * Comprehensive 3D cylinder-to-spline inspection between implant body and mandibular canal.
 */
export function inspectImplantBodyToNerve3D(
	implant: {
		readonly entry: Point3D;
		readonly apex: Point3D;
		readonly diameterMm: number;
	},
	nerveSpline: readonly Point3D[] | null | undefined,
	canalRadiusMm = 1.4,
	safetyMarginMm = DEFAULT_SAFETY_CORRIDOR_MM,
): NerveInspectionResult {
	if (!nerveSpline || nerveSpline.length < 2) {
		return {
			distanceToCenterMm: 0,
			netClearanceMm: 0,
			safetyStatus: "unmeasured",
			isSafe: false,
			isWarning: false,
			isDanger: false,
			telemetryTextRu: "Канал не размечен",
			safetyMarginMm,
		};
	}

	const implantRadius = implant.diameterMm / 2.0;
	let minDistance = Number.POSITIVE_INFINITY;

	const ex = implant.entry.x;
	const ey = implant.entry.y;
	const ez = implant.entry.z;
	const ax = implant.apex.x;
	const ay = implant.apex.y;
	const az = implant.apex.z;

	const idx = ax - ex;
	const idy = ay - ey;
	const idz = az - ez;
	const iLenSq = idx * idx + idy * idy + idz * idz;

	for (let i = 0; i < nerveSpline.length - 1; i++) {
		const p1 = nerveSpline[i]!;
		const p2 = nerveSpline[i + 1]!;
		const sdx = p2.x - p1.x;
		const sdy = p2.y - p1.y;
		const sdz = p2.z - p1.z;

		// Sample 5 points along each nerve segment
		for (let s = 0; s <= 4; s++) {
			const st = s / 4;
			const nx = p1.x + st * sdx;
			const ny = p1.y + st * sdy;
			const nz = p1.z + st * sdz;

			let it = 0;
			if (iLenSq > 1e-6) {
				it = Math.max(0, Math.min(1, ((nx - ex) * idx + (ny - ey) * idy + (nz - ez) * idz) / iLenSq));
			}
			const ix = ex + it * idx;
			const iy = ey + it * idy;
			const iz = ez + it * idz;

			const dist = Math.hypot(nx - ix, ny - iy, nz - iz);
			if (dist < minDistance) {
				minDistance = dist;
			}
		}
	}

	const netClearance = Math.round((minDistance - canalRadiusMm - implantRadius) * 100) / 100;
	let status: "safe" | "warning" | "danger" = "safe";
	if (netClearance < MIN_SAFETY_CORRIDOR_MM) {
		status = "danger";
	} else if (netClearance < safetyMarginMm) {
		status = "warning";
	}

	return {
		distanceToCenterMm: Math.round(minDistance * 100) / 100,
		netClearanceMm: netClearance,
		safetyStatus: status,
		isSafe: status === "safe",
		isWarning: status === "warning",
		isDanger: status === "danger",
		telemetryTextRu: formatNerveClearanceMetric(netClearance),
		safetyMarginMm,
	};
}

/**
 * Library search and filtering helpers.
 */
export function getImplantsByBrand(brand: ImplantBrandKey): ImplantModel[] {
	return FULL_IMPLANT_LIBRARY.filter((i) => i.brand === brand);
}

export function filterImplantLibrary(criteria: {
	readonly brand?: ImplantBrandKey;
	readonly diameterMm?: number;
	readonly lengthMm?: number;
	readonly minDiameter?: number;
	readonly maxDiameter?: number;
	readonly minLength?: number;
	readonly maxLength?: number;
}): ImplantModel[] {
	return FULL_IMPLANT_LIBRARY.filter((item) => {
		if (criteria.brand && item.brand !== criteria.brand) return false;
		if (criteria.diameterMm && Math.abs(item.diameterMm - criteria.diameterMm) > 0.15) return false;
		if (criteria.lengthMm && Math.abs(item.lengthMm - criteria.lengthMm) > 0.3) return false;
		if (criteria.minDiameter && item.diameterMm < criteria.minDiameter - 0.05) return false;
		if (criteria.maxDiameter && item.diameterMm > criteria.maxDiameter + 0.05) return false;
		if (criteria.minLength && item.lengthMm < criteria.minLength - 0.05) return false;
		if (criteria.maxLength && item.lengthMm > criteria.maxLength + 0.05) return false;
		return true;
	});
}

export function findImplantById(id: string): ImplantModel | undefined {
	return FULL_IMPLANT_LIBRARY.find((i) => i.id === id);
}

export function getAvailableDiameters(brand?: ImplantBrandKey): number[] {
	const items = brand ? getImplantsByBrand(brand) : FULL_IMPLANT_LIBRARY;
	const set = new Set<number>();
	for (const item of items) {
		set.add(item.diameterMm);
	}
	return Array.from(set).sort((a, b) => a - b);
}

export function getAvailableLengths(brand?: ImplantBrandKey, diameter?: number): number[] {
	let items = brand ? getImplantsByBrand(brand) : FULL_IMPLANT_LIBRARY;
	if (diameter !== undefined) {
		items = items.filter((i) => Math.abs(i.diameterMm - diameter) <= 0.15);
	}
	const set = new Set<number>();
	for (const item of items) {
		set.add(item.lengthMm);
	}
	return Array.from(set).sort((a, b) => a - b);
}
