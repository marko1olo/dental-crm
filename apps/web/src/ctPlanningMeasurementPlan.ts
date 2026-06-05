import type { DicomViewerToolStateAnnotation } from "@dental/shared";
import type { CtPlanningGeometrySummary } from "./ctPlanningGeometry";

export type CtPlanningMeasurementPlanStatus = "ready" | "draft" | "blocked";

export type CtPlanningMeasurementCard = {
  id: string;
  title: string;
  status: CtPlanningMeasurementPlanStatus;
  value: string;
  detail: string;
  nextAction: string;
};

export type CtPlanningMeasurementPlan = {
  version: "dental-crm-ct-measurement-plan-v1";
  status: CtPlanningMeasurementPlanStatus;
  score: number;
  summaryLabel: string;
  linearCount: number;
  ridgeWidthCount: number;
  boneHeightCount: number;
  clearanceRoleCount: number;
  angleCount: number;
  areaCount: number;
  volumeCount: number;
  roiAreaTotalLabel: string;
  roiVolumeTotalLabel: string;
  roiVolumeSlabMm: number;
  roiDraftCount: number;
  densityProbeCount: number;
  densityValueCount: number;
  densityAverageValue: number | null;
  densityRangeLabel: string;
  densityProtocolLabel: string;
  densityUnitLabel: string;
  densityUnitIsCalibratedHu: boolean;
  densityHasMixedUnits: boolean;
  reviewCount: number;
  unsavedArtifactCount: number;
  readyCardCount: number;
  cards: CtPlanningMeasurementCard[];
  warnings: string[];
};

const round2 = (value: number) => Math.round(value * 100) / 100;

function hasPoints(annotation: DicomViewerToolStateAnnotation, minimum: number) {
  return annotation.points.length >= minimum;
}

function countAnnotations(
  annotations: DicomViewerToolStateAnnotation[],
  types: DicomViewerToolStateAnnotation["type"][],
  minimumPoints: number
) {
  return annotations.filter((annotation) => types.includes(annotation.type) && hasPoints(annotation, minimumPoints)).length;
}

function normalizedDensityUnit(unit: string | null) {
  const normalized = (unit ?? "").trim();
  if (!normalized) return "ед. просмотра";
  const lower = normalized.toLowerCase();
  if (lower === "hu" || lower === "hounsfield" || lower === "hounsfield unit" || lower === "hounsfield units") return "HU";
  return normalized;
}

function densityProtocolLabel(average: number | null, unitLabel: string, hasMixedUnits: boolean) {
  if (average === null) return "нет сохраненных значений";
  if (hasMixedUnits) return "смешанные единицы: повторить probe в одной калибровке";
  if (unitLabel !== "HU") return "единицы просмотра: сверить калибровку перед сверлением";
  if (average < 350) return "мягкая кость: осторожная первичная стабильность";
  if (average < 700) return "средняя плотность: базовый протокол";
  if (average < 1100) return "плотная кость: контролировать перегрев";
  return "очень плотная кость: снизить давление и усилить охлаждение";
}

