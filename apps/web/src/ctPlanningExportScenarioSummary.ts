import type { DicomMprProjection } from "@dental/shared";
import type { CtPlanningExportOwner, CtPlanningExportPacket, CtPlanningExportStatus } from "./ctPlanningExport";
import {
  buildCtPlanningViewerRestoreCommands,
  type CtPlanningViewerRestoreCommand,
  type CtPlanningViewerRestoreWindowPreset
} from "./ctPlanningViewerRestore";
import {
  buildCtPlanningViewerBridgeDataAttributes,
  type CtPlanningViewerBridgeDataAttributes
} from "./ctPlanningViewerBridgeAttributes";
import { buildCtPlanningViewerBridgeHandoff } from "./ctPlanningViewerBridgeHandoff";

export type CtPlanningExportScenarioArtifact = {
  id: string;
  title: string;
  status: "ready" | "draft" | "blocked";
  statusLabel: string;
  blocker: string | null;
};

export type CtPlanningExportScenarioStatusCounts = {
  ready: number;
  draft: number;
  blocked: number;
};

export type CtPlanningExportScenarioIssue = {
  id: string;
  title: string;
  status: "draft" | "blocked";
  blocker: string | null;
};

export type CtPlanningExportScenarioRoute = {
  owner: CtPlanningExportOwner;
  ownerLabel: string;
  deliverable: string;
  confirmation: string;
};

export type CtPlanningExportScenarioViewerPreset = {
  projection: DicomMprProjection;
  viewLabel: string;
  windowPreset: CtPlanningViewerRestoreWindowPreset;
  windowLabel: string;
  slabMm: number;
  requiresVolume: boolean;
  restoreCommands: CtPlanningViewerRestoreCommand[];
};

export type CtPlanningExportScenarioViewerBridge = {
  label: string;
  attrs: CtPlanningViewerBridgeDataAttributes;
};

export type CtPlanningExportScenarioSummary = {
  id: string;
  title: string;
  status: CtPlanningExportStatus;
  route: CtPlanningExportScenarioRoute;
  viewer: CtPlanningExportScenarioViewerPreset;
  bridge: CtPlanningExportScenarioViewerBridge;
  totalCount: number;
  readyCount: number;
  draftCount: number;
  blockedCount: number;
  draftArtifacts: CtPlanningExportScenarioIssue[];
  blockedArtifacts: CtPlanningExportScenarioIssue[];
  detail: string;
  nextAction: string;
};

export const activeScenarioLabels: Record<string, string> = {
  opg_curve: "ОПТГ",
  ridge_ruler: "Линейка",
  implant_axis: "Ось",
  area_roi: "Контур площади",
  volume_roi: "Контур объема",
  nerve_canal: "Канал",
  density_probe: "Плотность",
  surgical_guide: "Шаблон",
  implant_library: "Имплант"
};

export const activeScenarioRoutes: Record<string, CtPlanningExportScenarioRoute> = {
  opg_curve: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "ОПТГ-дуга и поперечные срезы",
    confirmation: "сверить дугу, слой и покрытие срезами"
  },
  ridge_ruler: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "ширина гребня и высота кости",
    confirmation: "проверить калибровку линейки"
  },
  implant_axis: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "ось, апекс и угол импланта",
    confirmation: "сверить ось с протетическим планом"
  },
  area_roi: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "контур площади",
    confirmation: "проверить контур на нужном срезе"
  },
  volume_roi: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "контур объема",
    confirmation: "проверить границы объема"
  },
  nerve_canal: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "кривая канала и отступ",
    confirmation: "подтвердить безопасный зазор до импланта"
  },
  density_probe: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "точка плотности и протокол сверления",
    confirmation: "проверить единицы плотности"
  },
  surgical_guide: {
    owner: "lab",
    ownerLabel: "лаборатория",
    deliverable: "маршрут хирургического шаблона",
    confirmation: "проверить втулку, ось и канал"
  },
  implant_library: {
    owner: "doctor",
    ownerLabel: "врач",
    deliverable: "типоразмер импланта",
    confirmation: "зафиксировать размер перед шаблоном"
  }
};

const fallbackScenarioRoute: CtPlanningExportScenarioRoute = {
  owner: "doctor",
  ownerLabel: "врач",
  deliverable: "выбранный КТ-сценарий",
  confirmation: "проверить артефакты сценария"
};

function viewerPreset(
  projection: DicomMprProjection,
  viewLabel: string,
  windowPreset: CtPlanningExportScenarioViewerPreset["windowPreset"],
  windowLabel: string,
  slabMm: number,
  requiresVolume = true
): CtPlanningExportScenarioViewerPreset {
  return {
    projection,
    viewLabel,
    windowPreset,
    windowLabel,
    slabMm,
    requiresVolume,
    restoreCommands: buildCtPlanningViewerRestoreCommands({ projection, windowPreset, slabMm, requiresVolume })
  };
}

