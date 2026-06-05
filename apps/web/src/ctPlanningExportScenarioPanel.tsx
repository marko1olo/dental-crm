import type { CtPlanningExportPacket } from "./ctPlanningExport";
import {
  buildCtPlanningExportScenarioSummary,
  type CtPlanningExportScenarioArtifact,
  type CtPlanningExportScenarioSummary
} from "./ctPlanningExportScenarioSummary";

type CtPlanningExportScenarioPanelProps = {
  packet: CtPlanningExportPacket;
  artifacts?: CtPlanningExportScenarioArtifact[];
};

function scenarioIssueLabel(status: CtPlanningExportScenarioArtifact["status"]) {
  if (status === "blocked") return "требует действия";
  if (status === "draft") return "черновик";
  return "готово";
}

function scenarioPanelArtifacts(
  summary: CtPlanningExportScenarioSummary,
  artifacts: CtPlanningExportScenarioArtifact[]
): CtPlanningExportScenarioArtifact[] {
  if (artifacts.length > 0) return artifacts;
  return [...summary.blockedArtifacts, ...summary.draftArtifacts].map((artifact) => ({
    id: artifact.id,
    title: artifact.title,
    status: artifact.status,
    statusLabel: scenarioIssueLabel(artifact.status),
    blocker: artifact.blocker
  }));
}

export function CtPlanningExportScenarioPanel({ packet, artifacts = [] }: CtPlanningExportScenarioPanelProps) {
  const summary = packet.activeScenarioSummary ?? buildCtPlanningExportScenarioSummary(packet, artifacts);
  if (!summary) return null;
  const displayArtifacts = scenarioPanelArtifacts(summary, artifacts);
  return (
    <article
      className={`ct-planning-export-focus ${summary.status}`}
      data-testid="ct-planning-export-focus"
      {...summary.bridge.attrs}
      aria-label="Текущий сценарий в пакете передачи КТ-плана"
    >
      <span>Текущий сценарий</span>
      <strong>{summary.title}</strong>
      <p>{summary.detail}</p>
      <small>{summary.route.ownerLabel}{" \u00b7 "}{summary.route.deliverable}{" \u00b7 "}{summary.route.confirmation}</small>
      <small>
        {summary.viewer.viewLabel}{" \u00b7 "}{summary.viewer.windowLabel}{" \u00b7 "}{summary.viewer.slabMm} мм
        {summary.viewer.requiresVolume ? "" : " · без объема"}
      </small>
      <small data-testid="ct-planning-viewer-bridge">
        {summary.bridge.label}
      </small>
      {displayArtifacts.length > 0 ? (
        <div className="ct-planning-export-scenario-artifacts" data-testid="ct-planning-export-scenario-artifacts">
          {displayArtifacts.map((artifact) => (
            <em className={artifact.status} key={artifact.id}>
              {artifact.title}: {artifact.statusLabel}
            </em>
          ))}
        </div>
      ) : null}
      <small>{summary.nextAction}</small>
    </article>
  );
}
