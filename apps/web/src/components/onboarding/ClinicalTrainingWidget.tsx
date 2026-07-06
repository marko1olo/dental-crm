import React, { useState } from 'react';
import { HelpCircle, PlayCircle, BookOpen, Stethoscope, Video, ChevronDown } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';


export function ClinicalTrainingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { startTour } = useOnboarding();
  

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/50"
      >
        <HelpCircle size={16} />
        <span className="text-sm font-medium">Справка / Помощь</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-zinc-800 bg-zinc-950/50">
            <h4 className="text-sm font-semibold text-zinc-200">Обучение персонала</h4>
            <p className="text-xs text-zinc-400 mt-1">Интерактивные гиды по системе</p>
          </div>
          
          <div className="py-2">
            <button onClick={() => { setIsOpen(false); startTour('schedule'); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
              <PlayCircle size={14} className="text-blue-400" />
              Расписание и Календарь
            </button>
            <button onClick={() => { setIsOpen(false); startTour('ehr'); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
              <PlayCircle size={14} className="text-emerald-400" />
              Электронная медкарта
            </button>
            <button onClick={() => { setIsOpen(false); startTour('viewer'); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
              <PlayCircle size={14} className="text-purple-400" />
              3D Вьюер и Хирургия
            </button>
            <button onClick={() => { setIsOpen(false); startTour('odontogram'); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
              <PlayCircle size={14} className="text-orange-400" />
              Зубная формула и Сметы
            </button>
            
            <div className="h-px bg-zinc-800 my-2 mx-4" />
            
            <button onClick={() => { setIsOpen(false); window.location.hash = 'manual'; }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
              <BookOpen size={14} className="text-zinc-400" />
              Клиническое руководство (Manual)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
