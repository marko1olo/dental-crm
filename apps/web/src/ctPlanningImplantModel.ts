import type {
  DentalModelFileRole,
  DentalModelWorkbenchItem,
  DentalModelWorkbenchManifest,
  DicomGpuRenderPlan,
  DicomViewerToolStateAnnotation,
  DicomViewerToolStatePoint,
  ImagingViewerImplantPlan,
  LocalBridgeReadinessResponse
} from "@dental/shared";
import type { CtPlanningGeometrySummary } from "./ctPlanningGeometry";

export type CtPlanningImplantModelStatus = "ready" | "draft" | "blocked";

export type CtPlanningImplantModelCard = {
  id: string;
  title: string;
  status: CtPlanningImplantModelStatus;
  value: string;
  detail: string;
  nextAction: string;
};

export type CtPlanningImplantModelPlan = {
  version: "dental-crm-ct-implant-model-v1";
  modelOutputKind: "planning_parameters_only";
  cadExportReady: false;
  surfaceModelRequired: true;
  outputBoundarySummary: string;
  status: CtPlanningImplantModelStatus;
  modelingWeight: number;
  modelingLabel: string;
  hasImplant: boolean;
  hasAxis: boolean;
  axisLengthMm: number | null;
  implantLengthMm: number | null;
  implantDiameterMm: number | null;
  safetyEnvelopeDiameterMm: number | null;
  sleeveDiameterMm: number | null;
  sleeveLengthMm: number | null;
  hasGuideRoute: boolean;
  guideReady: boolean;
  guideRoutePointCount: number;
  guideRouteLengthMm: number | null;
  apexPointLabel: string;
  cards: CtPlanningImplantModelCard[];
  warnings: string[];
};

export type CtPlanningLocal3DReadinessCard = {
  id: "ct-surface" | "arch" | "scan-body" | "guide";
  title: string;
  status: CtPlanningImplantModelStatus;
  value: string;
  detail: string;
  nextAction: string;
  metadataCount: number;
  requiresLocalBridge: boolean;
};

