import React, { useState, useCallback, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { CLINICAL_PRESETS, type ClinicalPreset, defaultPreset } from "./chairside/chairsidePresets";
import { mapToCanonicalToothState } from "./chairside/canonicalToothStateMapper";
import { useChairsideVoiceEngine } from "./chairside/useChairsideVoiceEngine";
import { ChairsideHUDProposals } from "./chairside/ChairsideHUDProposals";
import { ChairsideHUDCapsule } from "./chairside/ChairsideHUDCapsule";
import { ChairsideThoughtStream } from "./chairside/ChairsideThoughtStream";
import { ChairsideHUDComposer } from "./chairside/ChairsideHUDComposer";
import { ChairsideHUDFooter } from "./chairside/ChairsideHUDFooter";
import { mapVoiceIntentToHUDProposals } from "./chairside/chairsideVoiceIntentMapper";
import type {
  ChairsideCopilotHUDProps, ChairsideThoughtStep, ChairsideToothProposal,
  ChairsideServiceProposal, ChairsideSoapProposal, ChairsideAnestheticProposal,
  ChairsideConsentProposal, ChairsideSafetyAlert,
} from "./chairside/chairsideTypes";
import type { DentalVoiceIntent } from "../../services/voice";
import { executeCopilotAgentRequest } from "./chairside/chairsideAgentExecutor";
import "./ChairsideCopilotHUD.css";

export {
  type ChairsideCopilotHUDProps, type ChairsideThoughtStep, type ChairsideToothProposal,
  type ChairsideServiceProposal, type ChairsideSoapProposal, type ChairsideAnestheticProposal,
  type ChairsideConsentProposal, type ChairsideSafetyAlert, type ClinicalPreset,
  CLINICAL_PRESETS, mapToCanonicalToothState,
};

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

  const [toothProposal, setToothProposal] = useState<ChairsideToothProposal | null>(() => {
    if (initialToothProposal !== undefined) return initialToothProposal;
    if (initialPresetIndex !== undefined && initialPresetIndex !== null) {
      const p = CLINICAL_PRESETS[initialPresetIndex];
      if (p?.toothNumber || hasActiveTooth) {
        const num = (hasActiveTooth && typeof activeTooth === "number") ? activeTooth : p?.toothNumber;
        if (num) {
          return {
            toothNumber: num,
            state: p?.toothState || "C2",
            stateLabel: p?.toothStateLabel || "",
            surfaces: [...(p?.surfaces || [])],
            applied: false,
          };
        }
      }
    }
    return null;
  });

  const [servicesProposal, setServicesProposal] = useState<ChairsideServiceProposal[]>(() => {
    if (initialServicesProposal !== undefined) return [...initialServicesProposal];
    if (initialPresetIndex !== undefined && initialPresetIndex !== null) {
      const p = CLINICAL_PRESETS[initialPresetIndex];
      if (p?.services) {
        const effectiveTooth = (hasActiveTooth && typeof activeTooth === "number") ? activeTooth : p.toothNumber;
        return p.services.map((s) => ({
          ...s,
          toothNumber: effectiveTooth ?? s.toothNumber,
          applied: false,
        }));
      }
    }
    return [];
  });

  const [soapProposal, setSoapProposal] = useState<ChairsideSoapProposal>(() => {
    if (initialSoapProposal !== undefined) return initialSoapProposal;
    if (initialPresetIndex !== undefined && initialPresetIndex !== null) {
      const preset = CLINICAL_PRESETS[initialPresetIndex];
      if (preset?.soap) {
        return {
          ...preset.soap,
          applied: false,
        };
      }
    }
    if (initialToothProposal) {
      const toothNum = initialToothProposal.toothNumber;
      const stateLabel = initialToothProposal.stateLabel || "Кариес дентина";
      const code = initialToothProposal.state === "C2" ? "K02.1" : initialToothProposal.state === "P" ? "K04.0" : "K02.1";
      return {
        complaint: "Жалобы на кратковременные боли от сладкого и холодного.",
        anamnesis: "Ранее зуб не лечен, полость появилась около 2 месяцев назад.",
        objectiveStatus: "Зондирование дна полости болезненно по эмалево-дентинной границе. Перкуссия отрицательна.",
        diagnosis: `${code} ${stateLabel} (зуб ${toothNum})`,
        treatmentPlan: "Препарирование и медикаментозная обработка, постановка пломбы светового отверждения.",
        recommendations: "Щадящая диета 2 часа, повторный осмотр через 6 месяцев.",
        applied: false,
      };
    }
    return {
      complaint: "",
      anamnesis: "",
      objectiveStatus: "",
      diagnosis: "",
      treatmentPlan: "",
      recommendations: "",
      applied: false,
    };
  });

  const [anestheticProposal, setAnestheticProposal] = useState<ChairsideAnestheticProposal | null>(() => {
    if (initialAnestheticProposal !== undefined) return initialAnestheticProposal;
    if (initialPresetIndex !== undefined && initialPresetIndex !== null) {
      const preset = CLINICAL_PRESETS[initialPresetIndex];
      if (preset?.anesthetic) {
        const a = preset.anesthetic;
        return {
          applied: false,
          drugName: a.drugName,
          carpulesCount: a.carpulesCount,
          patientWeightKg: (a as any).patientWeightKg ?? 70,
          maxCarpules: (a as any).maxCarpules ?? 4,
          epinephrineMcg: (a as any).epinephrineMcg ?? 18,
          isCardiovascularRisk: Boolean((a as any).isCardiovascularRisk),
          ...(a.notes ? { notes: a.notes } : {}),
        };
      }
    }
    return null;
  });

  const [safetyAlert, setSafetyAlert] = useState<ChairsideSafetyAlert | null>(() => {
    if (initialSafetyAlert !== undefined) return initialSafetyAlert;
    if (initialPresetIndex !== undefined && initialPresetIndex !== null) {
      const preset = CLINICAL_PRESETS[initialPresetIndex];
      if (preset?.safetyAlert) {
        const sa = preset.safetyAlert;
        return {
          id: sa.id,
          severity: (sa.severity === "danger" ? "critical" : sa.severity) as "critical" | "warning" | "info",
          title: sa.title,
          description: sa.description,
          acknowledged: false,
        };
      }
    }
    return null;
  });

  const [thoughts, setThoughts] = useState<ChairsideThoughtStep[]>(() => {
    return initialThoughts ? [...initialThoughts] : [];
  });
  const [isExecutingAgent, setIsExecutingAgent] = useState(false);

  const servicesTotalPrice = useMemo(
    () => servicesProposal.reduce((sum, s) => sum + s.priceRub * s.quantity, 0),
    [servicesProposal]
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
      } catch (err) {
        console.warn("[ChairsideCopilotHUD] Agent execution failed:", err);
      } finally {
        setIsExecutingAgent(false);
      }
    },
    [activeTooth, props.patientId, patientAllergies]
  );

  const { isListening, handleToggleVoice } = useChairsideVoiceEngine({
    onTranscriptFinal: useCallback(
      (text: string) => {
        if (text) {
          setPromptInput(text);
          void handleExecutePrompt(text);
        }
      },
      [handleExecutePrompt]
    ),
    onIntentParsed: handleIntentParsed,
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
    setToothProposal((prev) => (prev ? { ...prev, applied: true } : null));
  }, [toothProposal, onApplyToothState, onUpdateToothStatus]);

  const handleApplyServices = useCallback(() => {
    if (onApplyServices) onApplyServices(servicesProposal);
    if (onAddBillingItem) onAddBillingItem(servicesProposal);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dente-add-billing-item", {
        detail: { items: servicesProposal, totalRub: servicesTotalPrice },
      }));
    }
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: true })));
  }, [servicesProposal, servicesTotalPrice, onApplyServices, onAddBillingItem]);

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
    setSoapProposal((prev) => ({ ...prev, applied: true }));
  }, [soapProposal, onApplySoapNotes, onApplySoapDiary]);

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
  }, []);

  const handleSelectPreset = useCallback((index: number) => {
    setActivePresetIndex(index);
    const p = CLINICAL_PRESETS[index] || defaultPreset;
    const effectiveTooth = (hasActiveTooth && typeof activeTooth === "number") ? activeTooth : p.toothNumber;
    setToothProposal(effectiveTooth ? {
      toothNumber: effectiveTooth,
      state: p.toothState || "C2",
      stateLabel: p.toothStateLabel || "",
      surfaces: [...(p.surfaces || [])],
      applied: false,
    } : null);
    setServicesProposal(p.services.map((s) => ({
      ...s,
      toothNumber: effectiveTooth ?? s.toothNumber,
      applied: false,
    })));
    const diagnosis = (effectiveTooth && p.soap.diagnosis)
      ? (p.toothNumber ? p.soap.diagnosis.replace(new RegExp(`зуб\\s*${p.toothNumber}`, "i"), `зуб ${effectiveTooth}`) : p.soap.diagnosis)
      : p.soap.diagnosis;
    setSoapProposal({ ...p.soap, diagnosis, applied: false });
    setAnestheticProposal(p.anesthetic ? {
      applied: false,
      drugName: p.anesthetic.drugName,
      carpulesCount: p.anesthetic.carpulesCount,
      patientWeightKg: (p.anesthetic as any).patientWeightKg ?? 70,
      maxCarpules: (p.anesthetic as any).maxCarpules ?? 4,
      epinephrineMcg: (p.anesthetic as any).epinephrineMcg ?? 18,
      isCardiovascularRisk: Boolean((p.anesthetic as any).isCardiovascularRisk),
      ...(p.anesthetic.notes ? { notes: p.anesthetic.notes } : {}),
    } : null);
    setSafetyAlert(p.safetyAlert ? {
      id: p.safetyAlert.id,
      severity: (p.safetyAlert.severity === "danger" ? "critical" : p.safetyAlert.severity) as "critical" | "warning" | "info",
      title: p.safetyAlert.title,
      description: p.safetyAlert.description,
      acknowledged: false,
    } : null);
  }, [hasActiveTooth, activeTooth]);

  const handleCloseHUD = () => {
    setIsOpen(false);
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
          onRemoveServices={() => setServicesProposal([])}
          onApplyAllActions={handleApplyAllActions}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen((d) => !d)}
          isDocked={isDocked}
          onToggleDock={() => setIsDocked((d) => !d)}
          onMinimize={() => setIsMinimized(true)}
          onClose={handleCloseHUD}
        />

        {/* Expanded Body Panel */}
        {isDrawerOpen && (
          <div className="chairside-hud-expanded-body chairside-hud-body p-3 flex flex-col gap-3">
            {/* Passive Allergy Notice (Mandates 8e, 8y) - strictly AlertCircle vector icon, zero emojis */}
            {patientAllergies && patientAllergies.length > 0 && (
              <div className="chairside-hud-alert flex items-center gap-2 p-2 rounded-lg bg-[var(--warn)]/10 border border-[var(--warn)]/20 text-xs text-[var(--ink)]" data-testid="chairside-patient-allergies">
                <AlertCircle size={14} className="text-[var(--warn)] shrink-0" />
                <span className="font-medium">Аллергоанамнез: {patientAllergies.join(", ")}</span>
                <span className="text-[11px] text-[var(--muted)] ml-auto">Учтено в протоколе</span>
              </div>
            )}

            {/* Quick Clinical Presets Chips */}
            <div className="chairside-hud-presets flex flex-row overflow-x-auto no-scrollbar gap-2 py-1 max-sm:flex-nowrap shrink-0" role="toolbar" aria-label="Клинические сценарии">
              <button
                type="button"
                onClick={() => handleSelectPreset(0)}
                className={`chairside-hud-preset-chip shrink-0 whitespace-nowrap btn-preset-caries-16 ${activePresetIndex === 0 ? "chairside-hud-preset-chip--active" : ""}`}
              >
                Кариес 16 (пломба + анестезия)
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

            {/* Decomposed Proposal Cards: Odontogram, 804n, SOAP, Anesthetic, Consent, Safety Alert */}
            <ChairsideHUDProposals
              toothProposal={toothProposal}
              servicesProposal={servicesProposal}
              servicesTotalPrice={servicesTotalPrice}
              soapProposal={soapProposal}
              anestheticProposal={anestheticProposal}
              safetyAlert={safetyAlert}
              onApplyTooth={handleApplyTooth}
              onApplyServices={handleApplyServices}
              onApplySoap={handleApplySoap}
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
