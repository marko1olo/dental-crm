import { useMemo } from "react";
import type { CtPlanningExportPacket } from "./ctPlanningExport";
import { CtPlanningExportScenarioPanel } from "./ctPlanningExportScenarioPanel";
import type { CtPlanningExportScenarioArtifact } from "./ctPlanningExportScenarioSummary";
import type { CtPlanningImplantFitPlan } from "./ctPlanningImplantFit";
import { buildCtPlanningReport, type CtPlanningReport } from "./ctPlanningReport";

type CtPlanningExportPanelProps = {
  packet: CtPlanningExportPacket;
  implantFitPlan?: CtPlanningImplantFitPlan;
  scenarioArtifacts?: CtPlanningExportScenarioArtifact[];
};

type CtPlanningReleaseGate = {
  tone: CtPlanningExportPacket["status"];
  title: string;
  detail: string;
  action: string;
};

type CtPlanningImplantFitHandoff = CtPlanningReleaseGate & {
  value: string;
};

const ownerLabels: Record<CtPlanningExportPacket["lanes"][number]["owner"], string> = {
  doctor: "врач",
  admin: "админ",
  lab: "лаборатория"
};

function buildReleaseGate(packet: CtPlanningExportPacket): CtPlanningReleaseGate {
  const blockedFact = packet.clinicalFacts.find((fact) => fact.tone === "blocked");
  const warningFact = packet.clinicalFacts.find((fact) => fact.tone === "warning");
  const missingArtifact = packet.missingArtifacts[0];
  const scenario = packet.activeScenarioSummary;
  if (scenario?.status === "blocked") {
    return {
      tone: "blocked",
      title: "Сценарий заблокирован",
      detail: `${scenario.title}: ${scenario.detail}`,
      action: scenario.nextAction
    };
  }
  if (scenario?.status === "warning" && packet.status !== "blocked") {
    return {
      tone: "warning",
      title: "Сначала закрыть сценарий",
      detail: `${scenario.title}: ${scenario.detail}`,
      action: scenario.nextAction
    };
  }
  if (packet.status === "ready") {
    return {
      tone: "ready",
      title: "Можно фиксировать",
      detail: "Критические проверки закрыты, пакет можно привязать к приему.",
      action: "Сохранить пакет плана и передать по маршруту."
    };
  }
  if (packet.status === "warning") {
    return {
      tone: "warning",
      title: "Только черновик",
      detail: warningFact ? `${warningFact.title}: ${warningFact.value}` : missingArtifact ?? "Есть незакрытые пункты плана.",
      action: packet.nextAction
    };
  }
  return {
    tone: "blocked",
    title: "Передача заблокирована",
    detail: blockedFact ? `${blockedFact.title}: ${blockedFact.value}` : missingArtifact ?? "Нет переносимого состояния или есть клинический блокер.",
    action: packet.nextAction
  };
}

function buildImplantFitHandoff(plan: CtPlanningImplantFitPlan): CtPlanningImplantFitHandoff {
  const candidate = plan.candidates.find((item) => item.id === plan.selectedCandidateId) ?? plan.candidates[0] ?? null;
  if (!candidate) {
    return {
      tone: plan.status === "ready" ? "ready" : plan.status === "blocked" ? "blocked" : "warning",
      title: "Типоразмер не выбран",
      value: `${plan.score}%`,
      detail: plan.warnings[0] ?? "Нужно сверить библиотеку имплантов с линейками.",
      action: "Выбрать типоразмер после ширины, высоты и канала."
    };
  }
  return {
    tone: candidate.status === "ready" ? "ready" : candidate.status === "blocked" ? "blocked" : "warning",
    title: candidate.selected ? "Выбранный типоразмер" : "Кандидат для сверки",
    value: `${candidate.sizeLabel} · ${candidate.score}%`,
    detail: candidate.decisionReasons.join(" · "),
    action: candidate.nextAction
  };
}

