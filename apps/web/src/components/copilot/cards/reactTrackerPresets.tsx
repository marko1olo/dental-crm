import React from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { ReactStepItem } from "../copilotTypes";

export const DEFAULT_DENTE_REACT_STEPS: ReactStepItem[] = [
  {
    id: "step_patient_anamnesis",
    stepNumber: 1,
    title: "Поиск карты пациента и проверка анамнеза...",
    status: "pending",
    detail: "Идентификация пациента и аллергоанамнез",
    icon: "search",
  },
  {
    id: "step_odontogram_status",
    stepNumber: 2,
    title: "Клинический осмотр и статус зубной формулы...",
    status: "pending",
    detail: "Анализ одонтограммы и диагностических находок",
    icon: "xray",
  },
  {
    id: "step_ddi_safety",
    stepNumber: 3,
    title: "Проверка лекарственной безопасности...",
    status: "pending",
    detail: "Контроль соматических стоп-факторов",
    icon: "shield",
  },
  {
    id: "step_treatment_tiers",
    stepNumber: 4,
    title: "Формирование клинического протокола и сметы...",
    status: "pending",
    detail: "Расчёт протокола SOAP и позиций прейскуранта",
    icon: "plan",
  },
];

export function getReactStepIcon(step: ReactStepItem): React.ReactNode {
  if (step.status === "running") {
    return <Loader2 size={16} className="copilot-rt-step-icon running animate-spin" />;
  }
  if (step.status === "done") {
    return <CheckCircle2 size={16} className="copilot-rt-step-icon done text-[var(--teal)]" />;
  }
  if (step.status === "failed") {
    return <AlertTriangle size={16} className="copilot-rt-step-icon failed text-[var(--rust)]" />;
  }
  return <Clock size={16} className="copilot-rt-step-icon pending text-[var(--muted)]" />;
}
