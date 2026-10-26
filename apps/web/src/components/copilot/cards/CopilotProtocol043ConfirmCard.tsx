import React, { useState } from "react";
import { Edit3, FileText } from "lucide-react";
import type { Protocol043Data } from "../copilotTypes";
import type { CopilotProtocol043ConfirmCardProps } from "./types";
import { useVisitStore } from "../../../store/visitStore";
import { CopilotProtocol043Fields } from "./CopilotProtocol043Fields";
import { CopilotProtocol043Actions } from "./CopilotProtocol043Actions";

export const CopilotProtocol043ConfirmCard: React.FC<CopilotProtocol043ConfirmCardProps> = ({
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
      // store sync resilience
    }
    onConfirm?.(formData);
  };

  return (
    <div
      className={`copilot-gen-card copilot-043-confirm-card ${savedStatus ? "saved" : ""}`}
      data-testid="copilot-protocol-043-card"
      role="region"
      aria-label="Карточка дневника приёма"
    >
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

      <CopilotProtocol043Fields isEditing={isEditing} formData={formData} onChangeField={handleFieldChange} />

      <CopilotProtocol043Actions
        savedStatus={savedStatus}
        onSave={handleSave}
        onReject={onReject}
        disabled={disabled}
      />
    </div>
  );
};
