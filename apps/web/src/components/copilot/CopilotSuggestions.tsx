import React from 'react';
import { Sparkles, Calendar, Users, FileText, Stethoscope, Search, Clock, ArrowRight } from 'lucide-react';
import type { SuggestionCategory } from './copilotTypes';

export interface SuggestionItem {
  label: string;
  prompt: string;
  icon?: string;
}

export type SuggestionCategoryGroup = SuggestionCategory;

export interface CopilotSuggestionsProps {
  onPick: (prompt: string) => void;
  categories?: SuggestionCategory[];
}

const DEFAULT_CATEGORIES: SuggestionCategory[] = [
  {
    category: 'Рабочие сценарии',
    items: [
      { label: 'Утренняя сводка дня', prompt: 'Покажи утреннюю сводку на сегодня: сколько пациентов, выручка и задачи', icon: 'Sun' },
      { label: 'Подготовка к приёму', prompt: 'Покажи детали ближайшего приёма и историю пациента', icon: 'UserCheck' },
      { label: 'Заполнить окно в графике', prompt: 'Найди пациентов из листа ожидания для заполнения свободного окна', icon: 'CalendarPlus' },
    ],
  },
  {
    category: 'Пациенты',
    items: [
      { label: 'Поиск пациента', prompt: 'Найди пациента по фамилии или номеру телефона', icon: 'Search' },
    ],
  },
  {
    category: 'Расписание',
    items: [
      { label: 'Свободные окна сегодня', prompt: 'Покажи все свободные слоты у терапевта на сегодня', icon: 'Clock' },
      { label: 'Записать на приём', prompt: 'Запиши пациента на консультацию к хирургу', icon: 'Calendar' },
    ],
  },
];

export const CopilotSuggestions: React.FC<CopilotSuggestionsProps> = ({ onPick, categories = DEFAULT_CATEGORIES }) => {
  return (
    <div className="copilot-suggestions-wrapper">
      <div className="copilot-hero-icon">
        <Sparkles size={24} />
      </div>
      <div>
        <h4 className="copilot-hero-title">Клинический ассистент DENTE</h4>
        <p className="copilot-hero-sub">
          Задайте вопрос по расписанию, пациентам, планам лечения или выберите готовый сценарий:
        </p>
      </div>

      {categories.map((cat, idx) => (
        <div key={idx} className="copilot-suggestion-group">
          <div className="copilot-suggestion-category">{cat.category}</div>
          <div className="copilot-suggestion-grid">
            {cat.items.map((item, itemIdx) => (
              <button
                key={itemIdx}
                type="button"
                onClick={() => onPick(item.prompt)}
                className="copilot-prompt-chip"
              >
                <span style={{ color: 'var(--teal)', display: 'flex', alignItems: 'center' }}>
                  <Sparkles size={14} />
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
