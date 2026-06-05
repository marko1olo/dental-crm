import type {
  DicomViewerPlanningTask,
  DicomViewerPlanningTaskKind,
  DicomViewerTargetTool,
  DicomViewerToolStateAnnotation,
  DicomViewerToolStateBundleResponse,
  ImagingViewerAnnotation,
  ImagingViewerImplantPlan,
  ImagingViewerTool
} from "@dental/shared";
import { buildCtPlanningExportPacket, type CtPlanningExportPacket } from "./ctPlanningExport";
import { buildCtPlanningGeometrySummary, type CtPlanningGeometrySummary } from "./ctPlanningGeometry";
import { buildCtPlanningImplantModelPlan, type CtPlanningImplantModelPlan } from "./ctPlanningImplantModel";
import { buildCtPlanningMeasurementPlan, type CtPlanningMeasurementPlan } from "./ctPlanningMeasurementPlan";
import { buildCtPlanningReconstructionPlan, type CtPlanningReconstructionPlan } from "./ctPlanningReconstruction";
import { buildCtPlanningValidationSummary, type CtPlanningValidationSummary } from "./ctPlanningValidation";

export type CtPlanningTaskCard = {
  id: string;
  kind: DicomViewerPlanningTaskKind;
  title: string;
  detail: string;
  status: DicomViewerPlanningTask["status"];
  statusLabel: string;
  outputUnit: string;
  toolLabel: string;
  projectionLabel: string;
  warnings: string[];
};

export type CtPlanningTaskSnapshot = {
  readinessScore: number;
  totalTasks: number;
  readyTasks: number;
  activeTasks: number;
  blockedTasks: number;
  volumeBlockedTasks: number;
  hasImplantPlan: boolean;
  hasPanoramicRoute: boolean;
  hasCanalRoute: boolean;
  hasGuideRoute: boolean;
  taskSummaryLabel: string;
  implantSummaryLabel: string;
  geometrySummary: CtPlanningGeometrySummary;
  measurementPlan: CtPlanningMeasurementPlan;
  implantModelPlan: CtPlanningImplantModelPlan;
  reconstructionPlan: CtPlanningReconstructionPlan;
  validationSummary: CtPlanningValidationSummary;
  exportPacket: CtPlanningExportPacket;
  routeCards: CtPlanningRouteCard[];
  cards: CtPlanningTaskCard[];
  warnings: string[];
};

export type CtPlanningRouteCard = {
  id: string;
  label: string;
  title: string;
  detail: string;
  state: "ready" | "blocked";
};

const taskKindLabels: Record<DicomViewerPlanningTaskKind, string> = {
  panoramic_reconstruction: "ОПТГ",
  cross_section_curve: "Поперечные срезы",
  distance_measurement: "Линейка",
  angle_measurement: "Угол",
  area_roi: "Контур площади",
  volume_roi: "Контур объема",
  implant_axis: "Ось импланта",
  implant_library: "Библиотека",
  nerve_canal: "Канал нерва",
  bone_density_probe: "Плотность",
  surgical_guide: "Шаблон"
};

const statusLabels: Record<DicomViewerPlanningTask["status"], string> = {
  active: "активно",
  ready: "готово",
  blocked: "нужно действие"
};

const projectionLabels: Record<string, string> = {
  axial: "аксиал",
  coronal: "коронал",
  sagittal: "сагиттал",
  oblique: "косой срез",
  panoramic_reconstruction: "панорама",
  three_d_volume: "3D",
  mip: "карта плотности"
};

const toolLabels: Record<string, string> = {
  WindowLevelTool: "окно",
  PanTool: "панорама",
  ZoomTool: "зум",
  StackScrollTool: "срезы",
  CrosshairsTool: "курсор",
  LengthTool: "линейка",
  AngleTool: "угол",
  ArrowAnnotateTool: "метка",
  RectangleROITool: "контур",
  BidirectionalTool: "ось",
  SplineROITool: "кривая",
  PlanarFreehandROITool: "контур",
  ProbeTool: "зонд"
};

