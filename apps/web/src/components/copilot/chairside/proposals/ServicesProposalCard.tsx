import React from "react";
import { Receipt, Check, RotateCcw } from "lucide-react";
import type { ChairsideServiceProposal } from "../chairsideTypes";

export interface ServicesProposalCardProps {
  readonly servicesProposal: ChairsideServiceProposal[];
  readonly servicesTotalPrice: number;
  readonly onApplyServices: () => void;
  readonly onUndoServices: () => void;
}

export const ServicesProposalCard: React.FC<ServicesProposalCardProps> = ({
  servicesProposal,
  servicesTotalPrice,
  onApplyServices,
  onUndoServices,
}) => {
  const isAllApplied = servicesProposal.every((s) => s.applied);

  return (
    <div className="chairside-hud-card" data-testid="chairside-card-services">
      <div className="chairside-hud-card-head">
        <div className="chairside-hud-card-title">
          <Receipt size={14} className="text-[var(--teal)] shrink-0" />
          <span>Смета услуг</span>
        </div>
        <span className={`chairside-hud-card-badge ${isAllApplied ? "chairside-hud-card-badge--applied" : ""}`}>
          {isAllApplied ? "Добавлено" : `${servicesTotalPrice.toLocaleString("ru-RU")} ₽`}
        </span>
      </div>
      <div className="chairside-hud-card-body">
        <div className="chairside-hud-service-list">
          {servicesProposal.map((srv) => (
            <div key={srv.id} className="chairside-hud-service-item">
              <div className="min-w-0 flex-1">
                <span className="chairside-hud-service-code">[{srv.serviceCode || srv.code804n}]</span>{" "}
                <span>{srv.title}</span>
              </div>
              <span className="chairside-hud-service-price">
                {srv.priceRub.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="chairside-hud-card-actions">
        {isAllApplied ? (
          <button
            type="button"
            className="chairside-hud-btn-undo"
            onClick={onUndoServices}
            data-testid="btn-undo-services"
            title="Откатить услуги из сметы"
          >
            <RotateCcw size={13} />
            <span>Откатить</span>
          </button>
        ) : (
          <button
            type="button"
            className="chairside-hud-btn-primary"
            onClick={onApplyServices}
            data-testid="btn-apply-services"
          >
            <Check size={13} />
            <span>Добавить в смету</span>
          </button>
        )}
      </div>
    </div>
  );
};
