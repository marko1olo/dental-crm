import type { CtPlanningGeometrySummary } from "./ctPlanningGeometry";
import type { CtPlanningImplantModelPlan } from "./ctPlanningImplantModel";
import type { CtPlanningMeasurementPlan } from "./ctPlanningMeasurementPlan";

export type CtPlanningValidationStatus = "pass" | "warn" | "fail";

export type CtPlanningValidationCheck = {
  id: string;
  title: string;
  status: CtPlanningValidationStatus;
  value: string;
  detail: string;
};

export type CtPlanningValidationSummary = {
  score: number;
  status: CtPlanningValidationStatus;
  label: string;
  checks: CtPlanningValidationCheck[];
};

function statusScore(status: CtPlanningValidationStatus) {
  if (status === "pass") return 1;
  if (status === "warn") return 0.55;
  return 0;
}

function combinedStatus(checks: CtPlanningValidationCheck[]): CtPlanningValidationStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

function clearanceCheck(geometry: CtPlanningGeometrySummary): CtPlanningValidationCheck {
  const clearance = geometry.minimumClearanceMm;
  if (clearance === null) {
    return {
      id: "canal-clearance",
      title: "Канал",
      status: "warn",
      value: "нет расчета",
      detail: "Нужны ось импланта и кривая канала."
    };
  }
  return {
    id: "canal-clearance",
    title: "Канал",
    status: clearance >= 2 ? "pass" : "fail",
    value: `${Math.round(clearance * 100) / 100} мм`,
    detail: clearance >= 2 ? "Отступ до канала рассчитан." : "Отступ до канала меньше 2 мм."
  };
}

export function buildCtPlanningValidationSummary(input: {
  canPlan: boolean;
  totalTasks: number;
  blockedTasks: number;
  volumeBlockedTasks: number;
  hasImplantPlan: boolean;
  hasPanoramicRoute: boolean;
  hasCanalRoute: boolean;
  hasGuideRoute: boolean;
  geometrySummary: CtPlanningGeometrySummary;
  measurementPlan: CtPlanningMeasurementPlan;
  implantModelPlan: CtPlanningImplantModelPlan;
}): CtPlanningValidationSummary {
  const checks: CtPlanningValidationCheck[] = [
    {
      id: "volume",
      title: "Серия",
      status: input.canPlan && input.volumeBlockedTasks === 0 ? "pass" : "fail",
      value: input.canPlan ? "готова" : "нет объема",
      detail: input.volumeBlockedTasks > 0 ? `${input.volumeBlockedTasks} объемных задач заблокированы.` : "КТ-задачи можно восстановить."
    },
    {
      id: "opg",
      title: "ОПТГ",
      status: input.hasPanoramicRoute ? "pass" : "warn",
      value: input.hasPanoramicRoute ? "есть" : "нет дуги",
      detail: input.hasPanoramicRoute ? "Панорамная реконструкция доступна." : "Нужно построить дугу и поперечные срезы."
    },
    {
      id: "implant",
      title: "Имплант",
      status: input.hasImplantPlan ? "pass" : "warn",
      value: input.hasImplantPlan ? "выбран" : "нет размера",
      detail: input.hasImplantPlan ? "Типоразмер есть в плане." : "Выберите библиотечный размер перед шаблоном."
    },
    {
      id: "axis",
      title: "Ось",
      status: input.implantModelPlan.hasAxis ? "pass" : "warn",
      value: input.implantModelPlan.hasAxis ? "есть" : "нет",
      detail: "Ось нужна для отступов, втулки и шаблона."
    },
    {
      id: "implant-model",
      title: "Модель",
      status: input.implantModelPlan.status === "ready" ? "pass" : input.implantModelPlan.status === "draft" ? "warn" : "fail",
      value: input.implantModelPlan.sleeveDiameterMm === null || input.implantModelPlan.sleeveLengthMm === null ? "нет втулки" : `${input.implantModelPlan.sleeveDiameterMm} x ${input.implantModelPlan.sleeveLengthMm} мм`,
      detail: input.implantModelPlan.status === "ready" ? "Имплант, ось, апекс и втулка рассчитаны." : "Нужны типоразмер и ось импланта."
    },
    {
      id: "roi",
      title: "Контуры",
      status: input.geometrySummary.areaCount > 0 || input.geometrySummary.volumeCount > 0 ? "pass" : "warn",
      value: input.geometrySummary.volumeCount > 0 ? input.measurementPlan.roiVolumeTotalLabel : input.geometrySummary.areaCount > 0 ? input.measurementPlan.roiAreaTotalLabel : "нет",
      detail: input.geometrySummary.volumeCount > 0 ? `Объем по контуру — оценка по слою ${input.measurementPlan.roiVolumeSlabMm} мм, не сегментация тканей.` : "Площадь или объем нужны для дефекта, пазухи, графта и дыхательных путей."
    },
    {
      id: "measurement-map",
      title: "Измерения",
      status: input.measurementPlan.status === "ready" ? "pass" : input.measurementPlan.status === "draft" ? "warn" : "fail",
      value: `${input.measurementPlan.readyCardCount}/${input.measurementPlan.cards.length}`,
      detail: input.measurementPlan.status === "ready" ? "Линейка, контуры, плотность и пакет измерений закрыты." : input.measurementPlan.summaryLabel
    },
    clearanceCheck(input.geometrySummary),
    {
      id: "guide",
      title: "Шаблон",
      status: input.implantModelPlan.guideReady ? "pass" : "warn",
      value: input.implantModelPlan.guideReady ? "готов" : input.implantModelPlan.hasGuideRoute ? "маршрут" : "нет",
      detail: input.implantModelPlan.guideReady ? "Маршрут, втулка, ось и отступ до канала закрыты." : "Шаблон требует объем, ось, имплант, втулку, канал и экспортируемый маршрут."
    }
  ];

  const score = Math.round((checks.reduce((sum, check) => sum + statusScore(check.status), 0) / checks.length) * 100);
  const status = combinedStatus(checks);
  const pendingChecks = checks.filter((check) => check.status !== "pass").length;
  const pendingLabel = pendingChecks === 1 ? "1 пункт требует действия" : `${pendingChecks} пунктов требуют действия`;
  const label =
    status === "pass"
      ? "план собран"
      : status === "fail"
        ? "есть блокер"
        : pendingLabel;

  return {
    score,
    status,
    label,
    checks
  };
}