function taskPriority(task: DicomViewerPlanningTask) {
  const order: Record<DicomViewerPlanningTaskKind, number> = {
    panoramic_reconstruction: 0,
    cross_section_curve: 1,
    distance_measurement: 2,
    angle_measurement: 3,
    area_roi: 4,
    volume_roi: 5,
    implant_library: 6,
    implant_axis: 7,
    nerve_canal: 8,
    bone_density_probe: 9,
    surgical_guide: 10
  };
  return order[task.kind] ?? 99;
}

function statusRank(status: DicomViewerPlanningTask["status"]) {
  if (status === "active") return 0;
  if (status === "blocked") return 1;
  return 2;
}

function taskCard(task: DicomViewerPlanningTask): CtPlanningTaskCard {
  const projectionLabel = task.projection ? projectionLabels[task.projection] ?? task.projection : "любой вид";
  const outputUnit = task.outputUnit ?? "план";
  const warnings = task.warnings.slice(0, 2);
  return {
    id: task.id,
    kind: task.kind,
    title: taskKindLabels[task.kind],
    detail: `${projectionLabel} · ${task.slabMm} мм · ${outputUnit}`,
    status: task.status,
    statusLabel: statusLabels[task.status],
    outputUnit,
    toolLabel: toolLabels[task.targetTool] ?? task.targetTool,
    projectionLabel,
    warnings
  };
}

function targetToolForLocalAnnotation(type: ImagingViewerAnnotation["type"]): DicomViewerTargetTool {
  switch (type) {
    case "distance":
      return "LengthTool";
    case "angle":
      return "AngleTool";
    case "roi":
      return "RectangleROITool";
    case "area_roi":
      return "PlanarFreehandROITool";
    case "volume_roi":
      return "SplineROITool";
    case "implant_axis":
      return "BidirectionalTool";
    case "nerve_canal":
    case "panoramic_curve":
    case "surgical_guide":
      return "SplineROITool";
    case "bone_density_probe":
    case "landmark":
      return "ProbeTool";
    case "note":
    default:
      return "ArrowAnnotateTool";
  }
}

function localAnnotationToToolState(annotation: ImagingViewerAnnotation): DicomViewerToolStateAnnotation {
  const warnings = new Set<string>();
  if (annotation.points.length === 0) warnings.add("Черновик разметки создан, но точки еще не поставлены.");
  if ((annotation.type === "distance" || annotation.type === "angle") && annotation.measurementValue === null) {
    warnings.add("Значение измерения появится после калибровки и постановки точек.");
  }
  return {
    id: `local-toolstate-${annotation.id}`,
    sourceAnnotationId: annotation.id,
    targetTool: targetToolForLocalAnnotation(annotation.type),
    type: annotation.type,
    label: annotation.label,
    semanticRole: annotation.semanticRole ?? null,
    toothCode: annotation.toothCode,
    note: annotation.note,
    viewportId: "crm-local-draft",
    frameOfReferenceUid: null,
    referencedImageId: null,
    measurement: {
      value: annotation.measurementValue,
      unit: annotation.unit
    },
    points: annotation.points.map((point, index) => ({
      world: [point.x, point.y, point.z ?? 0],
      canvas: [point.x, point.y],
      plane: point.plane ?? null,
      sourceIndex: index
    })),
    locked: false,
    needsReview: warnings.size > 0,
    warnings: Array.from(warnings)
  };
}

function mergeToolStateAnnotations(
  bundleAnnotations: DicomViewerToolStateAnnotation[],
  localAnnotations: ImagingViewerAnnotation[]
): DicomViewerToolStateAnnotation[] {
  const seenSourceIds = new Set(bundleAnnotations.map((annotation) => annotation.sourceAnnotationId));
  const localToolStateAnnotations = localAnnotations
    .filter((annotation) => annotation.type !== "note" && !seenSourceIds.has(annotation.id))
    .map(localAnnotationToToolState);
  return [...bundleAnnotations, ...localToolStateAnnotations];
}

