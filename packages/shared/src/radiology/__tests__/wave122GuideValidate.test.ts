import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type GuideCheckImplant,
  type GuideParams,
  type AnatomyMarker,
  type GuideIssue,
  type GuideCheckInput,
  MIN_WALL_MM,
  MIN_DRILL_MM,
  DRILL_OVERSHOOT_MM,
  DEFAULT_GUIDE_PARAMS,
  GUIDE_DEFAULTS,
  drillRadius,
  validateGuide,
} from "../guideValidate.js";
import type { Vec3 } from "../implantSafetyClearance.js";

// Helper to create test implants
function makeImplant(
  entry: Vec3,
  axis: Vec3 = [0, 0, 1],
  length = 10,
  id = "imp-1",
  sleeveDiameter = 5.0,
): GuideCheckImplant {
  return {
    id,
    entry,
    axis,
    length,
    sleeveDiameter,
    sleeveOffset: 9.0,
    sleeveHeight: 5.0,
  };
}

// Helper to create test parameters
function makeParams(overrides: Partial<GuideParams> = {}): GuideParams {
  return { ...DEFAULT_GUIDE_PARAMS, ...overrides };
}

// Helper to create test anatomy markers
function makeMarker(
  id: string,
  type: "nerve" | "sinus",
  points: Vec3[],
  radius = 1.0,
): AnatomyMarker {
  return {
    id,
    type,
    radius,
    points,
  };
}

