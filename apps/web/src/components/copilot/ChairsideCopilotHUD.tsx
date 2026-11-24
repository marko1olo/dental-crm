import React, { useState, useCallback, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { CLINICAL_PRESETS, type ClinicalPreset, defaultPreset } from "./chairside/chairsidePresets";
import { mapToCanonicalToothState } from "./chairside/canonicalToothStateMapper";
import {
  resolveInitialProposals,
  resolvePresetSelection,
  parseChairsideAnesthetic,
  type ChairsidePresetAnesthetic,
} from "./chairside/chairsidePresetResolver";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { ChairsideHUDProposals } from "./chairside/ChairsideHUDProposals";
import { ChairsideHUDCapsule } from "./chairside/ChairsideHUDCapsule";
import { ChairsideThoughtStream } from "./chairside/ChairsideThoughtStream";
import { ChairsideHUDComposer } from "./chairside/ChairsideHUDComposer";
import { ChairsideHUDFooter } from "./chairside/ChairsideHUDFooter";
import { ChairsideIntercomBar } from "../communications/ChairsideIntercomBar";
import { mapVoiceIntentToHUDProposals } from "./chairside/chairsideVoiceIntentMapper";
import type {
  ChairsideCopilotHUDProps, ChairsideThoughtStep, ChairsideToothProposal,
  ChairsideServiceProposal, ChairsideSoapProposal, ChairsideAnestheticProposal,
  ChairsideConsentProposal, ChairsideSafetyAlert,
} from "./chairside/chairsideTypes";
import { type DentalVoiceIntent, parseDentalVoiceSpeech } from "../../services/voice";
import { executeCopilotAgentRequest } from "./chairside/chairsideAgentExecutor";
import { useCopilotStore } from "../../store/copilotStore";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import "./ChairsideCopilotHUD.css";

export {
  type ChairsideCopilotHUDProps, type ChairsideThoughtStep, type ChairsideToothProposal,
  type ChairsideServiceProposal, type ChairsideSoapProposal, type ChairsideAnestheticProposal,
  type ChairsideConsentProposal, type ChairsideSafetyAlert, type ClinicalPreset,
  CLINICAL_PRESETS, mapToCanonicalToothState,
};

export { parseChairsideAnesthetic, type ChairsidePresetAnesthetic };

export const ChairsideCopilotHUD: React.FC<ChairsideCopilotHUDProps> = (props) => {
  const {
    initialOpen = true, initialDocked = false, initialCompact = false, activeTooth,
    patientName, patientAllergies = [], onClose, onApplyToothState,
    onUpdateToothStatus, onApplyServices, onAddBillingItem, onApplySoapNotes,
    onApplySoapDiary, onDisposeCarpule, onPrintInformedConsent, onApplyAll, className = "",
    initialThoughts, initialToothProposal, initialServicesProposal, initialSoapProposal,
    initialAnestheticProposal, initialSafetyAlert, initialPresetIndex,
  } = props;

  const displayPatientName = patientName?.trim() ? patientName : "Пациент не выбран";
  const hasActiveTooth = typeof activeTooth === "number";

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isDocked, setIsDocked] = useState(initialDocked);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(!initialCompact);
  const [promptInput, setPromptInput] = useState("");
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(initialPresetIndex ?? null);
  const [fallbackBanner, setFallbackBanner] = useState<string | null>(null);

  const initialResolved = useMemo(() => resolveInitialProposals(props), []);
  const [toothProposal, setToothProposal] = useState<ChairsideToothProposal | null>(initialResolved.toothProposal);
  const [servicesProposal, setServicesProposal] = useState<ChairsideServiceProposal[]>(initialResolved.servicesProposal);
  const [soapProposal, setSoapProposal] = useState<ChairsideSoapProposal>(initialResolved.soapProposal);
  const [anestheticProposal, setAnestheticProposal] = useState<ChairsideAnestheticProposal | null>(initialResolved.anestheticProposal);
  const [safetyAlert, setSafetyAlert] = useState<ChairsideSafetyAlert | null>(initialResolved.safetyAlert);

  const [thoughts, setThoughts] = useState<ChairsideThoughtStep[]>(() => {
    return initialThoughts ? [...initialThoughts] : [];
  });
  const [isExecutingAgent, setIsExecutingAgent] = useState(false);

  const servicesTotalKopecks = useMemo(
    () =>
      servicesProposal.reduce((sum, s) => {
        const kopecks =
          typeof s.priceKopecks === "number"
            ? s.priceKopecks
            : rublesToKopecks(s.priceRub ?? 0);
        return sum + kopecks * s.quantity;
      }, 0),
    [servicesProposal]
  );

  const servicesTotalPrice = useMemo(
    () => kopecksToRubles(servicesTotalKopecks),
    [servicesTotalKopecks]
  );

  const handleIntentParsed = useCallback((intent: DentalVoiceIntent) => {
    if (!intent) return;
    setSoapProposal((prevSoap) => {
      const mapped = mapVoiceIntentToHUDProposals(intent, prevSoap);
      if (mapped.toothProposal) setToothProposal(mapped.toothProposal);
      if (mapped.anestheticProposal) setAnestheticProposal(mapped.anestheticProposal);
      if (mapped.servicesProposal) setServicesProposal(mapped.servicesProposal);
      return mapped.soapPatch ? { ...prevSoap, ...mapped.soapPatch } : prevSoap;
    });
  }, []);

  const handleExecutePrompt = useCallback(
    async (textToExecute: string) => {
      const text = textToExecute.trim();
      if (!text) return;
      setIsExecutingAgent(true);
      try {
        const result = await executeCopilotAgentRequest({
          promptText: text,
          activeTooth: activeTooth ?? undefined,
          patientId: props.patientId,
          patientAllergies,
          onThoughtChunk: (chunk) => {
            setThoughts((prev) => {
              if (prev.length === 0) {
                return [{ id: "stream-thought-1", stepNumber: 1, title: chunk.trim().split("\n")[0] || "Анализ модели", status: "running", detail: chunk.trim() }];
              }
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (!last) return updated;
              const updatedLast: ChairsideThoughtStep = {
                id: last.id,
                stepNumber: last.stepNumber,
                title: last.title,
                status: last.status,
                detail: (last.detail || "") + chunk,
                ...(last.durationMs !== undefined ? { durationMs: last.durationMs } : {}),
              };
              updated[updated.length - 1] = updatedLast;
              return updated;
            });
          },
        });

        if (result.toothProposal) setToothProposal(result.toothProposal);
        if (result.servicesProposal) setServicesProposal(result.servicesProposal);
        if (result.soapProposal) setSoapProposal(result.soapProposal);
        if (result.anestheticProposal !== undefined) setAnestheticProposal(result.anestheticProposal);
        if (result.safetyAlert !== undefined) setSafetyAlert(result.safetyAlert);
        if (result.thoughts && result.thoughts.length > 0) setThoughts(result.thoughts);
        if (result.activePresetIndex !== undefined) setActivePresetIndex(result.activePresetIndex);
        if (result.isLocalFallback) {
          setFallbackBanner(result.fallbackMessage || "Локальный автономный режим (API-ключ не настроен)");
        } else if (result.verdict || result.toothProposal || result.soapProposal) {
          setFallbackBanner(null);
        }
      } catch (err) {
        console.warn("[ChairsideCopilotHUD] Agent execution failed:", err);
      } finally {
        setIsExecutingAgent(false);
      }
    },
    [activeTooth, props.patientId, patientAllergies]
  );

  const handleVoiceFinalText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setPromptInput(trimmed);
      const intent = parseDentalVoiceSpeech(trimmed);
      if (intent) handleIntentParsed(intent);
      void handleExecutePrompt(trimmed);
    },
    [handleExecutePrompt, handleIntentParsed]
  );

  const handleVoiceInterimText = useCallback(
    (interim: string) => {
      const trimmed = interim.trim();
      if (!trimmed) return;
      const intent = parseDentalVoiceSpeech(trimmed);
      if (intent) handleIntentParsed(intent);
    },
    [handleIntentParsed]
  );

  const { isRecording: isListening, toggleDictation: handleToggleVoice } = useUnifiedDictation({
    context: "visit",
    patientId: props.patientId,
    onResult: handleVoiceFinalText,
    onInterim: handleVoiceInterimText,
  });

  const handleApplyTooth = useCallback(() => {
    if (!toothProposal) return;
    const canonicalState = mapToCanonicalToothState(toothProposal.state);
    if (onApplyToothState) onApplyToothState(toothProposal.toothNumber, canonicalState, toothProposal.surfaces);
    if (onUpdateToothStatus) onUpdateToothStatus(toothProposal.toothNumber, canonicalState, toothProposal.surfaces);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dente-odontogram-update", {
        detail: { toothNumber: toothProposal.toothNumber, status: canonicalState, surfaces: toothProposal.surfaces },
      }));
    }
    // Fallback в copilotStore для защиты от потери данных при отсутствии слушателя (Мандат 8d/8zq)
    useCopilotStore.getState().savePendingDictationDraft({
      patientId: props.patientId,
      toothUpdates: [{ toothNumber: toothProposal.toothNumber, status: canonicalState, surfaces: toothProposal.surfaces }],
    });
    setToothProposal((prev) => (prev ? { ...prev, applied: true } : null));
  }, [toothProposal, onApplyToothState, onUpdateToothStatus, props.patientId]);

  const handleApplyServices = useCallback(() => {
    if (onApplyServices) onApplyServices(servicesProposal);
    if (onAddBillingItem) onAddBillingItem(servicesProposal);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dente-add-billing-item", {
          detail: {
            items: servicesProposal,
            totalKopecks: servicesTotalKopecks,
            totalRub: servicesTotalPrice,
          },
        })
      );
    }
    // Fallback в copilotStore для защиты от потери данных при отсутствии слушателя (Мандат 8d/8zq)
    useCopilotStore.getState().savePendingDictationDraft({
      patientId: props.patientId,
      billingServices: servicesProposal.map((s) => ({
        code: s.serviceCode || s.code804n || "A16.07.002",
        name: s.title,
        title: s.title,
        price: s.priceRub ?? kopecksToRubles(s.priceKopecks ?? 0),
        priceRub: s.priceRub ?? kopecksToRubles(s.priceKopecks ?? 0),
        priceKopecks: typeof s.priceKopecks === "number" ? s.priceKopecks : rublesToKopecks(s.priceRub ?? 0),
        toothNumber: s.toothNumber,
      })),
    });
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: true })));
  }, [servicesProposal, servicesTotalKopecks, servicesTotalPrice, onApplyServices, onAddBillingItem, props.patientId]);

  const handleApplySoap = useCallback(() => {
    const patch: Record<string, string> = {
      complaint: soapProposal.complaint,
      anamnesis: soapProposal.anamnesis,
      objectiveStatus: soapProposal.objectiveStatus,
      diagnosis: soapProposal.diagnosis,
      treatmentPlan: soapProposal.treatmentPlan,
      recommendations: soapProposal.recommendations || "",
    };
    if (onApplySoapNotes) onApplySoapNotes(patch);
    if (onApplySoapDiary) onApplySoapDiary(patch);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: patch }));
    }
    // Fallback в copilotStore для защиты от потери данных при отсутствии слушателя (Мандат 8d/8zq)
    useCopilotStore.getState().savePendingDictationDraft({
      patientId: props.patientId,
      soapPatch: patch,
    });
    setSoapProposal((prev) => ({ ...prev, applied: true }));
  }, [soapProposal, onApplySoapNotes, onApplySoapDiary, props.patientId]);

  const handleApplyAllActions = useCallback(() => {
    handleApplyTooth();
    handleApplyServices();
    handleApplySoap();
    if (onApplyAll) onApplyAll();
  }, [handleApplyTooth, handleApplyServices, handleApplySoap, onApplyAll]);

  const handleDismissAll = useCallback(() => {
    setToothProposal(null);
    setServicesProposal([]);
    setSoapProposal({
      complaint: "",
      anamnesis: "",
      objectiveStatus: "",
      diagnosis: "",
      treatmentPlan: "",
      recommendations: "",
      applied: false,
    });
    setSafetyAlert(null);
    setAnestheticProposal(null);
    setActivePresetIndex(null);
    setFallbackBanner(null);
  }, []);

  const handleSelectPreset = useCallback((index: number) => {
    setActivePresetIndex(index);
    const resolved = resolvePresetSelection(index, activeTooth);
    setToothProposal(resolved.toothProposal);
    setServicesProposal(resolved.servicesProposal);
    setSoapProposal(resolved.soapProposal);
    setAnestheticProposal(resolved.anestheticProposal);
    setSafetyAlert(resolved.safetyAlert);
  }, [activeTooth]);

  const handleCloseHUD = () => {
    setIsOpen(false);
    useCopilotStore.getState().setIsHudOpen(false);
    if (onClose) onClose();
  };

  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (promptInput.trim()) {
      void handleExecutePrompt(promptInput);
      setPromptInput("");
    }
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div
        className={`chairside-copilot-hud ${isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
        data-testid="chairside-copilot-hud-minimized"
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="chairside-hud-pill"
          data-testid="btn-chairside-hud-expand"
          aria-label="Развернуть копилот у кресла"
        >
          <div className="chairside-hud-pill-icon" />
          <span>Копилот у кресла</span>
          <span className="chairside-hud-pill-badge">Готов</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`chairside-copilot-hud ${isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
      aria-label="Кресельный ИИ-Копилот ДЕНТА"
      data-testid="chairside-copilot-hud"
    >
      <div className={`chairside-hud-panel ${!isDrawerOpen ? "chairside-hud-panel--compact" : ""}`}>
        {/* Mobile Apple Bottom Sheet Drag Handle */}
        <div
          className="chairside-hud-drag-handle-wrap md:hidden flex justify-center pt-2 pb-1 cursor-grab"
          onClick={() => setIsDrawerOpen((d) => !d)}
          role="button"
          tabIndex={0}
          aria-label="Свернуть или развернуть панель копайлота"
        >
          <div className="w-9 h-1.5 touch-none rounded-full bg-[var(--line)]" />
        </div>

        {/* Capsule 1-Line Bar */}
        <ChairsideHUDCapsule
          displayPatientName={displayPatientName}
          isListening={isListening}
          onToggleVoice={handleToggleVoice}
          toothProposal={toothProposal}
          onRemoveTooth={() => setToothProposal(null)}
          diagnosis={soapProposal.diagnosis}
          onRemoveDiagnosis={() => setSoapProposal((p) => ({ ...p, diagnosis: "" }))}
          anestheticProposal={anestheticProposal}
          onRemoveAnesthetic={() => setAnestheticProposal(null)}
          servicesProposal={servicesProposal}
          servicesTotalPrice={servicesTotalPrice}
          servicesTotalKopecks={servicesTotalKopecks}
          onRemoveServices={() => setServicesProposal([])}
          onApplyAllActions={handleApplyAllActions}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen((d) => !d)}
          isDocked={isDocked}
          onToggleDock={() => setIsDocked((d) => !d)}
          onMinimize={() => setIsMinimized(true)}
          onClose={handleCloseHUD}
          onExpandToStudio={() => {
            useCopilotStore.getState().expandToStudio();
          }}
        />

        {/* Expanded Body Panel */}
        {isDrawerOpen && (
          <div className="chairside-hud-expanded-body chairside-hud-body p-3 flex flex-col gap-3">
            {/* Chairside Intercom Bar (Mandates 8bj, 8aq) */}
            <ChairsideIntercomBar
              cabinetNumber="1"
              patientId={props.patientId || undefined}
              patientName={displayPatientName}
            />

            {/* Passive Allergy Notice (Mandates 8e, 8y) - strictly AlertCircle vector icon, zero emojis */}
            {patientAllergies && patientAllergies.length > 0 && (
              <div className="chairside-hud-alert flex items-center gap-2 p-2 rounded-lg bg-[var(--warn)]/10 border border-[var(--warn)]/20 text-xs text-[var(--ink)]" data-testid="chairside-patient-allergies">
                <AlertCircle size={14} className="text-[var(--warn)] shrink-0" />
                <span className="font-medium">Аллергоанамнез: {patientAllergies.join(", ")}</span>
                <span className="text-[11px] text-[var(--muted)] ml-auto">Учтено в протоколе</span>
              </div>
            )}

            {/* Local Fallback Banner (DEF-AI-03: clear notice + direct settings trigger) */}
            {fallbackBanner && (
              <div
                className="chairside-hud-alert flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--warn)]/10 border border-[var(--warn)]/30 text-xs text-[var(--ink)]"
                data-testid="chairside-local-fallback-banner"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-[var(--warn)] shrink-0" />
                  <span className="font-medium">{fallbackBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => useCopilotStore.getState().setSettingsOpen(true)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer transition-colors"
                >
                  Настройки
                </button>
              </div>
            )}

            {/* Quick Clinical Presets Chips */}
            <div className="chairside-hud-presets flex flex-row overflow-x-auto no-scrollbar gap-2 py-1 max-sm:flex-nowrap shrink-0" role="toolbar" aria-label="Клинические сценарии">
              <button
                type="button"
                onClick={() => handleSelectPreset(0)}
                className={`chairside-hud-preset-chip shrink-0 whitespace-nowrap btn-preset-caries-16 ${activePresetIndex === 0 ? "chairside-hud-preset-chip--active" : ""}`}
              >
                {activeTooth ? `Кариес ${activeTooth} (пломба + анестезия)` : "Кариес 16 (пломба + анестезия)"}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(1)}
                className={`chairside-hud-preset-chip shrink-0 whitespace-nowrap btn-preset-pulpitis-26 ${activePresetIndex === 1 ? "chairside-hud-preset-chip--active" : ""}`}
              >
                Пульпит 26 (эндодонтия 3 канала)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(2)}
                className={`chairside-hud-preset-chip shrink-0 whitespace-nowrap btn-preset-hygiene ${activePresetIndex === 2 ? "chairside-hud-preset-chip--active" : ""}`}
              >
                Профгигиена (Air-Flow + УЗ)
              </button>
            </div>

            {/* Collapsible Thought Stream (ReAct reasoning steps) */}
            <ChairsideThoughtStream thoughts={thoughts} isExecutingAgent={isExecutingAgent} />

            {/* Decomposed Proposal Cards: Odontogram, Услуги, SOAP, Anesthetic, Consent, Safety Alert */}
            <ChairsideHUDProposals
              toothProposal={toothProposal}
              servicesProposal={servicesProposal}
              servicesTotalPrice={servicesTotalPrice}
              servicesTotalKopecks={servicesTotalKopecks}
              soapProposal={soapProposal}
              anestheticProposal={anestheticProposal}
              safetyAlert={safetyAlert}
              onApplyTooth={handleApplyTooth}
              onApplyServices={handleApplyServices}
              onApplySoap={handleApplySoap}
              onEditSoap={() => {
                useCopilotStore.getState().expandToStudio();
              }}
              onApplyAll={handleApplyAllActions}
              onDisposeCarpule={onDisposeCarpule}
              onPrintInformedConsent={onPrintInformedConsent}
              onDismissSafetyAlert={() => setSafetyAlert(null)}
            />

            {/* Quick Prompt Input (Mandate 8e: send button never disabled; Mandate 8am: secondary styled) */}
            <ChairsideHUDComposer
              promptInput={promptInput}
              onPromptInputChange={setPromptInput}
              onSubmit={handleSendPrompt}
              isListening={isListening}
              onToggleVoice={handleToggleVoice}
            />

            {/* Mandate 8e Autonomy Footer */}
            <ChairsideHUDFooter
              onDismissAll={handleDismissAll}
              onApplyAllActions={handleApplyAllActions}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

export default ChairsideCopilotHUD;
