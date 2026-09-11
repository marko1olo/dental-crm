import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_WALL_MM,
  MIN_DRILL_MM,
  DRILL_OVERSHOOT_MM,
  DEFAULT_GUIDE_PARAMS,
  GUIDE_DEFAULTS,
  type GuideCheckImplant,
  type GuideParams,
  type AnatomyMarker,
  type GuideIssue,
  type GuideCheckInput,
  guideCheckImplantSchema,
  guideParamsSchema,
  anatomyMarkerSchema,
  guideCheckInputSchema,
  drillRadius,
  atPoint,
  validateGuide,
  validateGuidePlan,
  validateSurgicalGuide,
  formatGuideValidationA4Protocol,
} from "../guideValidationEngine.js";
import type { Vec3 } from "../cprMath.js";

// Helper to construct test implants
function makeImplant(
  entry: Vec3 = [0, 0, 0],
  axis: Vec3 = [0, 0, 1],
  length = 10.0,
  id = "imp-1",
  sleeveDiameter = 5.0,
  sleeveOffset = 9.0,
  sleeveHeight = 5.0,
): GuideCheckImplant {
  return {
    id,
    entry,
    axis,
    length,
    sleeveDiameter,
    sleeveOffset,
    sleeveHeight,
  };
}

// Helper to construct test guide params
function makeParams(overrides: Partial<GuideParams> = {}): GuideParams {
  return { ...DEFAULT_GUIDE_PARAMS, ...overrides };
}

// Helper to construct test anatomy markers
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

