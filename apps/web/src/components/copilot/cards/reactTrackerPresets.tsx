import React from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { ReactStepItem } from "../copilotTypes";

export const DEFAULT_DENTE_REACT_STEPS: ReactStepItem[] = [
  {
    id: "step_patient_anamnesis",
    stepNumber: 1,
    title: "Поиск карты пациента и анамнеза (allergies, pregnancy)...",
    status: "done",
    detail: "Пациент идентифицирован • Аллергоанамнез проверен",
    icon: "search",
  },
  {
    id: "step_xray_tooth_36",
    stepNumber: 2,
    title: "Анализ прицельного снимка зуба 36 (глубокий кариес K02.1)...",
    status: "done",
    detail: "Зуб 36 FDI • Кариес дентина K02.1 MOD",
    icon: "xray",
  },
  {
    id: "step_ddi_safety",
    stepNumber: 3,
    title: "Проверка лекарственной безопасности...",
    status: "done",
    detail: "Совместимо • Противопоказания исключены",
    icon: "shield",
  },
  {
    id: "step_treatment_tiers",
    stepNumber: 4,
    title: "Формирование 3-уровневого плана лечения (Эконом / Оптимум / Премиум)...",
    status: "done",
    detail: "3 тарифа рассчитаны по прейскуранту",
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
