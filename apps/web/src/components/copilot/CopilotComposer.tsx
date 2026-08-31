import React, { useRef, useEffect } from 'react';
import { Send, Mic, RotateCcw, ShieldCheck } from 'lucide-react';

interface CopilotComposerProps {
  value: string;
  busy: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onReset?: () => void;
}

export const CopilotComposer: React.FC<CopilotComposerProps> = ({
  value,
  busy,
  onChange,
  onSubmit,
  onReset,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleTextChange = (newText: string) => {
    onChange(newText);
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

  const toggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Голосовой ввод не поддерживается данным браузером. Используйте Chrome или Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ru-RU';
      recognition.continuous = true;
      recognition.interimResults = true;

      baseTextRef.current = value || '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event: any) => {
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const transcriptChunk = res?.[0]?.transcript || '';
          if (res.isFinal) {
            sessionFinal += transcriptChunk;
          } else {
            sessionInterim += transcriptChunk;
          }
        }

        const base = baseTextRef.current.trim();
        const spoken = `${sessionFinal} ${sessionInterim}`.trim();
        const combined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
        handleTextChange(combined);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  return (
    <div className="copilot-composer">
      <div className="copilot-composer-box">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Идет запись речи... Говорите...' : 'Спросите ассистента или отдайте команду...'}
          disabled={busy}
          rows={1}
          className="copilot-textarea"
        />

        <button
          type="button"
          onClick={toggleVoice}
          className={`copilot-icon-btn ${isListening ? 'animate-pulse' : ''}`}
          title={isListening ? 'Остановить запись речи' : 'Голосовой ввод (надиктовка)'}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            color: isListening ? 'var(--rust, #b91c1c)' : undefined,
            backgroundColor: isListening ? 'var(--rust-soft, rgba(254, 226, 226, 0.4))' : undefined,
            borderColor: isListening ? 'var(--rust, #b91c1c)' : undefined,
          }}
        >
          <Mic size={18} />
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || busy}
          className="copilot-send-btn"
          title="Отправить (Enter)"
        >
          <Send size={16} />
        </button>
      </div>

      <div className="copilot-composer-footer">
        <div className="copilot-trust-note">
          <ShieldCheck size={15} style={{ color: 'var(--teal)' }} />
          <span>Данные защищены 152-ФЗ</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Горячие клавиши: <span className="copilot-kbd">Ctrl+K</span></span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="copilot-icon-btn"
              style={{ minWidth: '36px', minHeight: '32px', padding: '4px 8px', fontSize: '12px', height: 'auto' }}
              title="Очистить диалог"
            >
              <RotateCcw size={13} style={{ marginRight: '4px' }} />
              Сброс
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
