import React from "react";
import { Sparkles, Check, ChevronDown, ChevronUp, Layers, MessageSquare, X } from "lucide-react";
import type {
  ChairsideToothProposal, ChairsideServiceProposal, ChairsideSoapProposal, ChairsideAnestheticProposal,
} from "./chairsideTypes";
import { ChairsideCapsuleVoiceControls } from "./ChairsideVoiceAssistant";
import { ChairsideLiveEntityPills } from "./ChairsideLiveEntityPills";
import { ChairsideActionFooter, type ChairsideActionFooterProps } from "./ChairsideActionFooter";

export { ChairsideActionFooter, type ChairsideActionFooterProps };

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

export const ChairsideStatusCapsule: React.FC<ChairsideStatusCapsuleProps> = ({
  patientName, isListening, audioVolume, onToggleVoice, isDrawerOpen, onToggleDrawer,
  isDocked, onToggleDock, onMinimize, onOpenDrawerChat, onCloseHUD,
  toothProposal, onApplyTooth, onRemoveToothPill, soapProposal, onRemoveDiagnosisPill,
  anestheticProposal, onRemoveAnestheticPill, servicesProposal, servicesTotalPrice, onRemoveServicesPill,
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
        <ChairsideCapsuleVoiceControls
          isListening={isListening} audioVolume={audioVolume} onToggleVoice={onToggleVoice}
        />
      </div>

      <ChairsideLiveEntityPills
        toothProposal={toothProposal} onRemoveToothPill={onRemoveToothPill}
        soapProposal={soapProposal} onRemoveDiagnosisPill={onRemoveDiagnosisPill}
        anestheticProposal={anestheticProposal} onRemoveAnestheticPill={onRemoveAnestheticPill}
        servicesProposal={servicesProposal} servicesTotalPrice={servicesTotalPrice}
        onRemoveServicesPill={onRemoveServicesPill}
      />

      {toothProposal.toothNumber && toothProposal.state ? (
        <button
          type="button"
          className={`chairside-capsule-btn-apply ${toothProposal.applied ? "chairside-capsule-btn-apply--applied" : ""}`}
          onClick={onApplyTooth} data-testid="btn-capsule-apply-scheme"
          title="Мгновенно обновить зуб на схеме (Enter)"
        >
          <Check size={13} />
          <span>{toothProposal.applied ? "На схеме" : "Применить к схеме"}</span>
          <kbd className="chairside-capsule-kbd">↵</kbd>
        </button>
      ) : null}

      <div className="chairside-hud-header-actions">
        <button type="button" className="chairside-hud-btn-icon" onClick={onToggleDrawer} title={isDrawerOpen ? "Свернуть в компактную капсулу" : "Развернуть подробности (SOAP, услуги, обоснование)"} data-testid="btn-toggle-capsule-drawer" aria-label="Подробности">
          {isDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button type="button" className="chairside-hud-btn-icon" onClick={onToggleDock} title={isDocked ? "Перевести в плавающий режим" : "Закрепить в рабочей области"} data-testid="btn-chairside-hud-dock-toggle" aria-label="Переключить док">
          <Layers size={14} />
        </button>
        <button type="button" className="chairside-hud-btn-icon" onClick={onMinimize} title="Свернуть панель в компактную плашку" data-testid="btn-chairside-hud-minimize" aria-label="Свернуть">
          <ChevronDown size={15} />
        </button>
        <button type="button" className="chairside-hud-btn-icon" onClick={onOpenDrawerChat} title="Открыть полноразмерный чат Копилота" data-testid="btn-chairside-hud-to-drawer" aria-label="Полноразмерный чат">
          <MessageSquare size={14} />
        </button>
        <button type="button" className="chairside-hud-btn-icon" onClick={onCloseHUD} title="Закрыть HUD" data-testid="btn-chairside-hud-close" aria-label="Закрыть">
          <X size={15} />
        </button>
      </div>
    </header>
  );
};
