import React, { useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, RotateCcw, ShieldCheck, Check, Activity } from 'lucide-react';
import { useUnifiedDictation } from '../../hooks/useUnifiedDictation';

export interface CopilotComposerProps {
  value: string;
  busy: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onReset?: () => void;
  organizationId?: string | null;
  patientId?: string | null;
  visitId?: string | null;
}

export const CopilotComposer: React.FC<CopilotComposerProps> = ({
  value,
  busy,
  onChange,
  onSubmit,
  onReset,
  organizationId,
  patientId,
  visitId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseTextRef = useRef<string>('');
  const lastEmittedRef = useRef<string>('');

  const {
    isRecording,
    isSpeaking,
    mode: dictationMode,
    audioLevel,
    interimText,
    fullTranscript,
    startDictation,
    stopDictation,
    clearTranscript,
  } = useUnifiedDictation({
    preferredMode: 'gemini_live',
    context: 'chat',
    specialty: 'therapy',
    organizationId,
    patientId,
    visitId,
  });

  const syncLiveText = useCallback(
    (accumulated: string, interim: string) => {
      const base = baseTextRef.current.trim();
      const spoken = `${accumulated || ''} ${interim || ''}`.trim();
      const combined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      if (combined !== lastEmittedRef.current) {
        lastEmittedRef.current = combined;
        onChange(combined);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            if (combined.trim()) {
              localStorage.setItem('dente_copilot_draft_text', combined);
            } else {
              localStorage.removeItem('dente_copilot_draft_text');
            }
          }
        } catch {
          // ignore storage access errors
        }
      }
    },
    [onChange],
  );

  // Synchronize live dictation tokens (interim and accumulated) in real time
  useEffect(() => {
    if (isRecording) {
      syncLiveText(fullTranscript, interimText);
    }
  }, [isRecording, fullTranscript, interimText, syncLiveText]);

  // Dynamic textarea height calculation
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isRecording) {
        stopDictation();
      }
      onSubmit();
    }
  };

  const handleTextChange = (newText: string) => {
    baseTextRef.current = newText;
    onChange(newText);
    lastEmittedRef.current = newText;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (newText.trim()) {
          localStorage.setItem('dente_copilot_draft_text', newText);
        } else {
          localStorage.removeItem('dente_copilot_draft_text');
        }
      }
    } catch {
      // ignore storage access errors
    }
  };

  const handleToggleVoice = async () => {
    if (isRecording) {
      await stopDictation();
    } else {
      baseTextRef.current = value || '';
      clearTranscript();
      await startDictation('gemini_live');
    }
  };

  const handleStopVoice = async () => {
    if (isRecording) {
      await stopDictation();
    }
  };

  const modeLabel =
    dictationMode === 'gemini_live'
      ? 'Gemini 3.5 Transcribe Live'
      : dictationMode === 'server_whisper'
      ? 'Server Whisper'
      : 'Web Speech Live';

  return (
    <div className="copilot-composer">
      {/* Live Dictation & VU-Meter Status Capsule */}
      {isRecording && (
        <div className="copilot-dictation-banner" data-testid="copilot-dictation-banner">
          <div className="copilot-dictation-meta">
            <span className="copilot-recording-dot" />
            <span className="copilot-dictation-title">{modeLabel}</span>
            <span className="copilot-dictation-state">
              {isSpeaking ? '• Распознавание...' : '• Слушаю микрофон...'}
            </span>
          </div>

          {/* Live Dynamic VU Equalizer */}
          <div className="copilot-vu-meter-bar-container" aria-label="VU-метр микрофона" title="Уровень звука">
            {[0.4, 0.8, 1.3, 0.9, 0.5].map((factor, idx) => {
              const heightPx = Math.max(4, Math.min(22, 4 + audioLevel * factor * 22));
              return (
                <span
                  key={idx}
                  className="copilot-vu-equalizer-bar"
                  style={{
                    height: `${heightPx}px`,
                    backgroundColor: isSpeaking ? 'var(--teal, #0d9488)' : 'var(--muted, #6b7280)',
                  }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleStopVoice}
            className="copilot-stop-dictation-btn"
            title="Завершить надиктовку и сохранить текст"
          >
            <Check size={14} />
            <span>Готово</span>
          </button>
        </div>
      )}

      {/* Input box */}
      <div className="copilot-composer-box">
        {isRecording ? (
          <div
            className="copilot-two-layer-display"
            data-testid="copilot-two-layer-stream"
            aria-live="polite"
          >
            {baseTextRef.current && (
              <span className="copilot-stream-base">{baseTextRef.current} </span>
            )}
            <span className="copilot-stream-final">{fullTranscript}</span>
            {interimText.trim() && (
              <span className="copilot-stream-interim">
                {fullTranscript.trim() ? ' ' : ''}{interimText.trim()}
              </span>
            )}
            {!baseTextRef.current && !fullTranscript.trim() && !interimText.trim() && (
              <span style={{ color: 'var(--muted, #6b7280)' }}>
                🎙️ Говорите... Токены Gemini 3.5 Live бегут в реальном времени...
              </span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите ассистента или отдайте команду врачебного протокола..."
            disabled={busy}
            rows={1}
            className="copilot-textarea"
            aria-label="Поле ввода запроса или голосовой надиктовки"
          />
        )}

        {/* Live Mic Toggle Button */}
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`copilot-icon-btn copilot-mic-btn ${isRecording ? 'active recording' : ''}`}
          title={
            isRecording
              ? 'Остановить надиктовку речи'
              : 'Голосовая надиктовка (Gemini 3.5 Transcribe Live)'
          }
          aria-label={isRecording ? 'Остановить запись речи' : 'Начать запись речи'}
          data-testid="copilot-mic-btn"
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || busy}
          className="copilot-send-btn"
          title="Отправить (Enter)"
          aria-label="Отправить сообщение"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Footer info & hotkeys */}
      <div className="copilot-composer-footer">
        <div className="copilot-trust-note">
          <ShieldCheck size={15} style={{ color: 'var(--teal, #0d9488)' }} />
          <span>Данные защищены 152-ФЗ</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            Горячие клавиши: <span className="copilot-kbd">Ctrl+K</span>
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="copilot-icon-btn copilot-reset-btn"
              title="Очистить диалог"
              aria-label="Очистить диалог"
            >
              <RotateCcw size={14} style={{ marginRight: '4px' }} />
              <span>Сброс</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
