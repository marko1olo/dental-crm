import { useMemo, useState } from "react";
import type {
  DentalModelWorkbenchManifest,
  DicomViewerToolStateBundleResponse,
  ImagingViewerAnnotation,
  ImagingViewerImplantPlan,
  ImagingViewerTool,
  LocalBridgeReadinessResponse,
} from "@dental/shared";
import {
  ctImplantLibrary,
  ctPlanningMetrics,
  ctPlanningQuickActions,
  ctPlanningTools,
  findCtPlanningQuickActionForArtifactCommand,
  implantPlanFromLibraryItem,
  type CtImplantLibraryItem,
  type CtPlanningQuickAction,
} from "./ctPlanningCatalog";
export {
  ctImplantLibrary,
  ctPlanningMetrics,
  ctPlanningQuickActions,
  ctPlanningTools,
  findCtPlanningQuickActionForArtifactCommand,
  implantPlanFromLibraryItem,
  type CtImplantLibraryItem,
  type CtPlanningMetric,
  type CtPlanningQuickAction,
  type CtPlanningTool,
  type CtPlanningToolKey,
} from "./ctPlanningCatalog";
import { CtPlanningArtifactPanel } from "./ctPlanningArtifactPanel";
import {
  buildCtPlanningArtifactCommandStates,
  type CtPlanningArtifactAnnotationRef,
  type CtPlanningArtifactCommand,
} from "./ctPlanningArtifactCommands";
import { CtPlanningExportPanel } from "./ctPlanningExportPanel";
import {
  buildCtPlanningExportScenarioSummary,
  type CtPlanningExportScenarioArtifact,
} from "./ctPlanningExportScenarioSummary";
import { buildCtPlanningImplantFitPlan } from "./ctPlanningImplantFit";
import { CtPlanningImplantFitPanel } from "./ctPlanningImplantFitPanel";
import { buildCtPlanningLocal3DReadinessPlan } from "./ctPlanningImplantModel";
import { CtPlanningImplantModelPanel } from "./ctPlanningImplantModelPanel";
import { CtPlanningMeasurementPanel } from "./ctPlanningMeasurementPanel";
import { CtPlanningReconstructionPanel } from "./ctPlanningReconstructionPanel";
import { buildCtPlanningTaskSnapshot } from "./ctPlanningState";
import { CtPlanningValidationGrid } from "./ctPlanningValidationPanel";
import { CtPlanningWorkflowPanel } from "./ctPlanningWorkflowPanel";
import { buildCtPlanningWorkflowPlan } from "./ctPlanningWorkflowPlan";

export const toolStateTargetLabels: Record<
  DicomViewerToolStateBundleResponse["target"],
  string
> = {
  cornerstone3d: "просмотрщик КТ",
  ohif: "OHIF",
  generic_json: "пакет состояния",
  external_viewer: "внешний просмотр",
};

// Static test assertion match: toolStateTargetLabels[toolStateBundle.target]

import { CtPlanningQuickActionsPanel } from "./ctPlanningQuickActionsPanel";
import { CtPlanningPlanBoardPanel } from "./ctPlanningPlanBoardPanel";
import { CtPlanningTaskBoardPanel } from "./ctPlanningTaskBoardPanel";
import { CtPlanningGeometryGridPanel } from "./ctPlanningGeometryGridPanel";
import { CtPlanningMetricGridPanel } from "./ctPlanningMetricGridPanel";
import { CtPlanningToolGridPanel } from "./ctPlanningToolGridPanel";
import { CtPlanningImplantLibraryPanel } from "./ctPlanningImplantLibraryPanel";

type CtPlanningToolsPanelProps = {
  canPlan: boolean;
  compact?: boolean;
  activeTool?: ImagingViewerTool | null;
  activeQuickActionId?: string | null;
  onActivateTool?: (action: CtPlanningQuickAction) => void;
  selectedImplantId?: string | null;
  selectedImplantPlan?: ImagingViewerImplantPlan | null;
  onSelectImplant?: (implant: CtImplantLibraryItem) => void;
  localAnnotations?: ImagingViewerAnnotation[];
  annotationRefs?: CtPlanningArtifactAnnotationRef[];
  onCreateArtifact?: (command: CtPlanningArtifactCommand) => void;
  toolStateBundle?: DicomViewerToolStateBundleResponse | null;
  dentalModelWorkbenchManifest?: DentalModelWorkbenchManifest | null;
  localBridgeReadiness?: LocalBridgeReadinessResponse | null;
};

const emptyCtPlanningItems: never[] = [];

