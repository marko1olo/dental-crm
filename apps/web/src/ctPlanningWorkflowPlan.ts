import type { CtPlanningExportPacket, CtPlanningExportStatus } from "./ctPlanningExport";
import type { CtPlanningImplantModelPlan } from "./ctPlanningImplantModel";
import type { CtPlanningMeasurementPlan } from "./ctPlanningMeasurementPlan";
import type { CtPlanningReconstructionPlan } from "./ctPlanningReconstruction";
import type { CtPlanningValidationStatus, CtPlanningValidationSummary } from "./ctPlanningValidation";
import type { CtPlanningExportScenarioSummary } from "./ctPlanningExportScenarioSummary";

export type CtPlanningWorkflowPhaseStatus = "ready" | "active" | "blocked";
export type CtPlanningWorkflowPhaseOwner = "series" | "doctor" | "implant" | "admin" | "lab";

export type CtPlanningWorkflowPhase = {
  id: string;
  owner: CtPlanningWorkflowPhaseOwner;
  title: string;
  status: CtPlanningWorkflowPhaseStatus;
  value: string;
  detail: string;
  nextAction: string;
};

export type CtPlanningWorkflowScenarioFocus = {
  id: string;
  title: string;
  status: CtPlanningWorkflowPhaseStatus;
  value: string;
  detail: string;
  nextAction: string;
  routeLabel: string;
  viewerLabel: string;
  viewerBridgeLabel: string;
  viewerBridgeAttributes: CtPlanningExportScenarioSummary["bridge"]["attrs"];
  confirmation: string;
  issueTitles: string[];
};

export type CtPlanningWorkflowPlan = {
  version: "dental-crm-ct-workflow-plan-v1";
  status: CtPlanningWorkflowPhaseStatus;
  score: number;
  activePhaseId: string | null;
  selectedPhaseId: string | null;
  selectedScenario: CtPlanningWorkflowScenarioFocus | null;
  summaryLabel: string;
  nextAction: string;
  phases: CtPlanningWorkflowPhase[];
  warnings: string[];
};

function phaseStatus(canPlan: boolean, ready: boolean): CtPlanningWorkflowPhaseStatus {
  if (!canPlan) return "blocked";
  return ready ? "ready" : "active";
}

function statusFromValidation(status: CtPlanningValidationStatus): CtPlanningWorkflowPhaseStatus {
  if (status === "pass") return "ready";
  if (status === "fail") return "blocked";
  return "active";
}

function statusFromExport(status: CtPlanningExportStatus): CtPlanningWorkflowPhaseStatus {
  if (status === "ready") return "ready";
  if (status === "blocked") return "blocked";
  return "active";
}

function phaseScore(status: CtPlanningWorkflowPhaseStatus) {
  if (status === "ready") return 1;
  if (status === "active") return 0.5;
  return 0;
}

function combinedStatus(phases: CtPlanningWorkflowPhase[]): CtPlanningWorkflowPhaseStatus {
  if (phases.some((phase) => phase.status === "blocked")) return "blocked";
  if (phases.every((phase) => phase.status === "ready")) return "ready";
  return "active";
}

function uniqueWarnings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, 6);
}

function selectedPhaseForQuickActionId(quickActionId: string | null | undefined): string | null {
  if (quickActionId === "opg_curve") return "opg-route";
  if (quickActionId === "ridge_ruler") return "measurements";
  if (quickActionId === "implant_axis") return "implant-model";
  if (quickActionId === "area_roi") return "measurements";
  if (quickActionId === "volume_roi") return "measurements";
  if (quickActionId === "nerve_canal") return "safety";
  if (quickActionId === "density_probe") return "measurements";
  if (quickActionId === "surgical_guide") return "handoff";
  if (quickActionId === "implant_library") return "implant-model";
  return null;
}

function selectedScenarioFocus(packet: CtPlanningExportPacket): CtPlanningWorkflowScenarioFocus | null {
  const summary = packet.activeScenarioSummary;
  if (!summary) return null;
  return {
    id: summary.id,
    title: summary.title,
    status: statusFromExport(summary.status),
    value: `${summary.readyCount}/${summary.totalCount}`,
    detail: summary.detail,
    nextAction: summary.nextAction,
    routeLabel: `${summary.route.ownerLabel}: ${summary.route.deliverable}`,
    viewerLabel: `${summary.viewer.viewLabel} · ${summary.viewer.windowLabel} · ${summary.viewer.slabMm} мм`,
    viewerBridgeLabel: summary.bridge.label,
    viewerBridgeAttributes: summary.bridge.attrs,
    confirmation: summary.route.confirmation,
    issueTitles: [...summary.blockedArtifacts, ...summary.draftArtifacts].map((artifact) => artifact.title).slice(0, 4)
  };
}

