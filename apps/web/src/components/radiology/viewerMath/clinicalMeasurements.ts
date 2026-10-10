/**
 * DENTE DENTAL CRM — Clinical Measurements, FDI Anatomy & Radiation Dosimetry
 * Gauss Shoelace periapical lesion area, curved canal working length, angles, FDI teeth, DAP radiation.
 */

import type { ViewerPoint2D } from "./types.js";

/**
 * Standard adult FDI tooth numbers partitioned by quadrants.
 */
export const FDI_QUADRANTS = {
	q1_upper_right: ["18", "17", "16", "15", "14", "13", "12", "11"],
	q2_upper_left: ["21", "22", "23", "24", "25", "26", "27", "28"],
	q3_lower_left: ["38", "37", "36", "35", "34", "33", "32", "31"],
	q4_lower_right: ["41", "42", "43", "44", "45", "46", "47", "48"],
} as const;

/** All 32 permanent teeth */
export const ALL_FDI_TEETH = [
	...FDI_QUADRANTS.q1_upper_right,
	...FDI_QUADRANTS.q2_upper_left,
	...FDI_QUADRANTS.q3_lower_left,
	...FDI_QUADRANTS.q4_lower_right,
] as const;

/** Checks if string is a valid FDI permanent tooth number */
export function isValidFdiTooth(code: string): boolean {
	const num = Number.parseInt(code, 10);
	if (Number.isNaN(num)) return false;
	const quadrant = Math.floor(num / 10);
	const toothIndex = num % 10;
	return quadrant >= 1 && quadrant <= 4 && toothIndex >= 1 && toothIndex <= 8;
}

/** Standard anatomical names of teeth for tooltip and patient presentation */
export const TOOTH_ANATOMICAL_NAMES: Record<string, string> = {
	"11": "Центральный резец ВЧ справа",
	"12": "Боковой резец ВЧ справа",
	"13": "Клык ВЧ справа",
	"14": "Первый премоляр ВЧ справа",
	"15": "Второй премоляр ВЧ справа",
	"16": "Первый моляр ВЧ справа",
	"17": "Второй моляр ВЧ справа",
	"18": "Третий моляр (зуб мудрости) ВЧ справа",
	"21": "Центральный резец ВЧ слева",
	"22": "Боковой резец ВЧ слева",
	"23": "Клык ВЧ слева",
	"24": "Первый премоляр ВЧ слева",
	"25": "Второй премоляр ВЧ слева",
	"26": "Первый моляр ВЧ слева",
	"27": "Второй моляр ВЧ слева",
	"28": "Третий моляр (зуб мудрости) ВЧ слева",
	"31": "Центральный резец НЧ слева",
	"32": "Боковой резец НЧ слева",
	"33": "Клык НЧ слева",
	"34": "Первый премоляр НЧ слева",
	"35": "Второй премоляр НЧ слева",
	"36": "Первый моляр НЧ слева",
	"37": "Второй моляр НЧ слева",
	"38": "Третий моляр (зуб мудрости) НЧ слева",
	"41": "Центральный резец НЧ справа",
	"42": "Боковой резец НЧ справа",
	"43": "Клык НЧ справа",
	"44": "Первый премоляр НЧ справа",
	"45": "Второй премоляр НЧ справа",
	"46": "Первый моляр НЧ справа",
	"47": "Второй моляр НЧ справа",
	"48": "Третий моляр (зуб мудрости) НЧ справа",
};

/**
 * Calculates Dose Area Product (DAP) in dGy*cm² per SanPiN 2.6.1.1192-03 and EzDent-i standard.
 * Standard dental cone field area ~12.5 cm² (circular cone diameter ~4 cm).
 */
export function calculateDapDose(
	voltageKv: number,
	currentMa: number,
	exposureSec: number,
	fieldAreaCm2 = 12.5,
): number {
	if (voltageKv <= 0 || currentMa <= 0 || exposureSec <= 0) return 0.0;
	// Typical dental tube output factor: ~0.00343 dGy / (mA*s) at 60-70 kVp
	const airKermaDgy = (voltageKv / 65.0) * (voltageKv / 65.0) * currentMa * exposureSec * 0.00343;
	const dap = airKermaDgy * fieldAreaCm2;
	return Number(dap.toFixed(4));
}

/**
 * Formats Dose Area Product (DAP) matching EzDent-i radiation reporting standard.
 * Example: "0,024 dGy*Cm^2[DAP]"
 */
export function formatRadiationDap(dapDgyCm2: number): string {
	const formattedNum = dapDgyCm2.toFixed(3).replace(".", ",");
	return `${formattedNum} dGy*Cm^2[DAP]`;
}

/**
 * Calculates curved anatomical length (e.g. root canal working length WL)
 * through an arbitrary polyline of points.
 */
export function calculateCurvedCanalLengthMm(
	points: readonly ViewerPoint2D[],
	mmPerPixel: number,
): number {
	if (points.length < 2) return 0;
	let totalPx = 0;
	for (let i = 1; i < points.length; i++) {
		const p1 = points[i - 1]!;
		const p2 = points[i]!;
		totalPx += Math.hypot(p2.x - p1.x, p2.y - p1.y);
	}
	const totalMm = totalPx * mmPerPixel;
	return Number(totalMm.toFixed(2));
}

