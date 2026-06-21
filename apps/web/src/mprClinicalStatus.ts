import { formatMprSliceFractionLabel } from "./mprControlMath";

export type MprClinicalStatus = "ready" | "active" | "pending_review";

export type MprClinicalChecklistItem = {
  id: "series" | "orientation" | "sync" | "viewer";
  title: string;
  detail: string;
  action: string;
  status: MprClinicalStatus;
};

export type MprClinicalChecklistInput = {
  hasSeries: boolean;
  canOpenMpr: boolean;
  hasWorkbenchManifest: boolean;
  hasWorkstationReadiness: boolean;
  protocolExact: boolean;
  protocolCanApply: boolean;
  protocolLabel: string;
  projectionLabel: string;
  axisLabel: string;
  slabMm: number;
  sliceLabel: string;
  windowLabel: string;
  crosshair: boolean;
  linkedPlanes: boolean;
};

export type MprOperatorSummaryTone = "ready" | "attention" | "muted";

export type MprOperatorSummaryCard = {
  id: "series" | "protocol" | "axis" | "slice" | "sync";
  title: string;
  value: string;
  detail: string;
  tone: MprOperatorSummaryTone;
};

export type MprOperatorSummaryInput = MprClinicalChecklistInput & {
  protocolDeltas: string[];
};

export type MprClinicalPresetFitInput = {
  canOpenMpr: boolean;
  projection: string;
  availableProjections?: readonly string[];
  axisDeg: number;
  slabMm: number;
  sliceFraction: number;
  windowPreset: string;
  crosshair: boolean;
  linkedPlanes: boolean;
};

export type MprClinicalPresetFitTarget = {
  title: string;
  projection: string;
  axisDeg: number;
  slabMm: number;
  sliceFraction: number;
  windowPreset: string;
  crosshair: boolean;
  linkedPlanes: boolean;
};

export type MprClinicalPresetFit = {
  title: string;
  score: number;
  exact: boolean;
  deltas: string[];
  label: string;
};

export function resolveMprClinicalPresetProjection<TProjection extends string>(
  projection: TProjection,
  availableProjections: readonly TProjection[] | undefined
): TProjection {
  if (!availableProjections?.length || availableProjections.includes(projection)) return projection;
  if (projection === "panoramic_reconstruction" && availableProjections.includes("coronal" as TProjection)) return "coronal" as TProjection;
  if (availableProjections.includes("axial" as TProjection)) return "axial" as TProjection;
  return availableProjections[0] ?? projection;
}

export function describeMprClinicalPresetProjectionFallback<TProjection extends string>(
  projection: TProjection,
  availableProjections: readonly TProjection[] | undefined,
  projectionLabels: Record<string, string>
): string | null {
  const effectiveProjection = resolveMprClinicalPresetProjection(projection, availableProjections);
  if (effectiveProjection === projection) return null;
  return `В этой серии будет открыта доступная плоскость: ${projectionLabels[effectiveProjection] ?? "доступная плоскость"}.`;
}

function effectiveMprClinicalPreset(
  input: MprClinicalPresetFitInput,
  preset: MprClinicalPresetFitTarget
): MprClinicalPresetFitTarget {
  return {
    ...preset,
    projection: resolveMprClinicalPresetProjection(preset.projection, input.availableProjections)
  };
}

export function buildMprWorkbenchSummary(input: MprClinicalChecklistInput): string {
  if (!input.canOpenMpr) return "КТ-срезы: выберите готовую КЛКТ/КТ-серию.";

  return [
    `КТ-срезы: ${input.projectionLabel}`,
    input.axisLabel,
    `слой ${input.slabMm} мм`,
    input.sliceLabel,
    `окно ${input.windowLabel}`,
    input.protocolExact ? "протокол совпадает" : "протокол требует настройки",
    input.linkedPlanes ? "плоскости связаны" : "плоскости отдельно",
    input.crosshair ? "курсор включен" : "курсор скрыт"
  ].join(" · ");
}

