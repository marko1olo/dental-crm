import React from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { DictationHints } from '../DictationHints';

export function VoiceAssistantUI() {
  const { isListening, transcript, volume, startListening, stopListening, lastAction } = useVoiceAssistant("general");

  // Calculate a glow intensity based on volume (0 to 255)
  const glowIntensity = Math.min(100, Math.max(20, (volume / 255) * 100));

  // Determine hint type based on route
  let hintType: "schedule" | "patient" | "visit" | "prices" | "payment" = "schedule";
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash.includes('visit') || hash.includes('imaging')) hintType = 'visit';
    else if (hash.includes('patients')) hintType = 'patient';
    else if (hash.includes('finance')) hintType = 'payment';
    else if (hash.includes('settings')) hintType = 'prices';
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Visualizer and Transcript Bubble */}
      {isListening && (
        <div className="flex items-end gap-4 mb-4">
          <div className="hidden md:block transition-all animate-fade-in-up">
            <DictationHints isVisible={true} type={hintType} />
          </div>
          <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-700 p-4 rounded-2xl shadow-2xl max-w-sm pointer-events-auto transition-all animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs font-bold text-neutral-400 tracking-wider uppercase">Ассистент слушает...</span>
            </div>
            
            <div className="text-white text-sm leading-relaxed mb-3 min-h-[40px]">
              {transcript || "Говорите..."}
            </div>

            {/* Simple CSS Oscilloscope simulation based on volume */}
            <div className="flex items-center gap-1 h-6">
              {[...Array(12)].map((_, i) => {
                const h = Math.max(10, (Math.random() * glowIntensity));
                return (
                  <div 
                    key={i} 
                    className="w-1.5 bg-indigo-500 rounded-full transition-all duration-75"
                    style={{ height: `${h}%` }}
                  ></div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action Chip (if action was detected) */}
      {lastAction && !isListening && (
        <div className="mb-4 bg-green-500/20 backdrop-blur-md border border-green-500/50 p-3 rounded-xl shadow-lg pointer-events-auto animate-fade-in-up flex items-center gap-3">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <div className="text-xs font-bold text-green-400">Команда распознана</div>
            <div className="text-[10px] text-green-200 uppercase">{lastAction.action}</div>
          </div>
        </div>
      )}

      {/* Push-to-Talk Button */}
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onMouseLeave={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        className={`pointer-events-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
          isListening 
          ? 'bg-indigo-600 scale-110 shadow-[0_0_30px_rgba(79,70,229,0.8)]' 
          : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 shadow-xl'
        }`}
        style={{
          boxShadow: isListening ? `0 0 ${glowIntensity}px rgba(79, 70, 229, ${glowIntensity / 100})` : undefined
        }}
        title="Удерживайте для диктовки"
      >
        <svg className={`w-6 h-6 ${isListening ? 'text-white' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
        </svg>
      </button>

    </div>
  );
}
