import React from "react";
import { Syringe, Edit3, Check, RotateCcw } from "lucide-react";
import type { ChairsideAnestheticProposal } from "../chairsideTypes";

export interface AnestheticProposalCardProps {
  readonly anestheticProposal: ChairsideAnestheticProposal;
  readonly isEditingAnesthetic: boolean;
  readonly onToggleEditAnesthetic: () => void;
  readonly onAnestheticChange: (updater: (prev: ChairsideAnestheticProposal | null) => ChairsideAnestheticProposal | null) => void;
  readonly onApplyCarpule: () => void;
  readonly onUndoCarpule: () => void;
}

export const AnestheticProposalCard: React.FC<AnestheticProposalCardProps> = ({
  anestheticProposal,
  isEditingAnesthetic,
  onToggleEditAnesthetic,
  onAnestheticChange,
  onApplyCarpule,
  onUndoCarpule,
}) => {
  return (
    <div className="chairside-hud-card" data-testid="chairside-card-anesthetic">
      <div className="chairside-hud-card-head">
        <div className="chairside-hud-card-title">
          <Syringe size={14} className="text-[var(--teal)] shrink-0" />
          <span>Местная анестезия (клинический протокол)</span>
        </div>
        <span className={`chairside-hud-card-badge ${anestheticProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
          {anestheticProposal.applied ? "Внесено" : `${anestheticProposal.carpulesCount} карп.`}
        </span>
      </div>
      <div className="chairside-hud-card-body">
        <div className="font-medium text-[13px] text-[var(--ink)]">
          {anestheticProposal.drugName}
        </div>
        <div className="text-[11px] text-[var(--muted)] mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>Вес: <strong>{anestheticProposal.patientWeightKg} кг</strong></span>
          <span>МРД: <strong>до {anestheticProposal.maxCarpules} карп.</strong></span>
          {anestheticProposal.epinephrineMcg > 0 && (
            <span>Эпинефрин: <strong>{anestheticProposal.epinephrineMcg} мкг</strong></span>
          )}
          {anestheticProposal.isCardiovascularRisk && (
            <span className="text-[var(--warn-fg)] font-medium">Риск ССС (лимит 40 мкг)</span>
          )}
        </div>
        <div className="text-[10px] text-[var(--muted)] mt-1 opacity-80">
          Автосписание материалов и карпул выполняется фоновой автоматикой без участия врача.
        </div>
        {isEditingAnesthetic ? (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-[11px] text-[var(--muted)]">Количество карпул:</label>
            <input
              type="number"
              min="1"
              max={anestheticProposal.maxCarpules || 10}
              className="chairside-hud-soap-edit-input w-20"
              value={anestheticProposal.carpulesCount}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                onAnestheticChange((prev) => (prev ? { ...prev, carpulesCount: val } : null));
              }}
              data-testid="input-edit-anesthetic-carpules"
            />
          </div>
        ) : null}
        {anestheticProposal.notes && (
          <div className="text-[11px] text-[var(--muted)] mt-1 italic">
            {anestheticProposal.notes}
          </div>
        )}
      </div>
      <div className="chairside-hud-card-actions">
        <button
          type="button"
          className="chairside-hud-btn-secondary"
          onClick={onToggleEditAnesthetic}
          data-testid="btn-edit-anesthetic"
          title="Изменить количество карпул"
        >
          <Edit3 size={12} />
          <span>{isEditingAnesthetic ? "Готово" : "Изменить"}</span>
        </button>
        {anestheticProposal.applied ? (
          <button
            type="button"
            className="chairside-hud-btn-undo"
            onClick={onUndoCarpule}
            data-testid="btn-undo-carpule"
            title="Откатить протокол анестезии"
          >
            <RotateCcw size={13} />
            <span>Откатить</span>
          </button>
        ) : (
          <button
            type="button"
            className="chairside-hud-btn-primary"
            onClick={onApplyCarpule}
            data-testid="btn-apply-carpule"
          >
            <Check size={13} />
            <span>Применить анестезию</span>
          </button>
        )}
      </div>
    </div>
  );
};