export function buildMprOperatorSummary(input: MprOperatorSummaryInput): MprOperatorSummaryCard[] {
  if (!input.canOpenMpr) {
    return [
      {
        id: "series",
        title: "Серия",
        value: input.hasSeries ? "ограничена" : "не выбрана",
        detail: input.hasSeries ? "Серия найдена, но КТ-срезы пока недоступны." : "Выберите готовую КЛКТ/КТ-серию.",
        tone: input.hasSeries ? "attention" : "muted"
      },
      {
        id: "axis",
        title: "Ось и слой",
        value: "выключены",
        detail: "Угол, слой и срез появятся после готовой серии.",
        tone: "muted"
      },
      {
        id: "sync",
        title: "Навигация",
        value: "ожидает серию",
        detail: "Связанные плоскости и курсор включатся после выбора серии.",
        tone: "muted"
      }
    ];
  }

  const protocolDetail = input.protocolExact
    ? input.protocolLabel
    : input.protocolDeltas.length
      ? `Изменить: ${input.protocolDeltas.slice(0, 3).join(", ")}.`
      : input.protocolLabel;
  const syncReady = input.crosshair && input.linkedPlanes;
  return [
    {
      id: "protocol",
      title: "Протокол",
      value: input.protocolExact ? "совпадает" : "подогнать",
      detail: protocolDetail,
      tone: input.protocolExact ? "ready" : "attention"
    },
    {
      id: "axis",
      title: "Ось и слой",
      value: input.axisLabel,
      detail: `${input.projectionLabel}; слой ${input.slabMm} мм; окно ${input.windowLabel}.`,
      tone: "ready"
    },
    {
      id: "slice",
      title: "Срез",
      value: input.sliceLabel,
      detail: input.protocolExact ? "Опорный срез соответствует выбранному протоколу." : "Сверьте положение среза с клинической задачей.",
      tone: input.protocolExact ? "ready" : "attention"
    },
    {
      id: "sync",
      title: "Навигация",
      value: syncReady ? "синхронно" : "проверить",
      detail: `${input.linkedPlanes ? "плоскости связаны" : "плоскости отдельно"}; ${input.crosshair ? "курсор включен" : "курсор скрыт"}.`,
      tone: syncReady ? "ready" : "attention"
    }
  ];
}

function formatSignedDelta(value: number, unit: string): string {
  return value > 0 ? `+${value}${unit}` : `${value}${unit}`;
}

function scoreMprClinicalPresetFit(input: MprClinicalPresetFitInput, preset: MprClinicalPresetFitTarget): number {
  return (
    (input.projection === preset.projection ? 0 : 40) +
    Math.abs(input.axisDeg - preset.axisDeg) +
    Math.abs(input.slabMm - preset.slabMm) * 2 +
    Math.round(Math.abs(input.sliceFraction - preset.sliceFraction) * 20) +
    (input.windowPreset === preset.windowPreset ? 0 : 12) +
    (input.crosshair === preset.crosshair ? 0 : 8) +
    (input.linkedPlanes === preset.linkedPlanes ? 0 : 8)
  );
}

function describeMprClinicalPresetDelta(input: MprClinicalPresetFitInput, preset: MprClinicalPresetFitTarget): string[] {
  const deltas: string[] = [];
  if (input.projection !== preset.projection) deltas.push("плоскость");
  const axisDelta = preset.axisDeg - input.axisDeg;
  if (axisDelta !== 0) deltas.push(`ось ${formatSignedDelta(axisDelta, "°")}`);
  const slabDelta = preset.slabMm - input.slabMm;
  if (slabDelta !== 0) deltas.push(`слой ${formatSignedDelta(slabDelta, " мм")}`);
  if (Math.abs(input.sliceFraction - preset.sliceFraction) > 0.04) {
    deltas.push(formatMprSliceFractionLabel(preset.sliceFraction));
  }
  if (input.windowPreset !== preset.windowPreset) deltas.push("окно");
  if (input.crosshair !== preset.crosshair) deltas.push(preset.crosshair ? "включить курсор" : "скрыть курсор");
  if (input.linkedPlanes !== preset.linkedPlanes) deltas.push(preset.linkedPlanes ? "связать плоскости" : "развязать плоскости");
  return deltas;
}

