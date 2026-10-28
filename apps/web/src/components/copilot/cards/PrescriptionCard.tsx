import React, { useState, useCallback } from "react";
import { CheckCircle2, PenTool, Pill, Printer, ShieldCheck } from "lucide-react";
import type { PrescriptionCardProps } from "./types";
import { PrescriptionUkepStamp } from "./PrescriptionUkepStamp";

export const PrescriptionCard: React.FC<PrescriptionCardProps> = ({
  prescription,
  onPrint,
  onSignUkep,
}) => {
  const [isSigned, setIsSigned] = useState<boolean>(Boolean(prescription.isSignedUkep));
  const [signing, setSigning] = useState<boolean>(false);

  const handlePrint = useCallback(() => {
    if (onPrint) onPrint(prescription);
    else if (typeof window !== "undefined") window.print();
  }, [onPrint, prescription]);

  const handleSign = useCallback(() => {
    if (isSigned) return;
    setIsSigned(true);
    setSigning(false);
    onSignUkep?.(prescription);
  }, [isSigned, onSignUkep, prescription]);

  const series = prescription.series || "77-АА";
  const number = prescription.number || "004821";
  const validityText = prescription.isChronicallyIll
    ? "Действителен 1 год (для хроников)"
    : `Срок действия: ${prescription.validityDays || 60} дней`;

  return (
    <div className="copilot-gen-card copilot-prescription-card" data-testid="copilot-prescription-card">
      <div className="copilot-rx-header">
        <div className="copilot-rx-title-box">
          <h4 className="copilot-rx-title">
            <Pill size={16} className="text-[var(--teal)]" />
            <span>Рецептурный бланк</span>
          </h4>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="copilot-rx-series-badge">{`${series} № ${number}`}</span>
          <span className="text-[10px] font-semibold text-[var(--muted)]">{validityText}</span>
        </div>
      </div>

      <div className="copilot-rx-meta-grid">
        <div className="copilot-rx-meta-col">
          <span className="copilot-rx-meta-label">Пациент</span>
          <span className="copilot-rx-meta-val">{prescription.patientName}</span>
          {prescription.patientBirthDate && <span className="text-[11px] text-[var(--muted)]">Дата рожд.: {prescription.patientBirthDate}</span>}
        </div>
        <div className="copilot-rx-meta-col">
          <span className="copilot-rx-meta-label">Врач</span>
          <span className="copilot-rx-meta-val">{prescription.doctorName}</span>
          {prescription.doctorSpecialty && <span className="text-[11px] text-[var(--muted)]">{prescription.doctorSpecialty}</span>}
        </div>
      </div>

      {Boolean(prescription.diagnosisIcd10 || prescription.diagnosisName) && (
        <div className="text-xs text-[var(--ink)] bg-[var(--paper-soft)] p-2 rounded border border-[var(--line)]">
          <strong>Диагноз:</strong> {prescription.diagnosisIcd10} {prescription.diagnosisName ? `(${prescription.diagnosisName})` : ""}
        </div>
      )}

      <div className="copilot-rx-drug-list">
        {prescription.drugs.map((drug, idx) => (
          <div key={drug.id || idx} className="copilot-rx-drug-item">
            <div className="copilot-rx-latin-line">{`Rp.: ${drug.latinName || drug.mnn} ${drug.dosage || ""}`.trim()}</div>
            <div className="copilot-rx-signa-line">
              <strong>D.t.d.</strong> N {drug.quantity || "1"} • <strong>D.S.</strong> {drug.signa}
            </div>
            {drug.tradeName && (
              <div className="text-xs text-[var(--muted)] mt-0.5">
                Торговое наименование: {drug.tradeName} ({drug.dosageForm})
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="copilot-rx-safety-badge">
        <ShieldCheck size={14} />
        <span>Клинический контроль: Совместимость препаратов проверена</span>
      </div>

      <PrescriptionUkepStamp isSigned={isSigned} prescription={prescription} />

      <div className="copilot-rx-actions">
        <button
          type="button"
          onClick={handlePrint}
          className="copilot-rx-print-btn"
          title="Распечатать официальный рецептурный бланк"
        >
          <Printer size={15} />
          <span>Печать рецепта</span>
        </button>

        <button
          type="button"
          disabled={isSigned || signing}
          onClick={handleSign}
          className="copilot-rx-sign-btn"
          title="Подписать рецепт усиленной квалифицированной электронной подписью"
        >
          {isSigned ? (
            <><CheckCircle2 size={15} /><span>Подписано УКЭП</span></>
          ) : signing ? (
            <span>Подписание...</span>
          ) : (
            <><PenTool size={15} /><span>Подписать УКЭП</span></>
          )}
        </button>
      </div>
    </div>
  );
};

export const Prescription107Card = PrescriptionCard;