function downloadCtPlanningReport(body: string, type: string, fileName: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function printCtPlanningReport(report: CtPlanningReport) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    downloadCtPlanningReport(report.text, "text/plain;charset=utf-8", report.textFileName);
    return;
  }
  printWindow.opener = null;
  printWindow.document.write(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>DENTE CT planning report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      pre { white-space: pre-wrap; font: 14px/1.5 Arial, sans-serif; }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(report.text)}</pre>
  </body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function CtPlanningExportPanel({ packet, implantFitPlan, scenarioArtifacts = [] }: CtPlanningExportPanelProps) {
  const report = useMemo(() => buildCtPlanningReport(packet), [packet]);
  const releaseGate = buildReleaseGate(packet);
  const implantFitHandoff = implantFitPlan ? buildImplantFitHandoff(implantFitPlan) : null;
  return (
    <div className="ct-planning-export-board" data-testid="ct-planning-export-board" aria-label="Пакет передачи КТ-плана">
      <article className={`ct-planning-export-summary ${packet.status}`}>
        <span>Пакет КТ-плана</span>
        <strong>
          {packet.score}% · {packet.title}
        </strong>
        <p>{packet.handoffSummary}</p>
        <small>{packet.nextAction}</small>
        <div className="ct-planning-export-actions" aria-label="Действия с отчетом КТ-плана">
          <button
            className="text-button"
            type="button"
            onClick={() => printCtPlanningReport(report)}
            aria-label="Печать текстового отчета КТ-плана"
          >
            Печать отчета
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => downloadCtPlanningReport(report.text, "text/plain;charset=utf-8", report.textFileName)}
            aria-label="Скачать текстовый отчет КТ-плана"
          >
            Скачать текст
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => downloadCtPlanningReport(JSON.stringify(report.sidecar, null, 2), "application/json;charset=utf-8", report.jsonFileName)}
            aria-label="Скачать JSON-сводку КТ-плана"
          >
            Скачать JSON
          </button>
        </div>
      </article>
      <article
        className={`ct-planning-export-release ${releaseGate.tone}`}
        data-testid="ct-planning-export-release"
        aria-label="Контроль передачи КТ-плана"
      >
        <span>Контроль передачи</span>
        <strong>{releaseGate.title}</strong>
        <p>{releaseGate.detail}</p>
        <small>{releaseGate.action}</small>
      </article>
      <CtPlanningExportScenarioPanel packet={packet} artifacts={scenarioArtifacts} />
      {implantFitHandoff ? (
        <article
          className={`ct-planning-export-fit ${implantFitHandoff.tone}`}
          data-testid="ct-planning-export-fit"
          aria-label="Скрининг типоразмера в пакете передачи"
        >
          <span>{implantFitHandoff.title}</span>
          <strong>{implantFitHandoff.value}</strong>
          <p>{implantFitHandoff.detail}</p>
          <small>{implantFitHandoff.action}</small>
        </article>
      ) : null}
      <div className="ct-planning-export-facts" aria-label="Ключевые факты КТ-плана">
        {packet.clinicalFacts.map((fact) => (
          <article className={`ct-planning-export-fact ${fact.tone}`} key={fact.id}>
            <span>{fact.title}</span>
            <strong>{fact.value}</strong>
            <p>{fact.detail}</p>
          </article>
        ))}
      </div>
      <div className="ct-planning-export-lanes">
        {packet.lanes.map((lane) => (
          <article className={`ct-planning-export-card ${lane.status}`} key={lane.id}>
            <span>{ownerLabels[lane.owner]}</span>
            <strong>{lane.title}</strong>
            <b>{lane.value}</b>
            <p>{lane.detail}</p>
            <small>{lane.nextAction}</small>
          </article>
        ))}
      </div>
      {packet.missingArtifacts.length > 0 ? (
        <div className="ct-planning-export-missing" aria-label="Чего не хватает для передачи КТ-плана">
          <span>Не хватает</span>
          <p>{packet.missingArtifacts.join(" · ")}</p>
        </div>
      ) : null}
    </div>
  );
}
