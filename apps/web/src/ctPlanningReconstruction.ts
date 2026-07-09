import { polylineLengthMm, distanceMm, round1, round2, clamp } from "./ctPlanningMath";
import type { DicomGpuRenderPlan, DicomViewerToolStateAnnotation, DicomViewerToolStatePoint } from "@dental/shared";

export type CtPlanningReconstructionStatus = "ready" | "draft" | "blocked";

export type CtPlanningReconstructionCard = {
  id: string;
  title: string;
  status: CtPlanningReconstructionStatus;
  value: string;
  detail: string;
  nextAction: string;
};

export type CtPlanningReconstructionPlan = {
  version: "dental-crm-ct-reconstruction-plan-v1";
  status: CtPlanningReconstructionStatus;
  qualityWeight: number;
  qualityLabel: string;
  curvePointCount: number;
  canalPointCount: number;
  curveLengthMm: number | null;
  curveSegmentCount: number;
  longestCurveSegmentMm: number | null;
  curveSpacingTargetMm: number;
  slabMm: number;
  crossSectionStepMm: number;
  crossSectionCount: number;
  crossSectionRequiredCount: number;
  crossSectionCoverageMm: number | null;
  crossSectionCoveragePercent: number;
  crossSectionStationPreview: string;
  cards: CtPlanningReconstructionCard[];
  warnings: string[];
};




function longestPolylineSegmentMm(points: DicomViewerToolStatePoint[]) {
  if (points.length < 2) return null;
  let longest = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    longest = Math.max(longest, distanceMm(previous, current));
  }
  return Number.isFinite(longest) ? round2(longest) : null;
}

function longestAnnotation(annotations: DicomViewerToolStateAnnotation[], type: DicomViewerToolStateAnnotation["type"]) {
  let selected: DicomViewerToolStateAnnotation | null = null;
  let selectedLength = -1;
  for (const annotation of annotations) {
    if (annotation.type !== type) continue;
    const length = polylineLengthMm(annotation.points) ?? annotation.points.length;
    if (length > selectedLength) {
      selected = annotation;
      selectedLength = length;
    }
  }
  return selected;
}

function qualityModeWeight(renderPlan: DicomGpuRenderPlan | null) {
  if (!renderPlan) return 0.5;
  switch (renderPlan.qualityMode) {
    case "diagnostic_full":
      return 0.92;
    case "balanced_mpr":
      return 0.68;
    case "interactive_low":
      return 0.42;
    case "external":
      return 0.35;
    case "metadata_only":
    default:
      return 0.18;
  }
}

function gpuClassWeight(renderPlan: DicomGpuRenderPlan | null) {
  if (!renderPlan) return 0.45;
  switch (renderPlan.gpuClass) {
    case "diagnostic":
      return 1;
    case "discrete_ok":
      return 0.82;
    case "integrated_ok":
      return 0.58;
    case "integrated_low":
      return 0.35;
    case "none":
    default:
      return 0.18;
  }
}

function interactionBudgetWeight(renderPlan: DicomGpuRenderPlan | null) {
  if (!renderPlan) return 0.5;
  if (renderPlan.interactionBudgetMs <= 16) return 0.9;
  if (renderPlan.interactionBudgetMs <= 24) return 0.68;
  if (renderPlan.interactionBudgetMs <= 40) return 0.42;
  return 0.24;
}

function reconstructionQualityWeight(renderPlan: DicomGpuRenderPlan | null) {
  const downsamplePenalty = renderPlan ? clamp((renderPlan.downsampleFactor - 1) * 0.08, 0, 0.32) : 0;
  const hardwareWeight = renderPlan ? clamp(renderPlan.hardwareQualityWeight, 0, 1) : 0.5;
  const weighted = qualityModeWeight(renderPlan) * 0.36 + gpuClassWeight(renderPlan) * 0.22 + interactionBudgetWeight(renderPlan) * 0.14 + hardwareWeight * 0.28;
  return round2(clamp(weighted - downsamplePenalty, 0.15, 1));
}

function curveSpacingTargetMm(qualityWeight: number) {
  return round1(clamp(22 - qualityWeight * 10, 10, 22));
}

