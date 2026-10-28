import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Check, RotateCcw, X, Sparkles, Stethoscope } from "lucide-react";
import { extractFdiTeethNumbers } from "@dental/shared";
import "./CopilotVoiceStenographer.css";

export interface ParsedClinicalCommand {
  toothNumber: number | null;
  toothState: string | null;
  diagnosis: string | null;
  soapSection: "complaint" | "anamnesis" | "objectiveStatus" | "treatmentPlan" | "recommendations" | null;
  text: string;
}

export interface CopilotVoiceStenographerProps {
  isOpen?: boolean;
  embedded?: boolean;
  activeTooth?: number | null;
  patientName?: string;
  initialTranscript?: string;
  onClose?: () => void;
  onApplySoap?: (patch: Record<string, string>) => void;
  onApplyTooth?: (tooth: number, state: string) => void;
  className?: string;
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
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState(initialTranscript);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedCommands, setParsedCommands] = useState<ParsedClinicalCommand[]>([]);

  const recognitionRef = useRef<any>(null);
  const isSpeechSupported = typeof window !== "undefined" && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Parse spoken text into structured dental commands
  const parseClinicalText = useCallback((text: string): ParsedClinicalCommand[] => {
    if (!text.trim()) return [];
    const commands: ParsedClinicalCommand[] = [];
    const lower = text.toLowerCase();

    // 1. FDI Tooth Extraction
    const fdiTeeth = extractFdiTeethNumbers(lower);
    const toothNum = fdiTeeth.length > 0 ? fdiTeeth[0] : activeTooth;

    // 2. Tooth State extraction
    let detectedState: string | null = null;
    let detectedDiagnosis: string | null = null;
    if (lower.includes("кариес")) {
      detectedState = "caries";
      detectedDiagnosis = "K02.1 Кариес дентина";
    } else if (lower.includes("пульпит")) {
      detectedState = "pulpitis";
      detectedDiagnosis = "K04.0 Пульпит";
    } else if (lower.includes("периодонтит")) {
      detectedState = "periodontitis";
      detectedDiagnosis = "K04.4 Хронический апикальный периодонтит";
    } else if (lower.includes("пломб") || lower.includes("реставрац")) {
      detectedState = "filling";
    } else if (lower.includes("коронк")) {
      detectedState = "crown";
    } else if (lower.includes("имплант")) {
      detectedState = "implant";
    } else if (lower.includes("удален") || lower.includes("отсутств")) {
      detectedState = "missing";
    } else if (lower.includes("интакт") || lower.includes("здоров")) {
      detectedState = "healthy";
    }

    // 3. SOAP Sections detection
    let detectedSoapSection: ParsedClinicalCommand["soapSection"] = null;
    if (lower.includes("жалоб") || lower.includes("болит") || lower.includes("чувствительн")) {
      detectedSoapSection = "complaint";
    } else if (lower.includes("анамнез") || lower.includes("ранее") || lower.includes("со слов")) {
      detectedSoapSection = "anamnesis";
    } else if (lower.includes("осмотр") || lower.includes("объективно") || lower.includes("зондирован") || lower.includes("перкусси")) {
      detectedSoapSection = "objectiveStatus";
    } else if (lower.includes("лечение") || lower.includes("анестези") || lower.includes("препарирован") || lower.includes("коффердам")) {
      detectedSoapSection = "treatmentPlan";
    } else if (lower.includes("рекомендац") || lower.includes("назначен")) {
      detectedSoapSection = "recommendations";
    }

    if (toothNum || detectedState || detectedDiagnosis || detectedSoapSection) {
      commands.push({
        toothNumber: toothNum ?? null,
        toothState: detectedState,
        diagnosis: detectedDiagnosis,
        soapSection: detectedSoapSection,
        text,
      });
    }

    return commands;
  }, [activeTooth]);

  useEffect(() => {
    if (initialTranscript) {
      setFinalTranscript(initialTranscript);
      setParsedCommands(parseClinicalText(initialTranscript));
    }
  }, [initialTranscript, parseClinicalText]);

  // Handle SpeechRecognition Lifecycle
  const startListening = useCallback(() => {
    if (!isSpeechSupported) {
      setErrorMessage("Браузерное распознавание речи не поддерживается. Используйте Web Speech API Chrome/Edge.");
      return;
    }

    setErrorMessage(null);
    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechClass();
      rec.lang = "ru-RU";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let finalStr = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalStr += `${trans} `;
          } else {
            interim += trans;
          }
        }

        if (finalStr) {
          setFinalTranscript((prev) => {
            const updated = `${prev} ${finalStr}`.trim();
            setParsedCommands(parseClinicalText(updated));
            return updated;
          });
        }
        setInterimTranscript(interim);
      };

      rec.onerror = (e: any) => {
        if (e.error === "no-speech") {
          // Normal timeout waiting for speech - do not frighten the doctor
          return;
        }
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setErrorMessage("Доступ к микрофону заблокирован в браузере. Разрешите микрофон в адресной строке.");
        } else if (e.error === "audio-capture") {
          setErrorMessage("Микрофон не обнаружен. Проверьте подключение гарнитуры или введите текст вручную.");
        } else if (e.error === "network") {
          setErrorMessage("Ошибка сети при обращении к голосовому сервису.");
        } else {
          setErrorMessage(`Сбой микрофона (${e.error}). Доступен ручной ввод.`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setErrorMessage(`Сбой микрофона: ${err?.message || "Не удалось запустить аудио"}`);
      setIsListening(false);
    }
  }, [isSpeechSupported, parseClinicalText]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Safe ignore
      }
    }
    setIsListening(false);
  }, []);

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleClear = () => {
    setFinalTranscript("");
    setInterimTranscript("");
    setParsedCommands([]);
    setErrorMessage(null);
  };

  // 1-Click apply to clinical diary & tooth formula
  const handleApplyAll = () => {
    const fullText = `${finalTranscript} ${interimTranscript}`.trim();
    if (!fullText) return;

    // Apply Tooth State if parsed
    const lastToothCommand = [...parsedCommands].reverse().find((c) => c.toothNumber && c.toothState);
    if (lastToothCommand && lastToothCommand.toothNumber && lastToothCommand.toothState) {
      if (onApplyTooth) {
        onApplyTooth(lastToothCommand.toothNumber, lastToothCommand.toothState);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dente:apply-tooth-state", {
          detail: {
            toothNumber: lastToothCommand.toothNumber,
            toothState: lastToothCommand.toothState,
            diagnosis: lastToothCommand.diagnosis,
          },
        }));
      }
    }

    // Apply to SOAP Protocol
    const soapPatch: Record<string, string> = {};
    const lastSoapCommand = [...parsedCommands].reverse().find((c) => c.soapSection);
    if (lastSoapCommand?.soapSection) {
      soapPatch[lastSoapCommand.soapSection] = fullText;
    } else {
      soapPatch.objectiveStatus = fullText;
    }

    if (onApplySoap) onApplySoap(soapPatch);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: soapPatch }));
    }

    handleClear();
    if (onClose && !embedded) onClose();
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Safe ignore
        }
      }
    };
  }, []);

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
          <div className={`copilot-stenographer-status-dot ${isListening ? "copilot-stenographer-status-dot--listening" : "copilot-stenographer-status-dot--ready"}`} />
          <div>
            <h3 className="copilot-stenographer-title">Голосовой стенограф приёма</h3>
            <p className="copilot-stenographer-subtitle">{patientName} {activeTooth ? `• Зуб ${activeTooth}` : ""}</p>
          </div>
        </div>

        {/* Audio VU Wave */}
        <div className={`copilot-stenographer-vu-meter ${isListening ? "copilot-stenographer-vu-meter--active" : ""}`} aria-label="Индикатор аудио-сигнала">
          <div className="copilot-vu-bar" />
          <div className="copilot-vu-bar" />
          <div className="copilot-vu-bar" />
          <div className="copilot-vu-bar" />
          <div className="copilot-vu-bar" />
        </div>

        {onClose && !embedded && (
          <button type="button" onClick={onClose} className="copilot-stenographer-clear-btn" aria-label="Закрыть стенограф" data-testid="stenographer-close-btn">
            <X size={16} />
          </button>
        )}
      </header>

      {/* Body: live transcript and entities */}
      <div className="copilot-stenographer-body">
        <div
          className="copilot-stenographer-transcript-box"
          data-testid="stenographer-transcript-box"
          contentEditable={!isListening}
          suppressContentEditableWarning
          onBlur={(e) => {
            const text = e.currentTarget.textContent || "";
            setFinalTranscript(text.trim());
            setParsedCommands(parseClinicalText(text.trim()));
          }}
        >
          {finalTranscript ? <span>{finalTranscript} </span> : null}
          {interimTranscript ? <span className="copilot-stenographer-interim">{interimTranscript}</span> : null}
          {!finalTranscript && !interimTranscript && (
            <div className="copilot-stenographer-empty-hint">
              {isListening ? "Слушаю врача... Продиктуйте дневник или команду (напр. «кариес 16», «жалобы на ноющие боли»)" : "Нажмите микрофон для начала клинической диктовки или введите текст"}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="text-xs text-[var(--bad)] px-2 py-1 bg-[var(--bad)]/10 rounded">
            {errorMessage}
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

      {/* Actions Toolbar */}
      <footer className="copilot-stenographer-actions">
        <button
          type="button"
          onClick={toggleListening}
          className={`copilot-stenographer-mic-btn ${isListening ? "copilot-stenographer-mic-btn--active" : ""}`}
          aria-label={isListening ? "Остановить запись" : "Включить запись"}
          data-testid="stenographer-mic-toggle"
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          onClick={handleApplyAll}
          className="copilot-stenographer-apply-btn"
          data-testid="stenographer-apply-btn"
        >
          <Check size={16} />
          Применить в карту
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="copilot-stenographer-clear-btn"
          aria-label="Очистить текст"
          data-testid="stenographer-clear-btn"
        >
          <RotateCcw size={14} />
        </button>
      </footer>
    </div>
  );
};

export default CopilotVoiceStenographer;
