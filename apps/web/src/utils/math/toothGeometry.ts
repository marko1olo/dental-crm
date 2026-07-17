import type {
	DicomViewerToolStateAnnotation,
	DicomViewerToolStatePoint,
	ImagingViewerAnnotationSemanticRole,
	ImagingViewerImplantPlan,
} from "@dental/shared";
import {
	distanceMm,
	finiteOrNull,
	polylineLengthMm,
	round1,
	round2,
} from "./mprMath";

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

export type ToothGeometryType = {
	root: string;
	crown: string;
	canals?: string;
	fissures?: string;
	core?: string;
	apex?: { x: number; y: number }[];
	surfaces: {
		V: string;
		O: string;
		M: string;
		D: string;
		[key: string]: string;
	};
};

export const TOOTH_GEOMETRY = {
	UPPER_CENTRAL_INCISOR: {
		root: "M35 85 C33 60, 35 25, 50 5 C65 25, 67 60, 65 85 Z",
		crown:
			"M35 85 C30 95, 22 125, 32 145 C40 148, 60 148, 68 145 C72 125, 75 95, 65 85 Q50 82 35 85",
		canals: "M50 120 C 52 90, 48 50, 50 15",
		apex: [{ x: 50, y: 5 }],
		core: "M42 85 L44 115 Q50 120 56 115 L58 85 Z",
		surfaces: {
			V: "M35 85 C40 90, 60 90, 65 85 L68 115 Q50 120 32 115 Z",
			O: "M32 115 Q50 120 68 115 L68 145 C60 148, 40 148, 32 145 Z",
			M: "M35 85 C30 95, 28 125, 32 145 L42 145 L42 85 Z",
			D: "M65 85 C70 95, 72 125, 68 145 L58 145 L58 85 Z",
		},
	},

	UPPER_LATERAL_INCISOR: {
		root: "M38 85 C36 60, 40 30, 50 10 C60 30, 64 60, 62 85 Z",
		crown:
			"M38 85 C34 95, 35 120, 40 135 C45 138, 55 138, 60 135 C65 120, 66 95, 62 85 Q50 82 38 85",
		fissures: "M50 129 L50 135",
		core: "M42 85 L44 115 Q50 120 56 115 L58 85 Z",
		canals: "M50 120 C 51 90, 49 40, 52 15",
		apex: [{ x: 50, y: 10 }],
		surfaces: {
			V: "M38 85 C42 90, 58 90, 62 85 L62 105 Q50 110 38 105 Z",
			O: "M38 105 Q50 110 62 105 L60 135 C55 138, 45 138, 40 135 Z",
			M: "M38 85 C34 95, 35 120, 40 135 L45 135 L45 85 Z",
			D: "M62 85 C66 95, 65 120, 60 135 L55 135 L55 85 Z",
		},
	},

	UPPER_CANINE: {
		root: "M35 85 C33 50, 38 30, 45 2 C60 15, 67 50, 65 85 Z",
		crown: "M35 85 C30 105, 15 125, 53 148 C65 135, 90 115, 65 85 Q50 80 35 85",
		core: "M42 85 L44 115 Q50 120 56 115 L58 85 Z",
		canals: "M50 125 C 53 90, 47 40, 50 5",
		apex: [{ x: 45, y: 2 }],
		surfaces: {
			V: "M35 85 C40 90, 60 90, 65 85 L65 115 Q50 120 35 115 Z",
			O: "M35 115 Q50 120 65 115 L50 148 Z",
			M: "M35 85 C30 105, 35 125, 50 148 C45 125, 40 105, 35 85 Z",
			D: "M65 85 C70 105, 65 125, 50 148 C55 125, 60 105, 65 85 Z",
		},
	},

	UPPER_PREMOLAR: {
		root: "M32 85 C30 60, 35 25, 43 19 C50 32, 50 32, 52 15 C65 25, 70 60, 68 85 Z",
		crown:
			"M33 85 C25 100, 8 135, 40 142 Q50 138 68 142 C79 135, 75 100, 68 85 Q50 82 32 85",
		canals: "M50 115 Q 45 70 42 20 M50 115 Q 55 70 58 20",
		core: "M38 85 L40 110 Q50 115 60 110 L62 85 Z",
		apex: [
			{ x: 43, y: 19 },
			{ x: 52, y: 15 },
		],
		surfaces: {
			V: "M32 85 C35 90, 65 90, 68 85 L68 110 Q50 115 32 110 Z",
			O: "M32 110 Q50 115 68 110 L68 142 C50 138, 40 142, 32 142 Z",
			M: "M33 85 C15 100, 8 135, 40 142 C30 130, 30 100, 33 85 Z",
			D: "M68 85 C75 100, 79 135, 60 142 C65 130, 65 100, 68 85 Z",
		},
	},

	UPPER_MOLAR: {
		root: "M45 50 C 45 25, 45 20, 50 6 C 55 2, 67 10, 58 45 Q 50 65 42 46 M20 85 C 20 60, 18 65, 25 10 C 29 5, 40 25, 42 45 Q 50 65 58 45 C 60 25, 68 5, 79 4 C 82 25, 80 80, 92 85 Z",
		crown:
			"M20 85 C 13 105, 3 135, 38 139 C 45 139, 50 139, 50 125 C 50 135, 55 136, 62 137 C 100 135, 88 105, 92 85 Z",
		canals:
			"M50 110 C 30 100, 40 60, 30 5 M50 110 C 60 100, 70 60, 70 15 M50 110 C 50 80, 55 50, 50 10",
		apex: [
			{ x: 50, y: 6 },
			{ x: 25, y: 10 },
			{ x: 79, y: 4 },
		],
		core: "M30 85 L35 110 Q55 115 75 110 L80 85 Z",
		fissures: "M50 115 L50 125",
		surfaces: {
			V: "M20 85 C30 90, 80 90, 92 85 L92 110 Q50 115 20 110 Z",
			O: "M20 110 Q50 115 92 110 L62 137 C50 125, 38 139, 20 130 Z",
			M: "M20 85 C13 105, 3 135, 38 139 C30 125, 25 105, 20 85 Z",
			D: "M92 85 C88 105, 100 135, 62 137 C75 125, 85 105, 92 85 Z",
		},
	},

	LOWER_INCISOR: {
		root: "M40 75 C38 100, 42 135, 50 145 C58 135, 62 100, 60 75 Z",
		crown:
			"M40 75 C36 60, 36 35, 40 25 C45 22, 55 22, 60 25 C64 35, 64 60, 60 75 Q50 78 40 75",
		fissures: "M45 23 L45 30 M55 30 L55 23",
		canals: "M50 55 C 51 80, 49 110, 50 140",
		core: "M44 75 L46 45 Q50 40 54 45 L56 75 Z",
		apex: [{ x: 50, y: 145 }],
		surfaces: {
			V: "M40 75 C42 70, 58 70, 60 75 L60 55 Q50 50 40 55 Z",
			O: "M40 55 Q50 50 60 55 L60 25 C55 22, 45 22, 40 25 Z",
			M: "M40 75 C36 60, 36 35, 40 25 C40 45, 40 65, 40 75 Z",
			D: "M60 75 C64 60, 64 35, 60 25 C60 45, 60 65, 60 75 Z",
		},
	},

	LOWER_CANINE: {
		root: "M35 72 C33 100, 40 140, 50 150 C60 140, 67 100, 65 72 Z",
		crown: "M35 72 C30 55, 35 30, 50 12 C65 30, 70 55, 65 72 Q50 75 35 72",
		canals: "M50 55 C 52 80, 48 110, 50 145",
		core: "M44 75 L46 45 Q50 40 54 45 L56 75 Z",
		apex: [{ x: 50, y: 150 }],
		surfaces: {
			V: "M35 72 C40 68, 60 68, 65 72 L65 45 Q50 40 35 45 Z",
			O: "M35 45 Q50 40 65 45 L50 12 Z",
			M: "M35 72 C30 55, 35 30, 50 12 C45 35, 40 55, 35 72 Z",
			D: "M65 72 C70 55, 65 30, 50 12 C55 35, 60 55, 65 72 Z",
		},
	},

	LOWER_PREMOLAR: {
		root: "M32 75 C30 100, 35 140, 50 145 C65 140, 70 100, 68 75 Z",
		crown:
			"M32 75 C25 60, 28 35, 40 28 Q50 32 60 28 C72 35, 75 60, 68 75 Q50 78 32 75",
		canals: "M50 55 C 52 80, 48 110, 50 140",
		core: "M38 75 L40 50 Q50 45 60 50 L62 75 Z",
		apex: [{ x: 50, y: 145 }],
		surfaces: {
			V: "M32 75 C35 70, 65 70, 68 75 L68 50 Q50 45 32 50 Z",
			O: "M32 50 Q50 45 68 50 L60 28 C50 32, 40 28, 32 35 Z",
			M: "M32 75 C25 60, 28 35, 40 28 C35 45, 35 60, 32 75 Z",
			D: "M68 75 C75 60, 72 35, 60 28 C65 45, 65 60, 68 75 Z",
		},
	},

	LOWER_MOLAR: {
		root: "M15 80 C8 110, 19 135, 20 145 C33 145, 35 125, 38 115 Q49 85 52 100 C55 105, 62 145, 70 150 C80 145, 85 110, 85 80 Z",
		crown:
			"M15 80 C5 40, 15 35, 30 25 C40 20, 48 23, 50 30 C52 23, 60 20, 70 23 C85 35, 95 30, 85 80 Q50 85 15 80",
		fissures: "M50 30 L50 40 M50 55 L50 80",
		core: "M25 80 L30 55 Q50 50 70 55 L75 80 Z",
		canals: "M50 60 Q 25 70 30 140 M50 60 Q 75 70 70 145",
		apex: [
			{ x: 20, y: 145 },
			{ x: 80, y: 145 },
		],
		surfaces: {
			V: "M15 80 C20 75, 80 75, 85 80 L85 55 Q50 50 15 55 Z",
			O: "M15 55 Q50 50 85 55 L70 23 C50 30, 30 25, 15 40 Z",
			M: "M15 80 C5 40, 15 35, 30 25 C25 45, 20 60, 15 80 Z",
			D: "M85 80 C95 30, 85 35, 70 23 C75 45, 80 60, 85 80 Z",
		},
	},

	PEDIATRIC_UPPER_INCISOR: {
		root: "M35 85 C33 75, 42 55, 50 45 C58 55, 67 75, 65 85 Z",
		crown:
			"M35 85 C30 95, 22 125, 32 145 C40 148, 60 148, 68 145 C72 125, 75 95, 65 85 Q50 82 35 85",
		canals: "M50 120 C 51 90, 49 70, 50 50",
		apex: [{ x: 50, y: 45 }],
		surfaces: {
			V: "M35 85 C40 90, 60 90, 65 85 L68 115 Q50 120 32 115 Z",
			O: "M32 115 Q50 120 68 115 L68 145 C60 148, 40 148, 32 145 Z",
			M: "M35 85 C30 95, 28 125, 32 145 L42 145 L42 85 Z",
			D: "M65 85 C70 95, 72 125, 68 145 L58 145 L58 85 Z",
		},
	},
	PEDIATRIC_UPPER_CANINE: {
		root: "M35 85 C33 70, 42 50, 50 40 C58 50, 67 70, 65 85 Z",
		crown: "M35 85 C30 105, 15 125, 53 148 C65 135, 90 115, 65 85 Q50 80 35 85",
		canals: "M50 125 C 51 90, 49 60, 50 45",
		apex: [{ x: 50, y: 40 }],
		surfaces: {
			V: "M35 85 C40 90, 60 90, 65 85 L65 115 Q50 120 35 115 Z",
			O: "M35 115 Q50 120 65 115 L50 148 Z",
			M: "M35 85 C30 105, 35 125, 50 148 C45 125, 40 105, 35 85 Z",
			D: "M65 85 C70 105, 65 125, 50 148 C55 125, 60 105, 65 85 Z",
		},
	},
	PEDIATRIC_UPPER_MOLAR: {
		root: "M45 65 C 45 50, 48 45, 50 40 C 52 45, 55 50, 58 65 Q 50 75 42 66 M20 85 C 20 70, 25 50, 30 45 C 35 55, 40 70, 42 85 M79 85 C 80 70, 75 50, 70 45 C 65 55, 60 70, 58 85 Z",
		crown:
			"M20 85 C 13 105, 3 135, 38 139 C 45 139, 50 139, 50 125 C 50 135, 55 136, 62 137 C 100 135, 88 105, 92 85 Z",
		canals:
			"M50 110 C 40 90, 35 70, 30 50 M50 110 C 60 90, 65 70, 70 50 M50 110 C 50 90, 50 70, 50 45",
		apex: [
			{ x: 50, y: 40 },
			{ x: 30, y: 45 },
			{ x: 70, y: 45 },
		],
		surfaces: {
			V: "M20 85 C30 90, 80 90, 92 85 L92 110 Q50 115 20 110 Z",
			O: "M20 110 Q50 115 92 110 L62 137 C50 125, 38 139, 20 130 Z",
			M: "M20 85 C13 105, 3 135, 38 139 C30 125, 25 105, 20 85 Z",
			D: "M92 85 C88 105, 100 135, 62 137 C75 125, 85 105, 92 85 Z",
		},
	},
	PEDIATRIC_LOWER_INCISOR: {
		root: "M40 75 C38 90, 42 110, 50 120 C58 110, 62 90, 60 75 Z",
		crown:
			"M40 75 C36 60, 36 35, 40 25 C45 22, 55 22, 60 25 C64 35, 64 60, 60 75 Q50 78 40 75",
		canals: "M50 55 C 51 75, 49 95, 50 115",
		apex: [{ x: 50, y: 120 }],
		surfaces: {
			V: "M40 75 C42 70, 58 70, 60 75 L60 55 Q50 50 40 55 Z",
			O: "M40 55 Q50 50 60 55 L60 25 C55 22, 45 22, 40 25 Z",
			M: "M40 75 C36 60, 36 35, 40 25 C40 45, 40 65, 40 75 Z",
			D: "M60 75 C64 60, 64 35, 60 25 C60 45, 60 65, 60 75 Z",
		},
	},
	PEDIATRIC_LOWER_CANINE: {
		root: "M35 72 C33 90, 40 110, 50 120 C60 110, 67 90, 65 72 Z",
		crown: "M35 72 C30 55, 35 30, 50 12 C65 30, 70 55, 65 72 Q50 75 35 72",
		canals: "M50 55 C 52 75, 48 95, 50 115",
		apex: [{ x: 50, y: 120 }],
		surfaces: {
			V: "M35 72 C40 68, 60 68, 65 72 L65 45 Q50 40 35 45 Z",
			O: "M35 45 Q50 40 65 45 L50 12 Z",
			M: "M35 72 C30 55, 35 30, 50 12 C45 35, 40 55, 35 72 Z",
			D: "M65 72 C70 55, 65 30, 50 12 C55 35, 60 55, 65 72 Z",
		},
	},
	PEDIATRIC_LOWER_MOLAR: {
		root: "M15 80 C15 100, 25 115, 30 120 C35 115, 35 100, 38 90 Q49 85 52 100 C55 100, 60 115, 70 120 C80 115, 85 100, 85 80 Z",
		crown:
			"M15 80 C5 40, 15 35, 30 25 C40 20, 48 23, 50 30 C52 23, 60 20, 70 23 C85 35, 95 30, 85 80 Q50 85 15 80",
		canals: "M50 60 Q 30 80 30 115 M50 60 Q 70 80 70 115",
		apex: [
			{ x: 30, y: 120 },
			{ x: 70, y: 120 },
		],
		surfaces: {
			V: "M15 80 C20 75, 80 75, 85 80 L85 55 Q50 50 15 55 Z",
			O: "M15 55 Q50 50 85 55 L70 23 C50 30, 30 25, 15 40 Z",
			M: "M15 80 C5 40, 15 35, 30 25 C25 45, 20 60, 15 80 Z",
			D: "M85 80 C95 30, 85 35, 70 23 C75 45, 80 60, 85 80 Z",
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
	// Proportional widths scaled to exactly 96px height based on viewBox aspect ratios
	if (num <= 2)
		return {
			width: "38px",
			height: "96px",
			viewX: 20,
			viewWidth: 60,
			viewHeight: 150,
		};
	if (num === 3)
		return {
			width: "48px",
			height: "96px",
			viewX: 15,
			viewWidth: 75,
			viewHeight: 150,
		};
	if (num <= 5 && quadrant < 5)
		return {
			width: "48px",
			height: "96px",
			viewX: 12.5,
			viewWidth: 75,
			viewHeight: 150,
		};
	return {
		width: "64px",
		height: "96px",
		viewX: 0,
		viewWidth: 100,
		viewHeight: 150,
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
		ctx.bezierCurveTo(-hw * 1.1, -h * 0.2, -hw * 1.1, -h * 0.8, -hw * 0.8, -h * 0.95);
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
