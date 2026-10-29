/**
 * CopilotConfirmParamsView.tsx — Клиническое отображение параметров подтверждения операции.
 * Мандат 8x: Человеческий клинический язык без технарского мусора и без JSON!
 * Мандат 8e: Автономия врача, понятные параметры расчета в 1 взгляд.
 * Мандат 8b: размер <= 150 строк.
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface CopilotConfirmParamsViewProps {
  name?: string | undefined;
  args: Record<string, unknown>;
  nameCache?: Record<string, string> | undefined;
}

const PARAM_LABELS_RU: Record<string, string> = {
  toothNumber: "Зуб",
  tooth_number: "Зуб",
  tooth: "Зуб",
  teeth: "Зубы (FDI)",
  diagnosis: "Диагноз",
  icd10: "Код МКБ-10",
  patient: "Пациент",
  patient_name: "ФИО пациента",
  patient_id: "Пациент",
  doctor: "Лечащий врач",
  doctor_name: "Лечащий врач",
  doctor_id: "Врач",
  date: "Дата приёма",
  time: "Время",
  start_time: "Время начала",
  end_time: "Время окончания",
  duration_minutes: "Длительность",
  serviceCode: "Код услуги",
  treatmentProcedures: "План процедур",
  cabinet: "Кабинет",
  medication: "Препарат",
  drug_name: "Препарат",
  dosage: "Дозировка",
  quantity: "Количество",
  safe_alternative: "Безопасный аналог",
  discount_percent: "Размер скидки",
  reason: "Причина",
  notes: "Примечание",
  comment: "Комментарий",
};

export function CopilotConfirmParamsView({
  args,
  nameCache = {},
}: CopilotConfirmParamsViewProps): React.ReactElement {
  // Extract key clinical fields
  const rawTooth = args.toothNumber ?? args.tooth ?? args.teeth;
  const toothFormatted = rawTooth != null ? (Array.isArray(rawTooth) ? rawTooth.join(", ") : String(rawTooth)) : null;
  const diagnosis = typeof args.diagnosis === "string" ? args.diagnosis : typeof args.icd10 === "string" ? args.icd10 : null;
  const services = Array.isArray(args.services)
    ? args.services
    : Array.isArray(args.treatmentProcedures)
      ? args.treatmentProcedures
      : Array.isArray(args.procedures)
        ? args.procedures
        : Array.isArray((args as any).procedures804n)
          ? (args as any).procedures804n
          : null;

  // Extract total financial amount
  let totalAmountFormatted: string | null = null;
  if (typeof args.totalRub === "number") {
    totalAmountFormatted = `${args.totalRub.toLocaleString("ru-RU")} ₽`;
  } else if (typeof args.amount_rub === "number") {
    totalAmountFormatted = `${args.amount_rub.toLocaleString("ru-RU")} ₽`;
  } else if (typeof args.totalKopecks === "number") {
    totalAmountFormatted = `${Math.round(args.totalKopecks / 100).toLocaleString("ru-RU")} ₽`;
  } else if (typeof args.price === "number") {
    totalAmountFormatted = `${args.price.toLocaleString("ru-RU")} ₽`;
  } else if (typeof args.cost === "number") {
    totalAmountFormatted = `${args.cost.toLocaleString("ru-RU")} ₽`;
  } else if (typeof args.amount === "number") {
    totalAmountFormatted = `${args.amount.toLocaleString("ru-RU")} ₽`;
  }

  // Filter out already displayed or internal technical fields
  const hiddenKeys = new Set([
    "toothNumber", "tooth_number", "tooth", "teeth",
    "diagnosis", "icd10",
    "services", "procedures", "treatmentProcedures", "procedures804n",
    "totalRub", "totalKopecks", "amount_rub", "price", "cost", "amount",
    "callId", "toolCallId", "id", "_raw", "tierKey", "tier_key"
  ]);

  const remainingEntries = Object.entries(args).filter(([k]) => !hiddenKeys.has(k));

  return (
    <div className="copilot-confirm-params" data-testid="copilot-confirm-params">
      {/* 1. Tooth & Diagnosis Highlight */}
      {(Boolean(toothFormatted) || Boolean(diagnosis)) && (
        <div className="copilot-confirm-highlight-block">
          {toothFormatted ? (
            <div className="copilot-confirm-row">
              <span className="copilot-confirm-label">Зуб (FDI):</span>
              <span className="copilot-confirm-val font-bold text-[var(--teal)]">
                Зуб {toothFormatted}
              </span>
            </div>
          ) : null}
          {diagnosis ? (
            <div className="copilot-confirm-row">
              <span className="copilot-confirm-label">Диагноз:</span>
              <span className="copilot-confirm-val font-semibold">{diagnosis}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* 2. Structured Services List */}
      {services && services.length > 0 && (
        <div className="copilot-confirm-services-block">
          <div className="copilot-confirm-services-title">
            Состав плана лечения ({services.length}):
          </div>
          <ul className="copilot-confirm-services-list">
            {services.map((item, idx) => {
              const text = typeof item === "string" ? item : (item as any)?.name || (item as any)?.code || "Услуга";
              return (
                <li key={idx} className="copilot-confirm-service-item">
                  <CheckCircle2 size={13} className="text-[var(--teal)] shrink-0 mt-0.5" />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 3. Secondary Parameters */}
      {remainingEntries.map(([key, value]) => {
        if (value === null || value === undefined) return null;
        const label = PARAM_LABELS_RU[key] || key.replace(/_/g, " ");
        let displayVal = String(value);

        if (key === "patient" || key === "patient_id") {
          const pid = String(value);
          displayVal = nameCache[pid] || pid;
        } else if (key === "discount_percent") {
          displayVal = `${value}%`;
        } else if (key === "duration_minutes") {
          displayVal = `${value} мин.`;
        } else if (typeof value === "boolean") {
          displayVal = value ? "Да" : "Нет";
        } else if (Array.isArray(value)) {
          displayVal = value.join(", ");
        } else if (typeof value === "object") {
          displayVal = Object.entries(value)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
        }

        return (
          <div key={key} className="copilot-confirm-row">
            <span className="copilot-confirm-label">{label}:</span>
            <span className="copilot-confirm-val">{displayVal}</span>
          </div>
        );
      })}

      {/* 4. Total Amount Highlight */}
      {totalAmountFormatted && (
        <div className="copilot-confirm-total-row">
          <span className="copilot-confirm-total-label">Итоговая стоимость:</span>
          <span className="copilot-confirm-total-val">{totalAmountFormatted}</span>
        </div>
      )}
    </div>
  );
}
