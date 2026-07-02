import React, { useState, useRef, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { DictationHints } from '../DictationHints';
import { showToast } from "./GlobalToast";

type ContextType = "schedule" | "visit" | "patient" | "price" | "payment" | "general";

interface SmartMicrophoneButtonProps {
  context: ContextType;
  onResult: (text: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function SmartMicrophoneButton({ context, onResult, style, className }: SmartMicrophoneButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (isListening) return;
    
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast("Speech Recognition API не поддерживается в этом браузере.", "error");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false; // We only care about the final result for input fields

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResult(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();

    } catch (err) {
      console.error("Failed to start listening:", err);
      setIsListening(false);
    }
  }, [isListening, onResult]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        title="Диктовка"
        onClick={startListening}
        className={className}
        style={{
          background: isListening ? 'var(--red-100)' : 'transparent',
          color: isListening ? 'var(--red-600)' : 'var(--brand-500)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '50%',
          transition: 'all 0.2s ease',
          ...style
        }}
        onMouseEnter={() => setShowHints(true)}
        onMouseLeave={() => setShowHints(false)}
      >
        <Mic size={20} className={isListening ? "animate-pulse" : ""} />
      </button>

      {/* Dictation Hints Popover */}
      {showHints && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          marginBottom: '8px',
          zIndex: 100,
          minWidth: '300px',
          pointerEvents: 'none', // Don't block clicks
        }}>
          <DictationHints isVisible={true} type={context as any} />
        </div>
      )}
    </div>
  );
}