function densityValueStats(annotations: DicomViewerToolStateAnnotation[]) {
  let count = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let unitLabel = "ед. просмотра";
  let hasMixedUnits = false;
  for (const annotation of annotations) {
    if (
      annotation.type !== "bone_density_probe" ||
      !hasPoints(annotation, 1) ||
      typeof annotation.measurement.value !== "number" ||
      !Number.isFinite(annotation.measurement.value)
    ) {
      continue;
    }
    const value = annotation.measurement.value;
    const unit = normalizedDensityUnit(annotation.measurement.unit);
    if (count === 0) {
      unitLabel = unit;
    } else if (unit !== unitLabel) {
      hasMixedUnits = true;
    }
    count += 1;
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const average = count > 0 ? round2(sum / count) : null;
  const minimum = count > 0 ? round2(min) : null;
  const maximum = count > 0 ? round2(max) : null;
  const displayUnit = hasMixedUnits ? "смеш." : unitLabel;
  const rangeLabel =
    average === null
      ? "нет знач."
      : minimum !== null && maximum !== null && minimum !== maximum
        ? `ср. ${average} ${displayUnit} (${minimum}-${maximum})`
        : `ср. ${average} ${displayUnit}`;
  return {
    count,
    average,
    rangeLabel,
    protocolLabel: densityProtocolLabel(average, unitLabel, hasMixedUnits),
    unitLabel: displayUnit,
    unitIsCalibratedHu: !hasMixedUnits && unitLabel === "HU",
    hasMixedUnits
  };
}

function countSemanticDistances(
  annotations: DicomViewerToolStateAnnotation[],
  role: NonNullable<DicomViewerToolStateAnnotation["semanticRole"]>
) {
  return annotations.filter((annotation) => annotation.type === "distance" && annotation.semanticRole === role && hasPoints(annotation, 2)).length;
}

function statusFromCount(count: number, canPlan: boolean): CtPlanningMeasurementPlanStatus {
  if (!canPlan) return "blocked";
  return count > 0 ? "ready" : "draft";
}

function metricTotalLabel(value: number | null, unit: string) {
  return value === null ? "нет" : `${round2(value)} ${unit}`;
}

function readyCardCount(cards: CtPlanningMeasurementCard[]) {
  return cards.filter((card) => card.status === "ready").length;
}

export function buildCtPlanningMeasurementPlan(input: {
  canPlan: boolean;
  annotations: DicomViewerToolStateAnnotation[];
  geometrySummary: CtPlanningGeometrySummary;
  unsavedArtifactCount: number;
}): CtPlanningMeasurementPlan {
  const linearCount = countAnnotations(input.annotations, ["distance"], 2);
  const ridgeWidthCount = countSemanticDistances(input.annotations, "ridge_width");
  const boneHeightCount = countSemanticDistances(input.annotations, "bone_height");
  const clearanceRoleCount = countSemanticDistances(input.annotations, "clearance");
  const angleCount = countAnnotations(input.annotations, ["angle"], 3);
  const areaCount = input.geometrySummary.areaCount;
  const volumeCount = input.geometrySummary.volumeCount;
  const roiAreaTotalLabel = metricTotalLabel(input.geometrySummary.roiAreaTotalMm2, "мм²");
  const roiVolumeTotalLabel = metricTotalLabel(input.geometrySummary.roiVolumeTotalMm3, "мм³");
  const roiVolumeSlabMm = input.geometrySummary.roiVolumeSlabMm;
  const roiDraftCount = input.geometrySummary.roiDraftCount;
  const densityProbeCount = countAnnotations(input.annotations, ["bone_density_probe"], 1);
  const densityStats = densityValueStats(input.annotations);
  const densityValueCount = densityStats.count;
  const reviewCount = input.annotations.filter((annotation) => annotation.points.length > 0 && annotation.needsReview).length;
  const clearance = input.geometrySummary.minimumClearanceMm;
  const clearanceStatus: CtPlanningMeasurementPlanStatus =
    !input.canPlan ? "blocked" : clearance === null ? "draft" : clearance >= 2 ? "ready" : "blocked";
  const clearanceValue = clearance === null ? (clearanceRoleCount > 0 ? `${clearanceRoleCount} лин.` : "нет") : `${round2(clearance)} мм`;
  const clearanceNextAction =
    clearance === null
      ? clearanceRoleCount > 0
        ? "Контрольная линейка есть; добавьте ось и канал для клинической проверки."
        : "Нужны ось, канал и контрольная линейка."
      : clearance >= 2
        ? "Отступ закрыт."
        : "Перестроить ось или выбрать другой размер.";

  const cards: CtPlanningMeasurementCard[] = [
    {
      id: "linear-angle",
      title: "Линейка и угол",
      status: statusFromCount(linearCount + angleCount, input.canPlan),
      value: `${linearCount} / ${angleCount}`,
      detail: "Высота, ширина гребня и углы считаются только после постановки точек.",
      nextAction: linearCount + angleCount > 0 ? "Проверить плоскость и калибровку." : "Поставить линейку или угол."
    },
    {
      id: "signed-ridge-bone",
      title: "Ширина и высота",
      status: !input.canPlan ? "blocked" : ridgeWidthCount > 0 && boneHeightCount > 0 ? "ready" : "draft",
      value: `${ridgeWidthCount}/${boneHeightCount}`,
      detail: "Для имплант-скрининга нужны подписанные линейки ширины и высоты.",
      nextAction: ridgeWidthCount > 0 && boneHeightCount > 0 ? "Сверить плоскость и калибровку." : "Создать линейки Ширина гребня и Высота кости."
    },
    {
      id: "roi-area",
      title: "Контур площади",
      status: statusFromCount(areaCount, input.canPlan),
      value: roiAreaTotalLabel,
      detail: "Контур нужен для окна синус-лифтинга, дефекта, кисты или графта.",
      nextAction: areaCount > 0 ? "Проверить замыкание контура и плоскость." : "Обвести контур минимум тремя точками."
    },
    {
      id: "roi-volume",
      title: "Контур объема",
      status: statusFromCount(volumeCount, input.canPlan),
      value: roiVolumeTotalLabel,
      detail: `Объем использует контур и слой ${roiVolumeSlabMm} мм; это оценка, не сегментация тканей.`,
      nextAction: volumeCount > 0 ? "Проверить слой и границы." : "Добавить объемный контур."
    },
    {
      id: "density",
      title: "Плотность",
      status: !input.canPlan ? "blocked" : densityValueCount > 0 ? "ready" : densityProbeCount > 0 ? "draft" : "draft",
      value: densityValueCount > 0 ? densityStats.rangeLabel : `${densityProbeCount} точ.`,
      detail:
        densityValueCount > 0
          ? `${densityStats.protocolLabel}. ${densityStats.unitIsCalibratedHu ? "Источник отметил HU." : "Это не HU-калибровка."}`
          : "Точка плотности клиническая только после сохранения значения из просмотрщика.",
      nextAction: densityValueCount > 0 ? "Сверить калибровку и протокол сверления." : "Поставить probe и сохранить значение."
    },
    {
      id: "canal-clearance",
      title: "Отступ до канала",
      status: clearanceStatus,
      value: clearanceValue,
      detail: "Минимальная дистанция считается по оси импланта и кривой нижнечелюстного канала.",
      nextAction: clearanceNextAction
    },
    {
      id: "portable-state",
      title: "Пакет измерений",
      status: !input.canPlan ? "blocked" : input.unsavedArtifactCount > 0 ? "draft" : "ready",
      value: input.unsavedArtifactCount > 0 ? `${input.unsavedArtifactCount} черн.` : "сохранен",
      detail: "Локальные измерения нужно сохранить в пакет просмотра до передачи.",
      nextAction: input.unsavedArtifactCount > 0 ? "Обновить пакет просмотра." : "Можно передавать дальше."
    }
  ];

  const readyCount = readyCardCount(cards);
  const warnings: string[] = [];
  if (linearCount > 0 && (ridgeWidthCount === 0 || boneHeightCount === 0)) warnings.push("Линейки есть, но ширина гребня и высота кости должны быть подписаны отдельными ролями.");
  if (roiDraftCount > 0) warnings.push("Контур: меньше 3 точек; площадь/объем не считаются.");
  if (volumeCount > 0) warnings.push(`Объем по контуру: слой ${roiVolumeSlabMm} мм.`);
  if (!input.canPlan) warnings.push("Нужна готовая объемная КТ-серия.");
  if (densityProbeCount > 0 && densityValueCount === 0) warnings.push("Точки плотности есть, но значения еще не сохранены.");
  if (densityValueCount > 0 && !densityStats.unitIsCalibratedHu) warnings.push("Плотность сохранена в единицах просмотра; это не HU-калибровка.");
  if (densityStats.hasMixedUnits) warnings.push("Плотность смешала единицы; повторите probe в одной калибровке.");
  if (reviewCount > 0) warnings.push("Есть измерения с предупреждением по калибровке.");
  if (input.unsavedArtifactCount > 0) warnings.push("Есть локальные элементы вне пакета.");
  if (clearance !== null && clearance < 2) warnings.push("Отступ до канала меньше 2 мм.");

  const signedRidgeBoneReady = ridgeWidthCount > 0 && boneHeightCount > 0;
  const status: CtPlanningMeasurementPlanStatus =
    cards.some((card) => card.status === "blocked") ? "blocked" : signedRidgeBoneReady && readyCount >= 5 ? "ready" : "draft";
  const score = Math.round((readyCount / cards.length) * 100);
  const summaryLabel =
    status === "ready"
      ? "измерения закрыты"
      : status === "blocked"
        ? "есть блокер измерений"
        : `${readyCount}/${cards.length} блоков готовы`;

  return {
    version: "dental-crm-ct-measurement-plan-v1",
    status,
    score,
    summaryLabel,
    linearCount,
    ridgeWidthCount,
    boneHeightCount,
    clearanceRoleCount,
    angleCount,
    areaCount,
    volumeCount,
    roiAreaTotalLabel,
    roiVolumeTotalLabel,
    roiVolumeSlabMm,
    roiDraftCount,
    densityProbeCount,
    densityValueCount,
    densityAverageValue: densityStats.average,
    densityRangeLabel: densityStats.rangeLabel,
    densityProtocolLabel: densityStats.protocolLabel,
    densityUnitLabel: densityStats.unitLabel,
    densityUnitIsCalibratedHu: densityStats.unitIsCalibratedHu,
    densityHasMixedUnits: densityStats.hasMixedUnits,
    reviewCount,
    unsavedArtifactCount: input.unsavedArtifactCount,
    readyCardCount: readyCount,
    cards,
    warnings
  };
}