describe("Wave 127: Surgical Guide Printability & Drill Safety Validation Engine", () => {
  it("exposes canonical clinical constants and standard defaults", () => {
    assert.strictEqual(MIN_WALL_MM, 1.0);
    assert.strictEqual(MIN_DRILL_MM, 1.8);
    assert.strictEqual(DRILL_OVERSHOOT_MM, 2.0);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.wallMm, 1.5);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.sleeveWallMm, 0.9);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.channelTolMm, 0.1);
    assert.strictEqual(DEFAULT_GUIDE_PARAMS.sleeveSeat, true);
    assert.strictEqual(GUIDE_DEFAULTS, DEFAULT_GUIDE_PARAMS);
  });

  it("validates Zod schemas for implants, params, markers, and inputs", () => {
    const imp = makeImplant([10, 20, 30], [0, 0, 1], 11.5, "tooth-36", 5.0);
    const parsedImp = guideCheckImplantSchema.parse(imp);
    assert.strictEqual(parsedImp.id, "tooth-36");
    assert.strictEqual(parsedImp.length, 11.5);

    const params = makeParams();
    const parsedParams = guideParamsSchema.parse(params);
    assert.strictEqual(parsedParams.wallMm, 1.5);
    assert.strictEqual(parsedParams.sleeveSeat, true);

    const marker = makeMarker("ian-left", "nerve", [[0, 0, 0], [10, 0, 0]], 1.2);
    const parsedMarker = anatomyMarkerSchema.parse(marker);
    assert.strictEqual(parsedMarker.type, "nerve");
    assert.strictEqual(parsedMarker.radius, 1.2);

    const input: GuideCheckInput = {
      implants: [imp],
      params,
      anatomy: [marker],
      thresholds: { nerve: 2.0, sinus: 1.0 },
    };
    const parsedInput = guideCheckInputSchema.parse(input);
    assert.strictEqual(parsedInput.implants.length, 1);
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

  it("correctly computes 3D points along implant trajectory via atPoint", () => {
    const imp = makeImplant([10, 20, 30], [0, 0, 1], 10);
    const apex = atPoint(imp, 10);
    assert.deepStrictEqual(apex, [10, 20, 40]);

    const drillTip = atPoint(imp, 10 + DRILL_OVERSHOOT_MM);
    assert.deepStrictEqual(drillTip, [10, 20, 42]);
  });

  // 1. Тест на тонкую стенку шаблона (< 1.0 мм)
  it("Test 1: Thin template wall (< 1.0 mm) yields 'thinWall' warning with Russian description", () => {
    const imp = makeImplant([0, 0, 0]);
    const issues = validateGuide({
      implants: [imp],
      params: makeParams({ wallMm: 0.8 }),
    });

    const thinWallIssue = issues.find((i) => i.code === "thinWall");
    assert.ok(thinWallIssue, "thinWall issue must be generated");
    assert.strictEqual(thinWallIssue.severity, "warning");
    assert.strictEqual(thinWallIssue.detail, "0.8 мм");
    assert.ok(thinWallIssue.messageRu.includes("Толщина стенки шаблона"));
    assert.ok(thinWallIssue.messageRu.includes("0.8 мм"));
  });

  // 2. Тест на узкий канал сверла (< 1.8 мм)
  it("Test 2: Narrow drill channel (< 1.8 mm) yields 'narrowChannel' warning with Russian description", () => {
    // sleeveDiameter 2.0 mm with sleeveSeat=true, sleeveWallMm=0.9 -> innerD = 0.5 mm -> radius = 0.35 mm -> diameter = 0.7 mm < 1.8 mm
    const narrowImp = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-narrow", 2.0);
    const issues = validateGuide({
      implants: [narrowImp],
      params: makeParams({ sleeveSeat: true, sleeveWallMm: 0.9, channelTolMm: 0.1 }),
    });

    const narrowIssue = issues.find((i) => i.code === "narrowChannel");
    assert.ok(narrowIssue, "narrowChannel issue must be generated");
    assert.strictEqual(narrowIssue.severity, "warning");
    assert.strictEqual(narrowIssue.implantId, "imp-narrow");
    assert.ok(narrowIssue.messageRu.includes("Диаметр направляющего канала"));
    assert.strictEqual(narrowIssue.detail, "0.7 мм");
  });

  // 3. Тест на тонкую перемычку между близко расположенными имплантами (< 1.0 мм)
  it("Test 3: Thin web between closely spaced implants yields 'thinWeb' error", () => {
    // Two implants with 3.8 mm distance between axes.
    // drillRadius for each is 1.7 mm -> total drill cylinder radius = 3.4 mm.
    // Gap = 3.8 - 3.4 = 0.4 mm (< MIN_WALL_MM = 1.0 mm).
    const impA = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-A", 5.0);
    const impB = makeImplant([3.8, 0, 0], [0, 0, 1], 10, "imp-B", 5.0);

    const issues = validateGuide({
      implants: [impA, impB],
      params: makeParams(),
    });

    const webIssue = issues.find((i) => i.code === "thinWeb");
    assert.ok(webIssue, "thinWeb issue must be generated");
    assert.strictEqual(webIssue.severity, "error");
    assert.strictEqual(webIssue.implantId, "imp-A");
    assert.strictEqual(webIssue.pairImplantId, "imp-B");
    assert.strictEqual(webIssue.detail, "0.4 мм");
    assert.ok(webIssue.messageRu.includes("Недостаточная толщина перемычки"));

    // Check intersecting drill channels (collision: gap < 0)
    const impC = makeImplant([2.0, 0, 0], [0, 0, 1], 10, "imp-C", 5.0);
    const collisionIssues = validateGuide({
      implants: [impA, impC],
      params: makeParams(),
    });
    const collisionIssue = collisionIssues.find((i) => i.code === "thinWeb");
    assert.ok(collisionIssue);
    assert.strictEqual(collisionIssue.severity, "error");
    assert.ok(collisionIssue.messageRu.includes("Пересечение сверлильных каналов"));
  });

  // 4. Тест на безопасность траектории сверла (сверло с овершутом 2мм задевает нерв, даже если тело импланта формально не касается)
  it("Test 4: Drill trajectory safety with 2.0 mm overshoot detects nerve collision ('drillHitsNerve')", () => {
    // Implant body: entry [0, 0, 0], axis [0, 0, 1], length = 10.0 mm -> apex is at [0, 0, 10.0].
    // Extended drill trajectory: tip reaches [0, 0, 12.0] (+2.0 mm overshoot).
    // Drill radius = 1.7 mm.
    // Nerve canal polyline runs along X at Z = 11.0 mm, Y = 0 mm, radius = 1.0 mm.
    //
    // Notice: The implant body [0, 0, 0] -> [0, 0, 10.0] apex is 1.0 mm away from Z = 11.0.
    // The implant body does not reach the nerve centerline at Z = 11.0!
    // However, the drill bur penetrates to Z = 12.0 mm.
    // The segment [0, 0, 0] -> [0, 0, 12.0] intersects Z = 11.0 at [0, 0, 11.0].
    // Center-to-center distance is 0.0 mm.
    // Clearance = 0.0 - 1.0 (nerve radius) - 1.7 (drill radius) = -2.7 mm (< 0 mm, direct drill collision)!
    const imp = makeImplant([0, 0, 0], [0, 0, 1], 10.0, "imp-nerve-danger", 5.0);
    const nerveMarker = makeMarker(
      "mandibular-nerve",
      "nerve",
      [
        [-20, 0, 11.0],
        [20, 0, 11.0],
      ],
      1.0,
    );

    const issues = validateGuide({
      implants: [imp],
      params: makeParams(),
      anatomy: [nerveMarker],
      thresholds: { nerve: 2.0, sinus: 1.0 },
    });

    const nerveIssue = issues.find((i) => i.code === "drillHitsNerve");
    assert.ok(nerveIssue, "drillHitsNerve collision must be generated");
    assert.strictEqual(nerveIssue.severity, "error");
    assert.strictEqual(nerveIssue.implantId, "imp-nerve-danger");
    assert.strictEqual(nerveIssue.detail, "-2.7 мм");
    assert.ok(nerveIssue.messageRu.includes("Прямая коллизия"));
    assert.ok(nerveIssue.messageRu.includes("нижнечелюстным нервом"));
  });

  it("detects sinus floor proximity and perforation via 'drillHitsSinus'", () => {
    // Implant apex at [0, 0, 10.0], drill tip at [0, 0, 12.0], drill radius = 1.7 mm.
    // Sinus floor at Z = 13.5 mm, radius = 0.5 mm, threshold = 1.0 mm.
    // Distance from drill tip [0, 0, 12.0] to sinus at Z = 13.5 is 1.5 mm.
    // Clearance = 1.5 - 0.5 - 1.7 = -0.7 mm (< 0 mm -> perforation error).
    const imp = makeImplant([0, 0, 0], [0, 0, 1], 10.0, "imp-sinus", 5.0);
    const sinusMarker = makeMarker("maxillary-sinus", "sinus", [[-20, 0, 13.5], [20, 0, 13.5]], 0.5);

    const issues = validateGuide({
      implants: [imp],
      params: makeParams(),
      anatomy: [sinusMarker],
      thresholds: { nerve: 2.0, sinus: 1.0 },
    });

    const sinusIssue = issues.find((i) => i.code === "drillHitsSinus");
    assert.ok(sinusIssue, "drillHitsSinus must be detected");
    assert.strictEqual(sinusIssue.severity, "error");
    assert.ok(sinusIssue.messageRu.includes("Перфорация дна верхнечелюстной пазухи"));
  });

  // 5. Тест на чистый безопасный шаблон (0 issues)
  it("Test 5: Clean and safe surgical guide template returns exactly 0 issues", () => {
    const imp1 = makeImplant([0, 0, 0], [0, 0, 1], 10, "imp-clean-1", 5.0);
    const imp2 = makeImplant([20, 0, 0], [0, 0, 1], 10, "imp-clean-2", 5.0);
    // Nerve canal safely far below at Z = 30.0 mm
    const safeNerve = makeMarker("safe-nerve", "nerve", [[-50, 0, 30], [50, 0, 30]], 1.0);

    const issues = validateGuide({
      implants: [imp1, imp2],
      params: makeParams({ wallMm: 1.5 }),
      anatomy: [safeNerve],
      thresholds: { nerve: 2.0, sinus: 1.0 },
    });

    assert.strictEqual(issues.length, 0, "Clean guide must have 0 issues");
  });

  // 6. Проверка генерации А4 протокола без эмодзи по Мандату 8d п. 7
  it("Test 6: Formats formal A4 validation protocol strictly without cartoon emojis (Mandate 8d #7)", () => {
    const imp = makeImplant([10, 15, 0], [0, 0, 1], 10, "tooth-46", 5.0);
    const input: GuideCheckInput = {
      implants: [imp],
      params: makeParams(),
      anatomy: [],
    };

    const protocolClean = formatGuideValidationA4Protocol({
      input,
      patientName: "Барабаш С.В.",
      doctorName: "Д-р Смирнов А.П.",
      clinicName: "Стоматология ДЕНТЕ",
    });

    // Check required clinical sections
    assert.ok(protocolClean.includes("ПРОТОКОЛ ВАЛИДАЦИИ ХИРУРГИЧЕСКОГО НАВИГАЦИОННОГО ШАБЛОНА"));
    assert.ok(protocolClean.includes("1. ТЕХНОЛОГИЧЕСКИЕ ПАРАМЕТРЫ ШАБЛОНА (SLA/DLP 3D-PRINTING)"));
    assert.ok(protocolClean.includes("2. СПЕЦИФИКАЦИЯ ИМПЛАНТАТОВ И ТРАЕКТОРИЙ СВЕРЛЕНИЯ"));
    assert.ok(protocolClean.includes("3. РЕЗУЛЬТАТЫ ПРОВЕРКИ БЕЗОПАСНОСТИ И ВЫЯВЛЕННЫЕ ЗАМЕЧАНИЯ"));
    assert.ok(protocolClean.includes("4. ИТОГОВЫЙ КЛИНИЧЕСКИЙ ВЕРДИКТ"));
    assert.ok(protocolClean.includes("5. ВЕРИФИКАЦИЯ И ПОДПИСИ"));
    assert.ok(protocolClean.includes("Барабаш С.В."));
    assert.ok(protocolClean.includes("Д-р Смирнов А.П."));
    assert.ok(protocolClean.includes("[ДОПУЩЕНО К 3D-ПЕЧАТИ И КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ]"));

    // Rigorous regex test proving 100% absence of emojis per Mandate 8d item 7
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    assert.strictEqual(
      emojiRegex.test(protocolClean),
      false,
      "Protocol must not contain any emojis under Mandate 8d item 7",
    );

    // Also test protocol with issues present
    const badInput: GuideCheckInput = {
      implants: [makeImplant([0, 0, 0])],
      params: makeParams({ wallMm: 0.6 }),
    };
    const protocolWithIssues = formatGuideValidationA4Protocol(badInput);
    assert.ok(protocolWithIssues.includes("[ТРЕБУЕТСЯ ВНИМАНИЕ: ВЫЯВЛЕНЫ ТЕХНОЛОГИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ]"));
    assert.ok(protocolWithIssues.includes("[ПРЕДУПРЕЖДЕНИЕ] [thinWall]"));
    assert.strictEqual(
      emojiRegex.test(protocolWithIssues),
      false,
      "Protocol with warnings must not contain any emojis",
    );
  });

  it("exports functional aliases for integration compatibility", () => {
    assert.strictEqual(validateGuidePlan, validateGuide);
    assert.strictEqual(validateSurgicalGuide, validateGuide);
  });
});
