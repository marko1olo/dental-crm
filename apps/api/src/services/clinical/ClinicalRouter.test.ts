import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ClinicalRouter } from "./ClinicalRouter.js";

describe("ClinicalRouter", () => {
  test("creates handoff task for PHASE_1_THERAPY", async () => {
    const router = new ClinicalRouter();
    const task = await router.handlePhaseCompletion(
      "org-1",
      "pat-2",
      "PHASE_1_THERAPY",
      "Patient is ready.",
      ["11", "21"]
    );

    assert.notEqual(task, null);
    assert.equal(task!.organizationId, "org-1");
    assert.equal(task!.patientId, "pat-2");
    assert.equal(task!.taskType, "prosthetics_handoff");
    assert.equal(task!.title, "Phase II: Orthopedic Handoff");
    assert.equal(
      task!.description,
      "Therapy phase completed for teeth: 11, 21. Handoff notes: Patient is ready.. Please review for prosthetics."
    );
    assert.equal(task!.status, "pending");
    assert.ok(task!.id);
  });

  test("creates handoff task for PHASE_2_SURGERY", async () => {
    const router = new ClinicalRouter();
    const task = await router.handlePhaseCompletion(
      "org-1",
      "pat-2",
      "PHASE_2_SURGERY",
      "No complications.",
      ["44"]
    );

    assert.notEqual(task, null);
    assert.equal(task!.taskType, "prosthetics_handoff");
    assert.equal(task!.title, "Phase II: Orthopedic Handoff after Surgery");
    assert.equal(
      task!.description,
      "Surgery completed for teeth: 44. Notes: No complications.. Proceed with prosthetics after healing."
    );
    assert.equal(task!.status, "pending");
  });

  test("returns null for unknown phase", async () => {
    const router = new ClinicalRouter();
    const task = await router.handlePhaseCompletion(
      "org-1",
      "pat-2",
      "UNKNOWN_PHASE",
      "Notes",
      ["11"]
    );

    assert.equal(task, null);
  });
});
