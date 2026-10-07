/**
 * ChairsideProposalCards.tsx — HITL Action Proposal Cards for ChairsideCopilotHUD.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent strictly <= 500 lines.
 * - Mandate 8e: Doctor Autonomy (editable before apply, reversible undo, zero blocking gates).
 * - TABOO OF THE CREATOR: STRICTLY PRESERVE ANESTHETIC DOSAGE LOGIC AND PEDIATRICS!
 * - Zero cartoon emojis, strictly Lucide vector icons.
 */

import React from "react";
import {
  ShieldAlert,
  Activity,
  Receipt,
  FileText,
  Syringe,
  Printer,
  Check,
  RotateCcw,
  Edit3,
} from "lucide-react";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideConsentProposal,
  ChairsideSafetyAlert,
} from "./chairsideTypes";

export interface ChairsideProposalCardsProps {
  readonly toothProposal: ChairsideToothProposal;
  readonly onApplyTooth: () => void;
  readonly onUndoTooth: () => void;

  readonly servicesProposal: ChairsideServiceProposal[];
  readonly servicesTotalPrice: number;
  readonly onApplyServices: () => void;
  readonly onUndoServices: () => void;

  readonly soapProposal: ChairsideSoapProposal;
  readonly isEditingSoap: boolean;
  readonly onToggleEditSoap: () => void;
  readonly onSoapChange: (updater: (prev: ChairsideSoapProposal) => ChairsideSoapProposal) => void;
  readonly onApplySoap: () => void;
  readonly onUndoSoap: () => void;

  readonly anestheticProposal: ChairsideAnestheticProposal | null;
  readonly isEditingAnesthetic: boolean;
  readonly onToggleEditAnesthetic: () => void;
  readonly onAnestheticChange: (updater: (prev: ChairsideAnestheticProposal | null) => ChairsideAnestheticProposal | null) => void;
  readonly onApplyCarpule: () => void;
  readonly onUndoCarpule: () => void;

  readonly consentProposal: ChairsideConsentProposal | null;
  readonly onApplyConsent: () => void;
  readonly onUndoConsent: () => void;

  readonly safetyAlert: ChairsideSafetyAlert;
  readonly onAcknowledgeAlert: () => void;
}