export const activeScenarioViewerPresets: Record<string, CtPlanningExportScenarioViewerPreset> = {
  opg_curve: viewerPreset("panoramic_reconstruction", "панорама", "bone", "кость", 10),
  ridge_ruler: viewerPreset("oblique", "косой срез", "bone", "кость", 1),
  implant_axis: viewerPreset("oblique", "косой срез", "implant", "имплант", 1),
  area_roi: viewerPreset("axial", "аксиальный срез", "bone", "кость", 1),
  volume_roi: viewerPreset("three_d_volume", "3D-объем", "soft_tissue", "мягкие ткани", 5),
  nerve_canal: viewerPreset("panoramic_reconstruction", "панорама", "bone", "кость", 3),
  density_probe: viewerPreset("axial", "аксиальный срез", "implant", "имплант", 1),
  surgical_guide: viewerPreset("three_d_volume", "3D-объем", "bone", "кость", 5),
  implant_library: viewerPreset("axial", "справочник", "implant", "имплант", 1, false)
};

const fallbackScenarioViewerPreset = viewerPreset("axial", "аксиальный срез", "bone", "кость", 1);

export function scenarioStatusCounts(artifacts: CtPlanningExportScenarioArtifact[]): CtPlanningExportScenarioStatusCounts {
  return artifacts.reduce<CtPlanningExportScenarioStatusCounts>(
    (counts, artifact) => {
      counts[artifact.status] += 1;
      return counts;
    },
    { ready: 0, draft: 0, blocked: 0 }
  );
}

export function scenarioIssues(artifacts: CtPlanningExportScenarioArtifact[]) {
  return artifacts.reduce<{ draftArtifacts: CtPlanningExportScenarioIssue[]; blockedArtifacts: CtPlanningExportScenarioIssue[] }>(
    (issues, artifact) => {
      if (artifact.status === "draft" || artifact.status === "blocked") {
        issues[artifact.status === "draft" ? "draftArtifacts" : "blockedArtifacts"].push({
          id: artifact.id,
          title: artifact.title,
          status: artifact.status,
          blocker: artifact.blocker
        });
      }
      return issues;
    },
    { draftArtifacts: [], blockedArtifacts: [] }
  );
}

export function scenarioDetail(artifacts: CtPlanningExportScenarioArtifact[], counts: CtPlanningExportScenarioStatusCounts) {
  if (artifacts.length === 0) return "Сценарий без артефактов.";
  const blockedDetail = counts.blocked > 0 ? `; требует действия ${counts.blocked}` : "";
  const draftDetail = counts.draft > 0 ? `; черновиков ${counts.draft}` : "";
  return `${counts.ready}/${artifacts.length} артефактов сценария готовы к передаче${blockedDetail}${draftDetail}.`;
}

export function scenarioAction(packet: CtPlanningExportPacket, artifacts: CtPlanningExportScenarioArtifact[]) {
  const nextArtifact = artifacts.find((artifact) => artifact.status !== "ready");
  if (nextArtifact) return nextArtifact.blocker ?? `Закрыть: ${nextArtifact.title}.`;
  const missingArtifact = packet.missingArtifacts[0];
  if (packet.status === "ready") return "Передать вместе с пакетом плана.";
  return missingArtifact ? `Сначала закрыть: ${missingArtifact}.` : packet.nextAction;
}

export function scenarioTone(
  packet: CtPlanningExportPacket,
  artifactCount: number,
  counts: CtPlanningExportScenarioStatusCounts
): CtPlanningExportStatus {
  if (artifactCount === 0) return packet.status;
  if (counts.blocked > 0) return "blocked";
  if (counts.draft > 0) return "warning";
  return packet.status === "blocked" ? "warning" : "ready";
}

export function buildCtPlanningExportScenarioSummary(
  packet: CtPlanningExportPacket,
  artifacts: CtPlanningExportScenarioArtifact[]
): CtPlanningExportScenarioSummary | null {
  if (!packet.activeQuickActionId) return null;
  const counts = scenarioStatusCounts(artifacts);
  const issues = scenarioIssues(artifacts);
  const route = activeScenarioRoutes[packet.activeQuickActionId] ?? fallbackScenarioRoute;
  const viewer = activeScenarioViewerPresets[packet.activeQuickActionId] ?? fallbackScenarioViewerPreset;
  const handoff = buildCtPlanningViewerBridgeHandoff({
    commands: viewer.restoreCommands,
    requiresVolume: viewer.requiresVolume,
    volumeReady: packet.volumeReady,
    viewLabel: viewer.viewLabel,
    windowLabel: viewer.windowLabel,
    slabMm: viewer.slabMm,
    runtimeTruthPolicy: packet.runtimeTruthPolicy
  });
  const bridge: CtPlanningExportScenarioViewerBridge = {
    label: handoff.manifest.statusLabel,
    attrs: buildCtPlanningViewerBridgeDataAttributes(handoff)
  };
  return {
    id: packet.activeQuickActionId,
    title: activeScenarioLabels[packet.activeQuickActionId] ?? packet.activeQuickActionId,
    status: scenarioTone(packet, artifacts.length, counts),
    route,
    viewer,
    bridge,
    totalCount: artifacts.length,
    readyCount: counts.ready,
    draftCount: counts.draft,
    blockedCount: counts.blocked,
    draftArtifacts: issues.draftArtifacts,
    blockedArtifacts: issues.blockedArtifacts,
    detail: scenarioDetail(artifacts, counts),
    nextAction: scenarioAction(packet, artifacts)
  };
}