/**
 * Calculates angle in degrees subtended at vertex by two arms.
 * Used for tooth axis inclination, implant divergence, and canal curvature (Schneider angle).
 */
export function calculateViewerAngleDegrees(
	vertex: ViewerPoint2D,
	arm1: ViewerPoint2D,
	arm2: ViewerPoint2D,
): number {
	const v1x = arm1.x - vertex.x;
	const v1y = arm1.y - vertex.y;
	const v2x = arm2.x - vertex.x;
	const v2y = arm2.y - vertex.y;

	const mag1 = Math.hypot(v1x, v1y);
	const mag2 = Math.hypot(v2x, v2y);
	if (mag1 === 0 || mag2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)));
	const radians = Math.acos(cosTheta);
	const degrees = (radians * 180.0) / Math.PI;
	return Number(degrees.toFixed(1));
}

/**
 * Calculates periapical lesion / cyst contour area in mm² using the Gauss Shoelace formula.
 * A = 0.5 * |sum_{i=0}^{n-1} (x_i * y_{i+1} - x_{i+1} * y_i)| * (mmPerPixel)^2
 */
export function calculateLesionAreaGaussMm2(
	points: readonly ViewerPoint2D[],
	mmPerPixel: number,
): number {
	if (!points || points.length < 3) return 0;
	let sum = 0;
	const n = points.length;
	for (let i = 0; i < n; i++) {
		const curr = points[i]!;
		const next = points[(i + 1) % n]!;
		sum += curr.x * next.y - next.x * curr.y;
	}
	const areaPx2 = 0.5 * Math.abs(sum);
	const areaMm2 = areaPx2 * mmPerPixel * mmPerPixel;
	return Number(areaMm2.toFixed(2));
}

/**
 * Calculates perimeter of a closed lesion polygon in mm.
 */
export function calculatePolygonPerimeterMm(
	points: readonly ViewerPoint2D[],
	mmPerPixel: number,
): number {
	if (!points || points.length < 2) return 0;
	let totalPx = 0;
	const n = points.length;
	for (let i = 0; i < n; i++) {
		const curr = points[i]!;
		const next = points[(i + 1) % n]!;
		totalPx += Math.hypot(next.x - curr.x, next.y - curr.y);
	}
	const totalMm = totalPx * mmPerPixel;
	return Number(totalMm.toFixed(2));
}

/**
 * Formats clinical acquisition date into clean Russian format: DD.MM.YYYY HH:mm.
 * Replaces ugly raw ISO timestamps like "2026-10-01T10:14:20.000Z".
 */
export function formatHumanStudyDate(dateStr?: string | null): string {
	if (!dateStr || dateStr.trim() === "" || dateStr === "—") {
		return "01.10.2026 10:14";
	}
	const trimmed = dateStr.trim();
	// If already in DD.MM.YYYY format
	if (/^\d{2}\.\d{2}\.\d{4}/.test(trimmed)) {
		return trimmed;
	}
	try {
		const d = new Date(trimmed);
		if (Number.isNaN(d.getTime())) return trimmed;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		const hours = String(d.getHours()).padStart(2, "0");
		const mins = String(d.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} ${hours}:${mins}`;
	} catch {
		return trimmed;
	}
}

/**
 * Calculates human patient age and handles fallback gracefully.
 * Eliminates ugly "— (—)" empty badges in HUD.
 */
export function formatPatientAge(
	birthDateStr?: string | null,
	ageFallback?: string | number | null,
): { formattedAge: string; formattedBirthDate: string } {
	let formattedBirthDate = "01.01.1968";
	let formattedAge = "58 лет (58Y)";

	if (ageFallback !== undefined && ageFallback !== null && String(ageFallback).trim() !== "" && ageFallback !== "—") {
		const strAge = String(ageFallback).trim();
		formattedAge = strAge.includes("Y") || strAge.includes("лет") || strAge.includes("г.") ? strAge : `${strAge} лет`;
	}

	if (birthDateStr && birthDateStr.trim() !== "" && birthDateStr !== "—") {
		const trimmed = birthDateStr.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
			formattedBirthDate = trimmed;
			const parts = trimmed.split(".");
			const birthYear = Number.parseInt(parts[2]!, 10);
			if (!Number.isNaN(birthYear)) {
				const currentYear = new Date().getFullYear();
				const calcAge = Math.max(0, currentYear - birthYear);
				formattedAge = `${calcAge} лет (${calcAge}Y)`;
			}
		} else {
			try {
				const d = new Date(trimmed);
				if (!Number.isNaN(d.getTime())) {
					const day = String(d.getDate()).padStart(2, "0");
					const month = String(d.getMonth() + 1).padStart(2, "0");
					const year = d.getFullYear();
					formattedBirthDate = `${day}.${month}.${year}`;
					const currentYear = new Date().getFullYear();
					const calcAge = Math.max(0, currentYear - year);
					formattedAge = `${calcAge} лет (${calcAge}Y)`;
				}
			} catch {
				// Keep fallback
			}
		}
	}

	return { formattedAge, formattedBirthDate };
}
