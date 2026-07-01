import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DictationHintsProps {
  isVisible: boolean;
  type: "schedule" | "patient" | "visit";
}

export function DictationHints({ isVisible, type }: DictationHintsProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute left-full top-0 ml-4 w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
        >
          <div className="bg-slate-50 border-b border-slate-100 p-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Памятка для умного ввода
            </h4>
          </div>
          <div className="p-4 text-sm text-slate-600 space-y-3">
            {type === "schedule" && (
              <>
                <p><strong>Запись:</strong><br/>«Запиши Иванова к Смирнову завтра в 14:30 на чистку»</p>
                <p><strong>Отмена:</strong><br/>«Отмени запись Петрова на завтра»</p>
                <p><strong>Заметка:</strong><br/>«Заметка: пациент очень боится»</p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  Парсер прощает опечатки в именах. Услуги и даты определяются автоматически.
                </div>
              </>
            )}
            {type === "patient" && (
              <>
                <p><strong>Создание:</strong><br/>«Новый пациент Иванов Иван 12 мая 1990 телефон 8 999 123 45 67»</p>
                <p><strong>Заметки:</strong><br/>«... пометка: аллергия на лидокаин»</p>
              </>
            )}
            {type === "visit" && (
              <>
                <p>Говорите естественно, парсер сам разобьет текст на блоки:</p>
                <p className="text-xs italic bg-slate-50 p-2 rounded">«Жалуется на боль в 45 зубе от холодного. Объективно глубокая кариозная полость. Диагноз средний кариес. Лечение: анестезия, пломба»</p>
                <ul className="list-disc pl-4 mt-2 space-y-1 text-xs">
                  <li>Называйте номера зубов (напр. 45)</li>
                  <li>Используйте слова маркеры: <strong>Жалобы, Объективно, Диагноз, Лечение</strong></li>
                </ul>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
