import React, { useState, useRef, useEffect } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { DictationHints } from '../DictationHints';

interface VoiceAssistantUIProps {
  onNavigate?: (view: any) => void;
  onSearchQuery?: (query: string) => void;
  onDateChange?: (date: string) => void;
}

export function VoiceAssistantUI({ onNavigate, onSearchQuery, onDateChange }: VoiceAssistantUIProps) {
  const { isListening, transcript, volume, startListening, stopListening, lastAction } = useVoiceAssistant("general", {
    onNavigate,
    onSearchQuery,
    onDateChange
  });

  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<"nav" | "search" | "visit">("nav");
  const [visibleAction, setVisibleAction] = useState<any>(null);

  // Interaction mode refs
  const clickTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const isToggleModeRef = useRef<boolean>(false);

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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none gap-3 select-none">
      
      {/* Onboarding & Commands Tutorial Popover */}
      {showTutorial && (
        <div className="mb-2 bg-neutral-950/95 backdrop-blur-lg border border-neutral-800 text-neutral-200 p-5 rounded-2xl shadow-2xl w-80 md:w-96 pointer-events-auto transition-all animate-fade-in-up max-h-[70vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Голосовое управление</h3>
                <p className="text-[10px] text-neutral-400 m-0 uppercase tracking-wider">Интерактивное обучение</p>
              </div>
            </div>
            <button 
              onClick={() => setShowTutorial(false)}
              className="text-neutral-400 hover:text-neutral-300 transition-colors p-1 hover:bg-neutral-800 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-neutral-900 p-1 rounded-xl mb-4 text-xs">
            {(["nav", "search", "visit"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === tab 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {tab === "nav" ? "Навигация" : tab === "search" ? "Поиск и Даты" : "Диктовка ЭМК"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="space-y-3.5 text-xs leading-relaxed">
            {activeTab === "nav" && (
              <>
                <p className="text-neutral-400">Скажите команду для быстрого перехода между разделами клиники:</p>
                <div className="space-y-2">
                  {[
                    { cmd: "«Перейди в расписание»", desc: "Открывает календарь записей" },
                    { cmd: "«Открой пациентов»", desc: "Переходит в список пациентов клиники" },
                    { cmd: "«Перейди в кассу»", desc: "Раздел финансов и оплат" },
                    { cmd: "«Открой настройки»", desc: "Управление клиникой и услугами" },
                    { cmd: "«Покажи маркетинг»", desc: "Аналитика каналов привлечения" },
                    { cmd: "«Открой документы»", desc: "Анализатор документов и согласий" }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-neutral-900/50 border border-neutral-850 p-2.5 rounded-xl hover:border-neutral-705 transition-colors">
                      <div className="font-semibold text-indigo-400 mb-0.5">{item.cmd}</div>
                      <div className="text-neutral-400 text-[11px]">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "search" && (
              <>
                <p className="text-neutral-400">Используйте для поиска пациентов или смены даты в календаре:</p>
                <div className="space-y-2">
                  {[
                    { cmd: "«Найди пациента Смирнов»", desc: "Ищет карту пациента по фамилии или имени" },
                    { cmd: "«Поиск Петров»", desc: "Быстрый глобальный поиск по базе" },
                    { cmd: "«Покажи расписание на завтра»", desc: "Фильтрует календарь на следующий день" },
                    { cmd: "«Перейди на сегодня»", desc: "Возвращает календарную сетку на текущую дату" },
                    { cmd: "«Покажи расписание на вчера»", desc: "Переключает дату календаря на день назад" }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-neutral-900/50 border border-neutral-850 p-2.5 rounded-xl hover:border-neutral-705 transition-colors">
                      <div className="font-semibold text-indigo-400 mb-0.5">{item.cmd}</div>
                      <div className="text-neutral-400 text-[11px]">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "visit" && (
              <>
                <p className="text-neutral-400">Для заполнения карты приема диктуйте жалобы, объективный статус или диагнозы:</p>
                <div className="space-y-2">
                  {[
                    { cmd: "«Жалобы на острую боль в 45 зубе»", desc: "Автоматически заполнит поле жалоб пациента" },
                    { cmd: "«Объективно глубокий кариес сорок шестого зуба»", desc: "Заполнит объективный статус" },
                    { cmd: "«Диагноз хронический пульпит»", desc: "Установит клинический диагноз визита" },
                    { cmd: "«Лечение проведено препарирование и пломбирование»", desc: "Добавит описание выполненных работ" },
                    { cmd: "«Зуб 36 кариес дентина»", desc: "Отметит состояние на интерактивной зубной карте" }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-neutral-900/50 border border-neutral-850 p-2.5 rounded-xl hover:border-neutral-705 transition-colors">
                      <div className="font-semibold text-indigo-400 mb-0.5">{item.cmd}</div>
                      <div className="text-neutral-400 text-[11px]">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-amber-300 text-[11px]">
                  <strong>Совет:</strong> Убедитесь, что открыта вкладка приёма (ЭМК), чтобы текст диктовки автоматически распределился по медицинским полям.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Visualizer and Transcript Bubble */}
      {isListening && (
        <div className="flex items-end gap-4 mb-2">
          <div className="hidden md:block transition-all animate-fade-in-up">
            <DictationHints isVisible={true} type={hintType} />
          </div>
          <div className="bg-neutral-905/90 backdrop-blur-md border border-neutral-800 p-4 rounded-2xl shadow-2xl max-w-sm pointer-events-auto transition-all animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs font-bold text-neutral-400 tracking-wider uppercase">Ассистент слушает...</span>
              {isToggleModeRef.current && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full ml-auto">Режим фиксации</span>
              )}
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
      {visibleAction && !isListening && (
        <div className="mb-2 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/50 p-3 rounded-xl shadow-lg pointer-events-auto animate-fade-in-up flex items-center gap-3 max-w-xs">
          <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <div className="text-xs font-bold text-indigo-400">Команда выполнена</div>
            <div className="text-[11px] text-indigo-200">
              {visibleAction.payload?.nav?.feedbackText || visibleAction.payload?.text || "Команда обработана"}
            </div>
          </div>
        </div>
      )}

      {/* Controls: Info + Mic Buttons */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Helper Toggle Button */}
        <button
          onClick={() => setShowTutorial(prev => !prev)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border ${
            showTutorial
            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]'
            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-white'
          }`}
          title="Справка по голосовым командам"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Push-to-Talk / Toggle Mic Button */}
        <button
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleLeave}
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
            isListening 
            ? 'bg-indigo-600 scale-105 shadow-[0_0_30px_rgba(79,70,229,0.8)]' 
            : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 shadow-xl'
          }`}
          style={{
            boxShadow: isListening ? `0 0 ${glowIntensity}px rgba(79, 70, 229, ${glowIntensity / 100})` : undefined
          }}
          title={isListening ? "Нажмите для завершения" : "Удерживайте для записи (или нажмите один раз)"}
        >
          <svg className={`w-6 h-6 ${isListening ? 'text-white' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
          </svg>
        </button>
      </div>

    </div>
  );
}