export type CtPlanningLocal3DReadinessPlan = {
  version: "dental-crm-ct-local-3d-readiness-v1";
  containsMeshGeometry: false;
  containsDiagnosticPixels: false;
  browserStoresHeavyGeometry: false;
  heavyDataOwner: "external_viewer_or_local_3d_module";
  outputBoundarySummary: string;
  bridgeStatusLabel: string;
  recommendedTargetLabel: string;
  cards: CtPlanningLocal3DReadinessCard[];
  warnings: string[];
  nextAction: string;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const implantModelOutputBoundarySummary =
  "CRM хранит маршрут, ось, апекс, втулку и отступы как параметры плана. CAD/STL выпускает лаборатория или локальный 3D-модуль.";
const local3DOutputBoundarySummary =
  "В браузере хранится только готовность 3D-кейса и метаданные ролей. Поверхности черепа/кости, дуги, скан-боди, шаблон и CAD/STL остаются в локальном 3D-модуле, внешнем просмотре или лаборатории.";

const local3DTargetLabels: Record<DentalModelWorkbenchManifest["recommendedTarget"], string> = {
  metadata_only: "только метаданные",
  external_model_viewer: "внешний 3D-просмотр",
  local_bridge: "локальный 3D-модуль"
};

const local3DBridgeStatusLabels: Record<LocalBridgeReadinessResponse["bridges"][number]["status"], string> = {
  ready: "локальный модуль готов",
  not_configured: "локальный модуль не настроен",
  unreachable: "локальный модуль недоступен",
  blocked: "локальный модуль заблокирован",
  misconfigured: "ошибка настройки модуля",
  planned: "локальный модуль запланирован"
};

const ctSurfaceRoles: DentalModelFileRole[] = ["skull_surface", "maxilla_surface", "mandible_surface", "ct_bone_surface"];
const archRoles: DentalModelFileRole[] = ["upper_arch", "lower_arch"];
const scanBodyRoles: DentalModelFileRole[] = ["scan_body"];
const guideRoles: DentalModelFileRole[] = ["implant_guide", "surgical_guide"];

function itemHasRole(item: DentalModelWorkbenchItem, roles: DentalModelFileRole[]) {
  return roles.includes(item.role) || Boolean(item.ctSurfaceManifest && roles.includes(item.ctSurfaceManifest.role));
}

function itemsForRoles(manifest: DentalModelWorkbenchManifest, roles: DentalModelFileRole[]) {
  return manifest.items.filter((item) => itemHasRole(item, roles));
}

function localBridgeReadiness(input: LocalBridgeReadinessResponse | null) {
  const bridge = input?.bridges.find((item) => item.kind === "dicom_cbct") ?? null;
  return {
    bridge,
    ready: Boolean(bridge && bridge.status === "ready" && bridge.reachable),
    label: bridge ? local3DBridgeStatusLabels[bridge.status] : "локальный модуль не проверен"
  };
}

function itemNeedsLocalBridge(item: DentalModelWorkbenchItem) {
  return (
    item.loadTarget === "local_bridge" ||
    item.ctSurfaceManifest?.loadTarget === "local_bridge" ||
    item.ctSurfaceManifest?.readiness === "pending_local_bridge"
  );
}

function itemIsBlocked(item: DentalModelWorkbenchItem) {
  return item.ctSurfaceManifest?.readiness === "blocked";
}

function formatLocal3DRecordCount(count: number) {
  if (count <= 0) return "нет записей";
  const mod10 = count % 10;
  const mod100 = count % 100;
  const suffix = mod10 === 1 && mod100 !== 11 ? "запись" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "записи" : "записей";
  return `${count} ${suffix}`;
}

function roleCard(input: {
  id: CtPlanningLocal3DReadinessCard["id"];
  title: string;
  manifest: DentalModelWorkbenchManifest;
  roles: DentalModelFileRole[];
  bridgeReady: boolean;
  bridgeLabel: string;
}) {
  const items = itemsForRoles(input.manifest, input.roles);
  const requiresLocalBridge = items.some(itemNeedsLocalBridge) || input.manifest.recommendedTarget === "local_bridge";
  const hasBlockedItem = items.some(itemIsBlocked);
  const metadataCount = items.length;
  const formats = Array.from(new Set(items.map((item) => item.format.toUpperCase()))).slice(0, 3).join(", ");
  const status: CtPlanningImplantModelStatus =
    metadataCount === 0 || hasBlockedItem
      ? "blocked"
      : requiresLocalBridge
        ? input.bridgeReady
          ? "ready"
          : "draft"
        : items.some((item) => item.ctSurfaceManifest?.readiness === "metadata_only" || item.loadTarget === "metadata_only")
          ? "draft"
          : "ready";
  const targetLabel = requiresLocalBridge ? input.bridgeLabel : local3DTargetLabels[input.manifest.recommendedTarget] ?? input.manifest.recommendedTarget;
  const detail =
    metadataCount === 0
      ? "Метаданные этой роли не найдены; CRM ничего не загружает и не строит."
      : `${formats || "формат не указан"} · ${targetLabel}. CRM хранит только счетчик и роль; тяжелая геометрия остается во внешнем просмотре или локальном модуле.`;
  const nextAction =
    status === "ready"
      ? "Передать готовность во внешний 3D-модуль; CAD/STL остается вне CRM."
      : status === "draft"
        ? "Подключить локальный 3D-модуль или оставить кейс в режиме метаданных."
        : "Запустить локальный органайзер и проверить модельные файлы кейса.";

  return {
    id: input.id,
    title: input.title,
    status,
    value: formatLocal3DRecordCount(metadataCount),
    detail,
    nextAction,
    metadataCount,
    requiresLocalBridge
  };
}

export function buildCtPlanningLocal3DReadinessPlan(input: {
  modelWorkbenchManifest: DentalModelWorkbenchManifest | null;
  localBridgeReadiness: LocalBridgeReadinessResponse | null;
}): CtPlanningLocal3DReadinessPlan | null {
  const manifest = input.modelWorkbenchManifest;
  if (!manifest || manifest.totalModels <= 0) return null;
  const bridge = localBridgeReadiness(input.localBridgeReadiness);
  const cards = [
    roleCard({ id: "ct-surface", title: "КТ-поверхность", manifest, roles: ctSurfaceRoles, bridgeReady: bridge.ready, bridgeLabel: bridge.label }),
    roleCard({ id: "arch", title: "Дуги/челюсти", manifest, roles: archRoles, bridgeReady: bridge.ready, bridgeLabel: bridge.label }),
    roleCard({ id: "scan-body", title: "Скан-боди", manifest, roles: scanBodyRoles, bridgeReady: bridge.ready, bridgeLabel: bridge.label }),
    roleCard({ id: "guide", title: "Шаблон", manifest, roles: guideRoles, bridgeReady: bridge.ready, bridgeLabel: bridge.label })
  ];
  const warnings = Array.from(
    new Set([
      ...manifest.warnings,
      ...manifest.items.flatMap((item) => item.warnings),
      ...manifest.items.flatMap((item) => item.ctSurfaceManifest?.warnings ?? [])
    ])
  ).slice(0, 4);

  return {
    version: "dental-crm-ct-local-3d-readiness-v1",
    containsMeshGeometry: false,
    containsDiagnosticPixels: false,
    browserStoresHeavyGeometry: false,
    heavyDataOwner: "external_viewer_or_local_3d_module",
    outputBoundarySummary: local3DOutputBoundarySummary,
    bridgeStatusLabel: bridge.label,
    recommendedTargetLabel: local3DTargetLabels[manifest.recommendedTarget] ?? manifest.recommendedTarget,
    cards,
    warnings,
    nextAction: manifest.nextAction
  };
}

function distanceMm(a: DicomViewerToolStatePoint, b: DicomViewerToolStatePoint) {
  const dx = a.world[0] - b.world[0];
  const dy = a.world[1] - b.world[1];
  const dz = a.world[2] - b.world[2];
  return Math.hypot(dx, dy, dz);
}

function implantAxisAnnotation(annotations: DicomViewerToolStateAnnotation[]) {
  let selected: DicomViewerToolStateAnnotation | null = null;
  let selectedLength = -1;
  for (const annotation of annotations) {
    if (annotation.type !== "implant_axis" || annotation.points.length < 2) continue;
    const first = annotation.points[0];
    const last = annotation.points[annotation.points.length - 1];
    if (!first || !last) continue;
    const length = distanceMm(first, last);
    if (length > selectedLength) {
      selected = annotation;
      selectedLength = length;
    }
  }
  return selected;
}

function surgicalGuideAnnotation(annotations: DicomViewerToolStateAnnotation[]) {
  let selected: DicomViewerToolStateAnnotation | null = null;
  let selectedPointCount = -1;
  for (const annotation of annotations) {
    if (annotation.type !== "surgical_guide" || annotation.points.length < 2) continue;
    if (annotation.points.length > selectedPointCount) {
      selected = annotation;
      selectedPointCount = annotation.points.length;
    }
  }
  return selected;
}

function renderPlanWeight(renderPlan: DicomGpuRenderPlan | null) {
  if (!renderPlan) return 0.5;
  const hardware = clamp(renderPlan.hardwareQualityWeight, 0, 1);
  const quality =
    renderPlan.qualityMode === "diagnostic_full"
      ? 0.95
      : renderPlan.qualityMode === "balanced_mpr"
        ? 0.7
        : renderPlan.qualityMode === "interactive_low"
          ? 0.45
          : renderPlan.qualityMode === "external"
            ? 0.35
            : 0.2;
  const gpu =
    renderPlan.gpuClass === "diagnostic"
      ? 1
      : renderPlan.gpuClass === "discrete_ok"
        ? 0.82
        : renderPlan.gpuClass === "integrated_ok"
          ? 0.58
          : renderPlan.gpuClass === "integrated_low"
            ? 0.35
            : 0.2;
  const budget = renderPlan.interactionBudgetMs <= 16 ? 0.9 : renderPlan.interactionBudgetMs <= 32 ? 0.55 : 0.3;
  return round2(clamp(quality * 0.34 + gpu * 0.24 + budget * 0.14 + hardware * 0.28, 0.15, 1));
}

function modelingLabel(weight: number) {
  if (weight >= 0.82) return "детальная модель";
  if (weight >= 0.6) return "усиленная модель";
  if (weight >= 0.36) return "обычная модель";
  return "экономная модель";
}

function axisLength(axis: DicomViewerToolStateAnnotation | null) {
  if (!axis) return null;
  const first = axis.points[0];
  const last = axis.points[axis.points.length - 1];
  return first && last ? round2(distanceMm(first, last)) : null;
}

function polylineLengthMm(points: DicomViewerToolStatePoint[]) {
  if (points.length < 2) return null;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    total += distanceMm(previous, current);
  }
  return Number.isFinite(total) ? round2(total) : null;
}

