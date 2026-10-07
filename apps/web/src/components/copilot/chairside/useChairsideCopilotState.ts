/**
 * useChairsideCopilotState.ts — Chairside Copilot State, Agent API Executor & Clinical Action Handlers.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8e: Doctor & Staff Autonomy (zero blocking gates, reversible actions).
 * - Mandate 8v & 8ab: Multi-functional copilot, background inventory & silent sync.
 * - TABOO OF THE CREATOR: STRICTLY PRESERVE ANESTHESIA AND PEDIATRIC DOSAGE LOGIC!
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { showToast } from "../../GlobalToast";
import { findBestClinicalProtocol } from "../../visit/clinicalCatalog/clinicalProtocolsCatalog";
import {
  type ChairsideThoughtStep,
  type ChairsideToothProposal,
  type ChairsideServiceProposal,
  type ChairsideSoapProposal,
  type ChairsideAnestheticProposal,
  type ChairsideConsentProposal,
  type ChairsideSafetyAlert,
  type ChairsideCopilotHUDProps,
  CLINICAL_PRESETS,
  defaultPreset,
} from "./chairsideTypes";
import type { MatchedProtocolInfo } from "./ChairsideClinicalInsights";
import { executeCopilotAgentRequest } from "./chairsideAgentExecutor";
import { useChairsideActionHandlers } from "./useChairsideActionHandlers";
import { useChairsideVoiceEngine } from "./useChairsideVoiceEngine";
import { useChairsideHotkeys } from "./useChairsideHotkeys";

export function useChairsideCopilotState(props: ChairsideCopilotHUDProps) {
  const {
    initialOpen = true,
    initialDocked = false,
    initialCompact = false,
    initialDrawerOpen = true,
    activeTooth = 16,
    patientId,
    visitId,
    chairId,
    patientAllergies = ["Пенициллины"],
    patientSomaticHistory,
    onApplyToothState,
    onUpdateToothStatus,
    onApplyServices,
    onAddBillingItem,
    onApplySoapNotes,
    onApplySoapDiary,
    onDisposeCarpule,
    onPrintInformedConsent,
    onApplyAll,
  } = props;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isDocked, setIsDocked] = useState(initialDocked);
  const [isDrawerOpen, setIsDrawerOpen] = useState(initialCompact ? false : initialDrawerOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [inputText, setInputText] = useState("");
  const [verdict, setVerdict] = useState<string>("");
  const [isEditingSoap, setIsEditingSoap] = useState<boolean>(false);
  const [isEditingAnesthetic, setIsEditingAnesthetic] = useState<boolean>(false);

  // Current active preset (default: Caries 16)
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const activePreset = CLINICAL_PRESETS[activePresetIndex] ?? defaultPreset;

  // Live state of proposals and thoughts
  const [thoughts, setThoughts] = useState<ChairsideThoughtStep[]>(activePreset.thoughts);
  const [toothProposal, setToothProposal] = useState<ChairsideToothProposal>({
    toothNumber: activePreset.toothNumber,
    state: activePreset.toothState,
    stateLabel: activePreset.toothStateLabel,
    surfaces: activePreset.surfaces,
    applied: false,
  });
  const [servicesProposal, setServicesProposal] = useState<ChairsideServiceProposal[]>(
    activePreset.services.map((s) => ({ ...s, applied: false }))
  );
  const [soapProposal, setSoapProposal] = useState<ChairsideSoapProposal>({
    ...activePreset.soap,
    applied: false,
  });
  const [anestheticProposal, setAnestheticProposal] = useState<ChairsideAnestheticProposal | null>(
    activePreset.anesthetic ? { ...activePreset.anesthetic, applied: false } : null
  );
  const [consentProposal, setConsentProposal] = useState<ChairsideConsentProposal | null>(
    activePreset.consent ? { ...activePreset.consent, applied: false } : null
  );
  const [safetyAlert, setSafetyAlert] = useState<ChairsideSafetyAlert>({
    ...activePreset.safetyAlert,
    acknowledged: false,
  });
  const [matchedProtocol, setMatchedProtocol] = useState<MatchedProtocolInfo | null>(() => {
    const match = findBestClinicalProtocol(activePreset.prompt, activePreset.toothNumber || activeTooth || undefined);
    if (match) {
      return {
        procedureName: match.procedureName,
        categoryKey: match.categoryKey,
        tooth: match.tooth ?? activePreset.toothNumber,
        ...(match.matchedIcd10 ? { matchedIcd10: match.matchedIcd10 } : {}),
      };
    }
    return null;
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Total price in rubles
  const servicesTotalPrice = useMemo(() => {
    return servicesProposal.reduce((sum, s) => sum + s.priceRub * s.quantity, 0);
  }, [servicesProposal]);

  // Total thinking time
  const totalThoughtDuration = useMemo(() => {
    const total = thoughts.reduce((sum, t) => sum + (t.durationMs ?? 80), 0);
    return (total / 1000).toFixed(2);
  }, [thoughts]);

  // Completed steps count
  const completedStepsCount = useMemo(() => {
    return thoughts.filter((t) => t.status === "done").length;
  }, [thoughts]);

  // Load clinical preset immediately without artificial simulation delays (Mandates 8e, 8k, 8s)
  const loadPreset = useCallback(
    (index: number) => {
      const preset = CLINICAL_PRESETS[index] ?? defaultPreset;
      setActivePresetIndex(index);
      setInputText(preset.prompt);
      setIsThinking(false);
      setThoughts(preset.thoughts);
      setToothProposal({
        toothNumber: preset.toothNumber,
        state: preset.toothState,
        stateLabel: preset.toothStateLabel,
        surfaces: preset.surfaces,
        applied: false,
      });
      setServicesProposal(preset.services.map((s) => ({ ...s, applied: false })));
      setSoapProposal({ ...preset.soap, applied: false });
      setAnestheticProposal(preset.anesthetic ? { ...preset.anesthetic, applied: false } : null);
      setConsentProposal(preset.consent ? { ...preset.consent, applied: false } : null);
      setSafetyAlert({ ...preset.safetyAlert, acknowledged: false });
      setVerdict((preset as any).verdict || "");
      const match = findBestClinicalProtocol(preset.prompt, preset.toothNumber || activeTooth || undefined);
      if (match) {
        setMatchedProtocol({
          procedureName: match.procedureName,
          categoryKey: match.categoryKey,
          tooth: match.tooth ?? preset.toothNumber,
          ...(match.matchedIcd10 ? { matchedIcd10: match.matchedIcd10 } : {}),
        });
      } else {
        setMatchedProtocol(null);
      }
    },
    [activeTooth]
  );

  // Execution via extracted executor module
  const executeCopilotAgent = useCallback(
    async (promptText: string) => {
      setIsThinking(true);
      try {
        const result = await executeCopilotAgentRequest({
          promptText,
          activeTooth,
          patientId,
          visitId,
          chairId,
          patientAllergies,
          patientSomaticHistory,
        });

        if (result.thoughts) setThoughts(result.thoughts);
        if (result.verdict !== undefined) setVerdict(result.verdict);
        if (result.safetyAlert !== undefined) {
          setSafetyAlert(result.safetyAlert || { id: "", severity: "info", title: "", description: "", acknowledged: true });
        }
        if (result.toothProposal) setToothProposal(result.toothProposal);
        if (result.servicesProposal) setServicesProposal(result.servicesProposal);
        if (result.soapProposal) setSoapProposal(result.soapProposal);
        if (result.anestheticProposal !== undefined) setAnestheticProposal(result.anestheticProposal);
        if (result.consentProposal !== undefined) setConsentProposal(result.consentProposal);
        if (result.matchedProtocol !== undefined) setMatchedProtocol(result.matchedProtocol);
        if (result.activePresetIndex !== undefined) setActivePresetIndex(result.activePresetIndex);
        if (result.toastMessage) showToast(result.toastMessage.text, result.toastMessage.type);
      } finally {
        setIsThinking(false);
      }
    },
    [activeTooth, patientId, visitId, chairId, patientAllergies, patientSomaticHistory]
  );

  // Voice listener integration (MANDATE 8l)
  const handleIntentParsed = useCallback((intent: any) => {
    if (intent && (intent.teethUpdates.length > 0 || intent.anesthesia || intent.procedures804n.length > 0)) {
      const firstTooth = intent.teethUpdates[0];
      if (firstTooth) {
        setToothProposal((prev) => ({
          ...prev,
          toothNumber: firstTooth.toothNumber,
          state: firstTooth.state,
          stateLabel: `${firstTooth.icd10Title} (${firstTooth.toothNumber})`,
          surfaces: firstTooth.surfaces || ["O"],
          applied: false,
        }));
      }
      if (intent.anesthesia) {
        const an = intent.anesthesia;
        setAnestheticProposal({
          drugName: an.tradeName,
          carpulesCount: an.cartridgeCount,
          patientWeightKg: 70,
          maxCarpules: 7,
          epinephrineMcg: 8.5 * an.cartridgeCount,
          isCardiovascularRisk: false,
          notes: an.displayName,
          applied: false,
        });
      }
      if (intent.soapNotes?.assessment) {
        const sn = intent.soapNotes;
        setSoapProposal((prev) => ({
          ...prev,
          diagnosis: sn.assessment || prev.diagnosis,
          complaint: sn.subjective || prev.complaint,
          objectiveStatus: sn.objective || prev.objectiveStatus,
          treatmentPlan: sn.plan || prev.treatmentPlan,
          recommendations: sn.recommendations || prev.recommendations,
          applied: false,
        }));
      }
    }
  }, []);

  const { isListening, audioVolume, handleToggleVoice } = useChairsideVoiceEngine({
    onTranscriptFinal: setInputText,
    onIntentParsed: handleIntentParsed,
  });

  // Action handlers via extracted hook
  const {
    handleApplyTooth,
    handleUndoTooth,
    handleApplyServices,
    handleUndoServices,
    handleApplySoap,
    handleUndoSoap,
    handleApplyCarpule,
    handleUndoCarpule,
    handleApplyConsent,
    handleUndoConsent,
    handleAcknowledgeAlert,
    allApplied,
    handleApplyAll,
    handleUndoAll,
    handleDismissAll,
    handleRemoveToothPill,
    handleRemoveDiagnosisPill,
    handleRemoveAnestheticPill,
    handleRemoveServicesPill,
  } = useChairsideActionHandlers({
    patientId,
    visitId,
    toothProposal,
    setToothProposal,
    servicesProposal,
    setServicesProposal,
    soapProposal,
    setSoapProposal,
    anestheticProposal,
    setAnestheticProposal,
    consentProposal,
    setConsentProposal,
    safetyAlert,
    setSafetyAlert,
    servicesTotalPrice,
    onApplyToothState,
    onUpdateToothStatus,
    onApplyServices,
    onAddBillingItem,
    onApplySoapNotes,
    onApplySoapDiary,
    onDisposeCarpule,
    onPrintInformedConsent,
    onApplyAll,
  });

  // Handle submit text / query (Mandate 8e: Never disabled, fallback to clinical default)
  const handleFormSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const text = inputText.trim();
      if (!text) {
        const defaultPrompt = `вылечили кариес ${activeTooth || 16} зуба, световая пломба, анестезия убистезин 1 карпула`;
        setInputText(defaultPrompt);
        executeCopilotAgent(defaultPrompt);
        return;
      }
      executeCopilotAgent(text);
    },
    [inputText, activeTooth, executeCopilotAgent]
  );

  // Hotkey & custom event listeners (Mandate 8l & 8e)
  useChairsideHotkeys({
    setIsOpen,
    setIsMinimized,
    inputRef,
    toothProposal,
    handleApplyTooth,
    handleApplyAll,
    handleToggleVoice,
  });

  return {
    isOpen,
    setIsOpen,
    isDocked,
    setIsDocked,
    isDrawerOpen,
    setIsDrawerOpen,
    isMinimized,
    setIsMinimized,
    isThoughtsExpanded,
    setIsThoughtsExpanded,
    isListening,
    audioVolume,
    isThinking,
    inputText,
    setInputText,
    verdict,
    isEditingSoap,
    setIsEditingSoap,
    isEditingAnesthetic,
    setIsEditingAnesthetic,
    activePresetIndex,
    thoughts,
    toothProposal,
    setToothProposal,
    servicesProposal,
    setServicesProposal,
    soapProposal,
    setSoapProposal,
    anestheticProposal,
    setAnestheticProposal,
    consentProposal,
    safetyAlert,
    matchedProtocol,
    inputRef,
    servicesTotalPrice,
    totalThoughtDuration,
    completedStepsCount,
    loadPreset,
    handleApplyTooth,
    handleUndoTooth,
    handleApplyServices,
    handleUndoServices,
    handleApplySoap,
    handleUndoSoap,
    handleApplyCarpule,
    handleUndoCarpule,
    handleApplyConsent,
    handleUndoConsent,
    handleAcknowledgeAlert,
    allApplied,
    handleApplyAll,
    handleUndoAll,
    handleDismissAll,
    handleRemoveToothPill,
    handleRemoveDiagnosisPill,
    handleRemoveAnestheticPill,
    handleRemoveServicesPill,
    handleFormSubmit,
    handleToggleVoice,
  };
}
