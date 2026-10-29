/**
 * CopilotDrawerEmptyState.tsx — Блок приветствия и сценариев пустого экрана Копайлота.
 */

import React from "react";
import { Sparkles, Camera, FolderSearch, Receipt, FileText, Calculator, ShieldAlert } from "lucide-react";

export interface CopilotDrawerEmptyStateProps {
  runtimeMode: "web_browser" | "desktop_native";
  onSendPrompt: (prompt: string) => void;
}

export const CopilotDrawerEmptyState: React.FC<CopilotDrawerEmptyStateProps> = ({
  runtimeMode,
  onSendPrompt,
}) => {
  return (
    <div className="copilot-feed-empty">
      <Sparkles size={32} className="text-[var(--teal)] opacity-60 mb-2" />
      <p className="text-sm font-medium text-[var(--ink)]">Ассистент готов к работе</p>
      <p className="text-xs text-[var(--muted)] max-w-xs mt-1">
        {runtimeMode === "desktop_native"
          ? "Управление рабочей станцией ПК: снимки визиографа, томографы, касса по COM/USB."
          : "Клинический ассистент: расписание, дневник SOAP, сметы и медкарта приёма."}
      </p>
      <div className="copilot-quick-prompts mt-4">
        {runtimeMode === "desktop_native" ? (
          <>
            <button
              type="button"
              onClick={() => onSendPrompt("Захвати экран визиографа")}
              className="copilot-quick-prompt-btn"
            >
              <Camera size={15} className="text-[var(--teal)] shrink-0 mr-2" />
              <span>Захвати экран визиографа</span>
            </button>
            <button
              type="button"
              onClick={() => onSendPrompt("Найди снимки КЛКТ пациента")}
              className="copilot-quick-prompt-btn"
            >
              <FolderSearch size={15} className="text-[var(--teal)] shrink-0 mr-2" />
              <span>Найди снимки КЛКТ</span>
            </button>
            <button
              type="button"
              onClick={() => onSendPrompt("Проверь фискальный регистратор")}
              className="copilot-quick-prompt-btn"
            >
              <Receipt size={15} className="text-[var(--teal)] shrink-0 mr-2" />
              <span>Касса по COM/USB</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSendPrompt("Заполни дневник приёма")}
              className="copilot-quick-prompt-btn"
            >
              <FileText size={15} className="text-[var(--teal)] shrink-0 mr-2" />
              <span>Заполни дневник приёма</span>
            </button>
            <button
              type="button"
              onClick={() => onSendPrompt("Рассчитай 3 плана лечения")}
              className="copilot-quick-prompt-btn"
            >
              <Calculator size={15} className="text-[var(--teal)] shrink-0 mr-2" />
              <span>Рассчитай 3 плана лечения</span>
            </button>
            <button
              type="button"
              onClick={() => onSendPrompt("Проверь лекарственную безопасность")}
              className="copilot-quick-prompt-btn"
            >
              <ShieldAlert size={15} className="text-[var(--warn,#f59e0b)] shrink-0 mr-2" />
              <span>Проверь аллергии и совместимость</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