export function buildCtPlanningWorkflowPlan(input: {
  canPlan: boolean;
  activeQuickActionId?: string | null;
  totalTasks: number;
  blockedTasks: number;
  unsavedArtifactCount: number;
  hasImplantPlan: boolean;
  hasPanoramicRoute: boolean;
  hasCanalRoute: boolean;
  hasGuideRoute: boolean;
  measurementPlan: CtPlanningMeasurementPlan;
  implantModelPlan: CtPlanningImplantModelPlan;
  reconstructionPlan: CtPlanningReconstructionPlan;
  validationSummary: CtPlanningValidationSummary;
  exportPacket: CtPlanningExportPacket;
}): CtPlanningWorkflowPlan {
  const opgReady = input.reconstructionPlan.status === "ready" && input.hasPanoramicRoute;
  const measurementReady = input.measurementPlan.status === "ready";
  const implantReady = input.hasImplantPlan && input.implantModelPlan.status === "ready";
  const safetyReady = input.validationSummary.status === "pass" && input.hasCanalRoute;
  const handoffReady = input.exportPacket.status === "ready" && input.unsavedArtifactCount === 0;

  const phases: CtPlanningWorkflowPhase[] = [
    {
      id: "series",
      owner: "series",
      title: "Серия КТ",
      status: input.canPlan ? "ready" : "blocked",
      value: input.canPlan ? "готова" : "нет объема",
      detail: "Объемная серия открывает ОПТГ, поперечные срезы, контуры, плотность, ось и шаблон.",
      nextAction: input.canPlan ? "Работать с планом." : "Выбрать готовую КЛКТ/КТ-серию."
    },
    {
      id: "opg-route",
      owner: "doctor",
      title: "ОПТГ и срезы",
      status: phaseStatus(input.canPlan, opgReady),
      value: input.reconstructionPlan.crossSectionCount > 0 ? `${input.reconstructionPlan.crossSectionCount} срезов` : `${input.reconstructionPlan.curvePointCount} точек`,
      detail: "Панорамная дуга дает маршрут ОПТГ и поперечных срезов; тяжелые снимки остаются в просмотрщике.",
      nextAction: opgReady ? "Проверить срезы вдоль дуги." : "Построить панорамную дугу минимум тремя точками."
    },
    {
      id: "measurements",
      owner: "doctor",
      title: "Измерения",
      status: phaseStatus(input.canPlan, measurementReady),
      value: `${input.measurementPlan.readyCardCount}/${input.measurementPlan.cards.length}`,
      detail: "Линейка, угол, контуры, объем, плотность и отступ до канала закрываются отдельной картой.",
      nextAction: measurementReady ? "Сверить подпись и калибровку." : input.measurementPlan.summaryLabel
    },
    {
      id: "implant-model",
      owner: "implant",
      title: "Имплант",
      status: phaseStatus(input.canPlan, implantReady),
      value: input.implantModelPlan.sleeveDiameterMm ? `${input.implantModelPlan.sleeveDiameterMm} мм втулка` : input.hasImplantPlan ? "размер выбран" : "нет размера",
      detail: "Типоразмер, ось, апекс, защитный контур и втулка должны быть рассчитаны до шаблона.",
      nextAction: implantReady ? "Проверить апекс и втулку." : "Выбрать типоразмер и поставить ось импланта."
    },
    {
      id: "safety",
      owner: "doctor",
      title: "Безопасность",
      status: statusFromValidation(input.validationSummary.status === "pass" && !input.hasCanalRoute ? "warn" : input.validationSummary.status),
      value: `${input.validationSummary.score}%`,
      detail: "Клинические проверки смотрят серию, ОПТГ, канал, отступ, контуры, модель и шаблон.",
      nextAction: safetyReady ? "Клинические проверки закрыты." : input.validationSummary.label
    },
    {
      id: "handoff",
      owner: input.hasGuideRoute ? "lab" : "admin",
      title: "Передача",
      status: statusFromExport(input.exportPacket.status),
      value: input.unsavedArtifactCount > 0 ? `${input.unsavedArtifactCount} черн.` : `${input.exportPacket.score}%`,
      detail: "Пакет переносит рабочее место, разметки, имплант, маршруты и блокеры без тяжелых снимков.",
      nextAction: handoffReady ? "Сохранить пакет плана." : input.exportPacket.nextAction
    }
  ];

  const status = combinedStatus(phases);
  const activePhase = phases.find((phase) => phase.status !== "ready") ?? null;
  const score = Math.round((phases.reduce((sum, phase) => sum + phaseScore(phase.status), 0) / phases.length) * 100);
  const selectedPhaseId = selectedPhaseForQuickActionId(input.activeQuickActionId);
  const selectedScenario = selectedScenarioFocus(input.exportPacket);
  const summaryLabel =
    status === "ready"
      ? "КТ-маршрут закрыт"
      : activePhase
        ? `следующий этап: ${activePhase.title}`
        : "КТ-маршрут требует проверки";

  return {
    version: "dental-crm-ct-workflow-plan-v1",
    status,
    score,
    activePhaseId: activePhase?.id ?? null,
    selectedPhaseId,
    selectedScenario,
    summaryLabel,
    nextAction: activePhase?.nextAction ?? "Сохранить пакет плана.",
    phases,
    warnings: uniqueWarnings([
      ...input.measurementPlan.warnings,
      ...input.implantModelPlan.warnings,
      ...input.reconstructionPlan.warnings,
      ...input.exportPacket.missingArtifacts,
      selectedScenario && selectedScenario.status !== "ready" ? `${selectedScenario.title}: ${selectedScenario.nextAction}` : "",
      input.blockedTasks > 0 ? `${input.blockedTasks} задач требуют действия` : "",
      input.totalTasks === 0 ? "Пакет задач просмотра еще не собран." : ""
    ])
  };
}
