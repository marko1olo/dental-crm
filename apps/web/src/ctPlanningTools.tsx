import { useMemo, useState } from "react";
import type {
  DentalModelWorkbenchManifest,
  DicomViewerToolStateBundleResponse,
  ImagingViewerAnnotation,
  ImagingViewerImplantPlan,
  ImagingViewerTool,
  LocalBridgeReadinessResponse
} from "@dental/shared";
import {
  ctImplantLibrary,
  ctPlanningMetrics,
  ctPlanningQuickActions,
  ctPlanningTools,
  findCtPlanningQuickActionForArtifactCommand,
  implantPlanFromLibraryItem,
  type CtImplantLibraryItem,
  type CtPlanningQuickAction
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
  type CtPlanningToolKey
} from "./ctPlanningCatalog";
import { CtPlanningArtifactPanel } from "./ctPlanningArtifactPanel";
import {
  buildCtPlanningArtifactCommandStates,
  type CtPlanningArtifactAnnotationRef,
  type CtPlanningArtifactCommand
} from "./ctPlanningArtifactCommands";
import { CtPlanningExportPanel } from "./ctPlanningExportPanel";
import { buildCtPlanningExportScenarioSummary, type CtPlanningExportScenarioArtifact } from "./ctPlanningExportScenarioSummary";
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

