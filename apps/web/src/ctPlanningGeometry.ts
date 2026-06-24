import { polylineLengthMm, distanceMm, round1, round2, finiteOrNull } from "./ctPlanningMath";
import type {
  DicomViewerToolStateAnnotation,
  DicomViewerToolStatePoint,
  ImagingViewerAnnotationSemanticRole,
  ImagingViewerImplantPlan
} from "@dental/shared";

export type CtPlanningGeometryMetric = {
  id: string;
  title: string;
  valueLabel: string;
  detail: string;
  source: string;
  tone: "ready" | "attention";
};

export type CtPlanningDistanceMeasurementRole = ImagingViewerAnnotationSemanticRole;

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
  const cosine = Math.max(-1, Math.min(1, (abX * cbX + abY * cbY + abZ * cbZ) / (abLen * cbLen)));
  return finiteOrNull((Math.acos(cosine) * 180) / Math.PI);
}

function pointToSegmentDistanceMm(point: DicomViewerToolStatePoint, start: DicomViewerToolStatePoint, end: DicomViewerToolStatePoint) {
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
  const t = lengthSq <= 0 ? 0 : Math.max(0, Math.min(1, ((px - sx) * vx + (py - sy) * vy + (pz - sz) * vz) / lengthSq));
  return Math.hypot(px - (sx + vx * t), py - (sy + vy * t), pz - (sz + vz * t));
}

