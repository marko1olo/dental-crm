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
}

export function SmartMicrophoneButton({ context, onResult, style, className }: SmartMicrophoneButtonProps) {
  const [showHints, setShowHints] = useState(false);
  
  const { isRecording, isProcessing, toggleRecording } = useShortDictation(
    context, 
    onResult
  );

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        title="Диктовка"
        onClick={toggleRecording}
        className={className}
        style={{
          background: isRecording ? 'var(--red-100)' : isProcessing ? 'var(--blue-100)' : 'transparent',
          color: isRecording ? 'var(--red-600)' : isProcessing ? 'var(--blue-600)' : 'var(--brand-500)',
          border: 'none',
          cursor: isProcessing ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          borderRadius: '50%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : 'none',
          transform: isRecording ? 'scale(1.05)' : 'scale(1)',
          ...style
        }}
        onMouseEnter={() => setShowHints(true)}
        onMouseLeave={() => setShowHints(false)}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Mic size={20} className={isRecording ? "animate-pulse" : ""} />
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
