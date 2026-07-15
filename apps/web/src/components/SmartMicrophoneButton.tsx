import React, { useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { DictationHints } from '../DictationHints';
import { useShortDictation } from '../hooks/useShortDictation';
import { AudioWaveform } from './AudioWaveform';

export type ContextType = "schedule" | "visit" | "patient" | "price" | "payment" | "general";

interface SmartMicrophoneButtonProps {
  context: ContextType;
  onResult: (text: string) => void;
  style?: React.CSSProperties;
  className?: string;
  sterileMode?: boolean; // new prop
}

export function SmartMicrophoneButton({ context, onResult, style, className, sterileMode = true }: SmartMicrophoneButtonProps) {
  const [showHints, setShowHints] = useState(false);
  
  const { isRecording, isProcessing, toggleRecording } = useShortDictation(
    context, 
    onResult
  );

  return (
    <>
      {sterileMode && isRecording && (
        <div className="sterile-mode-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
             width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', animation: 'pulse 2s infinite'
          }}>
             <Mic size={48} color="var(--red-500)" />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>STERILE MODE ACTIVE</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--slate-300)', marginBottom: '2rem' }}>Бесконтактная диктовка: {context}</p>
          <AudioWaveform isRecording={isRecording} color="var(--red-400)" />
          
          <button 
            onClick={toggleRecording}
            style={{
              marginTop: '3rem',
              padding: '12px 24px',
              background: 'var(--red-600)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Остановить диктовку
          </button>
        </div>
      )}
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
    </>
  );
}