function apexLabel(axis: DicomViewerToolStateAnnotation | null, implantPlan: ImagingViewerImplantPlan | null) {
  if (!axis || !implantPlan) return "нет оси";
  const first = axis.points[0];
  const last = axis.points[axis.points.length - 1];
  if (!first || !last) return "нет оси";
  const dx = last.world[0] - first.world[0];
  const dy = last.world[1] - first.world[1];
  const dz = last.world[2] - first.world[2];
  const length = Math.hypot(dx, dy, dz);
  if (length <= 0) return "ось без длины";
  const scale = implantPlan.lengthMm / length;
  return `${round1(first.world[0] + dx * scale)}, ${round1(first.world[1] + dy * scale)}, ${round1(first.world[2] + dz * scale)}`;
}

function statusForImplant(hasImplant: boolean, hasAxis: boolean): CtPlanningImplantModelStatus {
  if (hasImplant && hasAxis) return "ready";
  if (hasImplant || hasAxis) return "draft";
  return "blocked";
}

export function buildCtPlanningImplantModelPlan(input: {
  annotations: DicomViewerToolStateAnnotation[];
  implantPlan: ImagingViewerImplantPlan | null;
  geometrySummary: CtPlanningGeometrySummary;
  renderPlan: DicomGpuRenderPlan | null;
}): CtPlanningImplantModelPlan {
  const axis = implantAxisAnnotation(input.annotations);
  const guideRoute = surgicalGuideAnnotation(input.annotations);
  const hasImplant = Boolean(input.implantPlan);
  const hasAxis = Boolean(axis);
  const hasGuideRoute = Boolean(guideRoute);
  const axisLengthMm = axisLength(axis);
  const guideRoutePointCount = guideRoute?.points.length ?? 0;
  const guideRouteLengthMm = guideRoute ? polylineLengthMm(guideRoute.points) : null;
  const implantLengthMm = input.implantPlan?.lengthMm ?? null;
  const implantDiameterMm = input.implantPlan?.diameterMm ?? null;
  const safetyEnvelopeDiameterMm = implantDiameterMm === null ? null : round1(implantDiameterMm + 4);
  const sleeveDiameterMm = implantDiameterMm === null ? null : round1(implantDiameterMm + 1.4);
  const sleeveLengthMm = implantLengthMm === null ? null : round1(clamp(implantLengthMm * 0.45, 5, 9));
  const modelingWeight = renderPlanWeight(input.renderPlan);
  const clearance = input.geometrySummary.minimumClearanceMm;
  const status = statusForImplant(hasImplant, hasAxis);
  const guideReady = hasImplant && hasAxis && hasGuideRoute && sleeveDiameterMm !== null && sleeveLengthMm !== null && clearance !== null && clearance >= 2;
  const cards: CtPlanningImplantModelCard[] = [
    {
      id: "implant-body",
      title: "Тело импланта",
      status: hasImplant ? "ready" : "blocked",
      value: input.implantPlan ? `${input.implantPlan.diameterMm} x ${input.implantPlan.lengthMm} мм` : "нет размера",
      detail: input.implantPlan ? `${input.implantPlan.line}, ${input.implantPlan.platform}` : "Типоразмер нужен до оси и шаблона.",
      nextAction: hasImplant ? "Сверить диаметр с шириной гребня." : "Выбрать имплант из библиотеки."
    },
    {
      id: "implant-axis",
      title: "Ось и апекс",
      status: hasAxis ? "ready" : hasImplant ? "draft" : "blocked",
      value: axisLengthMm === null ? "нет оси" : `${axisLengthMm} мм`,
      detail: `Апекс по выбранной длине: ${apexLabel(axis, input.implantPlan)}.`,
      nextAction: hasAxis ? "Проверить апекс на поперечных срезах." : "Поставить 2 точки оси импланта."
    },
    {
      id: "safety-envelope",
      title: "Контрольный цилиндр",
      status: safetyEnvelopeDiameterMm !== null ? "ready" : "blocked",
      value: safetyEnvelopeDiameterMm === null ? "нет" : `${safetyEnvelopeDiameterMm} мм`,
      detail: "Диаметр импланта + 2 мм с каждой стороны для визуального контроля.",
      nextAction: clearance === null ? "Добавить канал для расчета отступа." : clearance >= 2 ? "Отступ до канала проходит." : "Сместить ось или изменить размер."
    },
    {
      id: "guide-sleeve",
      title: "Втулка шаблона",
      status: sleeveDiameterMm !== null && hasAxis ? "ready" : sleeveDiameterMm !== null ? "draft" : "blocked",
      value: sleeveDiameterMm === null || sleeveLengthMm === null ? "нет" : `${sleeveDiameterMm} x ${sleeveLengthMm} мм`,
      detail: `${modelingLabel(modelingWeight)}: качество меняет только отображение, не размеры втулки.`,
      nextAction: sleeveDiameterMm !== null && hasAxis ? "Сохранить маршрут шаблона в пакет." : "Нужны типоразмер и ось."
    },
    {
      id: "guide-route",
      title: "Маршрут шаблона",
      status: guideReady ? "ready" : hasGuideRoute || (hasImplant && hasAxis) ? "draft" : "blocked",
      value: guideRouteLengthMm === null ? `${guideRoutePointCount}/2` : `${guideRouteLengthMm} мм`,
      detail: "Маршрут передается как кривая; STL/CAD делает лаборатория.",
      nextAction: guideReady ? "Передать лаборатории после сохранения пакета." : "Нужны имплант, ось, маршрут и отступ >= 2 мм."
    }
  ];
  const warnings: string[] = [];
  if (!hasGuideRoute) warnings.push("Маршрут шаблона не размечен.");
  if (hasGuideRoute && clearance === null) warnings.push("Для шаблона нужен отступ до канала.");
  if (!hasImplant) warnings.push("Имплант не выбран.");
  if (!hasAxis) warnings.push("Ось импланта не размечена.");
  if (axisLengthMm !== null && implantLengthMm !== null && axisLengthMm < implantLengthMm * 0.75) warnings.push("Размеченная ось короче выбранного импланта.");
  if (clearance !== null && clearance < 2) warnings.push("Отступ до канала меньше 2 мм.");

  return {
    version: "dental-crm-ct-implant-model-v1",
    modelOutputKind: "planning_parameters_only",
    cadExportReady: false,
    surfaceModelRequired: true,
    outputBoundarySummary: implantModelOutputBoundarySummary,
    status,
    modelingWeight,
    modelingLabel: modelingLabel(modelingWeight),
    hasImplant,
    hasAxis,
    axisLengthMm,
    implantLengthMm,
    implantDiameterMm,
    safetyEnvelopeDiameterMm,
    sleeveDiameterMm,
    sleeveLengthMm,
    hasGuideRoute,
    guideReady,
    guideRoutePointCount,
    guideRouteLengthMm,
    apexPointLabel: apexLabel(axis, input.implantPlan),
    cards,
    warnings
  };
}
