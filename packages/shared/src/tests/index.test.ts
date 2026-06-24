import { test, describe } from "node:test";
import assert from "node:assert";
import {
  documentRequiresPaidRecord,
  documentAmountSource,
  documentKindSchema,
  buildRuleBasedVisitDraftFromTranscript,
} from "../index.js";

describe("documentAmountSource", () => {
  test("returns expected amount source for different document kinds", () => {
    // Expected 'paid'
    assert.strictEqual(documentAmountSource("completed_works_act"), "paid");
    assert.strictEqual(
      documentAmountSource("tax_deduction_certificate"),
      "paid",
    );

    // Expected 'planned'
    assert.strictEqual(
      documentAmountSource("paid_medical_services_contract"),
      "planned",
    );
    assert.strictEqual(documentAmountSource("treatment_plan"), "planned");

    // Expected 'none'
    assert.strictEqual(documentAmountSource("informed_consent"), "none");
    assert.strictEqual(
      documentAmountSource("procedure_specific_consent_packet"),
      "none",
    );
    assert.strictEqual(documentAmountSource("anesthesia_consent_log"), "none");
    assert.strictEqual(
      documentAmountSource("prescription_medication_order"),
      "none",
    );
  });

  test("handles all valid document kinds without throwing and returns a valid source", () => {
    const validSources = ["none", "planned", "paid"];
    for (const kind of documentKindSchema.options) {
      const result = documentAmountSource(kind);
      assert.ok(
        validSources.includes(result),
        `Invalid source '${result}' for document kind '${kind}'`,
      );
    }
  });
});

describe("documentRequiresPaidRecord", () => {
  test("returns expected boolean for different document kinds", () => {
    // Requires paid record
    assert.strictEqual(documentRequiresPaidRecord("completed_works_act"), true);
    assert.strictEqual(
      documentRequiresPaidRecord("tax_deduction_certificate"),
      true,
    );
    assert.strictEqual(documentRequiresPaidRecord("payment_receipt"), true);
    assert.strictEqual(
      documentRequiresPaidRecord("payment_refund_correction_request"),
      true,
    );
    assert.strictEqual(
      documentRequiresPaidRecord("legacy_tax_deduction_certificate"),
      true,
    );
    assert.strictEqual(
      documentRequiresPaidRecord("tax_deduction_registry"),
      true,
    );

    // Doesn't require paid record
    assert.strictEqual(
      documentRequiresPaidRecord("paid_medical_services_contract"),
      false,
    );
    assert.strictEqual(documentRequiresPaidRecord("treatment_plan"), false);
    assert.strictEqual(documentRequiresPaidRecord("payment_invoice"), false);
    assert.strictEqual(documentRequiresPaidRecord("informed_consent"), false);
    assert.strictEqual(
      documentRequiresPaidRecord("prescription_medication_order"),
      false,
    );
    assert.strictEqual(documentRequiresPaidRecord("lab_work_order"), false);
  });

  test("handles all valid document kinds without throwing", () => {
    for (const kind of documentKindSchema.options) {
      const result = documentRequiresPaidRecord(kind);
      assert.strictEqual(typeof result, "boolean");
    }
  });
});

describe("buildRuleBasedVisitDraftFromTranscript", () => {
  test("happy path: extracts all sections perfectly from a structured transcript", () => {
    const transcript =
      "Жалобы на боль в 36 зубе при накусывании. Анамнез: зуб болит уже третий день, аллергии на медикаменты нет. Объективно: глубокая кариозная полость, перкуссия резко болезненна. Диагноз: острый верхушечный периодонтит 36 зуба. Лечение: анестезия, коффердам, экстирпация пульпы, механическая и медикаментозная обработка корневых каналов, пломбирование каналов гуттаперчей, временная пломба.";
    const draft = buildRuleBasedVisitDraftFromTranscript(transcript);

    // Complaint
    assert.strictEqual(
      draft.complaint,
      "на боль в 36 зубе при накусывании",
    );

    // Anamnesis
    assert.strictEqual(
      draft.anamnesis,
      "зуб болит уже третий день, аллергии на медикаменты нет",
    );

    // Objective
    assert.strictEqual(
      draft.objectiveStatus,
      "глубокая кариозная полость, перкуссия резко болезненна",
    );

    // Diagnosis
    assert.strictEqual(
      draft.diagnosis,
      "острый верхушечный периодонтит 36 зуба",
    );

    // Treatment
    assert.strictEqual(
      draft.treatmentPlan,
      "анестезия, коффердам, экстирпация пульпы, механическая и медикаментозная обработка корневых каналов, пломбирование каналов гуттаперчей, временная пломба",
    );

    // Quality checks
    assert.ok(draft.quality);
    assert.strictEqual(draft.quality.level, "ready");
    assert.ok(draft.quality.confidence > 0.8);
    assert.ok(draft.quality.detectedToothCodes.includes("36"));
  });

  test("fallback mechanisms: applies fallbacks when sections are missing", () => {
    const transcript = "Просто болит зуб";
    const draft = buildRuleBasedVisitDraftFromTranscript(transcript);

    // If complaint is present, it will be the text itself since no other sections exist.
    assert.strictEqual(draft.complaint, "Просто болит зуб");

    // Check fallbacks
    assert.ok(draft.anamnesis?.includes("Анамнез уточнить"));
    assert.ok(draft.objectiveStatus?.includes("Просто болит зуб"));
    assert.strictEqual(draft.diagnosis, null);
    assert.ok(draft.treatmentPlan?.includes("План: маршрутизация"));

    assert.ok(draft.quality);
    assert.strictEqual(draft.quality.level, "needs_more_dictation");
  });

  test("tooth extraction: correctly identifies multiple tooth codes", () => {
    const transcript = "Кариес на 11 и 21 зубах. Также нужно посмотреть 46 и 47. 8-ки не беспокоят.";
    const draft = buildRuleBasedVisitDraftFromTranscript(transcript);

    assert.ok(draft.quality);
    const teeth = draft.quality.detectedToothCodes;
    assert.ok(teeth.includes("11"));
    assert.ok(teeth.includes("21"));
    assert.ok(teeth.includes("46"));
    assert.ok(teeth.includes("47"));
  });

  test("empty/garbage transcript: falls back gracefully", () => {
    const draft = buildRuleBasedVisitDraftFromTranscript("");

    assert.strictEqual(draft.complaint, "Жалобы не распознаны, уточнить у пациента.");
    assert.ok(draft.anamnesis?.includes("Анамнез уточнить"));

    assert.ok(draft.quality);
    assert.strictEqual(draft.quality.level, "needs_more_dictation");
    assert.strictEqual(draft.quality.confidence, 0.25); // Minimum confidence
  });

  test("specialty differences: implantologist specialty alters fallbacks", () => {
    const transcript = "Просто короткая запись";

    const universalDraft = buildRuleBasedVisitDraftFromTranscript(transcript, "universal");
    const implantologistDraft = buildRuleBasedVisitDraftFromTranscript(transcript, "implantologist");

    // Implantologist should have a different objective fallback
    assert.notStrictEqual(universalDraft.objectiveStatus, implantologistDraft.objectiveStatus);
    assert.ok(implantologistDraft.objectiveStatus?.includes("уточнить зону адентии"));
  });
});
