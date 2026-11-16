import React, { useState } from "react";
import { AlertCircle, Check, CheckCircle2, Pill, ShieldCheck } from "lucide-react";
import type { CopilotDdiSafetyCardProps } from "./types";

export const CopilotDdiSafetyCard: React.FC<CopilotDdiSafetyCardProps> = ({
  data,
  resolved,
  onReplaceDrug,
  onOverride,
  disabled = false,
}) => {
  const alternatives = data.safeAlternatives && data.safeAlternatives.length > 0
    ? data.safeAlternatives
    : [];

  const [selectedAlt, setSelectedAlt] = useState<string>(
    data.recommendedAlternative || alternatives[0] || ""
  );
  const [replacedStatus, setReplacedStatus] = useState<boolean>(resolved === "confirm");

  const handleReplace = () => {
    setReplacedStatus(true);
    if (selectedAlt) {
      onReplaceDrug?.(selectedAlt);
    }
  };

  const handleOverride = () => {
    setReplacedStatus(true);
    onOverride?.();
  };

  return (
    <div
      className={`copilot-gen-card copilot-ddi-alert-card ${replacedStatus ? "replaced" : "passive-alert"}`}
      data-testid="copilot-ddi-safety-card"
      role="alert"
    >
      <div className="copilot-ddi-header">
        <div className="copilot-ddi-badge text-[var(--warning,#f59e0b)]">
          {replacedStatus ? <ShieldCheck size={20} className="text-[var(--teal,#0d9488)]" /> : <span>⚠️</span>}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="copilot-ddi-title">
              {replacedStatus ? "Назначение подтверждено врачом" : (data.title || "Аллергологический статус / Анамнез")}
            </h4>
            <span className={`copilot-ddi-severity-pill ${replacedStatus ? "safe" : "warning"}`}>
              {replacedStatus ? "Подтверждено" : "К сведению ⚠️"}
            </span>
          </div>
          <p className="copilot-ddi-desc">
            {data.description || "В анамнезе пациента зафиксирована лекарственная чувствительность. Автономия врача абсолютна."}
          </p>
        </div>
      </div>

      {data.patientAllergies && data.patientAllergies.length > 0 && (
        <div className="copilot-ddi-allergies-box">
          <AlertCircle size={14} className="text-[var(--warning,#f59e0b)] flex-shrink-0" />
          <span><strong>Аллергены в анамнезе:</strong> {data.patientAllergies.join(", ")}</span>
        </div>
      )}

      {!replacedStatus && alternatives.length > 0 && (
        <div className="copilot-ddi-alts-box">
          <div className="copilot-ddi-alts-label">
            <ShieldCheck size={13} className="text-[var(--teal)]" />
            <span>Рекомендованные безопасные аналоги:</span>
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
            <CheckCircle2 size={16} className="text-[var(--teal,#0d9488)]" />
            <span>Назначение утверждено врачом</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%", justifyContent: "flex-end" }}>
            {alternatives.length > 0 && (
              <button
                type="button"
                className="copilot-ddi-replace-btn"
                onClick={handleReplace}
                style={{ minWidth: "160px" }}
                title="Заменить на аналог"
              >
                <ShieldCheck size={16} />
                <span>Заменить на безопасный препарат ({selectedAlt})</span>
              </button>
            )}
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-[var(--teal,#0d9488)] text-white hover:bg-[var(--teal-dark,#0f766e)] font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[36px]"
              onClick={handleOverride}
              title="Утвердить назначение врача (Мандат 8e)"
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
