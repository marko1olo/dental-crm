/**
 * CopilotVoiceStenographer.tsx — Сквозной голосовой стенограф приёма DENTE CRM.
 * SSOT голосового контура с реальным VoiceEngine (Gemini STT + Web Speech fallback).
 * Мандаты 8b (320-390 строк), 8e (автономия врача), 8am (единый дизайн-код).
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Mic, MicOff, Check, RotateCcw, X, Search, MessageSquare, Stethoscope } from "lucide-react";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { CanvasWaveform } from "../audio/CanvasWaveform";
import { extractClinicalTerms, type ParsedClinicalSpeech } from "../../services/voice/clinicalTermsExtractor";
import "./CopilotVoiceStenographer.css";

export interface ParsedClinicalCommand {
  toothNumber: number | null;
  toothState: string | null;
  diagnosis: string | null;
  soapSection: "complaint" | "anamnesis" | "objectiveStatus" | "treatmentPlan" | "recommendations" | null;
  text: string;
}

export interface CopilotVoiceStenographerProps {
  isOpen?: boolean | undefined;
  embedded?: boolean | undefined;
  activeTooth?: number | null | undefined;
  patientName?: string | undefined;
  initialTranscript?: string | undefined;
  onClose?: (() => void) | undefined;
  onApplySoap?: ((patch: Record<string, string>) => void) | undefined;
  onApplyTooth?: ((tooth: number, state: string) => void) | undefined;
  className?: string | undefined;
}

export const CopilotVoiceStenographer: React.FC<CopilotVoiceStenographerProps> = ({
  isOpen = true,
  embedded = false,
  activeTooth = null,
  patientName = "Пациент",
  initialTranscript = "",
  onClose,
  onApplySoap,
  onApplyTooth,
  className = "",
}) => {
  const [manualDraft, setManualDraft] = useState(initialTranscript);
  const [isEditingManually, setIsEditingManually] = useState(false);

  const {
    isRecording: isListening,
    mode: activeAudioMode,
    audioLevel,
    streamManager,
    speechHealth,
    interimText,
    finalText,
    fullTranscript,
    error: voiceError,
    toggleDictation: toggleListening,
    stopDictation: stopListening,
    startDictation: startListening,
    clearTranscript,
  } = useUnifiedDictation({ autoFallback: true });

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !embedded && !wasOpenRef.current) {
      wasOpenRef.current = true;
      void startListening();
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, embedded, startListening]);

  const fullText = fullTranscript || (finalText ? `${finalText} ${interimText}`.trim() : interimText);

  const parsed = useMemo<ParsedClinicalSpeech | null>(() => {
    const textToAnalyze = isEditingManually ? manualDraft : (fullText || manualDraft);
    if (!textToAnalyze.trim()) return null;
    return extractClinicalTerms(textToAnalyze);
  }, [isEditingManually, manualDraft, fullText]);

  useEffect(() => {
    if (initialTranscript && !finalText) {
      setManualDraft(initialTranscript);
    }
  }, [initialTranscript, finalText]);

  // SSOT: Преобразование клинически распознанной речи в команды врача
  const parsedCommands = useMemo<ParsedClinicalCommand[]>(() => {
    const textToAnalyze = isEditingManually ? manualDraft : (fullText || manualDraft);
    if (!textToAnalyze.trim()) return [];

    const currentParsed: ParsedClinicalSpeech | null = parsed;
    const commands: ParsedClinicalCommand[] = [];

    const toothNum = currentParsed?.teeth?.[0] || activeTooth || null;
    const diagnosis = currentParsed?.diagnoses?.[0] || null;
    let toothState: string | null = null;
    if (diagnosis) {
      const lower = diagnosis.toLowerCase();
      if (lower.includes("кариес")) toothState = "caries";
      else if (lower.includes("пульпит")) toothState = "pulpitis";
      else if (lower.includes("периодонтит")) toothState = "periodontitis";
    }
    if (!toothState && currentParsed?.materials?.length) toothState = "filling";
    let detectedSection: ParsedClinicalCommand["soapSection"] = null;
    if (currentParsed?.soap?.subjective) detectedSection = "complaint";
    else if (currentParsed?.soap?.plan) detectedSection = "treatmentPlan";
    else if (currentParsed?.soap?.objective) detectedSection = "objectiveStatus";
    if (toothNum || toothState || diagnosis || detectedSection) {
      commands.push({ toothNumber: toothNum, toothState, diagnosis, soapSection: detectedSection, text: textToAnalyze });
    }
    return commands;
  }, [fullText, manualDraft, isEditingManually, parsed, activeTooth]);

  const handleApplyAll = () => {
    const effectiveText = (isEditingManually ? manualDraft : (fullText || manualDraft)).trim();
    if (!effectiveText) return;

    const lastToothCommand = [...parsedCommands].reverse().find((c) => c.toothNumber && c.toothState);
    if (lastToothCommand && lastToothCommand.toothNumber && lastToothCommand.toothState) {
      if (onApplyTooth) onApplyTooth(lastToothCommand.toothNumber, lastToothCommand.toothState);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dente-odontogram-update", {
            detail: {
              toothNumber: lastToothCommand.toothNumber,
              status: lastToothCommand.toothState,
              toothState: lastToothCommand.toothState,
              diagnosis: lastToothCommand.diagnosis,
            },
          }),
        );
      }
    }

    const soapPatch: Record<string, string> = {};
    if (parsed?.soap?.subjective) soapPatch.complaint = parsed.soap.subjective;
    if (parsed?.soap?.objective) soapPatch.objectiveStatus = parsed.soap.objective;
    if (parsed?.soap?.assessment) soapPatch.diagnosis = parsed.soap.assessment;
    if (parsed?.soap?.plan) soapPatch.treatmentPlan = parsed.soap.plan;

    if (Object.keys(soapPatch).length === 0) {
      soapPatch.objectiveStatus = effectiveText;
    }

    if (onApplySoap) onApplySoap(soapPatch);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: soapPatch }));
    }

    handleClear();
    if (onClose && !embedded) onClose();
  };

  const handleClear = () => {
    clearTranscript();
    setManualDraft("");
    setIsEditingManually(false);
  };

  const handleSendToSearch = () => {
    const text = (isEditingManually ? manualDraft : (fullText || manualDraft)).trim();
    if (!text || typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("dente:open-command-palette", { detail: { query: text } }));
    window.dispatchEvent(new CustomEvent("dente:open-command-hub", { detail: { query: text } }));
  };

  const handleSendToChat = () => {
    const text = (isEditingManually ? manualDraft : (fullText || manualDraft)).trim();
    if (!text || typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("dente:fill-copilot-input", { detail: { prompt: text } }));
    window.dispatchEvent(new CustomEvent("dente:open-copilot"));
    window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
  };

  const displayDraft = isEditingManually ? manualDraft : (fullText || manualDraft);

  if (!isOpen) return null;

  return (
    <div
      className={`copilot-voice-stenographer ${embedded ? "copilot-voice-stenographer--embedded" : "copilot-voice-stenographer--modal"} ${className}`}
      data-testid="copilot-voice-stenographer"
      role="region"
      aria-label="Голосовой стенограф приема"
    >
      <div className="copilot-stenographer-drag-handle" aria-hidden="true" />

      {/* Header */}
      <header className="copilot-stenographer-header">
        <div className="copilot-stenographer-title-box">
          <div
            className={`copilot-stenographer-status-dot ${isListening ? "copilot-stenographer-status-dot--listening" : "copilot-stenographer-status-dot--ready"}`}
          />
          <div>
            <h3 className="copilot-stenographer-title">Голосовой стенограф приёма</h3>
            <p className="copilot-stenographer-subtitle">
              {patientName} {activeTooth ? `• Зуб ${activeTooth}` : ""}
              {" • "}
              {activeAudioMode === "browser_speech" || (speechHealth.checked && !speechHealth.cloudReady)
                ? "Браузерный резерв"
                : speechHealth.activeProviderLabel}
            </p>
          </div>
        </div>

        {/* Audio VU Wave with real AnalyserNode / RMS audioLevel */}
        <div
          className={`copilot-stenographer-vu-meter ${isListening ? "copilot-stenographer-vu-meter--active" : ""}`}
          aria-label="Индикатор аудио-сигнала"
          onClick={() => { if (isListening) void stopListening(); else void startListening(); }}
          title={isListening ? "Остановить запись" : "Включить запись"}
          style={{ cursor: "pointer" }}
        >
          {streamManager?.getAnalyserNode() && isListening ? (
            <CanvasWaveform
              analyserNode={streamManager.getAnalyserNode()}
              isRecording={isListening}
              width={64}
              height={22}
              mode="bars"
              barCount={8}
              showStatusBadge={false}
            />
          ) : null}
          {[0.55, 0.85, 1.0, 0.75, 0.45].map((scale, idx) => {
            const barHeight = isListening
              ? Math.max(4, Math.min(20, Math.round(4 + audioLevel * 16 * scale)))
              : 4;
            return (
              <div
                key={idx}
                className="copilot-vu-bar"
                style={{ height: `${barHeight}px`, transition: "height 90ms ease-out" }}
              />
            );
          })}
        </div>

        {onClose && !embedded && (
          <button
            type="button"
            onClick={onClose}
            className="copilot-stenographer-clear-btn"
            aria-label="Закрыть стенограф"
            data-testid="stenographer-close-btn"
          >
            <X size={16} />
          </button>
        )}
      </header>

      {/* Body: live transcript and entities */}
      <div className="copilot-stenographer-body">
        <div
          className="copilot-stenographer-transcript-box"
          data-testid="stenographer-transcript-box"
          contentEditable={true}
          suppressContentEditableWarning
          onFocus={() => setIsEditingManually(true)}
          onBlur={(e) => {
            const text = (e.currentTarget.textContent || "").trim();
            setManualDraft(text);
            setIsEditingManually(false);
          }}
          onInput={(e) => {
            setManualDraft((e.currentTarget.textContent || "").trim());
          }}
        >
          {displayDraft ? <span>{displayDraft} </span> : null}
          {interimText && !isEditingManually ? (
            <span className="copilot-stenographer-interim">{interimText}</span>
          ) : null}
          {!displayDraft && !interimText && (
            <div className="copilot-stenographer-empty-hint">
              {isListening
                ? "Слушаю врача... Продиктуйте дневник или команду (напр. «кариес 16», «жалобы на ноющие боли»)"
                : "Нажмите микрофон для начала клинической диктовки или введите текст"}
            </div>
          )}
        </div>

        {voiceError && (
          <div className="text-xs text-[var(--danger)] px-2 py-1 bg-[var(--danger-soft)] rounded">
            {voiceError}
          </div>
        )}

        {/* Quick routing pills: В поиск Ctrl+K / В чат Копайлота */}
        {(displayDraft || interimText) && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-[11px] text-[var(--muted)]">Отправить:</span>
            <button
              type="button"
              onClick={handleSendToSearch}
              className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-[11px] font-medium flex items-center gap-1 hover:bg-[var(--line)] cursor-pointer"
              title="Передать текст в глобальный поиск Ctrl+K"
            >
              <Search size={12} className="text-[var(--teal)]" />
              <span>В поиск (Ctrl+K)</span>
            </button>
            <button
              type="button"
              onClick={handleSendToChat}
              className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-[11px] font-medium flex items-center gap-1 hover:bg-[var(--line)] cursor-pointer"
              title="Передать текст в окно чата с ассистентом"
            >
              <MessageSquare size={12} className="text-[var(--teal)]" />
              <span>В чат ИИ</span>
            </button>
          </div>
        )}

        {/* Parsed Clinical Entities */}
        {parsedCommands.length > 0 && (
          <div className="copilot-stenographer-entities" data-testid="stenographer-entities">
            {parsedCommands.map((cmd, idx) => (
              <React.Fragment key={idx}>
                {cmd.toothNumber && (
                  <span className="copilot-entity-pill copilot-entity-pill--tooth">
                    <Stethoscope size={11} />
                    Зуб {cmd.toothNumber} {cmd.toothState ? `(${cmd.toothState})` : ""}
                  </span>
                )}
                {cmd.diagnosis && (
                  <span className="copilot-entity-pill copilot-entity-pill--diagnosis">
                    {cmd.diagnosis}
                  </span>
                )}
                {cmd.soapSection && (
                  <span className="copilot-entity-pill copilot-entity-pill--soap">
                    Раздел: {cmd.soapSection}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Actions Toolbar: Вторичные слева, ровно ОДНА Primary CTA справа */}
      <footer className="copilot-stenographer-actions flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`copilot-stenographer-mic-btn ${isListening ? "copilot-stenographer-mic-btn--active" : ""}`}
            aria-label={isListening ? "Остановить запись" : "Включить запись"}
            data-testid="stenographer-mic-toggle"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="copilot-stenographer-clear-btn"
            aria-label="Очистить черновик"
            title="Очистить черновик"
            data-testid="stenographer-clear-btn"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleApplyAll}
          disabled={false}
          className="copilot-stenographer-apply-btn"
          data-testid="stenographer-apply-btn"
        >
          <Check size={16} />
          <span>Применить в карту</span>
        </button>
      </footer>
    </div>
  );
};

export default CopilotVoiceStenographer;
