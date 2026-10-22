import React from "react";
import { Activity, FileText, Receipt, Syringe, X } from "lucide-react";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
} from "./chairsideTypes";

interface ChairsideLiveEntityPillsProps {
  toothProposal: ChairsideToothProposal;
  onRemoveToothPill: () => void;
  soapProposal: ChairsideSoapProposal;
  onRemoveDiagnosisPill: () => void;
  anestheticProposal: ChairsideAnestheticProposal | null;
  onRemoveAnestheticPill: () => void;
  servicesProposal: ChairsideServiceProposal[];
  servicesTotalPrice: number;
  onRemoveServicesPill: () => void;
}

export const ChairsideLiveEntityPills: React.FC<ChairsideLiveEntityPillsProps> = ({
  toothProposal, onRemoveToothPill, soapProposal, onRemoveDiagnosisPill,
  anestheticProposal, onRemoveAnestheticPill, servicesProposal, servicesTotalPrice, onRemoveServicesPill,
}) => {
  return (
    <div className="chairside-hud-live-pills" data-testid="chairside-live-pills" role="toolbar" aria-label="Распознанные сущности">
      {toothProposal.toothNumber && toothProposal.state ? (
        <div className={`chairside-live-pill chairside-live-pill--tooth ${toothProposal.applied ? "chairside-live-pill--applied" : ""}`} data-testid="live-pill-tooth" title={`Зуб ${toothProposal.toothNumber}: ${toothProposal.stateLabel}`}>
          <Activity size={12} className="shrink-0 text-[var(--teal)]" />
          <span className="chairside-live-pill-text">Зуб {toothProposal.toothNumber}: {toothProposal.stateLabel.replace(/\s*\([A-Za-z0-9_]+\)\s*$/, "")}</span>
          <button type="button" className="chairside-live-pill-remove" onClick={(e) => { e.stopPropagation(); onRemoveToothPill(); }} title="Удалить зуб" aria-label="Удалить зуб" data-testid="btn-remove-pill-tooth">
            <X size={11} />
          </button>
        </div>
      ) : null}

      {soapProposal.diagnosis ? (
        <div className={`chairside-live-pill chairside-live-pill--diagnosis ${soapProposal.applied ? "chairside-live-pill--applied" : ""}`} data-testid="live-pill-diagnosis" title={`Диагноз: ${soapProposal.diagnosis}`}>
          <FileText size={12} className="shrink-0 text-[var(--teal-dark)]" />
          <span className="chairside-live-pill-text">{soapProposal.diagnosis}</span>
          <button type="button" className="chairside-live-pill-remove" onClick={(e) => { e.stopPropagation(); onRemoveDiagnosisPill(); }} title="Удалить диагноз" aria-label="Удалить диагноз" data-testid="btn-remove-pill-diagnosis">
            <X size={11} />
          </button>
        </div>
      ) : null}

      {anestheticProposal ? (
        <div className={`chairside-live-pill chairside-live-pill--anesthetic ${anestheticProposal.applied ? "chairside-live-pill--applied" : ""}`} data-testid="live-pill-anesthetic" title={`Анестезия: ${anestheticProposal.drugName}`}>
          <Syringe size={12} className="shrink-0 text-[var(--teal)]" />
          <span className="chairside-live-pill-text">{anestheticProposal.drugName} ({anestheticProposal.carpulesCount}к)</span>
          <button type="button" className="chairside-live-pill-remove" onClick={(e) => { e.stopPropagation(); onRemoveAnestheticPill(); }} title="Удалить анестетик" aria-label="Удалить анестетик" data-testid="btn-remove-pill-anesthetic">
            <X size={11} />
          </button>
        </div>
      ) : null}

      {servicesProposal.length > 0 ? (
        <div className={`chairside-live-pill chairside-live-pill--services ${servicesProposal.every((s) => s.applied) ? "chairside-live-pill--applied" : ""}`} data-testid="live-pill-services" title={`Смета: ${servicesProposal.length} услуг`}>
          <Receipt size={12} className="shrink-0 text-[var(--teal-dark)]" />
          <span className="chairside-live-pill-text">{servicesProposal.length} усл. • {servicesTotalPrice.toLocaleString("ru-RU")} ₽</span>
          <button type="button" className="chairside-live-pill-remove" onClick={(e) => { e.stopPropagation(); onRemoveServicesPill(); }} title="Удалить услуги" aria-label="Удалить услуги" data-testid="btn-remove-pill-services">
            <X size={11} />
          </button>
        </div>
      ) : null}
    </div>
  );
};