const toolStateTargetLabels: Record<DicomViewerToolStateBundleResponse["target"], string> = {
  cornerstone3d: "просмотрщик КТ",
  ohif: "OHIF",
  generic_json: "пакет состояния",
  external_viewer: "внешний просмотр"
};

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
  localBridgeReadiness = null
}: CtPlanningToolsPanelProps) {
  const [localSelectedImplantId, setLocalSelectedImplantId] = useState(ctImplantLibrary[2]?.id ?? ctImplantLibrary[0]?.id ?? "");
  const effectiveSelectedImplantId = selectedImplantId === undefined ? localSelectedImplantId : selectedImplantId ?? "";
  const selectedImplant = useMemo(
    () => ctImplantLibrary.find((implant) => implant.id === effectiveSelectedImplantId) ?? null,
    [effectiveSelectedImplantId]
  );
  const effectiveSelectedImplantPlan = useMemo(
    () => selectedImplantPlan ?? (selectedImplant ? implantPlanFromLibraryItem(selectedImplant) : null),
    [selectedImplant, selectedImplantPlan]
  );
  const effectiveActiveQuickActionId = activeQuickActionId ?? toolStateBundle?.activeQuickActionId ?? null;
  const activeQuickAction = useMemo(
    () =>
      ctPlanningQuickActions.find((action) => action.id === effectiveActiveQuickActionId) ??
      ctPlanningQuickActions.find((action) => action.tool === activeTool) ??
      null,
    [activeTool, effectiveActiveQuickActionId]
  );
  const planningSnapshot = useMemo(
    () => buildCtPlanningTaskSnapshot({
      canPlan,
      activeTool,
      activeQuickActionId: effectiveActiveQuickActionId,
      selectedImplantId: effectiveSelectedImplantId || null,
      selectedImplantPlan: effectiveSelectedImplantPlan,
      localAnnotations,
      toolStateBundle
    }),
    [activeTool, canPlan, effectiveActiveQuickActionId, effectiveSelectedImplantId, effectiveSelectedImplantPlan, localAnnotations, toolStateBundle]
  );
  const implantFitPlan = useMemo(
    () =>
      buildCtPlanningImplantFitPlan({
        canPlan,
        implantLibrary: ctImplantLibrary,
        selectedImplantId: effectiveSelectedImplantId || null,
        geometrySummary: planningSnapshot.geometrySummary
      }),
    [canPlan, effectiveSelectedImplantId, planningSnapshot.geometrySummary]
  );
  const local3DReadinessPlan = useMemo(
    () =>
      buildCtPlanningLocal3DReadinessPlan({
        modelWorkbenchManifest: dentalModelWorkbenchManifest,
        localBridgeReadiness
      }),
    [dentalModelWorkbenchManifest, localBridgeReadiness]
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
            pointCount: annotation.points.length
          })) ?? [])
        ]
      }),
    [annotationRefs, canPlan, planningSnapshot.hasImplantPlan, toolStateBundle]
  );
  const activeActionArtifactStates = useMemo(() => {
    if (!activeQuickAction) return [];
    const statesById = new Map(artifactCommands.map((item) => [item.command.id, item]));
    return activeQuickAction.artifactCommandIds.flatMap((id) => {
      const item = statesById.get(id);
      return item ? [item] : [];
    });
  }, [activeQuickAction, artifactCommands]);
  const activeActionNextArtifact =
    activeActionArtifactStates.find((item) => item.status !== "ready") ?? activeActionArtifactStates[0] ?? null;
  const activeScenarioArtifacts = useMemo<CtPlanningExportScenarioArtifact[]>(
    () =>
      activeActionArtifactStates.map((item) => ({
        id: item.command.id,
        title: item.command.title,
        status: item.status,
        statusLabel: item.statusLabel,
        blocker: item.blocker
      })),
    [activeActionArtifactStates]
  );
  const exportPacket = useMemo(
    () => ({
      ...planningSnapshot.exportPacket,
      activeScenarioSummary: buildCtPlanningExportScenarioSummary(planningSnapshot.exportPacket, activeScenarioArtifacts)
    }),
    [activeScenarioArtifacts, planningSnapshot.exportPacket]
  );
  const workflowPlan = useMemo(
    () =>
      buildCtPlanningWorkflowPlan({
        canPlan,
        activeQuickActionId: effectiveActiveQuickActionId,
        totalTasks: planningSnapshot.totalTasks,
        blockedTasks: planningSnapshot.blockedTasks,
        unsavedArtifactCount: planningSnapshot.measurementPlan.unsavedArtifactCount,
        hasImplantPlan: planningSnapshot.hasImplantPlan,
        hasPanoramicRoute: planningSnapshot.hasPanoramicRoute,
        hasCanalRoute: planningSnapshot.hasCanalRoute,
        hasGuideRoute: planningSnapshot.hasGuideRoute,
        measurementPlan: planningSnapshot.measurementPlan,
        implantModelPlan: planningSnapshot.implantModelPlan,
        reconstructionPlan: planningSnapshot.reconstructionPlan,
        validationSummary: planningSnapshot.validationSummary,
        exportPacket: exportPacket
      }),
    [canPlan, effectiveActiveQuickActionId, exportPacket, planningSnapshot]
  );
  const readyToolCount = ctPlanningTools.filter((tool) => !tool.requiresVolume || canPlan).length;
  const bundleSummary = toolStateBundle
    ? `${toolStateBundle.viewports.length} окон · ${planningSnapshot.taskSummaryLabel} · ${toolStateBundle.annotations.length} разметок`
    : "Соберите состояние просмотрщика для передачи или восстановления.";
  const readyLabel = canPlan ? "КТ-серия готова" : "Нужна готовая КЛКТ/КТ-серия";

  return (
    <section className={`ct-planning-suite ${compact ? "compact" : ""}`} data-testid="ct-planning-suite" aria-label="КТ-планирование, ОПТГ, измерения и импланты">
      <div className="ct-planning-suite-head">
        <div>
          <strong>КТ-планирование</strong>
          <span>ОПТГ, измерения, контуры, импланты, канал, пазуха и шаблон.</span>
        </div>
        <span className={canPlan ? "ready" : "locked"}>{readyLabel}</span>
      </div>
      <CtPlanningWorkflowPanel plan={workflowPlan} />
      <div className="ct-planning-quick-actions" data-testid="ct-planning-quick-actions" aria-label="Быстрые сценарии КТ-планирования">
        {ctPlanningQuickActions.map((action) => {
          const locked = action.requiresVolume && !canPlan;
          const selected = activeQuickAction?.id === action.id;
          return (
            <button
              className={`ct-planning-quick-action ${selected ? "selected" : ""} ${locked ? "locked" : "ready"}`}
              key={action.id}
              type="button"
              disabled={locked || !onActivateTool}
              onClick={() => onActivateTool?.(action)}
              aria-pressed={selected}
              title={locked ? "Сначала выберите готовую КЛКТ/КТ-серию" : action.detail}
            >
              <span>{action.title}</span>
              <strong>{action.toolLabel}</strong>
              <small>
                {locked
                  ? "нужна КТ-серия"
                  : `${action.viewLabel} · ${action.slabMm} мм`}
              </small>
            </button>
          );
        })}
      </div>
      <div className="ct-planning-plan-board" data-testid="ct-planning-plan-board" aria-label="Текущий КТ-план">
        <article>
          <span>Инструменты</span>
          <strong>
            {readyToolCount}/{ctPlanningTools.length}
          </strong>
          <p>{canPlan ? "Объемные инструменты доступны." : "Открыт справочник и план."}</p>
        </article>
        <article>
          <span>Имплант</span>
          <strong>{selectedImplant ? `${selectedImplant.diameterMm} x ${selectedImplant.lengthMm} мм` : "не выбран"}</strong>
          <p>{selectedImplant ? `${selectedImplant.line}, ${selectedImplant.platform}` : "Выберите типоразмер из библиотеки."}</p>
        </article>
        <article>
          <span>Действие</span>
          <strong>{activeQuickAction?.title ?? "не выбрано"}</strong>
          <p>{activeQuickAction ? activeQuickAction.detail : "Выберите сценарий плоскости и инструмента."}</p>
          {activeActionArtifactStates.length > 0 ? (
            <div className="ct-planning-active-action-artifacts" data-testid="ct-planning-active-action-artifacts">
              <div className="ct-planning-active-artifact-chips">
                {activeActionArtifactStates.map((item) => (
                  <em className={item.status} key={item.command.id}>
                    {item.command.title}: {item.statusLabel}
                  </em>
                ))}
              </div>
              {activeActionNextArtifact ? (
                <button
                  type="button"
                  disabled={activeActionNextArtifact.status === "blocked" || !onCreateArtifact}
                  onClick={() => onCreateArtifact?.(activeActionNextArtifact.command)}
                  aria-label={`${activeActionNextArtifact.actionLabel}: ${activeActionNextArtifact.command.title}`}
                >
                  {activeActionNextArtifact.actionLabel}: {activeActionNextArtifact.command.title}
                </button>
              ) : null}
            </div>
          ) : null}
        </article>
        <article>
          <span>Пакет</span>
          <strong>{toolStateBundle ? toolStateTargetLabels[toolStateBundle.target] : "не собран"}</strong>
          <p>{bundleSummary}</p>
        </article>
      </div>
      <div className="ct-planning-task-board" data-testid="ct-planning-task-board" aria-label="Задачи КТ-планирования для просмотрщика">
        <article className="ct-planning-task-summary">
          <span>Готовность плана</span>
          <strong>{planningSnapshot.readinessScore}%</strong>
          <p>{planningSnapshot.taskSummaryLabel}</p>
          <small>{planningSnapshot.implantSummaryLabel}</small>
        </article>
        {planningSnapshot.routeCards.map((route) => (
          <article className={route.state} key={route.id}>
            <span>{route.label}</span>
            <strong>{route.title}</strong>
            <p>{route.detail}</p>
          </article>
        ))}
      </div>
      {planningSnapshot.cards.length > 0 ? (
        <div className="ct-planning-task-list" data-testid="ct-planning-task-list" aria-label="Переносимые задачи КТ-планирования">
          {planningSnapshot.cards.map((task) => (
            <article className={`ct-planning-task ${task.status}`} key={task.id} data-task-kind={task.kind}>
              <span>{task.statusLabel}</span>
              <strong>{task.title}</strong>
              <p>{task.detail}</p>
              <small>{task.toolLabel}</small>
              {task.warnings.length > 0 ? <em>{task.warnings.join(" · ")}</em> : null}
            </article>
          ))}
        </div>
      ) : null}
      {planningSnapshot.geometrySummary.metrics.length > 0 ? (
        <div className="ct-planning-geometry-grid" data-testid="ct-planning-geometry-grid" aria-label="Расчетные измерения КТ-плана">
          {planningSnapshot.geometrySummary.metrics.map((metric) => (
            <article className={`ct-planning-geometry-card ${metric.tone}`} key={metric.id}>
              <span>{metric.title}</span>
              <strong>{metric.valueLabel}</strong>
              <p>{metric.detail}</p>
              <small>{metric.source}</small>
            </article>
          ))}
        </div>
      ) : null}
      <CtPlanningValidationGrid summary={planningSnapshot.validationSummary} />
      <CtPlanningMeasurementPanel plan={planningSnapshot.measurementPlan} />
      <CtPlanningImplantFitPanel plan={implantFitPlan} />
      <CtPlanningImplantModelPanel plan={planningSnapshot.implantModelPlan} local3DReadinessPlan={local3DReadinessPlan} />
      <CtPlanningReconstructionPanel plan={planningSnapshot.reconstructionPlan} />
      <CtPlanningExportPanel packet={exportPacket} implantFitPlan={implantFitPlan} scenarioArtifacts={activeScenarioArtifacts} />
      <CtPlanningArtifactPanel commands={artifactCommands} {...(onCreateArtifact ? { onCreateArtifact } : {})} />
      <div className="ct-planning-metric-grid" data-testid="ct-planning-metric-grid" aria-label="Измерения КТ-плана">
        {ctPlanningMetrics.map((metric) => (
          <article className={canPlan ? "ready" : "locked"} key={metric.id}>
            <span>{metric.title}</span>
            <strong>{metric.value}</strong>
            <p>{metric.clinicalUse}</p>
            <small>{metric.source}</small>
          </article>
        ))}
      </div>
      <div className="ct-planning-tool-grid" data-testid="ct-planning-tool-grid" aria-label="Инструменты КТ-планирования">
        {ctPlanningTools.map((tool) => {
          const locked = tool.requiresVolume && !canPlan;
          return (
            <article className={`ct-planning-tool ${locked ? "locked" : "ready"}`} data-tool-key={tool.key} data-state={locked ? "locked" : "ready"} key={tool.key}>
              <span>{tool.category}</span>
              <strong>{tool.title}</strong>
              <p>{tool.detail}</p>
              <small>{locked ? "Откроется после выбора готовой КЛКТ/КТ-серии." : tool.output}</small>
            </article>
          );
        })}
      </div>
      <div className="ct-implant-library-strip" data-testid="ct-implant-library-strip" aria-label="Библиотека имплантов для КТ-планирования">
        <div className="ct-implant-library-head">
          <strong>Библиотека имплантов</strong>
          <span>Универсальные типоразмеры; брендовые каталоги подключаются отдельно.</span>
        </div>
        <div className="ct-implant-library-grid">
          {ctImplantLibrary.map((implant) => (
            <button
              className={`ct-implant-library-card ${effectiveSelectedImplantId === implant.id ? "selected" : ""}`}
              key={implant.id}
              type="button"
              onClick={() => {
                setLocalSelectedImplantId(implant.id);
                onSelectImplant?.(implant);
              }}
              aria-pressed={effectiveSelectedImplantId === implant.id}
              aria-label={`Выбрать имплант ${implant.diameterMm} на ${implant.lengthMm} мм: ${implant.indication}`}
            >
              <span>{implant.system}</span>
              <strong>
                {implant.diameterMm} x {implant.lengthMm} мм
              </strong>
              <p>
                {implant.line} · {implant.platform}
              </p>
              <small>{implant.indication}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
