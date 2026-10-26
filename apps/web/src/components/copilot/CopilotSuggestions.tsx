import React from 'react';
import { Sparkles } from 'lucide-react';
import type { SuggestionCategory } from './copilotTypes';
import { DEFAULT_SUGGESTION_CATEGORIES, renderSuggestionChipIcon } from './suggestions/copilotSuggestionPresets';

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

export const CopilotSuggestions: React.FC<CopilotSuggestionsProps> = ({
  onPick,
  categories = DEFAULT_SUGGESTION_CATEGORIES,
}) => {
  return (
    <div className="copilot-suggestions-wrapper">
      <div className="copilot-hero-icon">
        <Sparkles size={24} />
      </div>
      <div>
        <h4 className="copilot-hero-title">ДЕНТА — Клинический ИИ-ассистент</h4>
        <p className="copilot-hero-sub">
          Задайте вопрос ДЕНТЕ по расписанию, пациентам, планам лечения или выберите готовый сценарий:
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
                title={item.prompt}
              >
                <span className="copilot-chip-icon text-[var(--teal)] flex items-center flex-shrink-0">
                  {renderSuggestionChipIcon(item.icon)}
                </span>
                <span className="copilot-chip-text flex-1 min-w-0 truncate">
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