function minimumImplantCanalClearanceMm(annotations: DicomViewerToolStateAnnotation[]) {
  const implantAxis = annotations.find((annotation) => annotation.type === "implant_axis" && annotation.points.length >= 2);
  const canal = annotations.find((annotation) => annotation.type === "nerve_canal" && annotation.points.length >= 3);
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

function implantCylinderVolumeMm3(implantPlan: ImagingViewerImplantPlan | null) {
  if (!implantPlan) return null;
  const radius = implantPlan.diameterMm / 2;
  return finiteOrNull(Math.PI * radius * radius * implantPlan.lengthMm);
}

function metricValue(annotation: DicomViewerToolStateAnnotation, slabMm: number) {
  if (typeof annotation.measurement.value === "number" && Number.isFinite(annotation.measurement.value)) {
    return annotation.measurement.value;
  }
  if (annotation.type === "distance" || annotation.type === "implant_axis") {
    return annotation.points.length >= 2 ? polylineLengthMm(annotation.points) : null;
  }
  if (annotation.type === "angle") return angleDeg(annotation.points);
  if (annotation.type === "roi" || annotation.type === "area_roi") return polygonAreaMm2(annotation.points);
  if (annotation.type === "volume_roi") {
    const area = polygonAreaMm2(annotation.points);
    return area === null ? null : area * slabMm;
  }
  if (annotation.type === "nerve_canal" || annotation.type === "panoramic_curve") {
    return annotation.points.length >= 3 ? polylineLengthMm(annotation.points) : null;
  }
  return null;
}

function metricUnit(annotation: DicomViewerToolStateAnnotation) {
  if (annotation.measurement.unit) return annotation.measurement.unit;
  if (annotation.type === "angle") return "deg";
  if (annotation.type === "roi" || annotation.type === "area_roi") return "mm2";
  if (annotation.type === "volume_roi") return "mm3";
  if (annotation.type === "distance" || annotation.type === "implant_axis" || annotation.type === "nerve_canal" || annotation.type === "panoramic_curve") return "mm";
  return "";
}

function metricTitle(annotation: DicomViewerToolStateAnnotation) {
  if (annotation.type === "distance") return "Линейка";
  if (annotation.type === "angle") return "Угол";
  if (annotation.type === "area_roi" || annotation.type === "roi") return "Площадь";
  if (annotation.type === "volume_roi") return "Объем";
  if (annotation.type === "implant_axis") return "Ось импланта";
  if (annotation.type === "nerve_canal") return "Канал";
  if (annotation.type === "panoramic_curve") return "ОПТГ дуга";
  if (annotation.type === "bone_density_probe") return "Плотность";
  return annotation.label || "Разметка";
}

function distanceMeasurementRole(annotation: DicomViewerToolStateAnnotation): CtPlanningDistanceMeasurementRole {
  if (annotation.semanticRole) return annotation.semanticRole;
  const text = `${annotation.label} ${annotation.note} ${annotation.warnings.join(" ")}`.toLowerCase();
  if (text.includes("ridge_width") || text.includes("ширин")) return "ridge_width";
  if (text.includes("bone_height") || text.includes("высот")) return "bone_height";
  if (text.includes("clearance") || text.includes("канал") || text.includes("отступ")) return "clearance";
  return "generic";
}

function hasCurveGeometry(annotation: DicomViewerToolStateAnnotation) {
  return (annotation.type === "panoramic_curve" || annotation.type === "nerve_canal") && annotation.points.length >= 3;
}

function uniqueToothCodes(annotations: DicomViewerToolStateAnnotation[]) {
  return Array.from(
    new Set(
      annotations
        .map((annotation) => normalizedToothCode(annotation.toothCode))
        .filter((toothCode): toothCode is string => Boolean(toothCode))
    )
  ).sort();
}

function inferImplantSiteToothCode(annotations: DicomViewerToolStateAnnotation[], distanceMeasurements: CtPlanningDistanceMeasurement[]) {
  const axisOrGuideCodes = uniqueToothCodes(annotations.filter((annotation) => annotation.type === "implant_axis" || annotation.type === "surgical_guide"));
  if (axisOrGuideCodes.length === 1) return axisOrGuideCodes[0];

  const signedRulerCodes = Array.from(
    new Set(
      distanceMeasurements
        .filter((measurement) => measurement.role === "ridge_width" || measurement.role === "bone_height")
        .map((measurement) => normalizedToothCode(measurement.toothCode))
        .filter((toothCode): toothCode is string => Boolean(toothCode))
    )
  ).sort();
  if (signedRulerCodes.length === 1) return signedRulerCodes[0];

  const allCodes = uniqueToothCodes(annotations);
  return allCodes.length === 1 ? allCodes[0] : null;
}

function hasAreaGeometry(annotation: DicomViewerToolStateAnnotation) {
  return (annotation.type === "roi" || annotation.type === "area_roi") && annotation.points.length >= 3;
}

function hasVolumeGeometry(annotation: DicomViewerToolStateAnnotation) {
  return annotation.type === "volume_roi" && annotation.points.length >= 3;
}

function hasIncompleteRoiGeometry(annotation: DicomViewerToolStateAnnotation) {
  return (annotation.type === "roi" || annotation.type === "area_roi" || annotation.type === "volume_roi") && annotation.points.length > 0 && annotation.points.length < 3;
}

export function buildCtPlanningGeometrySummary(input: {
  annotations: DicomViewerToolStateAnnotation[];
  implantPlan: ImagingViewerImplantPlan | null;
  slabMm: number;
}): CtPlanningGeometrySummary {
  const slabMm = Number.isFinite(input.slabMm) && input.slabMm > 0 ? input.slabMm : 1;
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
    if ((annotation.type === "roi" || annotation.type === "area_roi") && hasAreaGeometry(annotation)) {
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
        referencedImageId: annotation.referencedImageId
      });
      distanceMeasurementsMm.push(roundedValue);
    }
    const unit = metricUnit(annotation);
    metrics.push({
      id: annotation.id,
      title: metricTitle(annotation),
      valueLabel: `${round2(value)} ${unit}`.trim(),
      detail: annotation.toothCode ? `${annotation.label} · зуб ${annotation.toothCode}` : annotation.label,
      source: annotation.type,
      tone: annotation.needsReview ? "attention" : "ready"
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
      tone: minimumClearanceMm < 2 ? "attention" : "ready"
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
      tone: "ready"
    });
  }

  const warnings: string[] = [];
  if (minimumClearanceMm !== null && minimumClearanceMm < 2) warnings.push("Отступ до канала меньше 2 мм.");
  if (input.annotations.some((annotation) => annotation.needsReview)) warnings.push("Есть разметки, требующие проверки калибровки.");
  const roiDraftCount = input.annotations.filter(hasIncompleteRoiGeometry).length;
  if (roiDraftCount > 0) warnings.push("Есть контуры с недостаточным числом точек.");
  if (roiVolumeValueCount > 0) warnings.push(`Объем по контуру рассчитан через слой ${round2(slabMm)} мм; это не сегментация тканей.`);

  const siteEvidenceToothCodes = uniqueToothCodes(input.annotations);
  const implantSiteToothCode = inferImplantSiteToothCode(input.annotations, distanceMeasurements) ?? null;
  if (siteEvidenceToothCodes.length > 1) warnings.push("Измерения КТ относятся к нескольким зубам; скрининг импланта остается черновиком до подтверждения участка.");

  return {
    measurementCount: annotationMetricCount,
    curveCount: input.annotations.filter(hasCurveGeometry).length,
    areaCount: roiAreaValueCount,
    volumeCount: roiVolumeValueCount,
    roiAreaTotalMm2: roiAreaValueCount > 0 ? round2(roiAreaTotalMm2) : null,
    roiVolumeTotalMm3: roiVolumeValueCount > 0 ? round2(roiVolumeTotalMm3) : null,
    roiVolumeSlabMm: round2(slabMm),
    roiDraftCount,
    implantSiteToothCode,
    siteEvidenceToothCodes,
    distanceMeasurements,
    distanceMeasurementsMm,
    minimumClearanceMm,
    implantVolumeMm3,
    metrics: metrics.slice(0, 8),
    warnings
  };
}
