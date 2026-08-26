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

  return (
    <div className="copilot-composer">
      <div className="copilot-composer-box">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Спросите ассистента или отдайте команду..."
          disabled={busy}
          rows={1}
          className="copilot-textarea"
        />

        <button
          type="button"
          className="copilot-icon-btn"
          title="Голосовой ввод"
          style={{ minWidth: '40px', minHeight: '40px' }}
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
