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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
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

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          onChange(value ? `${value} ${transcript.trim()}` : transcript.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="copilot-composer">
      <div className="copilot-composer-box">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
          title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
          style={{
            minWidth: '40px',
            minHeight: '40px',
            color: isListening ? '#ef4444' : undefined,
            backgroundColor: isListening ? 'rgba(239, 68, 68, 0.15)' : undefined,
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
          <ShieldCheck size={14} style={{ color: 'var(--teal)' }} />
          <span>Данные защищены 152-ФЗ</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Горячие клавиши: <span className="copilot-kbd">Ctrl+K</span></span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="copilot-icon-btn"
              style={{ minWidth: '28px', minHeight: '28px', padding: '2px 6px', fontSize: '11px', height: 'auto' }}
              title="Очистить диалог"
            >
              <RotateCcw size={12} style={{ marginRight: '4px' }} />
              Сброс
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
