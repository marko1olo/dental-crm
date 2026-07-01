import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export interface SmartParsePreviewProps {
  isVisible: boolean;
  parsedData: any; // e.g. from smartBookingParser
  rawText: string;
  type: "schedule" | "patient" | "visit";
  onApply: (data: any) => void;
  onManual: () => void;
  onClose: () => void;
}

export function SmartParsePreview({ isVisible, parsedData, rawText, type, onApply, onManual, onClose }: SmartParsePreviewProps) {
  const [internalData, setInternalData] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setInternalData(parsedData);
      setIsAiLoading(false);
      setAiError(null);
    }
  }, [isVisible, parsedData]);

  const handleAiParse = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai/parse-dictation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, type })
      });
      if (!response.ok) throw new Error("Ошибка при обращении к ИИ");
      const data = await response.json();
      setInternalData(data);
    } catch (err: any) {
      setAiError(err.message || "Сбой при парсинге ИИ");
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const formatTime = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch { return iso; }
  };

  // Render logic depending on type
  const renderSchedulePreview = (data: any) => {
    if (!data || Object.keys(data).length === 0) {
      return <div className="text-sm text-slate-500 italic">Не удалось распознать детали. Попробуйте еще раз или используйте ИИ.</div>;
    }
    return (
      <div className="space-y-2 text-sm">
        {data.status === 'cancelled' && (
          <div className="bg-red-50 text-red-700 p-2 rounded text-xs font-semibold uppercase">Отмена записи</div>
        )}
        {data.patientId && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Пациент:</span>
            <span className="font-medium text-slate-800">Найдено в базе ✓</span>
          </div>
        )}
        {data.patientName && !data.patientId && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Пациент (ИИ):</span>
            <span className="font-medium text-slate-800">{data.patientName}</span>
          </div>
        )}
        {data.doctorUserId && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Врач:</span>
            <span className="font-medium text-slate-800">Найден в базе ✓</span>
          </div>
        )}
        {data.startsAt && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Время:</span>
            <span className="font-medium text-slate-800">{formatDate(data.startsAt)} в {formatTime(data.startsAt)}</span>
          </div>
        )}
        {data.timeStr && !data.startsAt && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Время (ИИ):</span>
            <span className="font-medium text-slate-800">{data.dateStr} в {data.timeStr}</span>
          </div>
        )}
        {(data.reason || data.service) && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Услуга:</span>
            <span className="font-medium text-slate-800">{data.reason || data.service}</span>
          </div>
        )}
        {(data.comment || data.note) && (
          <div className="flex flex-col pt-1">
            <span className="text-slate-500 text-xs mb-1">Заметка:</span>
            <span className="bg-amber-50 p-2 rounded text-amber-900 italic text-xs">{data.comment || data.note}</span>
          </div>
        )}
      </div>
    );
  };

  const renderPatientPreview = (data: any) => {
    if (!data || Object.keys(data).length === 0) return <div className="text-sm text-slate-500">Пусто...</div>;
    return (
      <div className="space-y-2 text-sm">
        {data.fullName && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">ФИО:</span><span className="font-medium">{data.fullName}</span>
          </div>
        )}
        {data.phone && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Телефон:</span><span className="font-medium">{data.phone}</span>
          </div>
        )}
        {data.birthDate && (
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">Дата рождения:</span><span className="font-medium">{data.birthDate}</span>
          </div>
        )}
        {data.notes && (
          <div className="flex flex-col pt-1">
            <span className="text-slate-500 text-xs mb-1">Заметки:</span>
            <span className="bg-amber-50 p-2 rounded text-amber-900 italic text-xs">{data.notes}</span>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isAiLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-3">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-purple-700 font-medium">Llama-3 анализирует...</p>
        </div>
      );
    }
    
    switch (type) {
      case "schedule": return renderSchedulePreview(internalData);
      case "patient": return renderPatientPreview(internalData);
      default: return <div className="text-sm text-slate-500">Превью для {type} в разработке...</div>;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute left-0 top-full mt-2 w-[400px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
        >
          <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Результат распознавания
            </h4>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4">
            {aiError && (
              <div className="bg-red-50 text-red-700 p-2 rounded mb-3 text-xs flex items-center gap-1">
                <AlertTriangle size={14} /> {aiError}
              </div>
            )}
            {renderContent()}
          </div>

          <div className="bg-slate-50 p-3 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => onApply(internalData)}
              disabled={isAiLoading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-sm py-2 px-3 rounded-lg transition-colors flex justify-center items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Применить
            </button>
            <button
              onClick={handleAiParse}
              disabled={isAiLoading}
              className="flex-1 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-700 font-medium text-sm py-2 px-3 rounded-lg transition-colors flex justify-center items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              ИИ-Анализ
            </button>
            <button
              onClick={onManual}
              disabled={isAiLoading}
              className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium text-sm py-2 px-3 rounded-lg transition-colors"
            >
              Вручную
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