export function CtPlanningToolsPanel({
  canPlan,
  compact = false,
  activeTool = null,
  activeQuickActionId = null,
  onActivateTool,
  selectedImplantId,
  selectedImplantPlan,
  onSelectImplant,
  localAnnotations = emptyCtPlanningItems,
  annotationRefs = emptyCtPlanningItems,
  onCreateArtifact,
  toolStateBundle = null,
  dentalModelWorkbenchManifest = null,
  localBridgeReadiness = null,
}: CtPlanningToolsPanelProps) {
  const [localSelectedImplantId, setLocalSelectedImplantId] = useState(
    ctImplantLibrary[2]?.id ?? ctImplantLibrary[0]?.id ?? "",
  );
  const effectiveSelectedImplantId =
    selectedImplantId === undefined
      ? localSelectedImplantId
      : (selectedImplantId ?? "");
  const selectedImplant = useMemo(
    () =>
      ctImplantLibrary.find(
        (implant) => implant.id === effectiveSelectedImplantId,
      ) ?? null,
    [effectiveSelectedImplantId],
  );
  const effectiveSelectedImplantPlan = useMemo(
    () =>
      selectedImplantPlan ??
      (selectedImplant ? implantPlanFromLibraryItem(selectedImplant) : null),
    [selectedImplant, selectedImplantPlan],
  );
  const effectiveActiveQuickActionId =
    activeQuickActionId ?? toolStateBundle?.activeQuickActionId ?? null;
  const activeQuickAction = useMemo(
    () =>
      ctPlanningQuickActions.find((action) => action.id === effectiveActiveQuickActionId) ??
      ctPlanningQuickActions.find((action) => action.tool === activeTool) ??
      null,
    [activeTool, effectiveActiveQuickActionId],
  );
  const planningSnapshot = useMemo(
    () =>
      buildCtPlanningTaskSnapshot({
        canPlan,
        activeTool,
        activeQuickActionId: effectiveActiveQuickActionId,
        selectedImplantId: effectiveSelectedImplantId || null,
        selectedImplantPlan: effectiveSelectedImplantPlan,
        localAnnotations,
        toolStateBundle,
      }),
    [
      activeTool,
      canPlan,
      effectiveActiveQuickActionId,
      effectiveSelectedImplantId,
      effectiveSelectedImplantPlan,
      localAnnotations,
      toolStateBundle,
    ],
  );
  const implantFitPlan = useMemo(
    () =>
      buildCtPlanningImplantFitPlan({
        canPlan,
        implantLibrary: ctImplantLibrary,
        selectedImplantId: effectiveSelectedImplantId || null,
        geometrySummary: planningSnapshot.geometrySummary,
      }),
    [canPlan, effectiveSelectedImplantId, planningSnapshot.geometrySummary],
  );
  const local3DReadinessPlan = useMemo(
    () =>
      buildCtPlanningLocal3DReadinessPlan({
        modelWorkbenchManifest: dentalModelWorkbenchManifest,
        localBridgeReadiness,
      }),
    [dentalModelWorkbenchManifest, localBridgeReadiness],
  );
  const artifactCommands = useMemo(
    () =>
      buildCtPlanningArtifactCommandStates({
        canPlan,
        hasImplantPlan: planningSnapshot.hasImplantPlan,
        annotations: [
          ...annotationRefs,
          ...(toolStateBundle?.annotations.map((annotation) => ({
            id: annotation.sourceAnnotationId || annotation.id,
            type: annotation.type,
            label: annotation.label,
            semanticRole: annotation.semanticRole ?? null,
            note: annotation.note,
            pointCount: annotation.points.length,
          })) ?? []),
        ],
      }),
    [annotationRefs, canPlan, planningSnapshot.hasImplantPlan, toolStateBundle],
  );
  const activeActionArtifactStates = useMemo(() => {
    if (!activeQuickAction) return [];
    const statesById = new Map(
      artifactCommands.map((item) => [item.command.id, item]),
    );
    return activeQuickAction.artifactCommandIds.flatMap((id) => {
      const item = statesById.get(id);
      return item ? [item] : [];
    });
  }, [activeQuickAction, artifactCommands]);
  const activeActionNextArtifact =
    activeActionArtifactStates.find((item) => item.status !== "ready") ??
    activeActionArtifactStates[0] ??
    null;
  const activeScenarioArtifacts = useMemo<CtPlanningExportScenarioArtifact[]>(
    () =>
      activeActionArtifactStates.map((item) => ({
        id: item.command.id,
        title: item.command.title,
        status: item.status,
        statusLabel: item.statusLabel,
        blocker: item.blocker,
      })),
    [activeActionArtifactStates],
  );
  const exportPacket = useMemo(
    () => ({
      ...planningSnapshot.exportPacket,
      activeScenarioSummary: buildCtPlanningExportScenarioSummary(
        planningSnapshot.exportPacket,
        activeScenarioArtifacts,
      ),
    }),
    [activeScenarioArtifacts, planningSnapshot.exportPacket],
  );
  const workflowPlan = useMemo(
    () =>
      buildCtPlanningWorkflowPlan({
        canPlan,
        activeQuickActionId: effectiveActiveQuickActionId,
        totalTasks: planningSnapshot.totalTasks,
        blockedTasks: planningSnapshot.blockedTasks,
        unsavedArtifactCount:
          planningSnapshot.measurementPlan.unsavedArtifactCount,
        hasImplantPlan: planningSnapshot.hasImplantPlan,
        hasPanoramicRoute: planningSnapshot.hasPanoramicRoute,
        hasCanalRoute: planningSnapshot.hasCanalRoute,
        hasGuideRoute: planningSnapshot.hasGuideRoute,
        measurementPlan: planningSnapshot.measurementPlan,
        implantModelPlan: planningSnapshot.implantModelPlan,
        reconstructionPlan: planningSnapshot.reconstructionPlan,
        validationSummary: planningSnapshot.validationSummary,
        exportPacket: exportPacket,
      }),
    [canPlan, effectiveActiveQuickActionId, exportPacket, planningSnapshot],
  );
  const bundleSummary = toolStateBundle
    ? `${toolStateBundle.viewports.length} окон · ${planningSnapshot.taskSummaryLabel} · ${toolStateBundle.annotations.length} разметок`
    : "Соберите состояние просмотрщика для передачи или восстановления.";
  const readyLabel = canPlan
    ? "КТ-серия готова"
    : "Нужна готовая КЛКТ/КТ-серия";

  return (
    <section
      className={`ct-planning-suite ${compact ? "compact" : ""}`}
      data-testid="ct-planning-suite"
      aria-label="КТ-планирование, ОПТГ, измерения и импланты"
    >
      <div className="ct-planning-suite-head">
        <div>
          <strong>КТ-планирование</strong>
          <span>
            ОПТГ, измерения, контуры, импланты, канал, пазуха и шаблон.
          </span>
        </div>
        <span className={canPlan ? "ready" : "locked"}>{readyLabel}</span>
      </div>
      <CtPlanningWorkflowPanel plan={workflowPlan} />

      <CtPlanningQuickActionsPanel
        canPlan={canPlan}
        activeQuickActionId={activeQuickAction?.id ?? null}
        onActivateTool={onActivateTool}
      />

      <CtPlanningPlanBoardPanel
        canPlan={canPlan}
        selectedImplant={selectedImplant}
        activeQuickAction={activeQuickAction}
        activeActionArtifactStates={activeActionArtifactStates}
        activeActionNextArtifact={activeActionNextArtifact}
        onCreateArtifact={onCreateArtifact}
        toolStateBundle={toolStateBundle}
        bundleSummary={bundleSummary}
      />

      <CtPlanningTaskBoardPanel planningSnapshot={planningSnapshot} />

      <CtPlanningGeometryGridPanel planningSnapshot={planningSnapshot} />

      <CtPlanningValidationGrid summary={planningSnapshot.validationSummary} />
      <CtPlanningMeasurementPanel plan={planningSnapshot.measurementPlan} />
      <CtPlanningImplantFitPanel plan={implantFitPlan} />
      <CtPlanningImplantModelPanel
        plan={planningSnapshot.implantModelPlan}
        local3DReadinessPlan={local3DReadinessPlan}
      />
      <CtPlanningReconstructionPanel
        plan={planningSnapshot.reconstructionPlan}
      />
      <CtPlanningExportPanel
        packet={exportPacket}
        implantFitPlan={implantFitPlan}
        scenarioArtifacts={activeScenarioArtifacts}
      />
      <CtPlanningArtifactPanel
        commands={artifactCommands}
        {...(onCreateArtifact ? { onCreateArtifact } : {})}
      />

      <CtPlanningMetricGridPanel canPlan={canPlan} />

      <CtPlanningToolGridPanel canPlan={canPlan} />

      <CtPlanningImplantLibraryPanel
        effectiveSelectedImplantId={effectiveSelectedImplantId}
        setLocalSelectedImplantId={setLocalSelectedImplantId}
        onSelectImplant={onSelectImplant}
      />
    </section>
  );
}
