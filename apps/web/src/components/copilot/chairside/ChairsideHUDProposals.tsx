import React from "react";
import { AlertCircle, Check } from "lucide-react";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideConsentProposal,
  ChairsideSafetyAlert,
} from "./chairsideTypes";

export interface ChairsideHUDProposalsProps {
  toothProposal: ChairsideToothProposal | null;
  servicesProposal: ChairsideServiceProposal[];
  servicesTotalPrice: number;
  soapProposal: ChairsideSoapProposal;
  anestheticProposal: ChairsideAnestheticProposal | null;
  consentProposal?: ChairsideConsentProposal | null | undefined;
  safetyAlert: ChairsideSafetyAlert | null;
  onApplyTooth: () => void;
  onApplyServices: () => void;
  onApplySoap: () => void;
  onApplyAll?: (() => void) | undefined;
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
  consentProposal,
  safetyAlert,
  onApplyTooth,
  onApplyServices,
  onApplySoap,
  onApplyAll,
  onDisposeCarpule,
  onPrintInformedConsent,
  onDismissSafetyAlert,
}) => {
  const hasAnyProposal = Boolean(
    toothProposal ||
    servicesProposal.length > 0 ||
    soapProposal?.diagnosis ||
    soapProposal?.complaint ||
    soapProposal?.treatmentPlan ||
    anestheticProposal ||
    safetyAlert ||
    consentProposal
  );

  if (!hasAnyProposal) {
    return (
      <div
        className="chairside-hud-empty-proposals p-4 rounded-xl border border-dashed border-[var(--line)] text-center text-xs text-[var(--muted)]"
        data-testid="chairside-empty-proposals"
      >
        <p className="m-0 font-medium text-[var(--ink)]">Нет активных клинических предложений</p>
        <p className="mt-1 mb-0 text-[11px]">Назовите зуб или жалобы в микрофон, либо выберите клинический сценарий выше.</p>
      </div>
    );
  }

  const hasBatchActions = Boolean(
    toothProposal ||
    servicesProposal.length > 0 ||
    soapProposal?.diagnosis ||
    soapProposal?.treatmentPlan
  );

  const soapDiagnosisLabel = soapProposal?.diagnosis
    ? `${soapProposal.diagnosis}${toothProposal?.toothNumber ? ` (зуб ${toothProposal.toothNumber})` : ""}`
    : toothProposal?.toothNumber
      ? `Зуб ${toothProposal.toothNumber}: клинический статус`
      : "Клинический статус";

  return (
    <>
      {/* 1-Click Macro-Batch Apply Header (Mandates 8e, 8ba, 8k) */}
      {hasBatchActions && onApplyAll && (
        <div
          className="chairside-hud-macro-batch chairside-proposals-macro-banner p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal,#0d9488)]/30 flex items-center justify-between gap-2"
          data-testid="chairside-macro-batch-banner"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Check size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--ink)] truncate">Пакетное оформление приёма</span>
          </div>
          <button
            type="button"
            onClick={onApplyAll}
            className="chairside-hud-btn-primary h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all btn-proposals-macro-apply"
            data-testid="chairside-btn-macro-apply-all"
            aria-label="Применить все предложения к схеме"
          >
            <Check size={13} />
            <span>Применить все предложения</span>
          </button>
        </div>
      )}

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

      {/* Services & Billing Proposal Card */}
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
      {(soapProposal?.diagnosis || soapProposal?.complaint || soapProposal?.treatmentPlan) && (
        <div className="chairside-hud-card chairside-card-soap" data-testid="chairside-card-soap">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-[var(--ink)]">Дневник приёма (SOAP)</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--info,#3b82f6)] font-medium">{soapDiagnosisLabel}</span>
              <button type="button" className="btn-edit-soap text-xs text-[var(--muted)] hover:underline">Редактировать</button>
            </div>
          </div>
          <div className="text-xs text-[var(--muted)] space-y-1 mb-2">
            {soapProposal.complaint && <p><strong>Жалобы (S):</strong> {soapProposal.complaint}</p>}
            {soapProposal.objectiveStatus && <p><strong>Объективно (O):</strong> {soapProposal.objectiveStatus}</p>}
            {soapProposal.diagnosis && <p><strong>Диагноз (A):</strong> {soapProposal.diagnosis}</p>}
            {soapProposal.treatmentPlan && <p><strong>План лечения (P):</strong> {soapProposal.treatmentPlan}</p>}
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
      )}

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
      {(consentProposal || toothProposal || servicesProposal.length > 0) && (
        <div className="chairside-hud-card chairside-card-consent" data-testid="chairside-card-consent">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-[var(--ink)]">Информированное согласие (ИДС)</span>
            <span className="text-xs font-mono text-[var(--teal)]">{consentProposal?.consentCode || "IDS-02-THERAPY"}</span>
          </div>
          <p className="text-xs text-[var(--muted)] mb-2">
            {consentProposal?.consentTitle || "ИДС на терапевтическое лечение кариеса и некариозных поражений."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (onPrintInformedConsent) onPrintInformedConsent(consentProposal?.consentCode || "IDS-02-THERAPY");
            }}
            className="chairside-hud-btn-secondary btn-apply-consent w-full"
            data-testid="chairside-btn-apply-consent"
          >
            Печать ИДС
          </button>
        </div>
      )}

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
