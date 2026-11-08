import React, { useState, useCallback, useMemo } from "react";
import {
  Mic, MicOff, Check, X, ChevronDown, ChevronUp,
  Columns, Minimize2, Sparkles, AlertCircle, Send
} from "lucide-react";
import { CLINICAL_PRESETS, type ClinicalPreset, defaultPreset } from "./chairside/chairsidePresets";
import { mapToCanonicalToothState } from "./chairside/canonicalToothStateMapper";
import { useChairsideVoiceEngine } from "./chairside/useChairsideVoiceEngine";
import { ChairsideHUDProposals } from "./chairside/ChairsideHUDProposals";
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
  const [activePresetIndex, setActivePresetIndex] = useState(initialPresetIndex ?? 0);

  const activePreset = useMemo(() => CLINICAL_PRESETS[activePresetIndex] || defaultPreset, [activePresetIndex]);

  const [toothProposal, setToothProposal] = useState<ChairsideToothProposal | null>(() => {
    if (initialToothProposal !== undefined) return initialToothProposal;
    if (!hasActiveTooth) return null;
    return {
      toothNumber: activeTooth,
      state: activePreset.toothState || "C2",
      stateLabel: activePreset.toothStateLabel || "Кариес дентина (C2)",
      surfaces: activePreset.surfaces || ["O"],
      applied: false,
    };
  });

  const [servicesProposal, setServicesProposal] = useState<ChairsideServiceProposal[]>(() => {
    if (initialServicesProposal !== undefined) return initialServicesProposal;
    if (!hasActiveTooth) return [];
    return activePreset.services.map((s) => ({ ...s, applied: false }));
  });

  const [soapProposal, setSoapProposal] = useState<ChairsideSoapProposal>(() => {
    if (initialSoapProposal !== undefined) return initialSoapProposal;
    if (!hasActiveTooth) {
      return {
        complaint: "",
        anamnesis: "",
        objectiveStatus: "",
        diagnosis: "",
        treatmentPlan: "",
        recommendations: "",
        applied: false,
      };
    }
    return {
      ...activePreset.soap,
      applied: false,
    };
  });

  const [anestheticProposal, setAnestheticProposal] = useState<ChairsideAnestheticProposal | null>(() => {
    if (initialAnestheticProposal !== undefined) return initialAnestheticProposal;
    if (!hasActiveTooth) return null;
    return activePreset.anesthetic ? { ...activePreset.anesthetic, applied: false } : null;
  });

  const [safetyAlert, setSafetyAlert] = useState<ChairsideSafetyAlert | null>(() => {
    if (initialSafetyAlert !== undefined) return initialSafetyAlert;
    if (!hasActiveTooth) return null;
    return activePreset.safetyAlert;
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
              const last = { ...updated[updated.length - 1] };
              last.detail = (last.detail || "") + chunk;
              updated[updated.length - 1] = last;
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
  }, []);

  const handleSelectPreset = useCallback((index: number) => {
    setActivePresetIndex(index);
    const p = CLINICAL_PRESETS[index] || defaultPreset;
    setToothProposal(p.toothNumber ? {
      toothNumber: p.toothNumber,
      state: p.toothState || "C2",
      stateLabel: p.toothStateLabel || "",
      surfaces: p.surfaces || [],
      applied: false,
    } : null);
    setServicesProposal(p.services.map((s) => ({ ...s, applied: false })));
    setSoapProposal({ ...p.soap, applied: false });
    setAnestheticProposal(p.anesthetic ? { ...p.anesthetic, applied: false } : null);
    setSafetyAlert(p.safetyAlert ? { ...p.safetyAlert, acknowledged: false } : null);
  }, []);

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
        <div className="chairside-hud-capsule" data-testid="chairside-hud-capsule">
          <div className="chairside-hud-capsule-brand flex items-center gap-2 shrink-0 whitespace-nowrap">
            <span className="chairside-hud-status-dot shrink-0" />
            <span className="font-semibold text-xs text-[var(--ink)] whitespace-nowrap shrink-0">Копилот у кресла</span>
            <span className="chairside-hud-badge-chair hidden md:inline-flex">В кресле</span>
            <span className="text-xs text-[var(--muted)] hidden lg:inline-block truncate max-w-[120px]">{displayPatientName}</span>
          </div>

          {/* VU-meter Audio Microphone */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`chairside-hud-btn-mic-capsule btn-capsule-mic ${isListening ? "chairside-hud-btn-mic-capsule--active" : ""}`}
            aria-label="Индикатор звука микрофона"
            data-testid="chairside-mic-capsule"
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            <div className={`chairside-vu-meter ${isListening ? "chairside-vu-meter--active" : ""}`} aria-label="Индикатор звука микрофона">
              <span className="chairside-vu-bar chairside-vu-bar--1" />
              <span className="chairside-vu-bar chairside-vu-bar--2" />
              <span className="chairside-vu-bar chairside-vu-bar--3" />
              <span className="chairside-vu-bar chairside-vu-bar--4" />
              <span className="chairside-vu-bar chairside-vu-bar--5" />
            </div>
          </button>

          {/* Live Action Pills */}
          <div className="chairside-hud-live-pills hidden md:flex" data-testid="chairside-hud-live-pills">
            {toothProposal && (
              <div className="chairside-live-pill chairside-live-pill--tooth live-pill-tooth" data-testid="live-pill-tooth">
                <span className="chairside-live-pill-text">{`Зуб ${toothProposal.toothNumber}`}: {toothProposal.stateLabel}</span>
                <button type="button" onClick={() => setToothProposal(null)} className="btn-remove-pill-tooth" aria-label="Удалить зуб" data-testid="btn-remove-pill-tooth"><X size={10} /></button>
              </div>
            )}
            {soapProposal.diagnosis ? (
              <div className="chairside-live-pill chairside-live-pill--diagnosis live-pill-diagnosis" data-testid="live-pill-diagnosis">
                <span className="chairside-live-pill-text">{soapProposal.diagnosis}</span>
                <button type="button" onClick={() => setSoapProposal((p) => ({ ...p, diagnosis: "" }))} className="btn-remove-pill-diagnosis" aria-label="Удалить диагноз" data-testid="btn-remove-pill-diagnosis"><X size={10} /></button>
              </div>
            ) : null}
            {anestheticProposal && (
              <div className="chairside-live-pill chairside-live-pill--anesthetic live-pill-anesthetic" data-testid="live-pill-anesthetic">
                <span className="chairside-live-pill-text">{anestheticProposal.drugName}</span>
                <button type="button" onClick={() => setAnestheticProposal(null)} className="btn-remove-pill-anesthetic" aria-label="Удалить анестетик" data-testid="btn-remove-pill-anesthetic"><X size={10} /></button>
              </div>
            )}
            {servicesProposal.length > 0 && (
              <div className="chairside-live-pill chairside-live-pill--services live-pill-services" data-testid="live-pill-services">
                <span className="chairside-live-pill-text">{`${servicesTotalPrice} ₽`}</span>
                <button type="button" onClick={() => setServicesProposal([])} className="btn-remove-pill-services" aria-label="Удалить услуги" data-testid="btn-remove-pill-services"><X size={10} /></button>
              </div>
            )}
            {!toothProposal && !soapProposal.diagnosis && !anestheticProposal && servicesProposal.length === 0 && (
              <div className="chairside-live-pill chairside-live-pill--ready text-xs text-[var(--muted)] flex items-center gap-1.5" data-testid="live-pill-ready">
                <span>Готов к диктовке</span>
              </div>
            )}
          </div>

          {/* Capsule Action Buttons */}
          <div className="chairside-hud-capsule-actions flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleApplyAllActions}
              className="chairside-hud-btn-quick-apply btn-capsule-apply-scheme hidden sm:inline-flex"
              data-testid="chairside-btn-quick-apply"
            >
              <Check size={14} />
              <span>Применить к схеме</span>
              <kbd className="chairside-capsule-kbd">↵</kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsDrawerOpen((d) => !d)}
              className="chairside-hud-btn-icon btn-toggle-capsule-drawer"
              title={isDrawerOpen ? "Свернуть панель" : "Развернуть детали"}
              aria-label="Развернуть"
            >
              {isDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setIsDocked((d) => !d)}
              className="chairside-hud-btn-icon btn-chairside-hud-dock-toggle"
              title="Переключить докинг"
              aria-label="Докинг"
            >
              <Columns size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="chairside-hud-btn-icon btn-chairside-hud-minimize"
              title="Свернуть в пилюлю"
              aria-label="Свернуть"
            >
              <Minimize2 size={14} />
            </button>

            <button
              type="button"
              onClick={handleCloseHUD}
              className="chairside-hud-btn-icon btn-chairside-hud-close"
              title="Закрыть HUD"
              aria-label="Закрыть"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Expanded Body Panel */}
        {isDrawerOpen && (
          <div className="chairside-hud-expanded-body p-3 flex flex-col gap-3">
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
            <div className="chairside-thought-stream" data-testid="chairside-thought-stream">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)] mb-1.5">
                <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-[var(--teal)]" /> Размышления ИИ</span>
                <span className="text-[10px] text-[var(--ok-fg,var(--teal))] bg-[var(--teal)]/10 px-1.5 py-0.5 rounded font-semibold">
                  {isExecutingAgent ? (
                    <span className="inline-flex items-center gap-1 animate-pulse">
                      <span>Печатает</span>
                      <span className="inline-flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-[var(--teal)] animate-pulse" />
                        <span className="w-1 h-1 rounded-full bg-[var(--teal)] animate-pulse [animation-delay:150ms]" />
                        <span className="w-1 h-1 rounded-full bg-[var(--teal)] animate-pulse [animation-delay:300ms]" />
                      </span>
                    </span>
                  ) : thoughts.length > 0 ? "завершено" : "готов к работе"}
                </span>
              </div>
              {thoughts.length > 0 ? (
                <ol className="chairside-thought-steps space-y-1 text-xs text-[var(--ink)]">
                  {thoughts.map((s) => (
                    <li key={s.id}>
                      {s.title.replace(/^\d+\.\s*/, "")}
                      {s.detail ? <span className="text-[var(--muted)]"> — {s.detail}</span> : null}
                    </li>
                  ))}
                </ol>
              ) : isExecutingAgent ? (
                <p className="text-xs text-[var(--teal)] font-medium m-0 animate-pulse">Формирование клинического протокола и расчет сметы...</p>
              ) : (
                <p className="text-xs text-[var(--muted)] italic m-0">Готов к работе. Ожидание команды или диктовки...</p>
              )}
            </div>

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
            <form onSubmit={handleSendPrompt} className="chairside-hud-composer flex gap-1.5 pt-1">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Команда ассистенту..."
                className="input-chairside-prompt flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
              <button
                type="button"
                onClick={handleToggleVoice}
                className="btn-chairside-mic px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]"
                aria-label="Голос"
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button
                type="submit"
                className="btn-chairside-send px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:text-[var(--teal)] hover:border-[var(--teal)] text-xs font-semibold flex items-center gap-1 transition-colors"
                aria-label="Отправить"
              >
                <Send size={12} />
              </button>
            </form>

            {/* Mandate 8e Autonomy Footer */}
            <div className="chairside-hud-footer flex items-center justify-between pt-2 border-t border-[var(--line)]">
              <div className="chairside-autonomy-note text-[11px] text-[var(--muted)]" data-testid="chairside-autonomy-note">
                Обратимые действия • Полный контроль врача
              </div>
              <div className="chairside-hud-apply-all-row flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDismissAll}
                  className="chairside-hud-btn-dismiss btn-chairside-dismiss-all px-2.5 py-1 text-xs border border-[var(--line)] rounded text-[var(--muted)]"
                >
                  Сброс
                </button>
                <button
                  type="button"
                  onClick={handleApplyAllActions}
                  className="chairside-hud-btn-apply-all btn-chairside-apply-all"
                  data-testid="chairside-btn-apply-all"
                >
                  <Check size={14} />
                  Применить все предложения
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ChairsideCopilotHUD;