export const ChairsideProposalCards: React.FC<ChairsideProposalCardsProps> = ({
  toothProposal,
  onApplyTooth,
  onUndoTooth,
  servicesProposal,
  servicesTotalPrice,
  onApplyServices,
  onUndoServices,
  soapProposal,
  isEditingSoap,
  onToggleEditSoap,
  onSoapChange,
  onApplySoap,
  onUndoSoap,
  anestheticProposal,
  isEditingAnesthetic,
  onToggleEditAnesthetic,
  onAnestheticChange,
  onApplyCarpule,
  onUndoCarpule,
  consentProposal,
  onApplyConsent,
  onUndoConsent,
  safetyAlert,
  onAcknowledgeAlert,
}) => {
  return (
    <section className="chairside-hud-proposals" data-testid="chairside-proposals-section">
      <div className="chairside-hud-section-header">
        <span className="chairside-hud-section-title">Предложенные действия (HITL)</span>
        <span className="text-[11px] text-[var(--muted)] font-medium">Контроль врача</span>
      </div>

      {/* 1. Safety Alert Card */}
      {safetyAlert && (
        <div
          className={`chairside-hud-card ${safetyAlert.severity === "critical" ? "chairside-hud-card--alert-critical" : "chairside-hud-card--alert-warning"}`}
          data-testid="chairside-card-safety-alert"
        >
          <div className="chairside-hud-card-head">
            <div className="chairside-hud-card-title">
              <ShieldAlert size={14} className="text-[var(--warn-fg)] shrink-0" />
              <span>{safetyAlert.title}</span>
            </div>
            {safetyAlert.acknowledged && (
              <span className="chairside-hud-card-badge chairside-hud-card-badge--applied">
                Принято
              </span>
            )}
          </div>
          <div className="chairside-hud-card-body chairside-hud-alert-text">
            {safetyAlert.description}
          </div>
          {!safetyAlert.acknowledged && (
            <div className="chairside-hud-card-actions">
              <button
                type="button"
                className="chairside-hud-btn-primary"
                onClick={onAcknowledgeAlert}
                data-testid="btn-acknowledge-safety-alert"
              >
                <Check size={13} />
                <span>Принять к сведению</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Odontogram Tooth State Card */}
      <div className="chairside-hud-card" data-testid="chairside-card-odontogram">
        <div className="chairside-hud-card-head">
          <div className="chairside-hud-card-title">
            <Activity size={14} className="text-[var(--teal)] shrink-0" />
            <span>{`Одонтограмма: Зуб ${toothProposal.toothNumber}`}</span>
          </div>
          <span className={`chairside-hud-card-badge ${toothProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
            {toothProposal.applied ? "Применено" : toothProposal.stateLabel}
          </span>
        </div>
        <div className="chairside-hud-card-body">
          <div>
            Статус: <strong>{toothProposal.stateLabel}</strong>
          </div>
          {toothProposal.surfaces.length > 0 && (
            <div className="text-[var(--muted)] text-[11px] mt-0.5">
              Поверхности: {toothProposal.surfaces.join(", ")} (окклюзионная)
            </div>
          )}
        </div>
        <div className="chairside-hud-card-actions">
          {toothProposal.applied ? (
            <button
              type="button"
              className="chairside-hud-btn-undo"
              onClick={onUndoTooth}
              data-testid="btn-undo-tooth"
              title="Откатить статус зуба"
            >
              <RotateCcw size={13} />
              <span>Откатить</span>
            </button>
          ) : (
            <button
              type="button"
              className="chairside-hud-btn-primary"
              onClick={onApplyTooth}
              data-testid="btn-apply-tooth"
            >
              <Check size={13} />
              <span>Применить к зубу</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. 804n Services & Estimate Card */}
      <div className="chairside-hud-card" data-testid="chairside-card-services">
        <div className="chairside-hud-card-head">
          <div className="chairside-hud-card-title">
            <Receipt size={14} className="text-[var(--teal)] shrink-0" />
            <span>Смета услуг</span>
          </div>
          <span className={`chairside-hud-card-badge ${servicesProposal.every((s) => s.applied) ? "chairside-hud-card-badge--applied" : ""}`}>
            {servicesProposal.every((s) => s.applied) ? "Добавлено" : `${servicesTotalPrice.toLocaleString("ru-RU")} ₽`}
          </span>
        </div>
        <div className="chairside-hud-card-body">
          <div className="chairside-hud-service-list">
            {servicesProposal.map((srv) => (
              <div key={srv.id} className="chairside-hud-service-item">
                <div className="min-w-0 flex-1">
                  <span className="chairside-hud-service-code">[{srv.code804n}]</span>{" "}
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
          {servicesProposal.every((s) => s.applied) ? (
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

      {/* 4. Form 043/u SOAP Diary Card (Mandate 8e: Editable before apply + Undo) */}
      <div className="chairside-hud-card" data-testid="chairside-card-soap">
        <div className="chairside-hud-card-head">
          <div className="chairside-hud-card-title">
            <FileText size={14} className="text-[var(--teal)] shrink-0" />
            <span>Дневник приёма</span>
          </div>
          <span className={`chairside-hud-card-badge ${soapProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
            {soapProposal.applied ? "Вставлено" : "Черновик"}
          </span>
        </div>
        <div className="chairside-hud-card-body">
          {isEditingSoap ? (
            <div className="chairside-hud-soap-grid" data-testid="chairside-soap-edit-mode">
              <div className="chairside-hud-soap-field">
                <label className="chairside-hud-soap-label">Жалобы (S):</label>
                <textarea
                  className="chairside-hud-soap-edit-textarea"
                  value={soapProposal.complaint}
                  onChange={(e) => onSoapChange((prev) => ({ ...prev, complaint: e.target.value }))}
                  data-testid="input-edit-soap-complaint"
                />
              </div>
              <div className="chairside-hud-soap-field">
                <label className="chairside-hud-soap-label">Объективно (O):</label>
                <textarea
                  className="chairside-hud-soap-edit-textarea"
                  value={soapProposal.objectiveStatus}
                  onChange={(e) => onSoapChange((prev) => ({ ...prev, objectiveStatus: e.target.value }))}
                  data-testid="input-edit-soap-objective"
                />
              </div>
              <div className="chairside-hud-soap-field">
                <label className="chairside-hud-soap-label">Диагноз (A):</label>
                <input
                  type="text"
                  className="chairside-hud-soap-edit-input"
                  value={soapProposal.diagnosis}
                  onChange={(e) => onSoapChange((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  data-testid="input-edit-soap-diagnosis"
                />
              </div>
              <div className="chairside-hud-soap-field">
                <label className="chairside-hud-soap-label">План лечения (P):</label>
                <textarea
                  className="chairside-hud-soap-edit-textarea"
                  value={soapProposal.treatmentPlan}
                  onChange={(e) => onSoapChange((prev) => ({ ...prev, treatmentPlan: e.target.value }))}
                  data-testid="input-edit-soap-plan"
                />
              </div>
            </div>
          ) : (
            <div className="chairside-hud-soap-grid">
              <div className="chairside-hud-soap-field">
                <span className="chairside-hud-soap-label">Жалобы (S):</span>
                <span className="chairside-hud-soap-val">{soapProposal.complaint}</span>
              </div>
              <div className="chairside-hud-soap-field">
                <span className="chairside-hud-soap-label">Объективно (O):</span>
                <span className="chairside-hud-soap-val">{soapProposal.objectiveStatus}</span>
              </div>
              <div className="chairside-hud-soap-field">
                <span className="chairside-hud-soap-label">Диагноз (A):</span>
                <span className="chairside-hud-soap-val font-semibold">{soapProposal.diagnosis}</span>
              </div>
              <div className="chairside-hud-soap-field">
                <span className="chairside-hud-soap-label">План лечения (P):</span>
                <span className="chairside-hud-soap-val">{soapProposal.treatmentPlan}</span>
              </div>
            </div>
          )}
        </div>
        <div className="chairside-hud-card-actions">
          <button
            type="button"
            className="chairside-hud-btn-secondary"
            onClick={onToggleEditSoap}
            data-testid="btn-edit-soap"
            title="Редактировать текст перед применением"
          >
            <Edit3 size={12} />
            <span>{isEditingSoap ? "Завершить правку" : "Править"}</span>
          </button>
          {soapProposal.applied ? (
            <button
              type="button"
              className="chairside-hud-btn-undo"
              onClick={onUndoSoap}
              data-testid="btn-undo-soap"
              title="Откатить вставку дневника"
            >
              <RotateCcw size={13} />
              <span>Откатить</span>
            </button>
          ) : (
            <button
              type="button"
              className="chairside-hud-btn-primary"
              onClick={onApplySoap}
              data-testid="btn-apply-soap"
            >
              <Check size={13} />
              <span>Применить в визит</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Anesthetic Clinical Protocol Card (TABOO: Do NOT alter dosage calculation logic!) */}
      {anestheticProposal && (
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
      )}

      {/* 6. Statutory Informed Consent (IDS) Card */}
      {consentProposal && (
        <div className="chairside-hud-card" data-testid="chairside-card-consent">
          <div className="chairside-hud-card-head">
            <div className="chairside-hud-card-title">
              <Printer size={14} className="text-[var(--teal)] shrink-0" />
              <span>Информированное согласие (ИДС)</span>
            </div>
            <span className={`chairside-hud-card-badge ${consentProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
              {consentProposal.applied ? "Направлено" : consentProposal.consentCode}
            </span>
          </div>
          <div className="chairside-hud-card-body">
            <div className="font-medium text-[13px] text-[var(--ink)]">
              {consentProposal.consentTitle}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1 flex flex-col gap-0.5">
              <div>Основание: {consentProposal.regulatoryBasis}</div>
              <div>Вмешательство: {consentProposal.procedureType} ({consentProposal.toothOrArea})</div>
            </div>
          </div>
          <div className="chairside-hud-card-actions">
            {consentProposal.applied ? (
              <button
                type="button"
                className="chairside-hud-btn-undo"
                onClick={onUndoConsent}
                data-testid="btn-undo-consent"
                title="Откатить отправку на печать"
              >
                <RotateCcw size={13} />
                <span>Откатить</span>
              </button>
            ) : (
              <button
                type="button"
                className="chairside-hud-btn-primary"
                onClick={onApplyConsent}
                data-testid="btn-apply-consent"
              >
                <Printer size={13} />
                <span>Печать ИДС</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
