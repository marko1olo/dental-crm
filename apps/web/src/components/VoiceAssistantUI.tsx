import React, { useState, useRef, useEffect } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { DictationHints } from '../DictationHints';
import { CornerDockSlot } from './floatingCorner/CornerDock';
import {
  type CornerHelpTab,
  cornerDockLabels,
  cornerVoiceCommands,
  cornerVoiceVisitNote,
} from './floatingCorner/cornerDockLabels';
import { VOICE_METER_BARS, voiceMeterHeights } from './floatingCorner/voiceMeter';

interface VoiceAssistantUIProps {
  onNavigate?: (view: any) => void;
  onSearchQuery?: (query: string) => void;
  onDateChange?: (date: string) => void;
}

const HELP_TABS: readonly CornerHelpTab[] = ["nav", "search", "visit"];

export function VoiceAssistantUI({ onNavigate, onSearchQuery, onDateChange }: VoiceAssistantUIProps) {
  const { isListening, transcript, volume, startListening, stopListening, lastAction } = useVoiceAssistant("general", {
    onNavigate,
    onSearchQuery,
    onDateChange
  });

  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<CornerHelpTab>("nav");
  const [visibleAction, setVisibleAction] = useState<any>(null);

  // Interaction mode refs
  const clickTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const isToggleModeRef = useRef<boolean>(false);

  // Determine hint type based on route
  let hintType: "schedule" | "patient" | "visit" | "prices" | "payment" = "schedule";
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash.includes('visit') || hash.includes('imaging')) hintType = 'visit';
    else if (hash.includes('patients')) hintType = 'patient';
    else if (hash.includes('finance')) hintType = 'payment';
    else if (hash.includes('settings')) hintType = 'prices';
  }

  // Handle action chip auto-dismissal
  useEffect(() => {
    if (lastAction) {
      setVisibleAction(lastAction);
      const timer = setTimeout(() => {
        setVisibleAction(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  // Click-to-Toggle and Push-to-Talk Handlers
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isListening) {
      if (isToggleModeRef.current) {
        stopListening();
        isToggleModeRef.current = false;
      }
      return;
    }

    clickTimeRef.current = Date.now();
    isHoldingRef.current = true;
    isToggleModeRef.current = false;
    startListening();
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isListening) return;

    isHoldingRef.current = false;
    const duration = Date.now() - clickTimeRef.current;
    if (duration < 300) {
      // Quick tap/click: enter toggle mode (keep listening)
      isToggleModeRef.current = true;
    } else {
      // Long press release: stop listening
      stopListening();
      isToggleModeRef.current = false;
    }
  };

  const handleLeave = () => {
    if (isListening && !isToggleModeRef.current && isHoldingRef.current) {
      stopListening();
      isHoldingRef.current = false;
    }
  };

  const activeCommands = cornerVoiceCommands[activeTab];
  const hasNotice = showTutorial || isListening || Boolean(visibleAction);

  /* Кнопки справки и микрофона больше не образуют собственный
     `position: fixed` остров в правом нижнем углу. Раньше этот компонент
     портировался прямо в `document.body` со своим z-index и своим отступом,
     плашка поиска из `Omnibar` — тоже, и микрофон в результате физически
     накрывал кнопку «Сохранить» панели плана лечения.

     Теперь угол принадлежит одному владельцу (`floatingCorner/CornerDock`):
     он задаёт порядок слотов, единственный stacking context, просвет над
     нижней навигацией по её измеренной высоте и подъём панели, когда под ней
     оказался интерактивный элемент. Здесь остаётся только содержимое слотов. */
  return (
    <>
      {hasNotice && (
        <CornerDockSlot slot="notice">
          {showTutorial && (
            <div className="corner-dock__panel">
              <div className="corner-dock__panel-head">
                <div>
                  <h3 className="corner-dock__panel-title">{cornerDockLabels.help.heading}</h3>
                  <p className="corner-dock__panel-subtitle">{cornerDockLabels.help.subheading}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTutorial(false)}
                  className="corner-dock__panel-close"
                  aria-label={cornerDockLabels.help.close}
                >
                  <svg className="corner-dock__action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="corner-dock__tabs" role="tablist">
                {HELP_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`corner-dock__tab${activeTab === tab ? " corner-dock__tab--active" : ""}`}
                  >
                    {cornerDockLabels.tabs[tab]}
                  </button>
                ))}
              </div>

              <p className="corner-dock__hint">{activeCommands.intro}</p>
              <div className="corner-dock__cmd-list">
                {activeCommands.items.map((item) => (
                  <div key={item.command} className="corner-dock__cmd">
                    <div className="corner-dock__cmd-title">{item.command}</div>
                    <div className="corner-dock__cmd-detail">{item.detail}</div>
                  </div>
                ))}
              </div>
              {activeTab === "visit" && (
                <p className="corner-dock__note">{cornerVoiceVisitNote}</p>
              )}
            </div>
          )}

          {isListening && (
            <div className="corner-dock__transcript">
              <div className="corner-dock__side-hints">
                <DictationHints isVisible={true} type={hintType} />
              </div>
              <div className="corner-dock__transcript-card">
                <div className="corner-dock__transcript-head">
                  <span className="corner-dock__rec-dot" aria-hidden="true"></span>
                  <span className="corner-dock__rec-label">{cornerDockLabels.voice.listeningTitle}</span>
                  {isToggleModeRef.current && (
                    <span className="corner-dock__rec-mode">{cornerDockLabels.voice.lockedMode}</span>
                  )}
                </div>

                <div className="corner-dock__transcript-text" aria-live="polite">
                  {transcript || cornerDockLabels.voice.listeningPlaceholder}
                </div>

                {/* Полоски — детерминированная функция измеренного уровня, не Math.random(). */}
                <div className="corner-dock__meter" aria-hidden="true">
                  {voiceMeterHeights(volume, VOICE_METER_BARS).map((height, index) => (
                    <div
                      key={index}
                      className="corner-dock__meter-bar"
                      style={{ height: `${height}%` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {visibleAction && !isListening && (
            <div className="corner-dock__action" role="status">
              <svg className="corner-dock__action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="corner-dock__action-title">{cornerDockLabels.voice.actionDone}</div>
                <div className="corner-dock__action-detail">
                  {visibleAction.payload?.nav?.feedbackText || visibleAction.payload?.text || cornerDockLabels.voice.actionFallback}
                </div>
              </div>
            </div>
          )}
        </CornerDockSlot>
      )}

      <CornerDockSlot slot="help">
        <button
          type="button"
          onClick={() => setShowTutorial(prev => !prev)}
          aria-expanded={showTutorial}
          className={`corner-dock__control${showTutorial ? " corner-dock__control--active" : ""}`}
          title={cornerDockLabels.help.title}
        >
          <svg className="corner-dock__control-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </CornerDockSlot>

      <CornerDockSlot slot="voice">
        <button
          type="button"
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleLeave}
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
          aria-pressed={isListening}
          className="corner-dock__control corner-dock__control--primary"
          style={{
            /* Свечение — единственная динамическая величина: радиус растёт от
               измеренного уровня. Цвет берётся из токена темы. */
            boxShadow: isListening
              ? `0 0 ${Math.round(Math.min(100, Math.max(20, (volume / 255) * 100)))}px var(--teal-glow)`
              : undefined
          }}
          title={isListening ? cornerDockLabels.voice.listening : cornerDockLabels.voice.idle}
        >
          <svg className="corner-dock__control-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
          </svg>
        </button>
      </CornerDockSlot>
    </>
  );
}
