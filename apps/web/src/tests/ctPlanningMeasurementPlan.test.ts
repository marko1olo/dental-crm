import test from "node:test";
import assert from "node:assert/strict";
import { buildCtPlanningMeasurementPlan } from "../ctPlanningMeasurementPlan";
import type { DicomViewerToolStateAnnotation } from "@dental/shared";

function mockAnnotation(
  id: string,
  type: DicomViewerToolStateAnnotation["type"],
  pointsCount: number,
  semanticRole?: DicomViewerToolStateAnnotation["semanticRole"],
  measurementValue?: number | null,
  measurementUnit?: string | null,
  needsReview = false
): DicomViewerToolStateAnnotation {
  return {
    id,
    sourceAnnotationId: id,
    targetTool: "LengthTool",
    type,
    label: "mock",
    semanticRole: semanticRole ?? null,
    toothCode: null,
    note: null,
    viewportId: "v1",
    frameOfReferenceUid: "f1",
    referencedImageId: "r1",
    measurement: {
      value: measurementValue ?? null,
      unit: measurementUnit ?? null,
    },
    points: Array(pointsCount).fill({
      world: [0, 0, 0],
      canvas: null,
      plane: null,
      sourceIndex: 0,
    }),
    locked: false,
    needsReview,
    warnings: [],
  };
}

test("buildCtPlanningMeasurementPlan returns blocked status when canPlan is false", () => {
  const result = buildCtPlanningMeasurementPlan({
    canPlan: false,
    annotations: [],
    geometrySummary: {
      measurementCount: 0,
      curveCount: 0,
      areaCount: 0,
      volumeCount: 0,
      roiAreaTotalMm2: null,
      roiVolumeTotalMm3: null,
      roiVolumeSlabMm: 1,
      roiDraftCount: 0,
      implantSiteToothCode: null,
      siteEvidenceToothCodes: [],
      distanceMeasurements: [],
      distanceMeasurementsMm: [],
      minimumClearanceMm: null,
      implantVolumeMm3: null,
      metrics: [],
      warnings: [],
    },
    unsavedArtifactCount: 0,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.score, 0);
  assert.ok(result.warnings.includes("Нужна готовая объемная КТ-серия."));
});

test("buildCtPlanningMeasurementPlan returns draft status with partial measurements", () => {
  const result = buildCtPlanningMeasurementPlan({
    canPlan: true,
    annotations: [
      mockAnnotation("1", "distance", 2, "ridge_width"),
      mockAnnotation("2", "distance", 2, "clearance"),
    ],
    geometrySummary: {
      measurementCount: 2,
      curveCount: 0,
      areaCount: 0,
      volumeCount: 0,
      roiAreaTotalMm2: null,
      roiVolumeTotalMm3: null,
      roiVolumeSlabMm: 1,
      roiDraftCount: 0,
      implantSiteToothCode: null,
      siteEvidenceToothCodes: [],
      distanceMeasurements: [],
      distanceMeasurementsMm: [],
      minimumClearanceMm: null,
      implantVolumeMm3: null,
      metrics: [],
      warnings: [],
    },
    unsavedArtifactCount: 1,
  });

  assert.equal(result.status, "draft");
  assert.equal(result.ridgeWidthCount, 1);
  assert.equal(result.boneHeightCount, 0);
  assert.equal(result.clearanceRoleCount, 1);
  assert.equal(result.unsavedArtifactCount, 1);

  const signedCard = result.cards.find(c => c.id === "signed-ridge-bone");
  assert.equal(signedCard?.status, "draft");
});

test("buildCtPlanningMeasurementPlan returns ready status with full measurements", () => {
  const result = buildCtPlanningMeasurementPlan({
    canPlan: true,
    annotations: [
      mockAnnotation("1", "distance", 2, "ridge_width"),
      mockAnnotation("2", "distance", 2, "bone_height"),
      mockAnnotation("3", "distance", 2, "clearance"),
      mockAnnotation("4", "bone_density_probe", 1, null, 500, "HU"),
      mockAnnotation("5", "area_roi", 3),
      mockAnnotation("6", "volume_roi", 3),
    ],
    geometrySummary: {
      measurementCount: 6,
      curveCount: 0,
      areaCount: 1,
      volumeCount: 1,
      roiAreaTotalMm2: 10,
      roiVolumeTotalMm3: 20,
      roiVolumeSlabMm: 1,
      roiDraftCount: 0,
      implantSiteToothCode: null,
      siteEvidenceToothCodes: [],
      distanceMeasurements: [],
      distanceMeasurementsMm: [],
      minimumClearanceMm: 2.5,
      implantVolumeMm3: null,
      metrics: [],
      warnings: [],
    },
    unsavedArtifactCount: 0,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.readyCardCount, 7);
});

test("buildCtPlanningMeasurementPlan handles bone density stats and warnings", () => {
  const result = buildCtPlanningMeasurementPlan({
    canPlan: true,
    annotations: [
      mockAnnotation("1", "bone_density_probe", 1, null, 1000, "HU"),
      mockAnnotation("2", "bone_density_probe", 1, null, 200, "HU"),
    ],
    geometrySummary: {
      measurementCount: 2,
      curveCount: 0,
      areaCount: 0,
      volumeCount: 0,
      roiAreaTotalMm2: null,
      roiVolumeTotalMm3: null,
      roiVolumeSlabMm: 1,
      roiDraftCount: 0,
      implantSiteToothCode: null,
      siteEvidenceToothCodes: [],
      distanceMeasurements: [],
      distanceMeasurementsMm: [],
      minimumClearanceMm: null,
      implantVolumeMm3: null,
      metrics: [],
      warnings: [],
    },
    unsavedArtifactCount: 0,
  });

  assert.equal(result.densityValueCount, 2);
  assert.equal(result.densityAverageValue, 600);
  assert.equal(result.densityUnitIsCalibratedHu, true);
  assert.equal(result.densityHasMixedUnits, false);
});

test("buildCtPlanningMeasurementPlan warns on mixed density units", () => {
  const result = buildCtPlanningMeasurementPlan({
    canPlan: true,
    annotations: [
      mockAnnotation("1", "bone_density_probe", 1, null, 1000, "HU"),
      mockAnnotation("2", "bone_density_probe", 1, null, 200, "other"),
    ],
    geometrySummary: {
      measurementCount: 2,
      curveCount: 0,
      areaCount: 0,
      volumeCount: 0,
      roiAreaTotalMm2: null,
      roiVolumeTotalMm3: null,
      roiVolumeSlabMm: 1,
      roiDraftCount: 0,
      implantSiteToothCode: null,
      siteEvidenceToothCodes: [],
      distanceMeasurements: [],
      distanceMeasurementsMm: [],
      minimumClearanceMm: null,
      implantVolumeMm3: null,
      metrics: [],
      warnings: [],
    },
    unsavedArtifactCount: 0,
  });

  assert.equal(result.densityHasMixedUnits, true);
  assert.ok(result.warnings.includes("Плотность смешала единицы; повторите probe в одной калибровке."));
});