function unsavedPlanningAnnotationCount(
  bundleAnnotations: DicomViewerToolStateAnnotation[],
  localAnnotations: ImagingViewerAnnotation[]
) {
  const seenSourceIds = new Set(bundleAnnotations.map((annotation) => annotation.sourceAnnotationId));
  return localAnnotations.filter((annotation) => annotation.type !== "note" && annotation.points.length > 0 && !seenSourceIds.has(annotation.id)).length;
}

function hasCompletedAnnotation(annotations: DicomViewerToolStateAnnotation[], type: ImagingViewerAnnotation["type"], minimumPoints: number) {
  return annotations.some((annotation) => annotation.type === type && annotation.points.length >= minimumPoints);
}

function minimumPointsForLocalReadiness(type: ImagingViewerAnnotation["type"]) {
  if (type === "angle" || type === "area_roi" || type === "roi" || type === "volume_roi" || type === "nerve_canal" || type === "panoramic_curve") return 3;
  if (type === "distance" || type === "implant_axis" || type === "surgical_guide") return 2;
  if (type === "bone_density_probe" || type === "landmark") return 1;
  return Number.POSITIVE_INFINITY;
}

export function buildCtPlanningTaskSnapshot(input: {
  canPlan: boolean;
  activeTool: ImagingViewerTool | null;
  activeQuickActionId?: string | null;
  selectedImplantId: string | null;
  selectedImplantPlan?: ImagingViewerImplantPlan | null;
  localAnnotations?: ImagingViewerAnnotation[];
  toolStateBundle: DicomViewerToolStateBundleResponse | null;
}): CtPlanningTaskSnapshot {
  const tasks = input.toolStateBundle?.planningTasks ?? [];
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((task) => task.status === "active").length;
  const readyTasks = tasks.filter((task) => task.status === "ready" || task.status === "active").length;
  const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
  const volumeBlockedTasks = tasks.filter((task) => task.status === "blocked" && task.requiresVolume).length;
  const mergedAnnotations = mergeToolStateAnnotations(input.toolStateBundle?.annotations ?? [], input.localAnnotations ?? []);
  const effectiveImplantPlan = input.toolStateBundle?.implantPlan ?? input.selectedImplantPlan ?? null;
  const localImplantNotInBundle = Boolean(input.selectedImplantPlan && (!input.toolStateBundle?.implantPlan || input.toolStateBundle.implantPlan.itemId !== input.selectedImplantPlan.itemId));
  const unsavedArtifactCount = unsavedPlanningAnnotationCount(input.toolStateBundle?.annotations ?? [], input.localAnnotations ?? []) + (localImplantNotInBundle ? 1 : 0);
  const hasImplantPlan = Boolean(effectiveImplantPlan ?? input.selectedImplantId);
  const hasPanoramicRoute = tasks.some((task) => task.kind === "panoramic_reconstruction" && task.status !== "blocked")
    || hasCompletedAnnotation(mergedAnnotations, "panoramic_curve", 3);
  const hasCanalRoute = tasks.some((task) => task.kind === "nerve_canal" && task.status !== "blocked")
    || hasCompletedAnnotation(mergedAnnotations, "nerve_canal", 3);
  const hasGuideRoute = tasks.some((task) => task.kind === "surgical_guide" && task.status !== "blocked")
    || hasCompletedAnnotation(mergedAnnotations, "surgical_guide", 2);
  const completedArtifactCount = mergedAnnotations.filter((annotation) => annotation.points.length >= minimumPointsForLocalReadiness(annotation.type)).length;
  const readinessScore = totalTasks > 0
    ? Math.round((readyTasks / totalTasks) * 100)
    : input.canPlan
      ? Math.min(85, 45 + completedArtifactCount * 6 + (hasImplantPlan ? 7 : 0))
      : 15;
  const warnings = Array.from(new Set(tasks.flatMap((task) => task.warnings))).slice(0, 4);
  const geometrySummary = buildCtPlanningGeometrySummary({
    annotations: mergedAnnotations,
    implantPlan: effectiveImplantPlan,
    slabMm: tasks.find((task) => task.kind === "volume_roi")?.slabMm ?? 1
  });
  const measurementPlan = buildCtPlanningMeasurementPlan({
    canPlan: input.canPlan,
    annotations: mergedAnnotations,
    geometrySummary,
    unsavedArtifactCount
  });
  const reconstructionPlan = buildCtPlanningReconstructionPlan({
    canPlan: input.canPlan,
    annotations: mergedAnnotations,
    renderPlan: input.toolStateBundle?.renderPlan ?? null,
    slabMm: tasks.find((task) => task.kind === "panoramic_reconstruction")?.slabMm ?? 10
  });
  const implantModelPlan = buildCtPlanningImplantModelPlan({
    annotations: mergedAnnotations,
    implantPlan: effectiveImplantPlan,
    geometrySummary,
    renderPlan: input.toolStateBundle?.renderPlan ?? null
  });
  const validationSummary = buildCtPlanningValidationSummary({
    canPlan: input.canPlan,
    totalTasks,
    blockedTasks,
    volumeBlockedTasks,
    hasImplantPlan,
    hasPanoramicRoute,
    hasCanalRoute,
    hasGuideRoute,
    geometrySummary,
    measurementPlan,
    implantModelPlan
  });
  const exportPacket = buildCtPlanningExportPacket({
    toolStateBundle: input.toolStateBundle ?? null,
    activeQuickActionId: input.activeQuickActionId ?? input.toolStateBundle?.activeQuickActionId ?? null,
    geometrySummary,
    validationSummary,
    readinessScore,
    totalTasks,
    blockedTasks,
    volumeBlockedTasks,
    unsavedArtifactCount,
    measurementPlan,
    implantModelPlan,
    reconstructionPlan,
    hasImplantPlan,
    hasPanoramicRoute,
    hasCanalRoute,
    hasGuideRoute
  });
  const cards = tasks
    .slice()
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || taskPriority(a) - taskPriority(b))
    .map(taskCard);
  const activeToolLabel = input.activeTool ? "выбран инструмент КТ" : null;
  const taskSummaryLabel = totalTasks > 0
    ? `${readyTasks}/${totalTasks} задач готовы`
    : input.canPlan
      ? activeToolLabel
        ? `серия готова, активен ${activeToolLabel}`
        : "серия готова, пакет задач еще не собран"
      : "сначала нужна готовая КТ-серия";
  const implantSummaryLabel = hasImplantPlan
    ? effectiveImplantPlan
      ? `${effectiveImplantPlan.diameterMm} x ${effectiveImplantPlan.lengthMm} мм`
      : "типоразмер выбран"
    : "имплант не выбран";
  const routeCards: CtPlanningRouteCard[] = [
    {
      id: "opg",
      label: "ОПТГ",
      title: hasPanoramicRoute ? "маршрут есть" : "нужно построить",
      detail: "Панорамная дуга и поперечные срезы восстанавливаются вместе с рабочим местом.",
      state: hasPanoramicRoute ? "ready" : "blocked"
    },
    {
      id: "canal",
      label: "Канал",
      title: hasCanalRoute ? "готов к разметке" : "нет трассы",
      detail: "Канал нерва хранится как отдельная кривая, а не как заметка в свободном тексте.",
      state: hasCanalRoute ? "ready" : "blocked"
    },
    {
      id: "guide",
      label: "Шаблон",
      title: hasGuideRoute ? "есть маршрут" : "нужны ось и имплант",
      detail: "План шаблона опирается на типоразмер, ось, втулку и 3D-проекцию.",
      state: hasGuideRoute ? "ready" : "blocked"
    }
  ];

  return {
    readinessScore,
    totalTasks,
    readyTasks,
    activeTasks,
    blockedTasks,
    volumeBlockedTasks,
    hasImplantPlan,
    hasPanoramicRoute,
    hasCanalRoute,
    hasGuideRoute,
    taskSummaryLabel,
    implantSummaryLabel,
    geometrySummary,
    measurementPlan,
    implantModelPlan,
    reconstructionPlan,
    validationSummary,
    exportPacket,
    routeCards,
    cards,
    warnings: Array.from(new Set([...warnings, ...geometrySummary.warnings])).slice(0, 6)
  };
}
