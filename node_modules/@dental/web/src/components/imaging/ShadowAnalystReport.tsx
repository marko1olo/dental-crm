import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Play, Square, Printer, AlertTriangle, FileText, Volume2, VolumeX, Sparkles, CheckCircle } from 'lucide-react';

interface ToothUpdate {
  code: string;
  state: string;
  diagnosisOrFinding: string;
}

interface ShadowAnalystReportProps {
  summary: string;
  toothUpdates?: ToothUpdate[];
  onPrint?: () => void;
  studyTitle?: string;
}

export function ShadowAnalystReport({ summary, toothUpdates, onPrint, studyTitle }: ShadowAnalystReportProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Voices load async in Chrome/Edge — wait for them
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const setReady = () => setVoicesReady(true);
    if (synth.getVoices().length > 0) {
      setReady();
    } else {
      synth.addEventListener('voiceschanged', setReady, { once: true });
    }
    return () => {
      synth.cancel();
    };
  }, []);

  const handleSpeak = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    let fullText = summary;
    if (toothUpdates && toothUpdates.length > 0) {
      fullText += '. Детализация по зубам: ';
      toothUpdates.forEach(t => {
        fullText += `Зуб ${t.code}: ${t.diagnosisOrFinding}. `;
      });
    }

    // Strip markdown characters
    const cleanText = fullText.replace(/[*#_`~]/g, '').replace(/\[.*?\]\(.*?\)/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = synth.getVoices();
    const ruVoice =
      voices.find(v => v.lang === 'ru-RU' && !v.name.toLowerCase().includes('google')) ||
      voices.find(v => v.lang.startsWith('ru')) ||
      null;
    if (ruVoice) utterance.voice = ruVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synth.cancel(); // cancel any previous
    synth.speak(utterance);
    setIsSpeaking(true);
  }, [summary, toothUpdates, isSpeaking]);

  const criticalCount = (toothUpdates ?? []).filter(u =>
    u.state.toLowerCase().includes('caries') ||
    u.state.toLowerCase().includes('pulpitis') ||
    u.state.toLowerCase().includes('periodont')
  ).length;

  return (
    <div className="sa-panel">
      <div className="sa-panel-header">
        <div className="sa-panel-title">
          <Sparkles size={15} />
          <span>ShadowAnalyst · AI Expert</span>
          {criticalCount > 0 && (
            <span className="sa-badge-critical">{criticalCount} крит.</span>
          )}
        </div>
        <div className="sa-panel-actions">
          {studyTitle && (
            <span className="sa-study-label">{studyTitle}</span>
          )}
          {onPrint && (
            <button className="sa-icon-btn" onClick={onPrint} title="Распечатать отчёт" type="button">
              <Printer size={14} />
            </button>
          )}
          <button
            className={`sa-icon-btn ${isSpeaking ? 'sa-icon-btn--active' : ''}`}
            onClick={handleSpeak}
            title={isSpeaking ? 'Остановить озвучку' : (voicesReady ? 'Озвучить отчёт' : 'Загрузка голоса...')}
            disabled={!voicesReady && !isSpeaking}
            type="button"
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      <div className="sa-panel-body">
        {/* Summary */}
        <div className="sa-section">
          <div className="sa-section-label">
            <FileText size={12} />
            Заключение
          </div>
          <p className="sa-summary-text">{summary}</p>
        </div>

        {/* Tooth table */}
        {toothUpdates && toothUpdates.length > 0 && (
          <div className="sa-section">
            <div className="sa-section-label">
              <AlertTriangle size={12} />
              Детализация по зубам · {toothUpdates.length} поз.
            </div>
            <div className="sa-tooth-grid">
              {toothUpdates.map((update, idx) => {
                const isCritical =
                  update.state.toLowerCase().includes('caries') ||
                  update.state.toLowerCase().includes('pulpitis') ||
                  update.state.toLowerCase().includes('periodont');
                const isDone =
                  update.state === 'done' || update.state === 'implant' || update.state === 'prosthetic';
                return (
                  <div
                    key={idx}
                    className={`sa-tooth-row ${isCritical ? 'sa-tooth-row--critical' : ''} ${isDone ? 'sa-tooth-row--done' : ''}`}
                  >
                    <span className="sa-tooth-num">{update.code}</span>
                    <span className="sa-tooth-text">{update.diagnosisOrFinding}</span>
                    {isCritical && <AlertTriangle size={12} className="sa-tooth-icon" />}
                    {isDone && <CheckCircle size={12} className="sa-tooth-icon sa-tooth-icon--done" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
