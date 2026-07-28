import React, { useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { DictationHints } from '../DictationHints';
import { useShortDictation } from '../hooks/useShortDictation';

export type ContextType = "schedule" | "visit" | "patient" | "price" | "payment" | "general";

interface SmartMicrophoneButtonProps {
  context: ContextType;
  onResult: (text: string) => void;
  style?: React.CSSProperties;
  className?: string;
  sterileMode?: boolean;
}

/* Свойства размещения принадлежат внешней обёртке, а не самой кнопке.
   Обёртка создаёт контекст позиционирования для подсказок и участвует в
   потоке родителя; кнопка внутри неё отвечает только за свой вид и
   размер. Если отдать position/inset/transform кнопке, обёртка теряет
   единственного ребёнка из потока, схлопывается в нулевую ширину, и
   кнопка вместе с иконкой ужимается до нуля — см. комментарий ниже. */
const PLACEMENT_PROPERTIES = new Set([
  'position',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'transform',
  'zIndex',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'alignSelf',
  'justifySelf',
  'flex',
  'flexShrink',
  'flexGrow',
]);

function splitPlacementStyle(style?: React.CSSProperties) {
  const placement: React.CSSProperties = {};
  const appearance: React.CSSProperties = {};
  for (const [key, value] of Object.entries(style ?? {})) {
    const bucket = PLACEMENT_PROPERTIES.has(key) ? placement : appearance;
    (bucket as Record<string, unknown>)[key] = value;
  }
  return { placement, appearance };
}

export function SmartMicrophoneButton({ context, onResult, style, className }: SmartMicrophoneButtonProps) {
  const [showHints, setShowHints] = useState(false);

  const { isRecording, isProcessing, toggleRecording } = useShortDictation(
    context,
    onResult
  );

  /* БЫЛО: весь style уходил на кнопку. Экраны «Пациенты» и «Расписание»
     передают сюда { position:absolute, right, top:50% }, рассчитывая
     положить кнопку на правый край поля быстрого ввода. Абсолют считался
     от этой обёртки, а не от .smart-input-wrapper: обёртка оставалась без
     детей в потоке и получала ширину 0, кнопка съёживалась по shrink-to-fit
     до 16px (только паддинги), а иконка микрофона — до нулевой ширины,
     то есть исчезала. Замерено: иконка 0x20, кнопка 16x36. */
  const { placement, appearance } = splitPlacementStyle(style);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...placement }}>
      <button
        type="button"
        title="Диктовка"
        aria-label="Диктовка"
        aria-pressed={isRecording}
        onClick={toggleRecording}
        className={className}
        /* БЫЛО: var(--red-600), var(--blue-600), var(--blue-100). Ни одно из
           этих имён не объявлено нигде в проекте (Tailwind v4 называет свою
           палитру --color-red-600, это другое имя). Неизвестное имя в var()
           не ломает сборку: объявление просто становится недействительным,
           и цвет берётся наследуемый. Значок микрофона при записи и при
           обработке оставался цветом окружающего текста — то есть кнопка не
           показывала, идёт ли запись. Фон при обработке пропадал целиком.
           Теперь взяты семантические токены, объявленные для всех трёх тем в
           dente-redesign.css: --bad-* (красный) и --info-* (синий). */
        style={{
          background: isRecording ? 'var(--bad-bg)' : isProcessing ? 'var(--info-bg)' : 'transparent',
          color: isRecording ? 'var(--bad-fg)' : isProcessing ? 'var(--info-fg)' : 'var(--brand-500)',
          border: 'none',
          cursor: isProcessing ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          /* Палец в перчатке у кресла: держим цель нажатия не меньше 36px
             даже когда вызывающий код просит компактный паддинг. */
          minWidth: '36px',
          minHeight: '36px',
          borderRadius: '50%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : 'none',
          transform: isRecording ? 'scale(1.05)' : 'scale(1)',
          ...appearance
        }}
        onMouseEnter={() => setShowHints(true)}
        onMouseLeave={() => setShowHints(false)}
        disabled={isProcessing}
      >
        {/* Иконка — flex-элемент; без flex-shrink:0 её ужимает любой
            предок с нулевой шириной. */}
        {isProcessing ? (
          <Loader2 size={20} className="animate-spin" style={{ flexShrink: 0 }} />
        ) : (
          <Mic size={20} className={isRecording ? "animate-pulse" : ""} style={{ flexShrink: 0 }} />
        )}
      </button>

      {/* Dictation Hints Popover */}
      {showHints && !isRecording && !isProcessing && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          marginBottom: '8px',
          zIndex: 100,
          minWidth: '300px',
          pointerEvents: 'none',
        }}>
          <DictationHints isVisible={true} type={context as any} />
        </div>
      )}
    </div>
  );
}
