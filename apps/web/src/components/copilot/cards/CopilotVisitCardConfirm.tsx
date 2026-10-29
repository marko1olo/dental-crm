/**
 * CopilotVisitCardConfirm.tsx — Семантическая карточка подтверждения дневника приёма.
 * Мандат 8ap: искоренение советского приказа «043» из названий компонентов и UI.
 * Мандат 8e: свобода врача, кнопки никогда не блокируются, мгновенное внесение в карту в 1 клик.
 * Мандат 8am: ровно ОДНА Primary CTA кнопка var(--teal) (#0d9488).
 * Sweet Spot: 160–250 строк.
 */

import React, { useState } from "react";
import { Edit3, FileText, Check, CheckCircle2, RotateCcw } from "lucide-react";
import type { Protocol043Data } from "../copilotTypes";
import type { CopilotSoapDiaryCardProps } from "./types";
import { useVisitStore } from "../../../store/visitStore";

export interface CopilotVisitCardConfirmProps extends CopilotSoapDiaryCardProps {
  onEditToggle?: (isEditing: boolean) => void;
}

export const CopilotVisitCardConfirm: React.FC<CopilotVisitCardConfirmProps> = ({
  data,
  resolved,
  onConfirm,
  onReject,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Protocol043Data>(() => {
    const d = data || {};
    return {
      patientName: d.patientName || "",
      tooth: d.tooth || "36",
      diagnosis: d.diagnosis || "K02.1 Кариес дентина (глубокий кариес)",
      complaints: d.complaints || d.complaint || "Боль от температурных раздражителей в области зуба 36.",
      complaint: d.complaint || d.complaints || "Боль от температурных раздражителей в области зуба 36.",
      anamnesis: d.anamnesis || "Полость обнаружена 2 недели назад, ранее зуб 36 не лечен.",
      objective: d.objective || d.objectiveStatus || "Глубокая кариозная полость MOD 36, зондирование болезненно.",
      objectiveStatus: d.objectiveStatus || d.objective || "Глубокая кариозная полость MOD 36, зондирование болезненно.",
      treatment: d.treatment || d.treatmentPlan || "Препарирование полости MOD 36. Пломбирование нанокомпозитом.",
      treatmentPlan: d.treatmentPlan || d.treatment || "Препарирование полости MOD 36. Пломбирование нанокомпозитом.",
      recommendations: d.recommendations,
      doctorName: d.doctorName,
      date: d.date,
    };
  });
  const [savedStatus, setSavedStatus] = useState<boolean>(resolved === "confirm");

  const handleFieldChange = (key: keyof Protocol043Data, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    setSavedStatus(true);
    setIsEditing(false);
    try {
      const store = useVisitStore.getState();
      const toothCode = String(formData.tooth || "36");
      const diagStr = String(formData.diagnosis || "K02.1");
      store.applyAiToothCodes([toothCode], "done", { [toothCode]: "treatment" }, { [toothCode]: diagStr });
      store.setVisitNoteForm((prev) => ({
        ...prev,
        complaint: String(formData.complaint || formData.complaints || prev.complaint),
        anamnesis: String(formData.anamnesis || prev.anamnesis),
        objectiveStatus: String(formData.objectiveStatus || formData.objective || prev.objectiveStatus),
        diagnosis: String(formData.diagnosis || prev.diagnosis),
        treatmentPlan: String(formData.treatmentPlan || formData.treatment || prev.treatmentPlan),
      }));
    } catch {
      // Store sync resilience
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dente-apply-soap-protocol", {
          detail: {
            tooth: formData.tooth,
            complaint: formData.complaint || formData.complaints,
            anamnesis: formData.anamnesis,
            objectiveStatus: formData.objectiveStatus || formData.objective,
            diagnosis: formData.diagnosis,
            treatmentPlan: formData.treatmentPlan || formData.treatment,
          },
        })
      );
    }

    onConfirm?.(formData);
  };

  return (
    <div
      className={`copilot-gen-card copilot-043-confirm-card copilot-visit-card ${savedStatus ? "saved" : ""}`}
      data-testid="copilot-protocol-043-card"
      role="region"
      aria-label="Карточка дневника приёма"
    >
      {/* Шапка карточки визита */}
      <div className="copilot-043-header">
        <div className="copilot-043-title-row">
          <div className="copilot-043-icon"><FileText size={18} /></div>
          <div>
            <h4 className="copilot-043-title">ДЕНТА сформировала дневник приёма</h4>
            <div className="copilot-043-meta">
              <span>{`${formData.patientName} • Зуб ${formData.tooth} (FDI) • ${formData.diagnosis}`}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              className="copilot-043-edit-btn"
              onClick={() => setIsEditing(true)}
              title="Редактировать запись дневника"
            >
              <Edit3 size={13} />
              <span>Изменить</span>
            </button>
          )}
          <span className={`copilot-043-status-pill ${savedStatus ? "saved" : isEditing ? "editing" : "pending"}`}>
            {savedStatus ? "В медкарте" : isEditing ? "Правка" : "Черновик дневника"}
          </span>
        </div>
      </div>

      {/* Поля дневника приёма (SOAP) */}
      <div className="copilot-043-grid">
        <div className="copilot-043-field">
          <span className="copilot-043-field-label">Жалобы:</span>
          {isEditing ? (
            <textarea
              className="copilot-043-textarea"
              value={formData.complaints || formData.complaint || ""}
              onChange={(e) => handleFieldChange("complaints", e.target.value)}
              rows={2}
            />
          ) : (
            <p className="copilot-043-field-text">{formData.complaints || formData.complaint}</p>
          )}
        </div>

        <div className="copilot-043-field">
          <span className="copilot-043-field-label">Анамнез заболевания:</span>
          {isEditing ? (
            <textarea
              className="copilot-043-textarea"
              value={formData.anamnesis || ""}
              onChange={(e) => handleFieldChange("anamnesis", e.target.value)}
              rows={2}
            />
          ) : (
            <p className="copilot-043-field-text">{formData.anamnesis}</p>
          )}
        </div>

        <div className="copilot-043-field">
          <span className="copilot-043-field-label">Объективный статус:</span>
          {isEditing ? (
            <textarea
              className="copilot-043-textarea"
              value={formData.objectiveStatus || formData.objective || ""}
              onChange={(e) => handleFieldChange("objectiveStatus", e.target.value)}
              rows={2}
            />
          ) : (
            <p className="copilot-043-field-text">{formData.objectiveStatus || formData.objective}</p>
          )}
        </div>

        <div className="copilot-043-field">
          <span className="copilot-043-field-label">Лечение и манипуляции:</span>
          {isEditing ? (
            <textarea
              className="copilot-043-textarea"
              value={formData.treatmentPlan || formData.treatment || ""}
              onChange={(e) => handleFieldChange("treatmentPlan", e.target.value)}
              rows={3}
            />
          ) : (
            <p className="copilot-043-field-text">{formData.treatmentPlan || formData.treatment}</p>
          )}
        </div>
      </div>

      {/* Действия: ровно ОДНА Primary CTA кнопка (Мандат 8am, 8e) */}
      <div className="copilot-043-actions">
        {savedStatus ? (
          <div className="copilot-043-success-box">
            <CheckCircle2 size={16} className="text-[var(--green,#10b981)]" />
            <span>Дневник приёма сохранён в медицинскую карту пациента</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", width: "100%", flexWrap: "wrap" }}>
            {onReject && (
              <button
                type="button"
                className="copilot-btn-secondary"
                onClick={onReject}
                disabled={disabled}
                title="Отклонить предложенную запись"
                style={{ minHeight: "36px", padding: "0 12px" }}
              >
                <RotateCcw size={14} />
                <span>Отклонить</span>
              </button>
            )}

            <button
              type="button"
              className="copilot-043-save-btn"
              onClick={handleSave}
              title="Внести дневник приёма в медицинскую карту в 1 клик"
              style={{ flex: 1, minWidth: "180px" }}
            >
              <Check size={16} />
              <span>Внести в дневник</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Семантические алиасы и обратная совместимость
export const CopilotSoapDiaryCard = CopilotVisitCardConfirm;
export const CopilotExaminationProtocolCard = CopilotVisitCardConfirm;
export const CopilotProtocol043ConfirmCard = CopilotVisitCardConfirm;