function crossSectionStationPlan(curveLengthMm: number | null, crossSectionStepMm: number, canPlan: boolean, curvePointCount: number) {
  if (!canPlan || curvePointCount < 3 || curveLengthMm === null || curveLengthMm <= 0) {
    return {
      count: 0,
      requiredCount: 0,
      coverageMm: null,
      coveragePercent: 0,
      stationPreview: "нет станций"
    };
  }
  const requiredCount = Math.max(3, Math.ceil(curveLengthMm / crossSectionStepMm) + 1);
  const count = Math.min(160, requiredCount);
  const rawCoverageMm = count >= requiredCount ? curveLengthMm : Math.min(curveLengthMm, (count - 1) * crossSectionStepMm);
  const coverageMm = round2(rawCoverageMm);
  const coveragePercent = Math.min(100, Math.round((rawCoverageMm / curveLengthMm) * 100));
  const middleMm = round1(Math.min(rawCoverageMm, Math.max(0, rawCoverageMm / 2)));
  const endMm = round1(rawCoverageMm);
  return {
    count,
    requiredCount,
    coverageMm,
    coveragePercent,
    stationPreview: `0 / ${middleMm} / ${endMm} мм`
  };
}

function qualityLabel(weight: number) {
  if (weight >= 0.82) return "детальный просмотр";
  if (weight >= 0.6) return "усиленный просмотр";
  if (weight >= 0.36) return "обычный ПК";
  return "минимальная нагрузка";
}

function routeStatus(canPlan: boolean, pointCount: number, minimumPoints: number): CtPlanningReconstructionStatus {
  if (!canPlan) return "blocked";
  if (pointCount >= minimumPoints) return "ready";
  if (pointCount > 0) return "draft";
  return "blocked";
}

function statusLabel(status: CtPlanningReconstructionStatus) {
  if (status === "ready") return "готово";
  if (status === "draft") return "черновик";
  return "нет данных";
}