export function findNearestMprClinicalPreset(
  input: MprClinicalPresetFitInput,
  presets: MprClinicalPresetFitTarget[]
): MprClinicalPresetFit {
  if (!input.canOpenMpr) {
    return {
      title: "",
      score: Number.POSITIVE_INFINITY,
      exact: false,
      deltas: [],
      label: "Выберите готовую КЛКТ/КТ-серию, чтобы увидеть ближайший протокол."
    };
  }

  let bestPreset = presets[0];
  let bestEffectivePreset = bestPreset ? effectiveMprClinicalPreset(input, bestPreset) : null;
  let bestScore = bestEffectivePreset ? scoreMprClinicalPresetFit(input, bestEffectivePreset) : Number.POSITIVE_INFINITY;
  for (const preset of presets.slice(1)) {
    const effectivePreset = effectiveMprClinicalPreset(input, preset);
    const score = scoreMprClinicalPresetFit(input, effectivePreset);
    if (score < bestScore) {
      bestPreset = preset;
      bestEffectivePreset = effectivePreset;
      bestScore = score;
    }
  }

  if (!bestPreset || !bestEffectivePreset) {
    return {
      title: "",
      score: Number.POSITIVE_INFINITY,
      exact: false,
      deltas: [],
      label: "Клинические протоколы КТ-срезов не настроены."
    };
  }

  const deltas = describeMprClinicalPresetDelta(input, bestEffectivePreset);
  const projectionFallback = bestEffectivePreset.projection !== bestPreset.projection;
  return {
    title: bestPreset.title,
    score: bestScore,
    exact: deltas.length === 0 && !projectionFallback,
    deltas,
    label:
      deltas.length === 0 && projectionFallback
        ? `Ближайший протокол: ${bestPreset.title}; настройки совпадают с безопасной заменой, но исходная плоскость недоступна.`
        : deltas.length === 0
          ? `Протокол: ${bestPreset.title}, настройки совпадают.`
        : `Ближайший протокол: ${bestPreset.title}; до него ${deltas.slice(0, 3).join(", ")}${
            projectionFallback ? "; плоскость заменена на доступную" : ""
          }.`
  };
}

export function buildMprClinicalChecklist(input: MprClinicalChecklistInput): MprClinicalChecklistItem[] {
  return [
    {
      id: "series",
      title: "Серия",
      detail: input.canOpenMpr
        ? "КЛКТ/КТ-серия готова к просмотру срезов."
        : input.hasSeries
          ? "Серия найдена, но просмотр срезов ограничен: проверьте полноту КЛКТ/КТ."
          : "Сначала проверьте серии снимков и выберите КЛКТ/КТ.",
      action: input.canOpenMpr ? "Можно настраивать плоскости." : "Проверьте серии и выберите готовую КЛКТ/КТ-серию.",
      status: input.canOpenMpr ? "ready" : input.hasSeries ? "active" : "pending_review"
    },
    {
      id: "orientation",
      title: "Плоскость и слой",
      detail: input.canOpenMpr
        ? `${input.projectionLabel}; ${input.axisLabel}; слой ${input.slabMm} мм; ${input.sliceLabel}; ${input.windowLabel}. ${
            input.protocolExact ? "Клинический протокол совпадает." : input.protocolLabel
          }`
        : "Ось, слой и окно включатся после выбора пригодной серии.",
      action: input.canOpenMpr
        ? input.protocolExact
          ? "Плоскость можно использовать для текущей клинической задачи."
          : input.protocolCanApply
            ? "Нажмите «Подогнать» или выберите клинический протокол ниже."
            : "Выберите доступный протокол ниже или откройте серию с нужной плоскостью."
        : "Сначала нужна пригодная КЛКТ/КТ-серия.",
      status: input.canOpenMpr ? (input.protocolExact ? "ready" : "active") : "pending_review"
    },
    {
      id: "sync",
      title: "Оси",
      detail: input.canOpenMpr
        ? `${input.linkedPlanes ? "Плоскости связаны" : "Плоскости отдельно"}; ${input.crosshair ? "курсор включен" : "курсор скрыт"}.`
        : "Связанные плоскости и курсор пока недоступны.",
      action:
        input.canOpenMpr && input.linkedPlanes && input.crosshair
          ? "Навигация синхронна."
          : input.canOpenMpr
            ? "Для быстрого разбора обычно включают курсор и связанные плоскости."
            : "Сначала нужна пригодная КЛКТ/КТ-серия.",
      status: input.canOpenMpr && input.linkedPlanes && input.crosshair ? "ready" : input.canOpenMpr ? "active" : "pending_review"
    },
    {
      id: "viewer",
      title: "Рабочий пакет",
      detail: input.hasWorkbenchManifest
        ? "Пакет КТ-срезов/просмотрщика собран."
        : input.hasWorkstationReadiness
          ? "ПК проверен, можно собрать КТ-рабочее место."
          : "Пакет просмотра еще не собран.",
      action: input.hasWorkbenchManifest
        ? "Можно открывать или скачивать пакет просмотра."
        : input.hasWorkstationReadiness
          ? "Соберите КТ-рабочее место."
          : input.canOpenMpr
            ? "Проверьте этот ПК и подготовьте КТ-рабочее место."
            : "Сначала выберите пригодную серию.",
      status: input.hasWorkbenchManifest ? "ready" : input.canOpenMpr ? "active" : "pending_review"
    }
  ];
}

export function mprClinicalNextAction(items: MprClinicalChecklistItem[]) {
  return items.find((item) => item.status !== "ready")?.action ?? "КТ-срезы готовы: можно работать с плоскостями, осью и слоем.";
}
