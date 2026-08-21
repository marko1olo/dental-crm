import type {
	DicomViewerToolStateAnnotation,
	DicomViewerToolStatePoint,
	ImagingViewerAnnotationSemanticRole,
	ImagingViewerImplantPlan,
} from "@dental/shared";
import { finiteOrNull, polylineLengthMm, round1, round2 } from "./mprMath";

export type CtPlanningGeometryMetric = {
	id: string;
	title: string;
	valueLabel: string;
	detail: string;
	source: string;
	tone: "ready" | "attention";
};

export type CtPlanningDistanceMeasurementRole =
	ImagingViewerAnnotationSemanticRole;

export type CtPlanningDistanceMeasurement = {
	id: string;
	valueMm: number;
	label: string;
	role: CtPlanningDistanceMeasurementRole;
	toothCode: string | null;
	viewportId: string;
	frameOfReferenceUid: string | null;
	referencedImageId: string | null;
};

export type CtPlanningGeometrySummary = {
	measurementCount: number;
	curveCount: number;
	areaCount: number;
	volumeCount: number;
	roiAreaTotalMm2: number | null;
	roiVolumeTotalMm3: number | null;
	roiVolumeSlabMm: number;
	roiDraftCount: number;
	implantSiteToothCode: string | null;
	siteEvidenceToothCodes: string[];
	distanceMeasurements: CtPlanningDistanceMeasurement[];
	distanceMeasurementsMm: number[];
	minimumClearanceMm: number | null;
	implantVolumeMm3: number | null;
	metrics: CtPlanningGeometryMetric[];
	warnings: string[];
};

function normalizedToothCode(value: string | null | undefined) {
	const clean = value?.trim();
	return clean ? clean.toUpperCase() : null;
}

function polygonAreaMm2(points: DicomViewerToolStatePoint[]) {
	if (points.length < 3) return null;
	let twiceArea = 0;
	for (let index = 0; index < points.length; index += 1) {
		const currentPoint = points[index];
		const nextPoint = points[(index + 1) % points.length];
		if (!currentPoint || !nextPoint) continue;
		const current = currentPoint.world;
		const next = nextPoint.world;
		twiceArea += current[0] * next[1] - next[0] * current[1];
	}
	return finiteOrNull(Math.abs(twiceArea) / 2);
}

function angleDeg(points: DicomViewerToolStatePoint[]) {
	if (points.length < 3) return null;
	const first = points[0];
	const middle = points[1];
	const last = points[2];
	if (!first || !middle || !last) return null;
	const a = first.world;
	const b = middle.world;
	const c = last.world;
	const abX = a[0] - b[0];
	const abY = a[1] - b[1];
	const abZ = a[2] - b[2];
	const cbX = c[0] - b[0];
	const cbY = c[1] - b[1];
	const cbZ = c[2] - b[2];
	const abLen = Math.hypot(abX, abY, abZ);
	const cbLen = Math.hypot(cbX, cbY, cbZ);
	if (abLen <= 0 || cbLen <= 0) return null;
	const cosine = Math.max(
		-1,
		Math.min(1, (abX * cbX + abY * cbY + abZ * cbZ) / (abLen * cbLen)),
	);
	return finiteOrNull((Math.acos(cosine) * 180) / Math.PI);
}

function pointToSegmentDistanceMm(
	point: DicomViewerToolStatePoint,
	start: DicomViewerToolStatePoint,
	end: DicomViewerToolStatePoint,
) {
	const px = point.world[0];
	const py = point.world[1];
	const pz = point.world[2];
	const sx = start.world[0];
	const sy = start.world[1];
	const sz = start.world[2];
	const ex = end.world[0];
	const ey = end.world[1];
	const ez = end.world[2];
	const vx = ex - sx;
	const vy = ey - sy;
	const vz = ez - sz;
	const lengthSq = vx * vx + vy * vy + vz * vz;
	const t =
		lengthSq <= 0
			? 0
			: Math.max(
					0,
					Math.min(
						1,
						((px - sx) * vx + (py - sy) * vy + (pz - sz) * vz) / lengthSq,
					),
				);
	return Math.hypot(px - (sx + vx * t), py - (sy + vy * t), pz - (sz + vz * t));
}

function minimumImplantCanalClearanceMm(
	annotations: DicomViewerToolStateAnnotation[],
) {
	const implantAxis = annotations.find(
		(annotation) =>
			annotation.type === "implant_axis" && annotation.points.length >= 2,
	);
	const canal = annotations.find(
		(annotation) =>
			annotation.type === "nerve_canal" && annotation.points.length >= 3,
	);
	if (!implantAxis || !canal) return null;
	const start = implantAxis.points[0];
	const end = implantAxis.points[implantAxis.points.length - 1];
	if (!start || !end) return null;
	let minimum = Number.POSITIVE_INFINITY;
	for (const point of canal.points) {
		minimum = Math.min(minimum, pointToSegmentDistanceMm(point, start, end));
	}
	return finiteOrNull(minimum);
}

function implantCylinderVolumeMm3(
	implantPlan: ImagingViewerImplantPlan | null,
) {
	if (!implantPlan) return null;
	const radius = implantPlan.diameterMm / 2;
	return finiteOrNull(Math.PI * radius * radius * implantPlan.lengthMm);
}

function metricValue(
	annotation: DicomViewerToolStateAnnotation,
	slabMm: number,
) {
	if (
		typeof annotation.measurement.value === "number" &&
		Number.isFinite(annotation.measurement.value)
	) {
		return annotation.measurement.value;
	}
	if (annotation.type === "distance" || annotation.type === "implant_axis") {
		return annotation.points.length >= 2
			? polylineLengthMm(annotation.points)
			: null;
	}
	if (annotation.type === "angle") return angleDeg(annotation.points);
	if (annotation.type === "roi" || annotation.type === "area_roi")
		return polygonAreaMm2(annotation.points);
	if (annotation.type === "volume_roi") {
		const area = polygonAreaMm2(annotation.points);
		return area === null ? null : area * slabMm;
	}
	if (
		annotation.type === "nerve_canal" ||
		annotation.type === "panoramic_curve"
	) {
		return annotation.points.length >= 3
			? polylineLengthMm(annotation.points)
			: null;
	}
	return null;
}

function metricUnit(annotation: DicomViewerToolStateAnnotation) {
	if (annotation.measurement.unit) return annotation.measurement.unit;
	if (annotation.type === "angle") return "deg";
	if (annotation.type === "roi" || annotation.type === "area_roi") return "mm2";
	if (annotation.type === "volume_roi") return "mm3";
	if (
		annotation.type === "distance" ||
		annotation.type === "implant_axis" ||
		annotation.type === "nerve_canal" ||
		annotation.type === "panoramic_curve"
	)
		return "mm";
	return "";
}

