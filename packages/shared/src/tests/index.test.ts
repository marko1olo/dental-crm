import { test, describe } from "node:test";
import assert from "node:assert";
import {
  documentRequiresPaidRecord,
  documentAmountSource,
  documentKindSchema,
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
