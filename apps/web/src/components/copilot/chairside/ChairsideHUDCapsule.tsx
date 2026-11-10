import React from "react";
import {
  Mic, MicOff, Check, X, ChevronDown, ChevronUp,
  Columns, Minimize2,
} from "lucide-react";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideAnestheticProposal,
} from "./chairsideTypes";

export interface ChairsideHUDCapsuleProps {
  displayPatientName: string;
  isListening: boolean;
  onToggleVoice: () => void;
  toothProposal: ChairsideToothProposal | null;
  onRemoveTooth: () => void;
  diagnosis: string;
  onRemoveDiagnosis: () => void;
  anestheticProposal: ChairsideAnestheticProposal | null;
  onRemoveAnesthetic: () => void;
  servicesProposal: ChairsideServiceProposal[];
  servicesTotalPrice: number;
  onRemoveServices: () => void;
  onApplyAllActions: () => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  isDocked: boolean;
  onToggleDock: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const ChairsideHUDCapsule: React.FC<ChairsideHUDCapsuleProps> = ({
  displayPatientName,
  isListening,
  onToggleVoice,
  toothProposal,
  onRemoveTooth,
  diagnosis,
  onRemoveDiagnosis,
  anestheticProposal,
  onRemoveAnesthetic,
  servicesProposal,
  servicesTotalPrice,
  onRemoveServices,
  onApplyAllActions,
  isDrawerOpen,
  onToggleDrawer,
  isDocked,
  onToggleDock,
  onMinimize,
  onClose,
}) => {
  return (
    <div className="chairside-hud-capsule" data-testid="chairside-hud-capsule">
      <div className="chairside-hud-capsule-brand flex items-center gap-2 shrink-0 whitespace-nowrap">
        <span className="chairside-hud-status-dot shrink-0" />
        <span className="font-semibold text-xs text-[var(--ink)] whitespace-nowrap shrink-0">Копилот у кресла</span>
        <span className="chairside-hud-badge-chair hidden md:inline-flex">В кресле</span>
        <span className="text-xs text-[var(--muted)] hidden lg:inline-block truncate max-w-[120px]">{displayPatientName}</span>
      </div>

      {/* VU-meter Audio Microphone */}
      <button
        type="button"
        onClick={onToggleVoice}
        className={`chairside-hud-btn-mic-capsule btn-capsule-mic ${isListening ? "chairside-hud-btn-mic-capsule--active" : ""}`}
        aria-label="Индикатор звука микрофона"
        data-testid="chairside-mic-capsule"
      >
        {isListening ? <MicOff size={15} /> : <Mic size={15} />}
        <div className={`chairside-vu-meter ${isListening ? "chairside-vu-meter--active" : ""}`} aria-label="Индикатор звука микрофона">
          <span className="chairside-vu-bar chairside-vu-bar--1" />
          <span className="chairside-vu-bar chairside-vu-bar--2" />
          <span className="chairside-vu-bar chairside-vu-bar--3" />
          <span className="chairside-vu-bar chairside-vu-bar--4" />
          <span className="chairside-vu-bar chairside-vu-bar--5" />
        </div>
      </button>

      {/* Live Action Pills */}
      <div className="chairside-hud-live-pills hidden md:flex" data-testid="chairside-hud-live-pills">
        {toothProposal && (
          <div className="chairside-live-pill chairside-live-pill--tooth live-pill-tooth" data-testid="live-pill-tooth">
            <span className="chairside-live-pill-text">{`Зуб ${toothProposal.toothNumber}`}: {toothProposal.stateLabel}</span>
            <button type="button" onClick={onRemoveTooth} className="btn-remove-pill-tooth" aria-label="Удалить зуб" data-testid="btn-remove-pill-tooth"><X size={10} /></button>
          </div>
        )}
        {diagnosis ? (
          <div className="chairside-live-pill chairside-live-pill--diagnosis live-pill-diagnosis" data-testid="live-pill-diagnosis">
            <span className="chairside-live-pill-text">{diagnosis}</span>
            <button type="button" onClick={onRemoveDiagnosis} className="btn-remove-pill-diagnosis" aria-label="Удалить диагноз" data-testid="btn-remove-pill-diagnosis"><X size={10} /></button>
          </div>
        ) : null}
        {anestheticProposal && (
          <div className="chairside-live-pill chairside-live-pill--anesthetic live-pill-anesthetic" data-testid="live-pill-anesthetic">
            <span className="chairside-live-pill-text">{anestheticProposal.drugName}</span>
            <button type="button" onClick={onRemoveAnesthetic} className="btn-remove-pill-anesthetic" aria-label="Удалить анестетик" data-testid="btn-remove-pill-anesthetic"><X size={10} /></button>
          </div>
        )}
        {servicesProposal.length > 0 && (
          <div className="chairside-live-pill chairside-live-pill--services live-pill-services" data-testid="live-pill-services">
            <span className="chairside-live-pill-text">{`${servicesTotalPrice} ₽`}</span>
            <button type="button" onClick={onRemoveServices} className="btn-remove-pill-services" aria-label="Удалить услуги" data-testid="btn-remove-pill-services"><X size={10} /></button>
          </div>
        )}
        {!toothProposal && !diagnosis && !anestheticProposal && servicesProposal.length === 0 && (
          <div className="chairside-live-pill chairside-live-pill--ready text-xs text-[var(--muted)] flex items-center gap-1.5" data-testid="live-pill-ready">
            <span>Готов к диктовке</span>
          </div>
        )}
      </div>

      {/* Capsule Action Buttons */}
      <div className="chairside-hud-capsule-actions flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          onClick={onApplyAllActions}
          className="chairside-hud-btn-quick-apply btn-capsule-apply-scheme hidden sm:inline-flex"
          data-testid="chairside-btn-quick-apply"
        >
          <Check size={14} />
          <span>Применить к схеме</span>
          <kbd className="chairside-capsule-kbd">↵</kbd>
        </button>

        <button
          type="button"
          onClick={onToggleDrawer}
          className="chairside-hud-btn-icon btn-toggle-capsule-drawer"
          title={isDrawerOpen ? "Свернуть панель" : "Развернуть детали"}
          aria-label="Развернуть"
        >
          {isDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        <button
          type="button"
          onClick={onToggleDock}
          className="chairside-hud-btn-icon btn-chairside-hud-dock-toggle"
          title="Переключить докинг"
          aria-label="Докинг"
        >
          <Columns size={14} />
        </button>

        <button
          type="button"
          onClick={onMinimize}
          className="chairside-hud-btn-icon btn-chairside-hud-minimize"
          title="Свернуть в пилюлю"
          aria-label="Свернуть"
        >
          <Minimize2 size={14} />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="chairside-hud-btn-icon btn-chairside-hud-close"
          title="Закрыть HUD"
          aria-label="Закрыть"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
