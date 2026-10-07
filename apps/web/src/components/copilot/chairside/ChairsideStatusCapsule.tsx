/**
 * ChairsideStatusCapsule.tsx — HUD Status Capsule & Chairside Quick Action Controls.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent strictly <= 500 lines.
 * - Mandate 8e: Doctor & Staff Autonomy (1-click apply-all, instant undo, 0 disabled buttons).
 * - Mandate 8l: 44px compact capsule bar, live entity pills, fast Enter shortcut.
 * - Mandate 8p: 1-line dense clinical header (32-44px).
 * - Zero cartoon emojis, strictly Lucide vector icons.
 */

import React from "react";
import {
  Sparkles,
  Activity,
  FileText,
  Syringe,
  Receipt,
  Check,
  CheckCheck,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  MessageSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
} from "./chairsideTypes";
import { ChairsideCapsuleVoiceControls } from "./ChairsideVoiceAssistant";

export interface ChairsideStatusCapsuleProps {
  readonly patientName?: string | undefined;
  readonly isListening: boolean;
  readonly audioVolume: number;
  readonly onToggleVoice: () => void;
  readonly isDrawerOpen: boolean;
  readonly onToggleDrawer: () => void;
  readonly isDocked: boolean;
  readonly onToggleDock: () => void;
  readonly onMinimize: () => void;
  readonly onOpenDrawerChat: () => void;
  readonly onCloseHUD: () => void;

  // Live entity pills
  readonly toothProposal: ChairsideToothProposal;
  readonly onApplyTooth: () => void;
  readonly onRemoveToothPill: () => void;

  readonly soapProposal: ChairsideSoapProposal;
  readonly onRemoveDiagnosisPill: () => void;

  readonly anestheticProposal: ChairsideAnestheticProposal | null;
  readonly onRemoveAnestheticPill: () => void;

  readonly servicesProposal: ChairsideServiceProposal[];
  readonly servicesTotalPrice: number;
  readonly onRemoveServicesPill: () => void;
}

export interface ChairsideActionFooterProps {
  readonly allApplied: boolean;
  readonly onApplyAll: () => void;
  readonly onUndoAll: () => void;
  readonly onDismissAll: () => void;
}

/**
 * Capsule Top Header (Mandates 8l & 8p: <= 44px capsule, entity pills, fast shortcuts).
 */
