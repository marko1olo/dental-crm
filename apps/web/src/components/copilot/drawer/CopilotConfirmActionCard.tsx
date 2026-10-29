/**
 * CopilotConfirmActionCard.tsx — Карточка Two-Phase подтверждения операций в Копайлоте.
 * Мандат 8e: Защита деструктивных мутаций с мгновенным подтверждением в 1 клик.
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488).
 */

import React from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { CopilotConfirmParamsView } from "./CopilotConfirmParamsView";
import type { PendingConfirmation } from "../copilotTypes";

export const TOOL_TITLES_RU: Record<string, string> = {
  calculate_treatment_estimate: "Предварительный расчёт сметы лечения",
  apply_treatment_estimate: "Применение сметы плана лечения",
  draft_clinical_soap_diary: "Формирование дневника приёма (SOAP)",
  get_patient_clinical_card: "Медицинская карта приёма",
  save_clinical_diary: "Сохранение протокола приёма в медкарту",
  save_visit_diary: "Сохранение протокола приёма в медкарту",
  save_examination_protocol: "Сохранение протокола приёма в медкарту",
  save_protocol_043: "Сохранение протокола приёма в медкарту",
  create_prescription: "Оформление электронного рецепта",
  create_electronic_prescription: "Оформление электронного рецепта",
  create_prescription_107: "Оформление электронного рецепта",
  check_drug_interactions: "Проверка лекарственной совместимости",
  update_odontogram: "Обновление статуса зубной формулы",
  add_procedure_to_invoice: "Добавление услуги в счёт приёма",
  create_appointment: "Бронирование приёма в расписании",
};

export function humanizeToolName(name?: string | null): string {
  if (!name) return "Клиническое действие";
  const cleaned = name.replace(/^(clinical|crm)\./, "");
  return TOOL_TITLES_RU[cleaned] || cleaned.replace(/_/g, " ");
}

export interface CopilotConfirmActionCardProps {
  pending: PendingConfirmation;
  nameCache: Record<string, string>;
  onConfirm: (decision: "confirm" | "reject", reason?: string) => void;
}

export const CopilotConfirmActionCard: React.FC<CopilotConfirmActionCardProps> = ({
  pending,
  nameCache,
  onConfirm,
}) => {
  return (
    <div className="copilot-action-confirm-card" data-testid="copilot-action-confirm-card">
      <div className="copilot-confirm-header">
        <AlertCircle size={18} className="text-[var(--teal)] shrink-0" />
        <div>
          <h4 className="copilot-confirm-title">Подтверждение операции</h4>
          <p className="copilot-confirm-sub">Действие: {humanizeToolName(pending.name || pending.toolName)}</p>
        </div>
      </div>
      <CopilotConfirmParamsView
        name={pending.name || pending.toolName || undefined}
        args={pending.args || (pending as any).arguments || {}}
        nameCache={nameCache}
      />
      <div className="copilot-confirm-actions">
        <button
          type="button"
          onClick={() => onConfirm("confirm")}
          className="copilot-btn-primary"
          data-testid="copilot-confirm-btn"
        >
          <Check size={14} />
          Применить
        </button>
        <button
          type="button"
          onClick={() => onConfirm("reject", "Отклонено врачом")}
          className="copilot-btn-secondary copilot-btn-cancel"
          data-testid="copilot-reject-btn"
        >
          <X size={14} />
          Отмена
        </button>
      </div>
    </div>
  );
};