export function buildCtPlanningReconstructionPlan(input: {
  canPlan: boolean;
  annotations: DicomViewerToolStateAnnotation[];
  renderPlan: DicomGpuRenderPlan | null;
  slabMm: number;
}): CtPlanningReconstructionPlan {
  const panoramicCurve = longestAnnotation(input.annotations, "panoramic_curve");
  const canalCurve = longestAnnotation(input.annotations, "nerve_canal");
  const curvePointCount = panoramicCurve?.points.length ?? 0;
  const canalPointCount = canalCurve?.points.length ?? 0;
  const curveLengthMm = panoramicCurve ? polylineLengthMm(panoramicCurve.points) : null;
  const qualityWeight = reconstructionQualityWeight(input.renderPlan);
  const curveSegmentCount = Math.max(0, curvePointCount - 1);
  const longestCurveSegmentMm = panoramicCurve ? longestPolylineSegmentMm(panoramicCurve.points) : null;
  const spacingTargetMm = curveSpacingTargetMm(qualityWeight);
  const crossSectionStepMm = round1(clamp(5 - qualityWeight * 3.5, 1.5, 5));
  const slabMm = round1(clamp(Number.isFinite(input.slabMm) ? input.slabMm : 10, 3, 20));
  const stationPlan = crossSectionStationPlan(curveLengthMm, crossSectionStepMm, input.canPlan, curvePointCount);
  const crossSectionCount = stationPlan.count;
  const crossSectionRequiredCount = stationPlan.requiredCount;
  const crossSectionCoverageMm = stationPlan.coverageMm;
  const crossSectionCoveragePercent = stationPlan.coveragePercent;
  const crossSectionStationPreview = stationPlan.stationPreview;
  const panoramicStatus = routeStatus(input.canPlan, curvePointCount, 3);
  const canalStatus = routeStatus(input.canPlan, canalPointCount, 3);
  const curveQualityStatus: CtPlanningReconstructionStatus =
    panoramicStatus !== "ready"
      ? panoramicStatus
      : longestCurveSegmentMm !== null && longestCurveSegmentMm <= spacingTargetMm
        ? "ready"
        : "draft";
  const crossSectionStatus: CtPlanningReconstructionStatus =
    crossSectionCount > 0 && crossSectionCoveragePercent >= 99 ? "ready" : input.canPlan && curvePointCount > 0 ? "draft" : "blocked";
  const status: CtPlanningReconstructionStatus =
    panoramicStatus === "ready" && crossSectionStatus === "ready" && curveQualityStatus === "ready"
      ? "ready"
      : panoramicStatus === "draft" || crossSectionStatus === "draft" || curveQualityStatus === "draft"
        ? "draft"
        : "blocked";

  const cards: CtPlanningReconstructionCard[] = [
    {
      id: "quality",
      title: "Вес качества",
      status: input.canPlan ? "ready" : "blocked",
      value: `${Math.round(qualityWeight * 100)}%`,
      detail: `${qualityLabel(qualityWeight)}: меняет плотность производных срезов, но не клинические размеры.`,
      nextAction: input.canPlan ? "Оставить как рабочий профиль этого ПК." : "Сначала выбрать готовую КЛКТ/КТ-серию."
    },
    {
      id: "opg-curve",
      title: "ОПТГ-дуга",
      status: panoramicStatus,
      value: curveLengthMm === null ? `${curvePointCount} точек` : `${curveLengthMm} мм`,
      detail: "Дуга хранится как кривая; тяжелые снимки остаются в просмотрщике КТ.",
      nextAction: panoramicStatus === "ready" ? "Проверить положение поперечных срезов." : "Поставить минимум 3 точки по зубной дуге."
    },
    {
      id: "curve-sampling",
      title: "Качество дуги",
      status: curveQualityStatus,
      value: longestCurveSegmentMm === null ? `${curvePointCount} точек` : `${longestCurveSegmentMm} мм max`,
      detail: `Цель ${spacingTargetMm} мм между контрольными точками; это проверка маршрута, не пиксельная ОПТГ.`,
      nextAction: curveQualityStatus === "ready" ? "Можно строить сетку срезов." : "Добавьте точки на длинных участках дуги."
    },
    {
      id: "cross-sections",
      title: "Поперечные срезы",
      status: crossSectionStatus,
      value: crossSectionCount > 0 ? `${crossSectionCount} срезов` : `${crossSectionStepMm} мм шаг`,
      detail: `Шаг ${crossSectionStepMm} мм, слой ${slabMm} мм; это план производных срезов, не экспорт пикселей.`,
      nextAction: crossSectionCount > 0 ? "Сохранить пакет просмотра после проверки дуги." : "Достроить ОПТГ-дугу."
    },
    {
      id: "station-coverage",
      title: "Покрытие станций",
      status: crossSectionStatus,
      value: crossSectionCoverageMm === null ? "нет" : `${crossSectionCoveragePercent}%`,
      detail:
        crossSectionCoverageMm === null
          ? "Станции появятся после готовой ОПТГ-дуги."
          : `Покрыто ${crossSectionCoverageMm} мм из ${curveLengthMm} мм; опорные станции ${crossSectionStationPreview}.`,
      nextAction:
        crossSectionRequiredCount > 160
          ? "Разделить дугу или увеличить шаг в просмотрщике."
          : crossSectionStatus === "ready"
            ? "Маршрут срезов покрывает дугу."
            : "Достроить дугу и пересчитать станции."
    },
    {
      id: "canal-route",
      title: "Канал НЧ",
      status: canalStatus,
      value: canalPointCount >= 3 ? `${canalPointCount} точек` : `${canalPointCount}/3`,
      detail: "Канал переносится отдельной кривой для проверки отступов и шаблона.",
      nextAction: canalStatus === "ready" ? "Сверить отступы до оси импланта." : "Дорисовать трассу нижнечелюстного канала."
    }
  ];

  const warnings: string[] = [];
  if (longestCurveSegmentMm !== null && longestCurveSegmentMm > spacingTargetMm) warnings.push("ОПТГ-дуга слишком редкая: добавьте контрольные точки перед панорамными срезами.");
  if (!input.canPlan) warnings.push("Для построения ОПТГ и поперечных срезов нужна готовая объемная КТ-серия.");
  if (curvePointCount > 0 && curvePointCount < 3) warnings.push("ОПТГ-дуга начата, но минимум 3 точки еще не поставлены.");
  if (crossSectionCount >= 160) warnings.push("Количество поперечных срезов ограничено, чтобы не перегружать слабый ПК.");
  if (crossSectionRequiredCount > 160 && crossSectionCoveragePercent < 99) warnings.push("Сетка поперечных срезов не покрывает всю дугу: сократите маршрут или увеличьте шаг в просмотрщике.");
  if (qualityWeight < 0.36) warnings.push("ПК в режиме минимальной нагрузки: показываем более редкую сетку производных срезов.");

  return {
    version: "dental-crm-ct-reconstruction-plan-v1",
    status,
    qualityWeight,
    qualityLabel: qualityLabel(qualityWeight),
    curvePointCount,
    canalPointCount,
    curveLengthMm,
    curveSegmentCount,
    longestCurveSegmentMm,
    curveSpacingTargetMm: spacingTargetMm,
    slabMm,
    crossSectionStepMm,
    crossSectionCount,
    crossSectionRequiredCount,
    crossSectionCoverageMm,
    crossSectionCoveragePercent,
    crossSectionStationPreview,
    cards,
    warnings
  };
}
