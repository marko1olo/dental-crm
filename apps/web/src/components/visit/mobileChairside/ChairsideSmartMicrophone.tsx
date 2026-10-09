/**
 * apps/web/src/components/visit/mobileChairside/ChairsideSmartMicrophone.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 1: SmartMicrophone Dictation Card)
 */

import React from "react";
import { Mic, MicOff } from "lucide-react";
import type { ChairsideSmartMicrophoneProps } from "./types";

export const ChairsideSmartMicrophone: React.FC<ChairsideSmartMicrophoneProps> = ({
  isRecording,
  onToggleRecording,
  onAppendPhrase,
  recognizedSnippet,
  testId = "mobile-chairside-workspace",
}) => {
  return (
    <div className="mobile-smart-mic-card" data-testid={`${testId}-smart-mic`}>
      <div className="mobile-smart-mic-header">
        <button
          type="button"
          onClick={onToggleRecording}
          className={`mobile-smart-mic-btn ${
            isRecording ? "is-listening" : "is-idle"
          }`}
          data-testid={`${testId}-mic-toggle-btn`}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          <span>{isRecording ? "Идет запись диктовки..." : "Голосовая диктовка SmartMic"}</span>
        </button>
      </div>

      <div className="mobile-smart-mic-chips">
        <button
          type="button"
          className="mobile-smart-mic-chip"
          onClick={() => onAppendPhrase("Перкуссия безболезненна")}
        >
          + Перкуссия норм
        </button>
        <button
          type="button"
          className="mobile-smart-mic-chip"
          onClick={() => onAppendPhrase("Анестезия Артикаин 1.7мл")}
        >
          + Анестезия 1.7мл
        </button>
        <button
          type="button"
          className="mobile-smart-mic-chip"
          onClick={() => onAppendPhrase("Слизистая бледно-розовая, чистая")}
        >
          + Слизистая норм
        </button>
        <button
          type="button"
          className="mobile-smart-mic-chip"
          onClick={() => onAppendPhrase("Пломба световой полимеризации")}
        >
          + Пломба композит
        </button>
      </div>

      {recognizedSnippet && (
        <div className="text-[12px] text-[var(--muted)] italic p-2 bg-[var(--paper-soft)] rounded-lg">
          Распознано: «{recognizedSnippet}»
        </div>
      )}
    </div>
  );
};
