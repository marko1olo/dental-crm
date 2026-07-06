import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { Search, Calendar, Users, FileText, Settings, Banknote, Stethoscope, Camera, MessageSquare, X, CheckCircle2 } from 'lucide-react';

export function Omnibar() {
  const { isOmnibarOpen, setOmnibarOpen, setCurrentView } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { id: 'nav-shift', title: 'Смена', icon: <Calendar />, category: 'Навигация', action: () => setCurrentView('shift') },
    { id: 'nav-schedule', title: 'Расписание', icon: <Calendar />, category: 'Навигация', action: () => setCurrentView('schedule') },
    { id: 'nav-patients', title: 'Пациенты', icon: <Users />, category: 'Навигация', action: () => setCurrentView('patients') },
    { id: 'nav-imaging', title: 'Снимки', icon: <Camera />, category: 'Навигация', action: () => setCurrentView('imaging') },
    { id: 'nav-visit', title: 'Прием', icon: <Stethoscope />, category: 'Навигация', action: () => setCurrentView('visit') },
    { id: 'nav-documents', title: 'Документы', icon: <FileText />, category: 'Навигация', action: () => setCurrentView('documents') },
    { id: 'nav-finance', title: 'Финансы', icon: <Banknote />, category: 'Навигация', action: () => setCurrentView('finance') },
    { id: 'nav-communications', title: 'Связь', icon: <MessageSquare />, category: 'Навигация', action: () => setCurrentView('communications') },
    { id: 'nav-settings', title: 'Настройки', icon: <Settings />, category: 'Навигация', action: () => setCurrentView('settings') },
    
    { id: 'action-new-patient', title: 'Создать карточку пациента', icon: <Users />, category: 'Быстрые действия', action: () => { setCurrentView('patients'); } },
    { id: 'action-new-appointment', title: 'Новая запись на прием', icon: <Calendar />, category: 'Быстрые действия', action: () => { setCurrentView('schedule'); } },
    { id: 'action-start-shift', title: 'Начать смену (Владелец)', icon: <CheckCircle2 />, category: 'Быстрые действия', action: () => { setCurrentView('shift'); } },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!isOmnibarOpen) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOmnibarOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setOmnibarOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOmnibarOpen, filteredCommands, selectedIndex, setOmnibarOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOmnibarOpen(!isOmnibarOpen);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOmnibarOpen, setOmnibarOpen]);

  return (
    <>
      <AnimatePresence>
        {!isOmnibarOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOmnibarOpen(true)}
            className="omnibar-trigger-btn"
            title="Глобальный поиск и команды (Cmd+K)"
          >
            <Search size={18} />
            <span className="omnibar-trigger-text">Поиск (Cmd+K)</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOmnibarOpen && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
              onClick={() => setOmnibarOpen(false)}
            />
            
            {/* Omnibar Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-white shadow-2xl rounded-2xl overflow-hidden border border-neutral-200 flex flex-col"
              style={{ maxHeight: '60vh' }}
            >
              {/* Header/Input */}
              <div className="flex items-center px-4 border-b border-neutral-100">
                <Search className="w-5 h-5 text-neutral-400 mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 h-14 bg-transparent border-none outline-none text-lg text-neutral-800 placeholder-neutral-400"
                  placeholder="Поиск по разделам или действиям..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                />
                <button 
                  onClick={() => setOmnibarOpen(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-400 hover:text-neutral-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Results */}
              <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(60vh - 56px)' }}>
                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400">
                    Ничего не найдено
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {filteredCommands.map((cmd, idx) => {
                      // Quick check if category changed to add a header
                      const showCategory = idx === 0 || filteredCommands[idx - 1]?.category !== cmd.category;
                      return (
                        <React.Fragment key={cmd.id}>
                          {showCategory && (
                            <div className="px-3 pt-3 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                              {cmd.category}
                            </div>
                          )}
                          <div
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                              idx === selectedIndex 
                                ? "bg-teal-50 text-teal-700" 
                                : "text-neutral-700 hover:bg-neutral-50"
                            }`}
                            onClick={() => {
                              cmd.action();
                              setOmnibarOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${idx === selectedIndex ? 'bg-teal-100/50 text-teal-600' : 'bg-neutral-100 text-neutral-400'}`}>
                              {React.cloneElement(cmd.icon as React.ReactElement<any>, { size: 16 })}
                            </div>
                            <span className="font-medium">{cmd.title}</span>
                            
                            {idx === selectedIndex && (
                              <span className="ml-auto text-xs text-teal-500 font-medium">↵ Выбрать</span>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="bg-neutral-50 px-4 py-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="font-sans px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-semibold text-neutral-400 shadow-sm">↑</kbd>
                    <kbd className="font-sans px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-semibold text-neutral-400 shadow-sm">↓</kbd>
                    <span>навигация</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-sans px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-semibold text-neutral-400 shadow-sm">↵</kbd>
                    <span>выбрать</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>DENTE OS</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
