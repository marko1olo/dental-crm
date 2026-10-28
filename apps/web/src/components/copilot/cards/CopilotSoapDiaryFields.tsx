import React from "react";
import type { Protocol043Data } from "../copilotTypes";

export interface CopilotSoapDiaryFieldsProps {
  isEditing: boolean;
  formData: Protocol043Data;
  onChangeField: (key: keyof Protocol043Data, val: string) => void;
}
export type CopilotProtocol043FieldsProps = CopilotSoapDiaryFieldsProps;

export const CopilotSoapDiaryFields: React.FC<CopilotSoapDiaryFieldsProps> = ({
  isEditing,
  formData,
  onChangeField,
}) => {
  return (
    <div className="copilot-043-grid">
      <div className="copilot-043-field">
        <span className="copilot-043-field-label">Жалобы:</span>
        {isEditing ? (
          <textarea
            className="copilot-043-textarea"
            value={formData.complaints || formData.complaint || ""}
            onChange={(e) => onChangeField("complaints", e.target.value)}
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
            onChange={(e) => onChangeField("anamnesis", e.target.value)}
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
            onChange={(e) => onChangeField("objectiveStatus", e.target.value)}
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
            onChange={(e) => onChangeField("treatmentPlan", e.target.value)}
            rows={3}
          />
        ) : (
          <p className="copilot-043-field-text">{formData.treatmentPlan || formData.treatment}</p>
        )}
      </div>
    </div>
  );
};

export const CopilotProtocol043Fields = CopilotSoapDiaryFields;
