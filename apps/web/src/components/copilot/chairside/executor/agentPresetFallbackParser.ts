/**
 * agentPresetFallbackParser.ts — Fallback to clinical presets for chairside assistant.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 100 lines.
 * - Mandate 8e: Doctor & Staff Autonomy.
 */

import { CLINICAL_PRESETS, defaultPreset, type MatchedProtocolInfo } from "../chairsideTypes";
import type { CopilotExecutionResult } from "../chairsideAgentExecutor";

export function matchPresetFallback(
  text: string,
  activeTooth: number | null = null,
  matchedProtocol: MatchedProtocolInfo | null = null,
): CopilotExecutionResult {
  const presetIdx =
    /пульпит|26|канал/i.test(text) ? 1 :
    /гигиен|чистк|налет|скейлинг/i.test(text) ? 2 :
    /пациент|сегодня|кто след/i.test(text) ? 3 :
    /смен|график|четверг|табель/i.test(text) ? 4 :
    /выручк|касс|деньг|доход/i.test(text) ? 5 : 0;

  const preset = CLINICAL_PRESETS[presetIdx] ?? defaultPreset;
  const targetTooth = Number(text.match(/\b([1-4][1-8])\b/)?.[1]) || activeTooth || (preset.toothNumber || null);

  return {
    activePresetIndex: presetIdx,
    thoughts: preset.thoughts,
    verdict: (preset as any).verdict || "",
    toothProposal: targetTooth ? {
      toothNumber: targetTooth,
      state: preset.toothState,
      stateLabel: preset.toothStateLabel,
      surfaces: preset.surfaces,
      applied: false,
    } : null,
    servicesProposal: preset.services.map((s) => ({
      ...s,
      toothNumber: targetTooth ?? undefined,
      applied: false,
    })),
    soapProposal: { ...preset.soap, applied: false },
    anestheticProposal: preset.anesthetic ? { ...preset.anesthetic, applied: false } : null,
    consentProposal: preset.consent
      ? {
          ...preset.consent,
          toothOrArea: targetTooth ? `Зуб ${targetTooth}` : "Полость рта",
          applied: false,
        }
      : null,
    safetyAlert: { ...preset.safetyAlert, acknowledged: false },
    matchedProtocol,
    toastMessage: {
      text: preset.toothNumber === 0
        ? `Автономный режим: ${preset.label}`
        : "Автономный режим: сформированы предложения у кресла",
      type: "info",
    },
  };
}
