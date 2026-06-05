import type { CtPlanningExportPacket, CtPlanningExportStatus } from "./ctPlanningExport";

export type CtPlanningReportReleaseGate = {
  tone: CtPlanningExportStatus;
  title: string;
  detail: string;
  action: string;
};

export type CtPlanningReportScenario = {
  title: string;
  status: CtPlanningExportStatus;
  ownerLabel: string;
  deliverable: string;
  confirmation: string;
  viewerSummary: string;
  bridgeLabel: string;
};

export type CtPlanningReportBridgeSummary = {
  label: string;
  commandSummary: string;
  commandString: string | null;
  envelopeVersion: string | null;
  canLaunch: boolean;
  launchGate: string | null;
  applyStepCount: number;
  missingTargetCount: number;
  pixelPolicy: string;
};

export type CtPlanningReportSidecar = {
  version: "dental-crm-ct-planning-report-v1";
  generatedAt: string;
  packetVersion: CtPlanningExportPacket["version"];
  status: CtPlanningExportPacket["status"];
  score: number;
  title: string;
  outputBoundary: {
    modelOutputKind: CtPlanningExportPacket["modelOutputKind"];
    cadExportReady: CtPlanningExportPacket["cadExportReady"];
    surfaceModelRequired: CtPlanningExportPacket["surfaceModelRequired"];
    summary: string;
    statements: string[];
  };
  runtimeTruthPolicy: CtPlanningExportPacket["runtimeTruthPolicy"];
  releaseGate: CtPlanningReportReleaseGate;
  selectedScenario: CtPlanningReportScenario | null;
  bridge: CtPlanningReportBridgeSummary | null;
  clinicalFacts: CtPlanningExportPacket["clinicalFacts"];
  lanes: CtPlanningExportPacket["lanes"];
  missingArtifacts: string[];
  nextAction: string;
};

export type CtPlanningReport = {
  sidecar: CtPlanningReportSidecar;
  text: string;
  textFileName: string;
  jsonFileName: string;
};

const reportBoundaryStatements = [
  "No DICOM pixels are included in this CRM report.",
  "No mesh geometry is included in this CRM report.",
  "No CAD, STL, surgical-guide, or prosthetic model is generated in the browser CRM.",
  "The report is planning metadata for clinician/lab review; diagnostic viewing and CAD output stay in the certified viewer, local bridge, or lab workflow."
];

function statusLabel(status: CtPlanningExportStatus) {
  if (status === "ready") return "готов";
  if (status === "warning") return "черновик";
  return "заблокирован";
}