describe("Surgical Drill Guide Validation & Overshoot Engine — Wave 122", () => {
  it("exposes canonical clinical constants and defaults", () => {
    assert.strictEqual(MIN_WALL_MM, 1.0);
    assert.strictEqual(MIN_DRILL_MM, 1.8);
    assert.strictEqual(DRILL_OVERSHOOT_MM, 2.0);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.wallMm, 1.5);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.sleeveWallMm, 0.9);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.channelTolMm, 0.1);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.sleeveSeat, true);
    assert.strictEqual(GUIDE_DEFAULTS, DEFAULT_GUIDE_PARAMS);
  });

  it("calculates accurate drillRadius in sleeve-seat and plain modes", () => {
    const imp = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-1", 5.0);
    // sleeveSeat = true: innerD = max(0.5, 5.0 - 2 * 0.9) = 3.2 mm -> radius = 1.6 + 0.1 = 1.7 mm
    const rSeat = drillRadius(imp, makeParams({ sleeveSeat: true, sleeveWallMm: 0.9, channelTolMm: 0.1 }));
    assert.ok(Math.abs(rSeat - 1.7) < 1e-6);

    // sleeveSeat = false: outer sleeve radius + tolerance = (5.0 + 0.1) / 2 = 2.55 mm
    const rNoSeat = drillRadius(imp, makeParams({ sleeveSeat: false, channelTolMm: 0.1 }));
    assert.ok(Math.abs(rNoSeat - 2.55) < 1e-6);
  });

  // Тест 1: Валидный одиночный имплантат и шаблон: возвращает пустой массив issues [];
  it("Test 1: Valid single implant and template returns empty issues array []", () => {
    const imp = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-1");
    const issues = validateGuide({
      implants: [imp],
      params: makeParams(),
      anatomy: [],
    });
    assert.strictEqual(issues.length, 0);
  });

  // Тест 2: Тонкая стенка смолы (wallMm = 0.6 мм < 1.0 мм): issue thinWall warning;
  it("Test 2: Thin housing wall (wallMm = 0.6 mm < 1.0 mm) yields thinWall warning", () => {
    const imp = makeImplant([0, 0, 0]);
    const issues = validateGuide({
      implants: [imp],
      params: makeParams({ wallMm: 0.6 }),
    });
    const thin = issues.find((i) => i.code === "thinWall");
    assert.ok(thin, "thinWall issue must be present");
    assert.strictEqual(thin.severity, "warning");
    assert.strictEqual(thin.detail, "0.6 mm");
  });

  // Тест 3: Слишком узкий канал сверла (< 1.8 мм): issue narrowChannel warning;
  it("Test 3: Narrow drill channel (< 1.8 mm) yields narrowChannel warning", () => {
    // sleeveDiameter = 5.0, sleeveWallMm = 1.8 -> innerD = 5.0 - 3.6 = 1.4 -> r = 0.7 + 0.1 = 0.8 -> d = 1.6 mm < 1.8 mm
    const imp = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-narrow");
    const issues = validateGuide({
      implants: [imp],
      params: makeParams({ sleeveWallMm: 1.8 }),
    });
    const narrow = issues.find((i) => i.code === "narrowChannel");
    assert.ok(narrow, "narrowChannel issue must be present");
    assert.strictEqual(narrow.severity, "warning");
    assert.strictEqual(narrow.detail, "1.6 mm");
    assert.strictEqual(narrow.implantId, "imp-narrow");
  });

  // Тест 4: Хрупкая перемычка между близкими имплантами (< 1.0 мм): issue fragileWeb error/warning;
  it("Test 4: Fragile web between close implants (< 1.0 mm) yields fragileWeb warning/error", () => {
    // Default params: sleeveDiameter = 5, sleeveWallMm = 0.9 -> innerD = 3.2 -> drill radius = 1.6 + 0.1 = 1.7 mm
    // Sum of two drill radii = 3.4 mm.
    // Case A: gap = 3.8 - 3.4 = 0.4 mm (< MIN_WALL_MM = 1.0, >= 0) -> fragileWeb warning
    const impA = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-A");
    const impB = makeImplant([3.8, 0, 0], [0, 0, 1], 10, "imp-B");
    const issuesWarning = validateGuide({
      implants: [impA, impB],
      params: makeParams(),
    });
    const webWarn = issuesWarning.find((i) => i.code === "fragileWeb");
    assert.ok(webWarn, "fragileWeb warning issue must be present");
    assert.strictEqual(webWarn.severity, "warning");
    assert.strictEqual(webWarn.detail, "0.4 mm");
    assert.strictEqual(webWarn.implantId, "imp-A");
    assert.strictEqual(webWarn.pairImplantId, "imp-B");

    // Case B: gap < 0 (actual intersection of drill shafts, e.g. distance = 2.0 mm < 3.4 mm) -> fragileWeb error
    const impC = makeImplant([2.0, 0, 0], [0, 0, 1], 10, "imp-C");
    const issuesError = validateGuide({
      implants: [impA, impC],
      params: makeParams(),
    });
    const webErr = issuesError.find((i) => i.code === "fragileWeb");
    assert.ok(webErr, "fragileWeb collision issue must be present");
    assert.strictEqual(webErr.severity, "error");
  });

  // Тест 5: Заступ сверла (drill overshoot) в нижнечелюстной нерв (имплантат в 1.0 мм над нервом, но сверло +2 мм пенетрирует нерв): issue drillNerveCollision error;
  it("Test 5: Drill overshoot into mandibular nerve (implant 1.0 mm above nerve, +2mm drill bur penetrates) yields drillNerveCollision error", () => {
    // Implant length: 10 mm (coronal entry [0,0,0], apex at [0,0,10])
    // Mandibular nerve canal polyline crosses horizontally at z = 11.0 mm with radius = 0.5 mm
    // Without drill overshoot, apex at z = 10 is 1.0 mm away from nerve centerline (0.5 mm from nerve surface).
    // With DRILL_OVERSHOOT_MM = 2.0 mm, drill bur reaches z = 12.0 mm, directly penetrating into the nerve canal at z = 11.0 mm!
    const imp = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-mandibular");
    const nerve = makeMarker("ian-nerve", "nerve", [
      [-10, 0, 11],
      [10, 0, 11],
    ], 0.5);

    const issues = validateGuide({
      implants: [imp],
      params: makeParams(),
      anatomy: [nerve],
    });

    const nerveCollision = issues.find((i) => i.code === "drillNerveCollision");
    assert.ok(nerveCollision, "drillNerveCollision issue must be detected due to drill overshoot");
    assert.strictEqual(nerveCollision.severity, "error");
    assert.strictEqual(nerveCollision.implantId, "imp-mandibular");
    // Clearance should be negative because drill centerline intersects nerve (distance = 0 - 0.5 - 1.7 = -2.2 mm)
    assert.ok(parseFloat(nerveCollision.detail!) < 0, `Clearance ${nerveCollision.detail} must be negative`);
    // Errors must sort before warnings
    assert.strictEqual(issues[0]?.severity, "error");
  });

  // Тест 6: Заступ сверла в гайморову пазуху (sinus overshoot): issue drillSinusCollision;
  it("Test 6: Drill overshoot into maxillary sinus floor yields drillSinusCollision", () => {
    // Maxillary implant length: 10 mm (coronal entry [0,0,0], apex at [0,0,10])
    // Sinus floor crosses at z = 11.0 mm with radius = 0.5 mm
    // With DRILL_OVERSHOOT_MM = 2.0 mm, drill tip reaches z = 12.0 mm, penetrating sinus floor
    const imp = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-sinus");
    const sinus = makeMarker("maxillary-sinus", "sinus", [
      [-10, 0, 11],
      [10, 0, 11],
    ], 0.5);

    const issues = validateGuide({
      implants: [imp],
      params: makeParams(),
      anatomy: [sinus],
    });

    const sinusCollision = issues.find((i) => i.code === "drillSinusCollision");
    assert.ok(sinusCollision, "drillSinusCollision issue must be detected");
    assert.strictEqual(sinusCollision.implantId, "imp-sinus");
    // Since drill reaches z=12 penetrating z=11, severity is error
    assert.strictEqual(sinusCollision.severity, "error");
  });

  // Тест 7: Граничные условия: пустой массив имплантатов, отсутствие маркеров анатомии.
  it("Test 7: Boundary conditions: empty implants, missing anatomy, empty markers", () => {
    // Empty implants array
    const emptyImplants = validateGuide({
      implants: [],
      params: makeParams(),
    });
    assert.deepStrictEqual(emptyImplants, []);

    // Valid implant with undefined anatomy
    const noAnatomy = validateGuide({
      implants: [makeImplant([0, 0, 0])],
      params: makeParams(),
      anatomy: undefined,
    });
    assert.deepStrictEqual(noAnatomy, []);

    // Valid implant with empty anatomy array
    const emptyAnatomy = validateGuide({
      implants: [makeImplant([0, 0, 0])],
      params: makeParams(),
      anatomy: [],
    });
    assert.deepStrictEqual(emptyAnatomy, []);

    // Valid implant with marker containing empty points
    const emptyPointsMarker = validateGuide({
      implants: [makeImplant([0, 0, 0])],
      params: makeParams(),
      anatomy: [{ id: "empty", type: "nerve", radius: 1.0, points: [] }],
    });
    assert.deepStrictEqual(emptyPointsMarker, []);
  });
});
