import React, { useState } from "react";
import { AlertCircle, Check, CheckCircle2, Pill, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CopilotDdiSafetyCardProps } from "./types";

export const CopilotDdiSafetyCard: React.FC<CopilotDdiSafetyCardProps> = ({
  data,
  resolved,
  onReplaceDrug,
  onOverride,
  disabled = false,
}) => {
  const alternatives = (data.safeAlternatives && data.safeAlternatives.length > 0)
    ? data.safeAlternatives
    : ["Кларитромицин 500 мг", "Азитромицин 500 мг", "Спирамицин 3 млн МЕ"];

  const [selectedAlt, setSelectedAlt] = useState<string>(
    data.recommendedAlternative || alternatives[0] || "Кларитромицин 500 мг"
  );
  const [replacedStatus, setReplacedStatus] = useState<boolean>(resolved === "confirm");

  const handleReplace = () => {
    setReplacedStatus(true);
    onReplaceDrug?.(selectedAlt);
  };

  const handleOverride = () => {
    setReplacedStatus(true);
    onOverride?.();
  };

  return (
    <div
      className={`copilot-gen-card copilot-ddi-alert-card ${replacedStatus ? "replaced" : "critical"}`}
      data-testid="copilot-ddi-safety-card"
      role="alert"
    >
      <div className="copilot-ddi-header">
        <div className="copilot-ddi-badge">
          {replacedStatus ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="copilot-ddi-title">
              {replacedStatus ? "Лекарственная безопасность подтверждена" : (data.title || "Критическое предупреждение: Конфликт препаратов")}
            </h4>
            <span className={`copilot-ddi-severity-pill ${replacedStatus ? "safe" : "danger"}`}>
              {replacedStatus ? "Безопасно" : "Внимание (анамнез)"}
            </span>
          </div>
          <p className="copilot-ddi-desc">
            {data.description || "В карте зафиксирована чувствительность к препарату в анамнезе. Проверьте или утвердите."}
          </p>
        </div>
      </div>

      {data.patientAllergies && data.patientAllergies.length > 0 && (
        <div className="copilot-ddi-allergies-box">
          <AlertCircle size={14} className="text-[var(--rust)] flex-shrink-0" />
          <span><strong>Аллергены в карте:</strong> {data.patientAllergies.join(", ")}</span>
        </div>
      )}

      {!replacedStatus && (
        <div className="copilot-ddi-alts-box">
          <div className="copilot-ddi-alts-label">
            <ShieldCheck size={13} className="text-[var(--teal)]" />
            <span>Рекомендованные безопасные аналоги (СтАР):</span>
          </div>
          <div className="copilot-ddi-alts-list">
            {alternatives.map((alt) => (
              <button
                key={alt}
                type="button"
                onClick={() => setSelectedAlt(alt)}
                className={`copilot-ddi-alt-btn ${alt === selectedAlt ? "selected" : ""}`}
              >
                <Pill size={13} />
                <span>{alt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="copilot-ddi-actions">
        {replacedStatus ? (
          <div className="copilot-ddi-success-box">
            <CheckCircle2 size={16} className="text-[var(--green)]" />
            <span>Препарат утвержден: <strong>{selectedAlt}</strong></span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
            <button
              type="button"
              className="copilot-ddi-replace-btn"
              onClick={handleReplace}
              style={{ flex: 1, minWidth: "180px" }}
              title="Заменить на клинически безопасный аналог"
            >
              <ShieldCheck size={16} />
              <span>Заменить на безопасный препарат ({selectedAlt})</span>
            </button>
            <button
              type="button"
              className="copilot-btn-secondary"
              onClick={handleOverride}
              title="Утвердить назначение врача без замены (1 клик)"
              style={{ minHeight: "36px", padding: "0 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Check size={16} />
              <span>Утвердить</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