function buildReportReleaseGate(packet: CtPlanningExportPacket): CtPlanningReportReleaseGate {
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
      title: "Сценарий требует сверки",
      detail: `${scenario.title}: ${scenario.detail}`,
      action: scenario.nextAction
    };
  }
  if (packet.status === "ready") {
    return {
      tone: "ready",
      title: "Можно фиксировать",
      detail: "Критические проверки закрыты, пакет можно приложить к приему.",
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

function pixelPolicyLabel(value: string | undefined) {
  if (value === "external_volume_only") return "объем открывается только во внешнем или локальном просмотре";
  if (value === "metadata_only_no_pixels") return "только метаданные, без данных снимков";
  return "граница просмотра не задана";
}

function bridgeSummary(packet: CtPlanningExportPacket): CtPlanningReportBridgeSummary | null {
  const scenario = packet.activeScenarioSummary;
  if (!scenario) return null;
  const attrs = scenario.bridge.attrs;
  return {
    label: scenario.bridge.label,
    commandSummary: `${scenario.viewer.viewLabel}; ${scenario.viewer.windowLabel}; слой ${scenario.viewer.slabMm} мм; ${scenario.viewer.requiresVolume ? "нужен готовый объем КТ" : "без загрузки объема"}`,
    commandString: attrs["data-viewer-restore"] || null,
    envelopeVersion: attrs["data-viewer-envelope-version"] || null,
    canLaunch: attrs["data-viewer-can-launch"] === "true",
    launchGate: attrs["data-viewer-launch-gate"] || null,
    applyStepCount: Number(attrs["data-viewer-apply-steps"] || 0),
    missingTargetCount: Number(attrs["data-viewer-missing-targets"] || 0),
    pixelPolicy: pixelPolicyLabel(attrs["data-viewer-pixel-policy"])
  };
}

function selectedScenario(packet: CtPlanningExportPacket): CtPlanningReportScenario | null {
  const scenario = packet.activeScenarioSummary;
  if (!scenario) return null;
  return {
    title: scenario.title,
    status: scenario.status,
    ownerLabel: scenario.route.ownerLabel,
    deliverable: scenario.route.deliverable,
    confirmation: scenario.route.confirmation,
    viewerSummary: `${scenario.viewer.viewLabel}; ${scenario.viewer.windowLabel}; слой ${scenario.viewer.slabMm} мм${scenario.viewer.requiresVolume ? "" : "; без объема"}`,
    bridgeLabel: scenario.bridge.label
  };
}

function reportFileStem(generatedAt: string) {
  return `ct_planning_report_${generatedAt.slice(0, 19).replace(/[-:T]/g, "")}`;
}

function linesForFacts(facts: CtPlanningExportPacket["clinicalFacts"]) {
  return facts.map((fact) => `- ${fact.title}: ${fact.value} [${statusLabel(fact.tone)}]. ${fact.detail}`);
}

function linesForLanes(lanes: CtPlanningExportPacket["lanes"]) {
  return lanes.map((lane) => `- ${lane.title}: ${lane.value} [${statusLabel(lane.status)}]. ${lane.detail} Next: ${lane.nextAction}`);
}

export function formatCtPlanningReportText(sidecar: CtPlanningReportSidecar): string {
  const scenario = sidecar.selectedScenario;
  const bridge = sidecar.bridge;
  return [
    "DENTE CT planning report",
    `Generated: ${sidecar.generatedAt}`,
    `Status: ${sidecar.score}% - ${statusLabel(sidecar.status)} - ${sidecar.title}`,
    "",
    "Release gate",
    `- ${sidecar.releaseGate.title} [${statusLabel(sidecar.releaseGate.tone)}]`,
    `- ${sidecar.releaseGate.detail}`,
    `- Action: ${sidecar.releaseGate.action}`,
    "",
    "Selected scenario",
    scenario
      ? `- ${scenario.title} [${statusLabel(scenario.status)}]: ${scenario.ownerLabel}; ${scenario.deliverable}; confirmation: ${scenario.confirmation}`
      : "- No selected CT scenario in packet.",
    scenario ? `- Viewer preset: ${scenario.viewerSummary}` : "",
    scenario ? `- Viewer package: ${scenario.bridgeLabel}` : "",
    "",
    "Bridge command and envelope summary",
    bridge ? `- Command summary: ${bridge.commandSummary}` : "- No bridge command in packet.",
    bridge?.commandString ? `- Command string: ${bridge.commandString}` : "",
    bridge ? `- Envelope: ${bridge.envelopeVersion ?? "not set"}; launch gate: ${bridge.launchGate ?? "not set"}; apply steps: ${bridge.applyStepCount}; missing targets: ${bridge.missingTargetCount}; can launch: ${bridge.canLaunch ? "yes" : "no"}` : "",
    bridge ? `- Pixel policy: ${bridge.pixelPolicy}` : "",
    "",
    "Runtime truth policy",
    `- Source mode: ${sidecar.runtimeTruthPolicy.sourceMode}; execution lane: ${sidecar.runtimeTruthPolicy.executionLane}`,
    `- Hardware quality weight: ${sidecar.runtimeTruthPolicy.hardwareQualityWeight}; memory: ${sidecar.runtimeTruthPolicy.memoryBudgetClass}; slice window: ${sidecar.runtimeTruthPolicy.progressiveSliceWindowCap}`,
    `- Contains diagnostic pixels: ${sidecar.runtimeTruthPolicy.containsDiagnosticPixels}; contains mesh geometry: ${sidecar.runtimeTruthPolicy.containsMeshGeometry}; browser heavy geometry: ${sidecar.runtimeTruthPolicy.browserStoresHeavyGeometry}`,
    `- Heavy data owner: ${sidecar.runtimeTruthPolicy.heavyDataOwner}`,
    "",
    "Planning facts and measurements",
    ...linesForFacts(sidecar.clinicalFacts),
    "",
    "Route lanes",
    ...linesForLanes(sidecar.lanes),
    "",
    "Missing items",
    ...(sidecar.missingArtifacts.length > 0 ? sidecar.missingArtifacts.map((item) => `- ${item}`) : ["- None"]),
    "",
    "Boundary",
    `- ${sidecar.outputBoundary.summary}`,
    ...sidecar.outputBoundary.statements.map((item) => `- ${item}`),
    "",
    `Next action: ${sidecar.nextAction}`
  ].filter((line) => line !== "").join("\n");
}

export function buildCtPlanningReport(packet: CtPlanningExportPacket, generatedAtInput: Date | string = new Date()): CtPlanningReport {
  const generatedAt = typeof generatedAtInput === "string" ? generatedAtInput : generatedAtInput.toISOString();
  const sidecar: CtPlanningReportSidecar = {
    version: "dental-crm-ct-planning-report-v1",
    generatedAt,
    packetVersion: packet.version,
    status: packet.status,
    score: packet.score,
    title: packet.title,
    outputBoundary: {
      modelOutputKind: packet.modelOutputKind,
      cadExportReady: packet.cadExportReady,
      surfaceModelRequired: packet.surfaceModelRequired,
      summary: packet.outputBoundarySummary,
      statements: reportBoundaryStatements
    },
    runtimeTruthPolicy: packet.runtimeTruthPolicy,
    releaseGate: buildReportReleaseGate(packet),
    selectedScenario: selectedScenario(packet),
    bridge: bridgeSummary(packet),
    clinicalFacts: packet.clinicalFacts,
    lanes: packet.lanes,
    missingArtifacts: packet.missingArtifacts,
    nextAction: packet.nextAction
  };
  const stem = reportFileStem(generatedAt);
  return {
    sidecar,
    text: formatCtPlanningReportText(sidecar),
    textFileName: `${stem}.txt`,
    jsonFileName: `${stem}.json`
  };
}