function metricTitle(annotation: DicomViewerToolStateAnnotation) {
	if (annotation.type === "distance") return "Линейка";
	if (annotation.type === "angle") return "Угол";
	if (annotation.type === "area_roi" || annotation.type === "roi")
		return "Площадь";
	if (annotation.type === "volume_roi") return "Объем";
	if (annotation.type === "implant_axis") return "Ось импланта";
	if (annotation.type === "nerve_canal") return "Канал";
	if (annotation.type === "panoramic_curve") return "ОПТГ дуга";
	if (annotation.type === "bone_density_probe") return "Плотность";
	return annotation.label || "Разметка";
}

function distanceMeasurementRole(
	annotation: DicomViewerToolStateAnnotation,
): CtPlanningDistanceMeasurementRole {
	if (annotation.semanticRole) return annotation.semanticRole;
	const text =
		`${annotation.label} ${annotation.note} ${annotation.warnings.join(" ")}`.toLowerCase();
	if (text.includes("ridge_width") || text.includes("ширин"))
		return "ridge_width";
	if (text.includes("bone_height") || text.includes("высот"))
		return "bone_height";
	if (
		text.includes("clearance") ||
		text.includes("канал") ||
		text.includes("отступ")
	)
		return "clearance";
	return "generic";
}

function hasCurveGeometry(annotation: DicomViewerToolStateAnnotation) {
	return (
		(annotation.type === "panoramic_curve" ||
			annotation.type === "nerve_canal") &&
		annotation.points.length >= 3
	);
}

function uniqueToothCodes(annotations: DicomViewerToolStateAnnotation[]) {
	return Array.from(
		new Set(
			annotations
				.map((annotation) => normalizedToothCode(annotation.toothCode))
				.filter((toothCode): toothCode is string => Boolean(toothCode)),
		),
	).sort();
}

function inferImplantSiteToothCode(
	annotations: DicomViewerToolStateAnnotation[],
	distanceMeasurements: CtPlanningDistanceMeasurement[],
) {
	const axisOrGuideCodes = uniqueToothCodes(
		annotations.filter(
			(annotation) =>
				annotation.type === "implant_axis" ||
				annotation.type === "surgical_guide",
		),
	);
	if (axisOrGuideCodes.length === 1) return axisOrGuideCodes[0];

	const signedRulerCodes = Array.from(
		new Set(
			distanceMeasurements
				.filter(
					(measurement) =>
						measurement.role === "ridge_width" ||
						measurement.role === "bone_height",
				)
				.map((measurement) => normalizedToothCode(measurement.toothCode))
				.filter((toothCode): toothCode is string => Boolean(toothCode)),
		),
	).sort();
	if (signedRulerCodes.length === 1) return signedRulerCodes[0];

	const allCodes = uniqueToothCodes(annotations);
	return allCodes.length === 1 ? allCodes[0] : null;
}

function hasAreaGeometry(annotation: DicomViewerToolStateAnnotation) {
	return (
		(annotation.type === "roi" || annotation.type === "area_roi") &&
		annotation.points.length >= 3
	);
}

function hasVolumeGeometry(annotation: DicomViewerToolStateAnnotation) {
	return annotation.type === "volume_roi" && annotation.points.length >= 3;
}

function hasIncompleteRoiGeometry(annotation: DicomViewerToolStateAnnotation) {
	return (
		(annotation.type === "roi" ||
			annotation.type === "area_roi" ||
			annotation.type === "volume_roi") &&
		annotation.points.length > 0 &&
		annotation.points.length < 3
	);
}

export function buildCtPlanningGeometrySummary(input: {
	annotations: DicomViewerToolStateAnnotation[];
	implantPlan: ImagingViewerImplantPlan | null;
	slabMm: number;
}): CtPlanningGeometrySummary {
	const slabMm =
		Number.isFinite(input.slabMm) && input.slabMm > 0 ? input.slabMm : 1;
	const metrics: CtPlanningGeometryMetric[] = [];
	const distanceMeasurements: CtPlanningDistanceMeasurement[] = [];
	const distanceMeasurementsMm: number[] = [];
	let roiAreaTotalMm2 = 0;
	let roiAreaValueCount = 0;
	let roiVolumeTotalMm3 = 0;
	let roiVolumeValueCount = 0;
	for (const annotation of input.annotations) {
		const value = metricValue(annotation, slabMm);
		if (value === null) continue;
		if (
			(annotation.type === "roi" || annotation.type === "area_roi") &&
			hasAreaGeometry(annotation)
		) {
			roiAreaTotalMm2 += value;
			roiAreaValueCount += 1;
		}
		if (annotation.type === "volume_roi" && hasVolumeGeometry(annotation)) {
			roiVolumeTotalMm3 += value;
			roiVolumeValueCount += 1;
		}
		if (annotation.type === "distance") {
			const roundedValue = round2(value);
			const role = distanceMeasurementRole(annotation);
			distanceMeasurements.push({
				id: annotation.id,
				valueMm: roundedValue,
				label: annotation.label,
				role,
				toothCode: normalizedToothCode(annotation.toothCode),
				viewportId: annotation.viewportId,
				frameOfReferenceUid: annotation.frameOfReferenceUid,
				referencedImageId: annotation.referencedImageId,
			});
			distanceMeasurementsMm.push(roundedValue);
		}
		const unit = metricUnit(annotation);
		metrics.push({
			id: annotation.id,
			title: metricTitle(annotation),
			valueLabel: `${round2(value)} ${unit}`.trim(),
			detail: annotation.toothCode
				? `${annotation.label} · зуб ${annotation.toothCode}`
				: annotation.label,
			source: annotation.type,
			tone: annotation.needsReview ? "attention" : "ready",
		});
	}
	const annotationMetricCount = metrics.length;

	const minimumClearanceMm = minimumImplantCanalClearanceMm(input.annotations);
	if (minimumClearanceMm !== null) {
		metrics.unshift({
			id: "minimum-implant-canal-clearance",
			title: "Отступ до канала",
			valueLabel: `${round2(minimumClearanceMm)} mm`,
			detail: "Минимальная дистанция от оси импланта до размеченного канала.",
			source: "implant_axis+nerve_canal",
			tone: minimumClearanceMm < 2 ? "attention" : "ready",
		});
	}

	const implantVolumeMm3 = implantCylinderVolumeMm3(input.implantPlan);
	if (implantVolumeMm3 !== null && input.implantPlan) {
		metrics.unshift({
			id: "implant-cylinder-volume",
			title: "Имплант",
			valueLabel: `${input.implantPlan.diameterMm} x ${input.implantPlan.lengthMm} mm`,
			detail: `Цилиндрическая оценка объема: ${round1(implantVolumeMm3)} mm3.`,
			source: "implant_library",
			tone: "ready",
		});
	}

	const warnings: string[] = [];
	if (minimumClearanceMm !== null && minimumClearanceMm < 2)
		warnings.push("Отступ до канала меньше 2 мм.");
	if (input.annotations.some((annotation) => annotation.needsReview))
		warnings.push("Есть разметки, требующие проверки калибровки.");
	const roiDraftCount = input.annotations.filter(
		hasIncompleteRoiGeometry,
	).length;
	if (roiDraftCount > 0)
		warnings.push("Есть контуры с недостаточным числом точек.");
	if (roiVolumeValueCount > 0)
		warnings.push(
			`Объем по контуру рассчитан через слой ${round2(slabMm)} мм; это не сегментация тканей.`,
		);

	const siteEvidenceToothCodes = uniqueToothCodes(input.annotations);
	const implantSiteToothCode =
		inferImplantSiteToothCode(input.annotations, distanceMeasurements) ?? null;
	if (siteEvidenceToothCodes.length > 1)
		warnings.push(
			"Измерения КТ относятся к нескольким зубам; скрининг импланта остается черновиком до подтверждения участка.",
		);

	return {
		measurementCount: annotationMetricCount,
		curveCount: input.annotations.filter(hasCurveGeometry).length,
		areaCount: roiAreaValueCount,
		volumeCount: roiVolumeValueCount,
		roiAreaTotalMm2: roiAreaValueCount > 0 ? round2(roiAreaTotalMm2) : null,
		roiVolumeTotalMm3:
			roiVolumeValueCount > 0 ? round2(roiVolumeTotalMm3) : null,
		roiVolumeSlabMm: round2(slabMm),
		roiDraftCount,
		implantSiteToothCode,
		siteEvidenceToothCodes,
		distanceMeasurements,
		distanceMeasurementsMm,
		minimumClearanceMm,
		implantVolumeMm3,
		metrics: metrics.slice(0, 8),
		warnings,
	};
}

