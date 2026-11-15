/**
 * agentPresetFallbackParser.ts — Fallback to clinical presets for chairside assistant.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 100 lines.
 * - Mandate 8e: Doctor & Staff Autonomy.
 */

import { CLINICAL_PRESETS, defaultPreset, type ChairsideThoughtStep, type MatchedProtocolInfo } from "../chairsideTypes";
import type { CopilotExecutionResult } from "../chairsideAgentExecutor";

export function matchPresetFallback(
  text: string,
  activeTooth: number | null = null,
  matchedProtocol: MatchedProtocolInfo | null = null,
): CopilotExecutionResult {
  const isCaries = /кариес|пломб|полост|c2|c3|реставрац/i.test(text);
  const isPulpitis = /пульпит|эндодонт|канал|депульп/i.test(text);
  const isHygiene = /гигиен|чистк|налет|скейлинг|air[- ]?flow|ультразвук/i.test(text);
  const isPatient = /пациент|сегодня|кто след|очеред|прием|приём/i.test(text);
  const isShift = /смен|график|четверг|табель|дежур/i.test(text);
  const isFinance = /выручк|касс|деньг|доход|финанс|оплат/i.test(text);

  let presetIdx: number | null = null;
  if (isPulpitis) presetIdx = 1;
  else if (isHygiene) presetIdx = 2;
  else if (isPatient) presetIdx = 3;
  else if (isShift) presetIdx = 4;
  else if (isFinance) presetIdx = 5;
  else if (isCaries) presetIdx = 0;

  if (presetIdx === null) {
    return {
      thoughts: [],
      verdict: "Команда не распознана. Назовите зуб и диагноз (например, '16 кариес'), процедуру ('профгигиена') или действие ('расписание на сегодня').",
      toothProposal: null,
      servicesProposal: [],
      soapProposal: null,
      anestheticProposal: null,
      consentProposal: null,
      safetyAlert: null,
      matchedProtocol,
      toastMessage: {
        text: "Команда не распознана. Уточните клинический запрос.",
        type: "warning",
      },
    };
  }

  const preset = CLINICAL_PRESETS[presetIdx] ?? defaultPreset;
  const targetTooth = Number(text.match(/\b([1-4][1-8])\b/)?.[1]) || activeTooth || (preset.toothNumber || null);

  const rawThoughts: readonly unknown[] = Array.isArray(preset.thoughts) ? preset.thoughts : [];
  const parsedThoughts: ChairsideThoughtStep[] = rawThoughts
    .filter((t): t is ChairsideThoughtStep => typeof t === "object" && t !== null && "id" in t && "title" in t)
    .map((t) => ({
      id: String(t.id),
      stepNumber: Number(t.stepNumber),
      title: String(t.title),
      status: t.status,
      ...(t.detail !== undefined ? { detail: t.detail } : {}),
      ...(t.durationMs !== undefined ? { durationMs: t.durationMs } : {}),
    }));

  return {
    activePresetIndex: presetIdx,
    thoughts: parsedThoughts,
    verdict: "verdict" in preset && typeof preset.verdict === "string" ? preset.verdict : "",
    toothProposal: targetTooth ? {
      toothNumber: targetTooth,
      state: preset.toothState,
      stateLabel: preset.toothStateLabel,
      surfaces: [...preset.surfaces],
      applied: false,
    } : null,
    servicesProposal: preset.services.map((s) => ({
      ...s,
      toothNumber: targetTooth ?? undefined,
      applied: false,
    })),
    soapProposal: { ...preset.soap, applied: false },
    anestheticProposal: preset.anesthetic ? {
      applied: false,
      drugName: preset.anesthetic.drugName,
      carpulesCount: preset.anesthetic.carpulesCount,
      patientWeightKg: preset.anesthetic.patientWeightKg ?? 70,
      maxCarpules: preset.anesthetic.maxCarpules ?? 4,
      epinephrineMcg: preset.anesthetic.epinephrineMcg ?? 18,
      isCardiovascularRisk: Boolean(preset.anesthetic.isCardiovascularRisk),
      ...(preset.anesthetic.notes ? { notes: preset.anesthetic.notes } : {}),
    } : null,
    consentProposal: preset.consent
      ? {
          ...preset.consent,
          toothOrArea: targetTooth ? `Зуб ${targetTooth}` : "Полость рта",
          applied: false,
        }
      : null,
    safetyAlert: preset.safetyAlert && "id" in preset.safetyAlert ? {
      id: preset.safetyAlert.id,
      severity: preset.safetyAlert.severity,
      title: preset.safetyAlert.title,
      description: preset.safetyAlert.description,
      acknowledged: false,
    } : null,
    matchedProtocol,
    toastMessage: {
      text: preset.toothNumber === 0
        ? `Автономный режим: ${preset.label}`
        : "Автономный режим: сформированы предложения у кресла",
      type: "info",
    },
  };
}
