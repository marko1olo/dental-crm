import { test } from "node:test";
import assert from "node:assert";
import { GbrMembraneResorptionService } from "./GbrMembraneResorptionService.js";

test("GbrMembraneResorptionService should generate correct timeline for Bio-Gide", () => {
  const timeline = GbrMembraneResorptionService.generateTimeline("bio_gide");
  assert.strictEqual(timeline.length, 2);
  assert.strictEqual(timeline[0]!.week, 2);
  assert.strictEqual(timeline[1]!.week, 24);
  assert.strictEqual(timeline[1]!.actionRequired, false);
});

test("GbrMembraneResorptionService should generate correct timeline for d-PTFE", () => {
  const timeline = GbrMembraneResorptionService.generateTimeline("d_ptfe");
  // Expected: 2w (control), 24w (CT), 24w (removal planning) - wait, removal planning should be 24-36. 
  // Let's verify timeline.
  assert.ok(timeline.some(p => p.week === 24 && p.actionRequired === true));
  assert.ok(timeline.some(p => p.week === 24 && p.titleRu.includes("удаления")));
});