export const ChairsideStatusCapsule: React.FC<ChairsideStatusCapsuleProps> = ({
  patientName,
  isListening,
  audioVolume,
  onToggleVoice,
  isDrawerOpen,
  onToggleDrawer,
  isDocked,
  onToggleDock,
  onMinimize,
  onOpenDrawerChat,
  onCloseHUD,
  toothProposal,
  onApplyTooth,
  onRemoveToothPill,
  soapProposal,
  onRemoveDiagnosisPill,
  anestheticProposal,
  onRemoveAnestheticPill,
  servicesProposal,
  servicesTotalPrice,
  onRemoveServicesPill,
}) => {
  return (
    <header className="chairside-hud-header chairside-hud-capsule" data-testid="chairside-hud-header">
      <div className="chairside-hud-header-brand">
        <div className="chairside-hud-header-icon" aria-hidden="true">
          <Sparkles size={14} />
        </div>
        <span className="chairside-hud-title">Копилот у кресла</span>
        {patientName && (
          <span className="chairside-hud-patient-name" data-testid="chairside-hud-patient-name">
            {patientName}
          </span>
        )}
        <span className="chairside-hud-badge" data-testid="chairside-hud-badge-mode">
          В кресле
        </span>

        {/* Quick Microphone Button & VU-meter (Mandate 8l) */}
        <ChairsideCapsuleVoiceControls
          isListening={isListening}
          audioVolume={audioVolume}
          onToggleVoice={onToggleVoice}
        />
      </div>

      {/* Interactive live entity pills with removal buttons (Mandate 8l: Always visible for doctor at chair) */}
      <div className="chairside-hud-live-pills" data-testid="chairside-live-pills" role="toolbar" aria-label="Распознанные сущности">
        {toothProposal.toothNumber && toothProposal.state ? (
          <div
            className={`chairside-live-pill chairside-live-pill--tooth ${toothProposal.applied ? "chairside-live-pill--applied" : ""}`}
            data-testid="live-pill-tooth"
            title={`Зуб ${toothProposal.toothNumber}: ${toothProposal.stateLabel}`}
          >
            <Activity size={12} className="shrink-0 text-[var(--teal)]" />
            <span className="chairside-live-pill-text">
              Зуб {toothProposal.toothNumber}: {toothProposal.stateLabel.replace(/\s*\([A-Za-z0-9_]+\)\s*$/, "")}
            </span>
            <button
              type="button"
              className="chairside-live-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveToothPill();
              }}
              title="Удалить зуб из предложений (если оговорились)"
              aria-label="Удалить зуб"
              data-testid="btn-remove-pill-tooth"
            >
              <X size={11} />
            </button>
          </div>
        ) : null}

        {soapProposal.diagnosis ? (
          <div
            className={`chairside-live-pill chairside-live-pill--diagnosis ${soapProposal.applied ? "chairside-live-pill--applied" : ""}`}
            data-testid="live-pill-diagnosis"
            title={`Диагноз: ${soapProposal.diagnosis}`}
          >
            <FileText size={12} className="shrink-0 text-[var(--teal-dark)]" />
            <span className="chairside-live-pill-text">{soapProposal.diagnosis}</span>
            <button
              type="button"
              className="chairside-live-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveDiagnosisPill();
              }}
              title="Удалить диагноз из предложений"
              aria-label="Удалить диагноз"
              data-testid="btn-remove-pill-diagnosis"
            >
              <X size={11} />
            </button>
          </div>
        ) : null}

        {anestheticProposal ? (
          <div
            className={`chairside-live-pill chairside-live-pill--anesthetic ${anestheticProposal.applied ? "chairside-live-pill--applied" : ""}`}
            data-testid="live-pill-anesthetic"
            title={`Анестезия: ${anestheticProposal.drugName}`}
          >
            <Syringe size={12} className="shrink-0 text-[var(--teal)]" />
            <span className="chairside-live-pill-text">
              {anestheticProposal.drugName} ({anestheticProposal.carpulesCount}к)
            </span>
            <button
              type="button"
              className="chairside-live-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAnestheticPill();
              }}
              title="Удалить анестетик из предложений"
              aria-label="Удалить анестетик"
              data-testid="btn-remove-pill-anesthetic"
            >
              <X size={11} />
            </button>
          </div>
        ) : null}

        {servicesProposal.length > 0 ? (
          <div
            className={`chairside-live-pill chairside-live-pill--services ${servicesProposal.every((s) => s.applied) ? "chairside-live-pill--applied" : ""}`}
            data-testid="live-pill-services"
            title={`Смета: ${servicesProposal.length} услуг`}
          >
            <Receipt size={12} className="shrink-0 text-[var(--teal-dark)]" />
            <span className="chairside-live-pill-text">
              {servicesProposal.length} усл. • {servicesTotalPrice.toLocaleString("ru-RU")} ₽
            </span>
            <button
              type="button"
              className="chairside-live-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveServicesPill();
              }}
              title="Удалить услуги из сметы"
              aria-label="Удалить услуги"
              data-testid="btn-remove-pill-services"
            >
              <X size={11} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Quick Apply Tooth to Scheme Button (Mandate 8l: 1-click or Enter) */}
      {toothProposal.toothNumber && toothProposal.state ? (
        <button
          type="button"
          className={`chairside-capsule-btn-apply ${toothProposal.applied ? "chairside-capsule-btn-apply--applied" : ""}`}
          onClick={onApplyTooth}
          data-testid="btn-capsule-apply-scheme"
          title="Мгновенно обновить зуб на схеме (Enter)"
        >
          <Check size={13} />
          <span>{toothProposal.applied ? "На схеме" : "Применить к схеме"}</span>
          <kbd className="chairside-capsule-kbd">↵</kbd>
        </button>
      ) : null}

      <div className="chairside-hud-header-actions">
        <button
          type="button"
          className="chairside-hud-btn-icon"
          onClick={onToggleDrawer}
          title={isDrawerOpen ? "Свернуть в компактную капсулу" : "Развернуть подробности (SOAP, услуги, обоснование)"}
          data-testid="btn-toggle-capsule-drawer"
          aria-label="Подробности"
        >
          {isDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button
          type="button"
          className="chairside-hud-btn-icon"
          onClick={onToggleDock}
          title={isDocked ? "Перевести в плавающий режим" : "Закрепить в рабочей области"}
          data-testid="btn-chairside-hud-dock-toggle"
          aria-label="Переключить док"
        >
          <Layers size={14} />
        </button>
        <button
          type="button"
          className="chairside-hud-btn-icon"
          onClick={onMinimize}
          title="Свернуть панель в компактную плашку"
          data-testid="btn-chairside-hud-minimize"
          aria-label="Свернуть"
        >
          <ChevronDown size={15} />
        </button>
        <button
          type="button"
          className="chairside-hud-btn-icon"
          onClick={onOpenDrawerChat}
          title="Открыть полноразмерный чат Копилота"
          data-testid="btn-chairside-hud-to-drawer"
          aria-label="Полноразмерный чат"
        >
          <MessageSquare size={14} />
        </button>
        <button
          type="button"
          className="chairside-hud-btn-icon"
          onClick={onCloseHUD}
          title="Закрыть HUD"
          data-testid="btn-chairside-hud-close"
          aria-label="Закрыть"
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
};

/**
 * Chairside Action Footer (Mandates 8e & 8k: 1-click apply-all, instant undo, doctor autonomy note).
 */
export const ChairsideActionFooter: React.FC<ChairsideActionFooterProps> = ({
  allApplied,
  onApplyAll,
  onUndoAll,
  onDismissAll,
}) => {
  return (
    <>
      <div className="chairside-hud-apply-all-row">
        {allApplied ? (
          <button
            type="button"
            className="chairside-hud-btn-apply-all chairside-hud-btn-apply-all--undo"
            onClick={onUndoAll}
            data-testid="btn-chairside-undo-all"
          >
            <RotateCcw size={16} />
            <span>Откатить всё</span>
          </button>
        ) : (
          <button
            type="button"
            className="chairside-hud-btn-apply-all"
            onClick={onApplyAll}
            data-testid="btn-chairside-apply-all"
          >
            <CheckCheck size={16} />
            <span>Применить все предложения</span>
          </button>
        )}
        <button
          type="button"
          className="chairside-hud-btn-dismiss"
          onClick={onDismissAll}
          data-testid="btn-chairside-dismiss-all"
          title="Сбросить все отметки применения"
        >
          <Trash2 size={14} />
          <span>Сброс</span>
        </button>
      </div>

      <div className="chairside-hud-autonomy-note" data-testid="chairside-autonomy-note">
        <Sparkles size={12} className="text-[var(--teal)]" />
        <span>Полный контроль врача</span>
      </div>
    </>
  );
};
