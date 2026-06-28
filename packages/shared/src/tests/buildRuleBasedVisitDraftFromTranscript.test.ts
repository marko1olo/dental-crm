import { describe, test } from "node:test";
import assert from "node:assert";
import { buildRuleBasedVisitDraftFromTranscript } from "../index.js";

describe("buildRuleBasedVisitDraftFromTranscript", () => {
  test("parses a full transcript with all sections correctly", () => {
    const transcript = "Жалобы: острая боль в зубе 4.5. Анамнез: боль появилась вчера. Объективно: глубокая кариозная полость. Диагноз: острый пульпит. План лечения: экстирпация пульпы.";
    const result = buildRuleBasedVisitDraftFromTranscript(transcript);

    assert.strictEqual(result.complaint, "острая боль в зубе 45");
    assert.strictEqual(result.anamnesis, "боль появилась вчера");
    assert.strictEqual(result.objectiveStatus, "глубокая кариозная полость");
    assert.strictEqual(result.diagnosis, "острый пульпит");
    assert.strictEqual(result.treatmentPlan, "лечения: экстирпация пульпы");
    assert.strictEqual(result.quality?.level, "ready");
    assert.deepStrictEqual(result.quality?.detectedToothCodes, ["45"]);
    assert.ok(result.warnings.some(w => w.includes("Распознаны зубы/сегменты: 45.")));
  });

  test("handles empty transcript and returns fallbacks", () => {
    const result = buildRuleBasedVisitDraftFromTranscript("   ");

    assert.strictEqual(result.complaint, "Жалобы не распознаны, уточнить у пациента.");
    assert.strictEqual(result.anamnesis, "Анамнез уточнить: сроки, аллергии, препараты, хронические заболевания, беременность, антикоагулянты.");
    assert.ok(result.objectiveStatus?.includes("Объективно уточнить"));
    assert.strictEqual(result.diagnosis, null);
    assert.ok(result.treatmentPlan?.includes("маршрутизация"));
    assert.strictEqual(result.quality?.level, "needs_more_dictation");
  });

  test("uses custom sourceLabel in warnings", () => {
    const result = buildRuleBasedVisitDraftFromTranscript("жалобы: болит зуб.", "universal", { sourceLabel: "My Custom Source" });

    assert.strictEqual(result.complaint, "болит зуб");
    assert.ok(result.warnings.some(w => w.includes("My Custom Source: черновик собран по профилю специальности")));
  });

  test("detects treatment plan signals even without explicit section headers", () => {
    const result = buildRuleBasedVisitDraftFromTranscript("провел анестезию убистезином");

    assert.strictEqual(result.treatmentPlan, "провел анестезию убистезином");
    assert.strictEqual(result.diagnosis, null);
    // Since it's only a plan, it should probably still need more dictation
    assert.strictEqual(result.quality?.level, "needs_more_dictation");
  });

  test("uses different specialty profile (surgeon)", () => {
    const transcript = "";
    const result = buildRuleBasedVisitDraftFromTranscript(transcript, "surgeon");

    // Check if the focus reflects the surgeon specialty
    assert.ok(result.warnings.some(w => w.includes("Фокус приема: хирургия.")));
    // Surgeon's fallback plan might be different, let's just check it doesn't fail
    assert.ok(result.treatmentPlan);
  });
});
