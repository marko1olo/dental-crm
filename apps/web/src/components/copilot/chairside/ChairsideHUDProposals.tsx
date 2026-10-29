import React from "react";
import { AlertCircle } from "lucide-react";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideSafetyAlert,
} from "./chairsideTypes";

export interface ChairsideHUDProposalsProps {
  toothProposal: ChairsideToothProposal | null;
  servicesProposal: ChairsideServiceProposal[];
  servicesTotalPrice: number;
  soapProposal: ChairsideSoapProposal;
  anestheticProposal: ChairsideAnestheticProposal | null;
  safetyAlert: ChairsideSafetyAlert | null;
  onApplyTooth: () => void;
  onApplyServices: () => void;
  onApplySoap: () => void;
  onDisposeCarpule?: ((drug: string, count: number) => void) | undefined;
  onPrintInformedConsent?: ((code: string) => void) | undefined;
  onDismissSafetyAlert: () => void;
}

export const ChairsideHUDProposals: React.FC<ChairsideHUDProposalsProps> = ({
  toothProposal,
  servicesProposal,
  servicesTotalPrice,
  soapProposal,
  anestheticProposal,
  safetyAlert,
  onApplyTooth,
  onApplyServices,
  onApplySoap,
  onDisposeCarpule,
  onPrintInformedConsent,
  onDismissSafetyAlert,
}) => {
  return (
    <>
      {/* Odontogram Proposal Card */}
      {toothProposal && (
        <div className="chairside-hud-card chairside-card-odontogram" data-testid="chairside-card-odontogram">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-[var(--ink)]">{`Одонтограмма: Зуб ${toothProposal.toothNumber}`}</span>
            <span className="text-xs text-[var(--teal)] font-medium">{toothProposal.stateLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">Поверхности: {toothProposal.surfaces.join(", ")}</span>
            <button
              type="button"
              onClick={onApplyTooth}
              className="chairside-hud-btn-secondary btn-apply-tooth"
              data-testid="chairside-btn-apply-tooth"
            >
              Применить к зубу
            </button>
          </div>
        </div>
      )}

      {/* 804n Services & Billing Proposal Card */}
      {servicesProposal.length > 0 && (
        <div className="chairside-hud-card chairside-card-services" data-testid="chairside-card-services">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-[var(--ink)]">Смета услуг ({servicesProposal.length})</span>
            <span className="text-xs font-bold text-[var(--teal)]">{servicesTotalPrice} ₽</span>
          </div>
          <ul className="text-xs space-y-1 text-[var(--muted)] mb-2">
            {servicesProposal.map((s) => (
              <li key={s.id} className="flex justify-between items-center">
                <span className="truncate pr-2 font-mono text-[11px] text-[var(--muted)]">{s.serviceCode || s.code804n}</span>
                <span className="truncate pr-2 flex-1">{s.title}</span>
                <span className="shrink-0">{s.priceRub} ₽</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onApplyServices}
            className="chairside-hud-btn-secondary btn-apply-services w-full"
            data-testid="chairside-btn-apply-services"
          >
            Добавить в смету
          </button>
        </div>
      )}

      {/* SOAP Diary Proposal Card */}
      <div className="chairside-hud-card chairside-card-soap" data-testid="chairside-card-soap">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-xs text-[var(--ink)]">Дневник приёма (SOAP)</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--info,#3b82f6)] font-medium">K02.1 Кариес дентина (зуб {toothProposal?.toothNumber ?? 16})</span>
            <button type="button" className="btn-edit-soap text-xs text-[var(--muted)] hover:underline">Редактировать</button>
          </div>
        </div>
        <div className="text-xs text-[var(--muted)] space-y-1 mb-2">
          <p><strong>Жалобы (S):</strong> {soapProposal.complaint}</p>
          <p><strong>Объективно (O):</strong> {soapProposal.objectiveStatus}</p>
          <p><strong>Диагноз (A):</strong> {soapProposal.diagnosis}</p>
          <p><strong>План лечения (P):</strong> {soapProposal.treatmentPlan}</p>
        </div>
        <button
          type="button"
          onClick={onApplySoap}
          className="chairside-hud-btn-secondary btn-apply-soap w-full"
          data-testid="chairside-btn-apply-soap"
        >
          Применить в визит
        </button>
      </div>

      {/* Anesthetic Clinical Protocol Card */}
      {anestheticProposal && (
        <div className="chairside-hud-card chairside-card-anesthetic" data-testid="chairside-card-anesthetic">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-[var(--ink)]">Местная анестезия (клинический протокол)</span>
            <span className="text-xs text-[var(--teal)] font-medium">{anestheticProposal.drugName}</span>
          </div>
          <p className="text-xs text-[var(--muted)] mb-2">
            Дозировка: {anestheticProposal.carpulesCount} карпула (1.7 мл). МРД: {anestheticProposal.maxCarpules} карпул.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onDisposeCarpule) onDisposeCarpule(anestheticProposal.drugName, anestheticProposal.carpulesCount);
              }}
              className="chairside-hud-btn-secondary btn-apply-carpule flex-1"
              data-testid="chairside-btn-apply-carpule"
            >
              Применить анестезию
            </button>
            <button
              type="button"
              className="btn-edit-anesthetic px-2.5 py-1 text-xs border border-[var(--line)] rounded text-[var(--muted)]"
            >
              Изменить
            </button>
          </div>
        </div>
      )}

      {/* Informed Consent (IDS) Card */}
      <div className="chairside-hud-card chairside-card-consent" data-testid="chairside-card-consent">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-xs text-[var(--ink)]">Информированное согласие (ИДС)</span>
          <span className="text-xs font-mono text-[var(--teal)]">IDS-02-THERAPY</span>
        </div>
        <p className="text-xs text-[var(--muted)] mb-2">
          ИДС на терапевтическое лечение кариеса и некариозных поражений.
        </p>
        <button
          type="button"
          onClick={() => {
            if (onPrintInformedConsent) onPrintInformedConsent("IDS-02-THERAPY");
          }}
          className="chairside-hud-btn-secondary btn-apply-consent w-full"
          data-testid="chairside-btn-apply-consent"
        >
          Печать ИДС
        </button>
      </div>

      {/* Safety & DDI Alert Card */}
      {safetyAlert && (
        <div className="chairside-hud-alert chairside-card-safety-alert flex items-start gap-2 p-2.5 rounded-lg bg-[var(--teal)]/10 border border-[var(--teal)]/20" data-testid="chairside-card-safety">
          <AlertCircle size={15} className="text-[var(--teal)] shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h5 className="font-semibold text-[var(--ink)]">{safetyAlert.title}</h5>
            <p className="text-[var(--muted)]">{safetyAlert.description}</p>
            <button
              type="button"
              onClick={onDismissSafetyAlert}
              className="mt-1 text-[11px] text-[var(--teal)] font-medium hover:underline btn-acknowledge-safety-alert"
            >
              Принять к сведению
            </button>
          </div>
        </div>
      )}
    </>
  );
};