export type FurcationGrade = 0 | 1 | 2 | 3 | 4;

export interface FurcationSiteGeometry {
	readonly id: string;
	readonly nameRu: string;
	readonly position: { readonly x: number; readonly y: number };
	readonly type:
		| "bifurcation"
		| "trifurcation_buccal"
		| "trifurcation_mesial"
		| "trifurcation_distal";
}

export interface PeriodontalBoneCrestLines {
	readonly normal: string;
	readonly mild: string;
	readonly moderate: string;
	readonly severe: string;
}

export interface FurcationMarkerSvg {
	readonly path: string;
	readonly fill: string;
	readonly stroke: string;
	readonly strokeWidth: number;
	readonly labelRu: string;
}

/**
 * Generate SVG marker path and styling for furcation involvement (Grade I..IV).
 */
export function getFurcationMarkerSvg(
	grade: FurcationGrade,
	x: number,
	y: number,
	isTop: boolean,
	size = 7,
): FurcationMarkerSvg | null {
	if (grade <= 0) return null;

	const tipY = isTop ? y - size : y + size;
	const baseY = isTop ? y + size * 0.5 : y - size * 0.5;
	const leftX = x - size * 0.9;
	const rightX = x + size * 0.9;

	switch (grade) {
		case 1:
			// Grade I: Incipient involvement — open chevron / triangle pointing toward apex
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY}`,
				fill: "none",
				stroke: "#f59e0b",
				strokeWidth: 1.8,
				labelRu: "Фуркация I ст. (начальная, зонд < 3 мм)",
			};
		case 2:
			// Grade II: Cul-de-sac / partial involvement — outline triangle
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`,
				fill: "rgba(245, 158, 11, 0.25)",
				stroke: "#f59e0b",
				strokeWidth: 2,
				labelRu: "Фуркация II ст. (частичная/тупиковая, зонд > 3 мм)",
			};
		case 3:
			// Grade III: Through-and-through penetration — solid filled warning triangle
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`,
				fill: "#ef4444",
				stroke: "#991b1b",
				strokeWidth: 2,
				labelRu: "Фуркация III ст. (сквозной дефект бифуркации)",
			};
		case 4:
			// Grade IV: Through-and-through with gingival recession — filled diamond with alert stroke
			return {
				path: `M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`,
				fill: "#dc2626",
				stroke: "#7f1d1d",
				strokeWidth: 2.2,
				labelRu: "Фуркация IV ст. (сквозная с обнажением рецессией)",
			};
		default:
			return null;
	}
}

export type ToothGeometryType = {
	root: string;
	crown: string;
	canals?: string;
	fissures?: string;
	core?: string;
	apex?: { x: number; y: number }[];
	furcations?: FurcationSiteGeometry[];
	boneCrest?: PeriodontalBoneCrestLines;
	touchTargetMinPx?: number;
	surfaces: {
		V: string;
		O: string;
		M: string;
		D: string;
		L?: string;
		P?: string;
		[key: string]: string | undefined;
	};
};

export const TOOTH_GEOMETRY = {
	UPPER_CENTRAL_INCISOR: {
		root: "M 35 85 C 33 60, 36 28, 50 8 C 64 28, 67 60, 65 85 Z",
		crown:
			"M 35 85 C 28 96, 22 122, 30 144 C 32 147, 48 147, 50 146 C 52 147, 68 147, 70 144 C 78 122, 72 96, 65 85 Q 50 81 35 85 Z",
		canals: "M 50 118 C 50 90, 50 45, 50 10",
		apex: [{ x: 50, y: 8 }],
		core: "M 42 85 L 44 115 Q 50 120 56 115 L 58 85 Z",
		boneCrest: {
			normal: "M 22 76 Q 50 72 78 76",
			mild: "M 22 66 Q 50 62 78 66",
			moderate: "M 22 52 Q 50 48 78 52",
			severe: "M 22 34 Q 50 30 78 34",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 35 85 C 40 88, 60 88, 65 85 L 66 130 C 50 133, 40 133, 34 130 Z",
			O: "M 30 144 C 32 147, 68 147, 70 144 L 66 130 C 50 133, 40 133, 34 130 Z",
			M: "M 35 85 C 28 96, 22 122, 30 144 L 34 130 L 35 85 Z",
			D: "M 65 85 C 72 96, 78 122, 70 144 L 66 130 L 65 85 Z",
			L: "M 34 130 C 40 133, 50 133, 66 130 L 70 144 C 58 147, 42 147, 30 144 Z",
		},
	},

	UPPER_LATERAL_INCISOR: {
		root: "M 38 85 C 36 60, 39 30, 50 12 C 58 30, 64 60, 62 85 Z",
		crown:
			"M 38 85 C 32 96, 28 120, 36 142 C 40 145, 60 145, 64 142 C 72 120, 68 96, 62 85 Q 50 81 38 85 Z",
		fissures: "M 50 129 L 50 138",
		core: "M 42 85 L 44 115 Q 50 120 56 115 L 58 85 Z",
		canals: "M 50 118 C 50 88, 48 45, 50 14",
		apex: [{ x: 50, y: 12 }],
		boneCrest: {
			normal: "M 24 76 Q 50 72 76 76",
			mild: "M 24 66 Q 50 62 76 66",
			moderate: "M 24 52 Q 50 48 76 52",
			severe: "M 24 34 Q 50 30 76 34",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 38 85 C 42 88, 58 88, 62 85 L 62 110 Q 50 114 38 110 Z",
			O: "M 38 110 Q 50 114 62 110 L 64 142 C 60 145, 40 145, 36 142 Z",
			M: "M 38 85 C 32 96, 28 120, 36 142 L 42 142 L 42 85 Z",
			D: "M 62 85 C 68 96, 72 120, 64 142 L 58 142 L 58 85 Z",
			L: "M 38 110 L 62 110 L 60 138 L 40 138 Z",
		},
	},

	UPPER_CANINE: {
		root: "M 33 85 C 30 55, 36 28, 50 4 C 64 28, 70 55, 67 85 Z",
		crown:
			"M 33 85 C 26 100, 16 122, 50 148 C 84 122, 74 100, 67 85 Q 50 80 33 85 Z",
		core: "M 42 85 L 44 115 Q 50 120 56 115 L 58 85 Z",
		canals: "M 50 122 C 50 85, 50 40, 50 6",
		apex: [{ x: 50, y: 4 }],
		boneCrest: {
			normal: "M 22 76 Q 50 71 78 76",
			mild: "M 22 65 Q 50 60 78 65",
			moderate: "M 22 50 Q 50 45 78 50",
			severe: "M 22 30 Q 50 25 78 30",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 33 85 C 38 88, 62 88, 67 85 L 63 114 Q 50 118 37 114 Z",
			O: "M 37 114 Q 50 118 63 114 L 50 148 Z",
			M: "M 33 85 C 26 100, 16 122, 50 148 L 37 114 Z",
			D: "M 67 85 C 74 100, 84 122, 50 148 L 63 114 Z",
			L: "M 37 114 L 50 148 L 63 114 Q 50 128 37 114 Z",
		},
	},

	UPPER_PREMOLAR: {
		root: "M 32 84 C 28 66, 28 42, 36 20 C 42 34, 46 48, 50 56 C 54 48, 58 34, 64 20 C 72 42, 72 66, 68 84 Z",
		crown:
			"M 32 84 C 22 98, 16 130, 42 142 Q 50 137, 58 142 C 84 130, 78 98, 68 84 Q 50 80 32 84 Z",
		canals: "M 42 92 C 38 72, 36 44, 36 20 M 58 92 C 62 72, 64 44, 64 20",
		core: "M 38 85 L 40 110 Q 50 115 60 110 L 62 85 Z",
		apex: [
			{ x: 36, y: 20 },
			{ x: 64, y: 20 },
		],
		furcations: [
			{
				id: "B_P_Furcation",
				nameRu: "Бифуркация верхнего премоляра",
				position: { x: 50, y: 56 },
				type: "bifurcation",
			},
		],
		boneCrest: {
			normal: "M 20 76 Q 50 71 80 76",
			mild: "M 20 66 Q 50 62 80 66",
			moderate: "M 20 54 Q 50 50 80 54",
			severe: "M 20 36 Q 50 32 80 36",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 32 84 C 36 88, 64 88, 68 84 L 64 112 Q 50 116 36 112 Z",
			O: "M 36 112 Q 50 116 64 112 L 58 142 Q 50 137, 42 142 Z",
			M: "M 32 84 C 22 98, 16 130, 42 142 L 36 112 Z",
			D: "M 68 84 C 78 98, 84 130, 58 142 L 64 112 Z",
			L: "M 36 112 L 64 112 L 60 134 Q 50 138 40 134 Z",
		},
	},

	UPPER_MOLAR: {
		root: "M 16 85 C 12 66, 16 40, 24 20 C 30 28, 34 46, 36 58 C 42 42, 46 22, 50 10 C 54 22, 58 42, 64 58 C 66 46, 70 28, 76 24 C 84 40, 88 66, 84 85 Z",
		crown:
			"M 16 85 C 10 98, 8 132, 25 142 C 34 148, 48 145, 50 138 C 52 145, 66 148, 75 142 C 92 132, 90 98, 84 85 Q 50 81 16 85 Z",
		canals:
			"M 36 94 C 32 78, 24 50, 24 20 M 50 94 C 50 72, 50 38, 50 10 M 64 94 C 68 78, 76 50, 76 24",
		apex: [
			{ x: 24, y: 20 },
			{ x: 50, y: 10 },
			{ x: 76, y: 24 },
		],
		furcations: [
			{
				id: "MB_DB_Buccal",
				nameRu: "Щечная трифуркация",
				position: { x: 50, y: 58 },
				type: "trifurcation_buccal",
			},
			{
				id: "MB_P_Mesial",
				nameRu: "Медиально-нёбная фуркация",
				position: { x: 36, y: 60 },
				type: "trifurcation_mesial",
			},
			{
				id: "DB_P_Distal",
				nameRu: "Дистально-нёбная фуркация",
				position: { x: 64, y: 60 },
				type: "trifurcation_distal",
			},
		],
		boneCrest: {
			normal: "M 12 76 Q 50 72 88 76",
			mild: "M 12 68 Q 50 64 88 68",
			moderate: "M 12 56 Q 50 52 88 56",
			severe: "M 12 40 Q 50 36 88 40",
		},
		touchTargetMinPx: 44,
		core: "M 30 85 L 35 110 Q 55 115 75 110 L 80 85 Z",
		fissures: "M 28 126 Q 50 134 72 126 M 50 110 L 50 136 M 36 112 Q 50 118 64 112",
		surfaces: {
			V: "M 16 85 C 32 82, 68 82, 84 85 L 70 112 Q 50 118 30 112 Z",
			O: "M 30 112 Q 50 118 70 112 L 66 134 Q 50 138 34 134 Z",
			M: "M 16 85 L 30 112 L 34 134 L 25 142 C 10 132, 10 98, 16 85 Z",
			D: "M 84 85 C 90 98, 90 132, 75 142 L 66 134 L 70 112 Z",
			L: "M 34 134 Q 50 138 66 134 L 75 142 C 66 148, 34 148, 25 142 Z",
		},
	},

	LOWER_INCISOR: {
		root: "M 28 76 C 28 98, 38 124, 50 148 C 62 124, 72 98, 72 76 Z",
		crown:
			"M 28 76 C 22 62, 20 28, 26 16 C 38 14, 62 14, 74 16 C 80 28, 78 62, 72 76 Q 50 80 28 76 Z",
		fissures: "M 34 20 L 66 20",
		canals: "M 50 70 C 50 92, 50 122, 50 148",
		core: "M 44 75 L 46 45 Q 50 40 54 45 L 56 75 Z",
		apex: [{ x: 50, y: 148 }],
		boneCrest: {
			normal: "M 24 84 Q 50 88 76 84",
			mild: "M 24 94 Q 50 98 76 94",
			moderate: "M 24 108 Q 50 112 76 108",
			severe: "M 24 126 Q 50 130 76 126",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 28 76 C 38 79, 62 79, 72 76 L 68 32 L 32 32 Z",
			O: "M 32 32 L 68 32 L 74 16 L 26 16 Z",
			M: "M 28 76 L 32 32 L 26 16 C 20 32, 22 62, 28 76 Z",
			D: "M 72 76 C 78 62, 80 32, 74 16 L 68 32 Z",
			L: "M 32 32 L 68 32 L 60 18 L 40 18 Z",
		},
	},

	LOWER_CANINE: {
		root: "M 26 76 C 24 98, 36 126, 50 152 C 64 126, 76 98, 74 76 Z",
		crown:
			"M 26 76 C 20 62, 18 34, 50 12 C 82 34, 80 62, 74 76 Q 50 80 26 76 Z",
		canals: "M 50 70 C 50 94, 50 126, 50 152",
		core: "M 44 75 L 46 45 Q 50 40 54 45 L 56 75 Z",
		apex: [{ x: 50, y: 152 }],
		boneCrest: {
			normal: "M 22 84 Q 50 89 78 84",
			mild: "M 22 95 Q 50 100 78 95",
			moderate: "M 22 110 Q 50 115 78 110",
			severe: "M 22 130 Q 50 135 78 130",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 26 76 C 38 79, 62 79, 74 76 L 62 46 Q 50 42 38 46 Z",
			O: "M 38 46 Q 50 42 62 46 L 50 12 Z",
			M: "M 26 76 L 38 46 L 50 12 C 28 28, 22 56, 26 76 Z",
			D: "M 74 76 C 78 56, 72 28, 50 12 L 62 46 Z",
			L: "M 38 46 L 50 12 L 62 46 Q 50 32 38 46 Z",
		},
	},

	LOWER_PREMOLAR: {
		root: "M 24 75 C 24 96, 36 124, 50 146 C 64 124, 76 96, 76 75 Z",
		crown:
			"M 24 75 C 18 63, 18 29, 34 17 C 44 13, 56 13, 66 17 C 82 29, 82 63, 76 75 Q 50 79 24 75 Z",
		canals: "M 50 68 C 50 90, 50 120, 50 146",
		core: "M 38 75 L 40 50 Q 50 45 60 50 L 62 75 Z",
		apex: [{ x: 50, y: 146 }],
		boneCrest: {
			normal: "M 20 84 Q 50 88 80 84",
			mild: "M 20 94 Q 50 98 80 94",
			moderate: "M 20 108 Q 50 112 80 108",
			severe: "M 20 126 Q 50 130 80 126",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 24 75 C 36 78, 64 78, 76 75 L 64 48 Q 50 44 36 48 Z",
			O: "M 36 48 Q 50 44 64 48 L 60 28 Q 50 24 40 28 Z",
			M: "M 24 75 L 36 48 L 40 28 L 34 17 C 18 29, 18 63, 24 75 Z",
			D: "M 76 75 C 82 63, 82 29, 66 17 L 60 28 L 64 48 Z",
			L: "M 40 28 Q 50 24 60 28 L 66 17 C 56 13, 44 13, 34 17 Z",
		},
	},

	LOWER_MOLAR: {
		root: "M 16 75 C 12 95, 18 122, 26 146 C 34 134, 42 118, 50 102 C 58 118, 66 134, 74 144 C 82 122, 88 95, 84 75 Z",
		crown:
			"M 16 75 C 10 62, 8 28, 25 18 C 34 12, 48 15, 50 22 C 52 15, 66 12, 75 18 C 92 28, 90 62, 84 75 Q 50 79 16 75 Z",
		fissures: "M 28 34 Q 50 26 72 34 M 50 50 L 50 24 M 36 48 Q 50 42 64 48",
		core: "M 25 80 L 30 55 Q 50 50 70 55 L 75 80 Z",
		canals:
			"M 36 66 C 32 86, 25 116, 26 146 M 64 66 C 66 86, 74 116, 74 144",
		apex: [
			{ x: 26, y: 146 },
			{ x: 74, y: 144 },
		],
		furcations: [
			{
				id: "M_D_Bifurcation_Buccal",
				nameRu: "Щечная бифуркация нижнего моляра",
				position: { x: 50, y: 102 },
				type: "bifurcation",
			},
			{
				id: "M_D_Bifurcation_Lingual",
				nameRu: "Язычная бифуркация нижнего моляра",
				position: { x: 50, y: 104 },
				type: "bifurcation",
			},
		],
		boneCrest: {
			normal: "M 12 84 Q 50 88 88 84",
			mild: "M 12 92 Q 50 96 88 92",
			moderate: "M 12 104 Q 50 108 88 104",
			severe: "M 12 122 Q 50 126 88 122",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 16 75 C 32 78, 68 78, 84 75 L 70 48 Q 50 42 30 48 Z",
			O: "M 30 48 Q 50 42 70 48 L 66 26 Q 50 22 34 26 Z",
			M: "M 16 75 L 30 48 L 34 26 L 25 18 C 10 28, 10 62, 16 75 Z",
			D: "M 84 75 C 90 62, 90 28, 75 18 L 66 26 L 70 48 Z",
			L: "M 34 26 Q 50 22 66 26 L 75 18 C 66 12, 34 12, 25 18 Z",
		},
	},

	PEDIATRIC_UPPER_INCISOR: {
		root: "M 35 85 C 33 72, 42 50, 50 36 C 58 50, 67 72, 65 85 Z",
		crown:
			"M 35 85 C 30 95, 22 125, 32 145 C 40 148, 60 148, 68 145 C 72 125, 75 95, 65 85 Q 50 82 35 85 Z",
		canals: "M 50 120 C 50 90, 50 65, 50 40",
		apex: [{ x: 50, y: 36 }],
		boneCrest: {
			normal: "M 24 78 Q 50 74 76 78",
			mild: "M 24 68 Q 50 64 76 68",
			moderate: "M 24 56 Q 50 52 76 56",
			severe: "M 24 44 Q 50 40 76 44",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 35 85 C 40 90, 60 90, 65 85 L 68 115 Q 50 120 32 115 Z",
			O: "M 32 115 Q 50 120 68 115 L 68 145 C 60 148, 40 148, 32 145 Z",
			M: "M 35 85 C 30 95, 28 125, 32 145 L 42 145 L 42 85 Z",
			D: "M 65 85 C 70 95, 72 125, 68 145 L 58 145 L 58 85 Z",
			L: "M 32 115 L 68 115 L 64 140 L 36 140 Z",
		},
	},

	PEDIATRIC_UPPER_CANINE: {
		root: "M 35 85 C 33 68, 42 46, 50 32 C 58 46, 67 68, 65 85 Z",
		crown:
			"M 35 85 C 30 105, 15 125, 53 148 C 65 135, 90 115, 65 85 Q 50 80 35 85 Z",
		canals: "M 50 125 C 50 90, 50 60, 50 36",
		apex: [{ x: 50, y: 32 }],
		boneCrest: {
			normal: "M 24 78 Q 50 74 76 78",
			mild: "M 24 68 Q 50 64 76 68",
			moderate: "M 24 54 Q 50 50 76 54",
			severe: "M 24 40 Q 50 36 76 40",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 35 85 C 40 90, 60 90, 65 85 L 65 115 Q 50 120 35 115 Z",
			O: "M 35 115 Q 50 120 65 115 L 50 148 Z",
			M: "M 35 85 C 30 105, 35 125, 50 148 C 45 125, 40 105, 35 85 Z",
			D: "M 65 85 C 70 105, 65 125, 50 148 C 55 125, 60 105, 65 85 Z",
			L: "M 35 115 L 65 115 L 50 148 Z",
		},
	},

	PEDIATRIC_UPPER_MOLAR: {
		root: "M 18 84 C 10 64, 10 38, 16 18 C 24 30, 32 48, 36 66 C 42 48, 46 28, 50 14 C 54 28, 58 48, 64 66 C 68 48, 76 30, 84 18 C 90 38, 90 64, 82 84 Z",
		crown:
			"M 18 84 C 12 96, 10 128, 28 138 C 36 142, 48 140, 50 134 C 52 140, 64 142, 72 138 C 90 128, 88 96, 82 84 Q 50 80 18 84 Z",
		canals:
			"M 36 92 C 30 70, 20 44, 16 18 M 50 92 C 50 70, 50 38, 50 14 M 64 92 C 70 70, 80 44, 84 18",
		apex: [
			{ x: 16, y: 18 },
			{ x: 50, y: 14 },
			{ x: 84, y: 18 },
		],
		furcations: [
			{
				id: "Pediatric_Trifurcation",
				nameRu: "Дивергирующая трифуркация молочного моляра",
				position: { x: 50, y: 66 },
				type: "trifurcation_buccal",
			},
		],
		boneCrest: {
			normal: "M 14 76 Q 50 72 86 76",
			mild: "M 14 66 Q 50 62 86 66",
			moderate: "M 14 54 Q 50 50 86 54",
			severe: "M 14 38 Q 50 34 86 38",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 18 84 C 32 81, 68 81, 82 84 L 68 110 Q 50 116 32 110 Z",
			O: "M 32 110 Q 50 116 68 110 L 64 130 Q 50 134 36 130 Z",
			M: "M 18 84 L 32 110 L 36 130 L 28 138 C 12 128, 12 96, 18 84 Z",
			D: "M 82 84 C 88 96, 88 128, 72 138 L 64 130 L 68 110 Z",
			L: "M 36 130 Q 50 134 64 130 L 72 138 C 64 142, 36 142, 28 138 Z",
		},
	},

	PEDIATRIC_LOWER_INCISOR: {
		root: "M 40 75 C 38 90, 42 110, 50 125 C 58 110, 62 90, 60 75 Z",
		crown:
			"M 40 75 C 36 60, 36 35, 40 25 C 45 22, 55 22, 60 25 C 64 35, 64 60, 60 75 Q 50 78 40 75 Z",
		canals: "M 50 55 C 50 75, 50 95, 50 120",
		apex: [{ x: 50, y: 125 }],
		boneCrest: {
			normal: "M 28 82 Q 50 86 72 82",
			mild: "M 28 92 Q 50 96 72 92",
			moderate: "M 28 104 Q 50 108 72 104",
			severe: "M 28 116 Q 50 120 72 116",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 40 75 C 42 70, 58 70, 60 75 L 60 55 Q 50 50 40 55 Z",
			O: "M 40 55 Q 50 50 60 55 L 60 25 C 55 22, 45 22, 40 25 Z",
			M: "M 40 75 C 36 60, 36 35, 40 25 C 40 45, 40 65, 40 75 Z",
			D: "M 60 75 C 64 60, 64 35, 60 25 C 60 45, 60 65, 60 75 Z",
			L: "M 40 55 L 60 55 L 56 30 L 44 30 Z",
		},
	},

	PEDIATRIC_LOWER_CANINE: {
		root: "M 35 72 C 33 90, 40 110, 50 128 C 60 110, 67 90, 65 72 Z",
		crown:
			"M 35 72 C 30 55, 35 30, 50 12 C 65 30, 70 55, 65 72 Q 50 75 35 72 Z",
		canals: "M 50 55 C 50 75, 50 98, 50 124",
		apex: [{ x: 50, y: 128 }],
		boneCrest: {
			normal: "M 26 80 Q 50 85 74 80",
			mild: "M 26 90 Q 50 95 74 90",
			moderate: "M 26 104 Q 50 109 74 104",
			severe: "M 26 118 Q 50 123 74 118",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 35 72 C 40 68, 60 68, 65 72 L 65 45 Q 50 40 35 45 Z",
			O: "M 35 45 Q 50 40 65 45 L 50 12 Z",
			M: "M 35 72 C 30 55, 35 30, 50 12 C 45 35, 40 55, 35 72 Z",
			D: "M 65 72 C 70 55, 65 30, 50 12 C 55 35, 60 55, 65 72 Z",
			L: "M 35 45 L 65 45 L 50 12 Z",
		},
	},

	PEDIATRIC_LOWER_MOLAR: {
		root: "M 18 76 C 10 96, 10 122, 16 142 C 26 130, 36 110, 50 90 C 64 110, 74 130, 84 142 C 90 122, 90 96, 82 76 Z",
		crown:
			"M 18 76 C 12 64, 10 32, 28 22 C 36 18, 48 20, 50 26 C 52 20, 64 18, 72 22 C 90 32, 88 64, 82 76 Q 50 80 18 76 Z",
		canals:
			"M 36 68 C 28 88, 20 116, 16 142 M 64 68 C 72 88, 80 116, 84 142",
		apex: [
			{ x: 16, y: 142 },
			{ x: 84, y: 142 },
		],
		furcations: [
			{
				id: "Pediatric_Bifurcation",
				nameRu: "Дивергирующая бифуркация нижнего молочного моляра",
				position: { x: 50, y: 90 },
				type: "bifurcation",
			},
		],
		boneCrest: {
			normal: "M 14 84 Q 50 88 86 84",
			mild: "M 14 94 Q 50 98 86 94",
			moderate: "M 14 106 Q 50 110 86 106",
			severe: "M 14 122 Q 50 126 86 122",
		},
		touchTargetMinPx: 44,
		surfaces: {
			V: "M 18 76 C 32 79, 68 79, 82 76 L 68 50 Q 50 44 32 50 Z",
			O: "M 32 50 Q 50 44 68 50 L 64 30 Q 50 26 36 30 Z",
			M: "M 18 76 L 32 50 L 36 30 L 28 22 C 12 32, 12 64, 18 76 Z",
			D: "M 82 76 C 88 64, 88 32, 72 22 L 64 30 L 68 50 Z",
			L: "M 36 30 Q 50 26 64 30 L 72 22 C 64 18, 36 18, 28 22 Z",
		},
	},
} satisfies Record<string, ToothGeometryType>;

export const getToothPath = (toothId: number): ToothGeometryType => {
	const quadrant = Math.floor(toothId / 10);
	const index = toothId % 10;
	const isPediatric = quadrant >= 5;

	if (quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6) {
		if (index === 1 || index === 2)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_UPPER_INCISOR
				: index === 1
					? TOOTH_GEOMETRY.UPPER_CENTRAL_INCISOR
					: TOOTH_GEOMETRY.UPPER_LATERAL_INCISOR;
		if (index === 3)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_UPPER_CANINE
				: TOOTH_GEOMETRY.UPPER_CANINE;
		if (index <= 5)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_UPPER_MOLAR
				: TOOTH_GEOMETRY.UPPER_PREMOLAR;
		return TOOTH_GEOMETRY.UPPER_MOLAR;
	} else {
		if (index <= 2)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_LOWER_INCISOR
				: TOOTH_GEOMETRY.LOWER_INCISOR;
		if (index === 3)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_LOWER_CANINE
				: TOOTH_GEOMETRY.LOWER_CANINE;
		if (index <= 5)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_LOWER_MOLAR
				: TOOTH_GEOMETRY.LOWER_PREMOLAR;
		return TOOTH_GEOMETRY.LOWER_MOLAR;
	}
};

export const getToothConfig = (toothId: number) => {
	const num = toothId % 10;
	const quadrant = Math.floor(toothId / 10);
	// Proportional widths scaled to exactly 96px height with sterile touch targets >= 44px
	if (num <= 2)
		return {
			width: "44px",
			height: "96px",
			viewX: 20,
			viewWidth: 60,
			viewHeight: 150,
			touchTargetMinPx: 44,
		};
	if (num === 3)
		return {
			width: "48px",
			height: "96px",
			viewX: 15,
			viewWidth: 75,
			viewHeight: 150,
			touchTargetMinPx: 44,
		};
	if (num <= 5 && quadrant < 5)
		return {
			width: "50px",
			height: "96px",
			viewX: 12.5,
			viewWidth: 75,
			viewHeight: 150,
			touchTargetMinPx: 44,
		};
	return {
		width: "64px",
		height: "96px",
		viewX: 0,
		viewWidth: 100,
		viewHeight: 150,
		touchTargetMinPx: 44,
	};
};

/**
 * toothCrownGeometry.ts
 *
 * FDI-based 2D crown contour definitions for canvas rendering in CT overlay.
 * Shapes are normalized to a [-1, 1] coordinate space, then scaled at render time.
 */

export type ToothGroup = "incisor" | "canine" | "premolar" | "molar" | "wisdom";

/** Returns the morphological group for an FDI tooth number */
export function getToothGroup(fdi: number): ToothGroup {
	const tooth = fdi % 10; // last digit = tooth position in quadrant
	const quadrant = Math.floor(fdi / 10);
	if (tooth === 1 || tooth === 2) return "incisor";
	if (tooth === 3) return "canine";
	if (tooth === 4 || tooth === 5) return quadrant >= 5 ? "molar" : "premolar";
	if (tooth === 8) return "wisdom";
	return "molar";
}

export interface CrownProfile {
	/** Width in mm (buccal-lingual) */
	widthMm: number;
	/** Height in mm (incisal/occlusal to cervical) */
	heightMm: number;
	/** Number of cusps for display */
	cusps: number;
	/** Approximate cervical width fraction (0-1) relative to max width */
	cervicalNarrow: number;
}

/** Reference dimensions per morphological group */
export const CROWN_PROFILES: Record<ToothGroup, CrownProfile> = {
	incisor: { widthMm: 8, heightMm: 10, cusps: 0, cervicalNarrow: 0.7 },
	canine: { widthMm: 8, heightMm: 11, cusps: 1, cervicalNarrow: 0.65 },
	premolar: { widthMm: 9, heightMm: 9, cusps: 2, cervicalNarrow: 0.6 },
	molar: { widthMm: 12, heightMm: 8, cusps: 4, cervicalNarrow: 0.55 },
	wisdom: { widthMm: 10, heightMm: 7, cusps: 3, cervicalNarrow: 0.5 },
};

/**
 * Draw a schematic tooth crown mockup on canvas context.
 * The crown is drawn centered at (0, 0) in local space,
 * with the cervical margin at y=0 and the occlusal/incisal surface at y=-height.
 *
 * @param ctx Canvas 2D context (already translated & rotated to implant neck)
 * @param fdi FDI tooth number
 * @param pixelsPerMm Scale factor
 * @param isWarning If true, draw in warning red
 */
export function drawCrownMockup(
	ctx: CanvasRenderingContext2D,
	fdi: number,
	pixelsPerMm: number,
	isWarning: boolean,
): void {
	const group = getToothGroup(fdi);
	const profile = CROWN_PROFILES[group];

	const w = profile.widthMm * pixelsPerMm;
	const h = profile.heightMm * pixelsPerMm;
	const hw = w / 2;
	const cervW = (profile.widthMm * profile.cervicalNarrow * pixelsPerMm) / 2;

	const strokeColor = isWarning ? "#ef4444" : "#22d3ee";
	const fillColor = isWarning
		? "rgba(239, 68, 68, 0.15)"
		: "rgba(34, 211, 238, 0.15)";
	const labelColor = isWarning ? "#fca5a5" : "#a5f3fc";

	ctx.strokeStyle = strokeColor;
	ctx.fillStyle = fillColor;
	ctx.lineWidth = 1.5;
	ctx.setLineDash([3, 3]);

	// Anatomically specific crown drawing
	ctx.beginPath();

	if (group === "incisor") {
		// Shovel-shaped incisor
		ctx.moveTo(-cervW, 0); // cervical left
		ctx.bezierCurveTo(-hw * 0.8, -h * 0.3, -hw, -h * 0.7, -hw * 0.9, -h * 0.95);
		// Incisal edge (slight curve)
		ctx.quadraticCurveTo(0, -h, hw * 0.9, -h * 0.95);
		ctx.bezierCurveTo(hw, -h * 0.7, hw * 0.8, -h * 0.3, cervW, 0);
	} else if (group === "canine") {
		// Pointed canine
		ctx.moveTo(-cervW, 0);
		ctx.bezierCurveTo(-hw * 0.9, -h * 0.4, -hw, -h * 0.6, -hw * 0.6, -h * 0.8);
		// Single cusp
		ctx.quadraticCurveTo(0, -h * 1.1, hw * 0.6, -h * 0.8);
		ctx.bezierCurveTo(hw, -h * 0.6, hw * 0.9, -h * 0.4, cervW, 0);
	} else if (group === "premolar") {
		// Bicuspid shape
		ctx.moveTo(-cervW, 0);
		ctx.bezierCurveTo(-hw, -h * 0.3, -hw, -h * 0.7, -hw * 0.7, -h * 0.9);
		// Two cusps
		ctx.quadraticCurveTo(-hw * 0.35, -h * 1.05, 0, -h * 0.85); // central fossa
		ctx.quadraticCurveTo(hw * 0.35, -h * 1.05, hw * 0.7, -h * 0.9);
		ctx.bezierCurveTo(hw, -h * 0.7, hw, -h * 0.3, cervW, 0);
	} else {
		// Molar (wide with multiple cusps)
		ctx.moveTo(-cervW, 0);
		ctx.bezierCurveTo(
			-hw * 1.1,
			-h * 0.2,
			-hw * 1.1,
			-h * 0.8,
			-hw * 0.8,
			-h * 0.95,
		);
		// Three/Four cusps represented schematically
		ctx.quadraticCurveTo(-hw * 0.5, -h * 1.05, -hw * 0.3, -h * 0.85);
		ctx.quadraticCurveTo(0, -h * 1.0, hw * 0.3, -h * 0.85);
		ctx.quadraticCurveTo(hw * 0.5, -h * 1.05, hw * 0.8, -h * 0.95);
		ctx.bezierCurveTo(hw * 1.1, -h * 0.8, hw * 1.1, -h * 0.2, cervW, 0);
	}

	// Close cervical margin
	ctx.quadraticCurveTo(0, h * 0.1, -cervW, 0);

	ctx.fill();
	ctx.stroke();

	// Cusps
	if (profile.cusps > 0) {
		ctx.setLineDash([2, 3]);
		ctx.lineWidth = 1;
		ctx.strokeStyle = isWarning
			? "rgba(239,68,68,0.5)"
			: "rgba(34,211,238,0.5)";

		if (profile.cusps === 1) {
			// Single cusp (canine)
			ctx.beginPath();
			ctx.moveTo(-hw * 0.3, -h * 0.9);
			ctx.lineTo(0, -h - 2 * pixelsPerMm);
			ctx.lineTo(hw * 0.3, -h * 0.9);
			ctx.stroke();
		} else if (profile.cusps === 2) {
			// Buccal + lingual (premolar)
			const mid = -h * 0.85;
			drawCusp(ctx, -hw * 0.25, mid, 0, -h - pixelsPerMm);
			drawCusp(ctx, hw * 0.25, mid, 0, -h - pixelsPerMm);
		} else if (profile.cusps >= 4) {
			// 4-cusp molar: 2 buccal + 2 lingual
			drawCusp(ctx, -hw * 0.35, -h * 0.75, -hw * 0.1, -h - pixelsPerMm);
			drawCusp(ctx, hw * 0.35, -h * 0.75, hw * 0.1, -h - pixelsPerMm);
			drawCusp(ctx, -hw * 0.3, -h * 0.9, -hw * 0.05, -h - 1.5 * pixelsPerMm);
			drawCusp(ctx, hw * 0.3, -h * 0.9, hw * 0.05, -h - 1.5 * pixelsPerMm);
			// Central fissure
			ctx.beginPath();
			ctx.moveTo(-hw * 0.1, -h * 0.72);
			ctx.lineTo(hw * 0.1, -h * 0.72);
			ctx.stroke();
		}
	}

	// FDI label
	ctx.setLineDash([]);
	ctx.font = `bold ${Math.round(6 * pixelsPerMm)}px monospace`;
	ctx.fillStyle = labelColor;
	ctx.textAlign = "center";
	ctx.fillText(`${fdi}`, 0, -h - 3 * pixelsPerMm);

	ctx.textAlign = "start";
	ctx.setLineDash([]);
}

function drawCusp(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	xtip: number,
	ytip: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x1 - 4, y1);
	ctx.lineTo(xtip, ytip);
	ctx.lineTo(x1 + 4, y1);
	ctx.stroke();
}

/**
 * Returns occlusal angulation warning status.
 * Assumes implant direction vector, occlusal plane = XY plane (Z-axis perpendicular).
 */
export function getAngulationWarning(dirZ: number): {
	angleDeg: number;
	isWarning: boolean;
	message?: string;
} {
	const angleRad = Math.acos(Math.abs(Math.max(-1, Math.min(1, dirZ))));
	const angleDeg = angleRad * (180 / Math.PI);
	const isWarning = angleDeg > 15;
	if (isWarning) {
		return {
			angleDeg,
			isWarning: true,
			message: `Внимание: угол наклона оси имплантата слишком велик (${angleDeg.toFixed(1)}°). Рекомендуется скорректировать позицию или использовать угловой абатмент!`,
		};
	}
	return { angleDeg, isWarning: false };
}
