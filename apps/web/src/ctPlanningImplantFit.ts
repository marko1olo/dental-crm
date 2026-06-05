import type { CtPlanningDistanceMeasurement, CtPlanningGeometrySummary } from "./ctPlanningGeometry";

export type CtPlanningImplantFitStatus = "ready" | "draft" | "blocked";

export type CtPlanningImplantFitLibraryItem = {
  id: string;
  system: string;
  line: string;
  diameterMm: number;
  lengthMm: number;
  platform: string;
  indication: string;
};

export type CtPlanningImplantFitCandidate = {
  id: string;
  title: string;
  selected: boolean;
  status: CtPlanningImplantFitStatus;
  score: number;
  sizeLabel: string;
  diameterMarginMm: number | null;
  lengthMarginMm: number | null;
  canalMarginMm: number | null;
  detail: string;
  nextAction: string;
  decisionReasons: string[];
};

export type CtPlanningImplantFitPlan = {
  version: "dental-crm-ct-implant-fit-v1";
  status: CtPlanningImplantFitStatus;
  score: number;
  selectedCandidateId: string | null;
  siteToothCode: string | null;
  siteEvidenceStatus: "scoped" | "mixed" | "unscoped";
  foreignSiteEvidenceCount: number;
  ridgeWidthMm: number | null;
  boneHeightMm: number | null;
  measurementSourceCount: number;
  measurementRoleCount: number;
  widthSource: "typed" | "fallback" | "missing";
  heightSource: "typed" | "fallback" | "missing";
  summaryLabel: string;
  candidates: CtPlanningImplantFitCandidate[];
  warnings: string[];
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function finiteMeasurement(value: number) {
  return Number.isFinite(value) && value > 0;
}

function rankedDistances(values: CtPlanningDistanceMeasurement[]) {
  return values.filter((item) => finiteMeasurement(item.valueMm)).slice().sort((a, b) => a.valueMm - b.valueMm);
}

function legacyDistanceMeasurements(values: number[]): CtPlanningDistanceMeasurement[] {
  return values.filter(finiteMeasurement).map((value, index) => ({
    id: `legacy-distance-${index}`,
    valueMm: value,
    label: "Линейка",
    role: "generic",
    toothCode: null,
    viewportId: "legacy",
    frameOfReferenceUid: null,
    referencedImageId: null
  }));
}

function sameToothCode(left: string | null, right: string | null) {
  return Boolean(left && right && left.trim().toUpperCase() === right.trim().toUpperCase());
}

function siteScopedDistances(values: CtPlanningDistanceMeasurement[], siteToothCode: string | null) {
  if (!siteToothCode) return values;
  return values.filter((item) => !item.toothCode || sameToothCode(item.toothCode, siteToothCode));
}

function foreignSiteDistanceCount(values: CtPlanningDistanceMeasurement[], siteToothCode: string | null) {
  if (!siteToothCode) return 0;
  return values.filter((item) => item.toothCode && !sameToothCode(item.toothCode, siteToothCode)).length;
}

function mixedUnscopedSite(values: CtPlanningDistanceMeasurement[], siteToothCode: string | null, geometrySummary: CtPlanningGeometrySummary) {
  if (siteToothCode) return false;
  return geometrySummary.siteEvidenceToothCodes.length > 1 || new Set(values.map((item) => item.toothCode).filter(Boolean)).size > 1;
}

function hasSiteConfirmedMeasurement(measurement: CtPlanningDistanceMeasurement | null, siteToothCode: string | null) {
  if (!measurement || !siteToothCode) return false;
  return sameToothCode(measurement.toothCode, siteToothCode);
}

function roleDistance(values: CtPlanningDistanceMeasurement[], role: CtPlanningDistanceMeasurement["role"]) {
  const matches = values.filter((item) => item.role === role);
  return matches.length > 0 ? rankedDistances(matches)[0] ?? null : null;
}

function fallbackWidth(values: CtPlanningDistanceMeasurement[]) {
  return rankedDistances(values.filter((item) => item.role !== "clearance"))[0] ?? null;
}

function fallbackHeight(values: CtPlanningDistanceMeasurement[]) {
  const candidates = rankedDistances(values.filter((item) => item.role !== "clearance"));
  return candidates.length >= 2 ? candidates[candidates.length - 1] ?? null : null;
}

function fitScore(diameterMarginMm: number | null, lengthMarginMm: number | null, canalMarginMm: number | null) {
  let score = 25;
  if (diameterMarginMm !== null) score += clamp(diameterMarginMm * 12, -40, 35);
  if (lengthMarginMm !== null) score += clamp(lengthMarginMm * 9, -35, 30);
  if (canalMarginMm !== null) score += canalMarginMm >= 2 ? clamp((canalMarginMm - 2) * 8, 0, 10) : -55;
  return Math.round(clamp(score, 0, 100));
}

function candidateDecisionReasons(input: {
  canPlan: boolean;
  diameterMarginMm: number | null;
  lengthMarginMm: number | null;
  canalMarginMm: number | null;
  hasTypedWidth: boolean;
  hasTypedHeight: boolean;
  siteEvidenceStatus: CtPlanningImplantFitPlan["siteEvidenceStatus"];
  foreignSiteEvidenceCount: number;
}) {
  const reasons: string[] = [];
  if (input.siteEvidenceStatus === "unscoped") reasons.push("участок импланта не подтвержден");
  if (input.siteEvidenceStatus === "mixed") reasons.push("измерения смешаны между зубами");
  if (input.foreignSiteEvidenceCount > 0) reasons.push("линейки другого зуба исключены");
  if (!input.canPlan) reasons.push("нет готовой КТ-серии");
  if (!input.hasTypedWidth) reasons.push("ширина взята из чернового подбора");
  if (!input.hasTypedHeight) reasons.push("высота взята из чернового подбора");
  if (input.diameterMarginMm === null) reasons.push("нет линейки ширины");
  else if (input.diameterMarginMm < 0) reasons.push(`диаметр шире гребня на ${round1(Math.abs(input.diameterMarginMm))} мм`);
  if (input.lengthMarginMm === null) reasons.push("нет линейки высоты");
  else if (input.lengthMarginMm < 0) reasons.push(`длина больше высоты на ${round1(Math.abs(input.lengthMarginMm))} мм`);
  if (input.canalMarginMm === null) reasons.push("нет проверки ось + канал");
  else if (input.canalMarginMm < 2) reasons.push(`до канала ${input.canalMarginMm} мм, нужно 2 мм`);
  if (reasons.length === 0) reasons.push("запасы проходят; подтвердить в просмотрщике");
  return reasons.slice(0, 4);
}

function candidateStatus(input: {
  canPlan: boolean;
  ridgeWidthMm: number | null;
  boneHeightMm: number | null;
  diameterMarginMm: number | null;
  lengthMarginMm: number | null;
  canalMarginMm: number | null;
  hasTypedWidth: boolean;
  hasTypedHeight: boolean;
  siteEvidenceStatus: CtPlanningImplantFitPlan["siteEvidenceStatus"];
}): CtPlanningImplantFitStatus {
  if (!input.canPlan) return "blocked";
  if (input.canalMarginMm !== null && input.canalMarginMm < 2) return "blocked";
  if (input.diameterMarginMm !== null && input.diameterMarginMm < 0) return "blocked";
  if (input.lengthMarginMm !== null && input.lengthMarginMm < 0) return "blocked";
  if (
    input.ridgeWidthMm !== null &&
    input.boneHeightMm !== null &&
    input.hasTypedWidth &&
    input.hasTypedHeight &&
    input.siteEvidenceStatus === "scoped"
  ) return "ready";
  return "draft";
}

function statusRank(status: CtPlanningImplantFitStatus) {
  if (status === "ready") return 0;
  if (status === "draft") return 1;
  return 2;
}

export function buildCtPlanningImplantFitPlan(input: {
  canPlan: boolean;
  implantLibrary: CtPlanningImplantFitLibraryItem[];
  selectedImplantId: string | null;
  geometrySummary: CtPlanningGeometrySummary;
}): CtPlanningImplantFitPlan {
  const allDistances = rankedDistances(
    input.geometrySummary.distanceMeasurements.length > 0
      ? input.geometrySummary.distanceMeasurements
      : legacyDistanceMeasurements(input.geometrySummary.distanceMeasurementsMm)
  );
  const siteToothCode = input.geometrySummary.implantSiteToothCode;
  const foreignSiteEvidenceCount = foreignSiteDistanceCount(allDistances, siteToothCode);
  const siteEvidenceStatus: CtPlanningImplantFitPlan["siteEvidenceStatus"] = siteToothCode
    ? "scoped"
    : mixedUnscopedSite(allDistances, siteToothCode, input.geometrySummary)
      ? "mixed"
      : "unscoped";
  const siteMatchedDistances = siteToothCode ? rankedDistances(allDistances.filter((item) => sameToothCode(item.toothCode, siteToothCode))) : allDistances;
  const unscopedSiteDistances = siteToothCode ? rankedDistances(allDistances.filter((item) => !item.toothCode)) : [];
  const distances = rankedDistances(siteScopedDistances(allDistances, siteToothCode));
  const typedWidth = roleDistance(siteMatchedDistances, "ridge_width") ?? roleDistance(siteToothCode ? unscopedSiteDistances : distances, "ridge_width");
  const typedHeight = roleDistance(siteMatchedDistances, "bone_height") ?? roleDistance(siteToothCode ? unscopedSiteDistances : distances, "bone_height");
  const widthMeasurement = typedWidth ?? fallbackWidth(siteMatchedDistances) ?? fallbackWidth(siteToothCode ? unscopedSiteDistances : distances);
  const heightMeasurement = typedHeight ?? fallbackHeight(siteMatchedDistances) ?? fallbackHeight(siteToothCode ? unscopedSiteDistances : distances);
  const ridgeWidthMm = widthMeasurement?.valueMm ?? null;
  const boneHeightMm = heightMeasurement?.valueMm ?? null;
  const hasTypedWidth = hasSiteConfirmedMeasurement(typedWidth, siteToothCode);
  const hasTypedHeight = hasSiteConfirmedMeasurement(typedHeight, siteToothCode);
  const canalMarginMm = input.geometrySummary.minimumClearanceMm;
  const measurementRoleCount = distances.filter((item) => item.role === "ridge_width" || item.role === "bone_height").length;
  const candidates = input.implantLibrary
    .map((implant) => {
      const diameterMarginMm = ridgeWidthMm === null ? null : round1(ridgeWidthMm - implant.diameterMm - 2);
      const lengthMarginMm = boneHeightMm === null ? null : round1(boneHeightMm - implant.lengthMm - 2);
      const status = candidateStatus({
        canPlan: input.canPlan,
        ridgeWidthMm,
        boneHeightMm,
        diameterMarginMm,
        lengthMarginMm,
        canalMarginMm,
        hasTypedWidth,
        hasTypedHeight,
        siteEvidenceStatus
      });
      return {
        id: implant.id,
        title: `${implant.system} · ${implant.line}`,
        selected: input.selectedImplantId === implant.id,
        status,
        score: fitScore(diameterMarginMm, lengthMarginMm, canalMarginMm),
        sizeLabel: `${implant.diameterMm} x ${implant.lengthMm} мм`,
        diameterMarginMm,
        lengthMarginMm,
        canalMarginMm,
        detail: `${implant.platform}. ${implant.indication}`,
        decisionReasons: candidateDecisionReasons({
          canPlan: input.canPlan,
          diameterMarginMm,
          lengthMarginMm,
          canalMarginMm,
          hasTypedWidth,
          hasTypedHeight,
          siteEvidenceStatus,
          foreignSiteEvidenceCount
        }),
        nextAction: !input.canPlan
          ? "Выбрать готовую КТ-серию."
          : status === "ready"
            ? "Сверить ширину, высоту, канал и плотность в просмотрщике."
            : status === "blocked"
              ? "Изменить типоразмер или перестроить ось/канал."
              : "Создать отдельные линейки ширины гребня и высоты кости."
      };
    })
    .sort((a, b) => Number(b.selected) - Number(a.selected) || statusRank(a.status) - statusRank(b.status) || b.score - a.score);
  const selectedCandidate = candidates.find((candidate) => candidate.selected) ?? null;
  const bestCandidate = candidates[0] ?? null;
  const status: CtPlanningImplantFitStatus =
    !input.canPlan || (canalMarginMm !== null && canalMarginMm < 2)
      ? "blocked"
      : selectedCandidate
        ? selectedCandidate.status
        : ridgeWidthMm !== null && boneHeightMm !== null && hasTypedWidth && hasTypedHeight && siteEvidenceStatus === "scoped" && bestCandidate?.status === "ready"
          ? "ready"
          : "draft";
  const score = selectedCandidate?.score ?? bestCandidate?.score ?? 0;
  const warnings: string[] = [];
  if (siteEvidenceStatus === "unscoped") warnings.push("Участок импланта не подтвержден; скрининг остается черновиком.");
  if (siteEvidenceStatus === "mixed") warnings.push("Измерения относятся к нескольким зубам; скрининг остается черновиком.");
  if (foreignSiteEvidenceCount > 0) warnings.push("Линейки другого зуба не участвуют в ранжировании типоразмеров.");
  if (!input.canPlan) warnings.push("Нужна готовая объемная КТ-серия.");
  if (ridgeWidthMm === null || !hasTypedWidth) warnings.push("Нет подписанной линейки ширины гребня.");
  if (boneHeightMm === null || !hasTypedHeight) warnings.push("Нет подписанной линейки высоты кости.");
  if (distances.length > 0 && (!hasTypedWidth || !hasTypedHeight)) warnings.push("Универсальные короткая/длинная линейки показаны только как черновик; для готовности нужны роли линейки.");
  if (canalMarginMm !== null && canalMarginMm < 2) warnings.push("Отступ до канала меньше 2 мм: типоразмер заблокирован до перестройки плана.");
  const summaryLabel =
    status === "ready"
      ? "типоразмер проходит первичный скрининг"
      : status === "blocked"
        ? "есть блокер типоразмера"
        : "нужны ширина и высота по линейке";

  return {
    version: "dental-crm-ct-implant-fit-v1",
    status,
    score,
    selectedCandidateId: selectedCandidate?.id ?? null,
    siteToothCode,
    siteEvidenceStatus,
    foreignSiteEvidenceCount,
    ridgeWidthMm,
    boneHeightMm,
    measurementSourceCount: distances.length,
    measurementRoleCount,
    widthSource: ridgeWidthMm === null ? "missing" : hasTypedWidth ? "typed" : "fallback",
    heightSource: boneHeightMm === null ? "missing" : hasTypedHeight ? "typed" : "fallback",
    summaryLabel,
    candidates: candidates.slice(0, 6),
    warnings: Array.from(new Set(warnings)).slice(0, 5)
  };
}
