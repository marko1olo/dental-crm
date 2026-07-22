import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { RecallScheduler } from "../recallScheduler.js";
import { db } from "../../db/client.js";
import {
  patients,
  treatmentPlans,
  treatmentPlanItemsNew,
  communicationTasks,
  organizations,
} from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("RecallScheduler", () => {
  let orgId: string;
  let patientId: string;
  let planId: string;

  beforeEach(async () => {
    orgId = randomUUID();
    patientId = randomUUID();
    planId = randomUUID();

    await db.insert(organizations).values({
      id: orgId,
      name: "Test Org",
    });

    await db.insert(patients).values({
      id: patientId,
      organizationId: orgId,
      fullName: "Test Patient",
      phone: "+1234567890",
      birthDate: "1990-01-01",
    });

    await db.insert(treatmentPlans).values({
      id: planId,
      patientId,
      name: "Test Plan",
      status: "Active",
      totalPrice: "0",
      updatedAt: new Date(), // Will be overridden in tests if needed
    });
  });

  afterEach(async () => {
    await db
      .delete(communicationTasks)
      .where(eq(communicationTasks.patientId, patientId));
    await db
      .delete(treatmentPlanItemsNew)
      .where(eq(treatmentPlanItemsNew.planId, planId));
    await db.delete(treatmentPlans).where(eq(treatmentPlans.id, planId));
    await db.delete(patients).where(eq(patients.id, patientId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  it("should trigger recall for upper jaw (6 months)", async () => {
    // Upper jaw tooth: 11
    // 6 months ago + 1 day
    const itemDate = new Date();
    itemDate.setMonth(itemDate.getMonth() - 6);
    itemDate.setDate(itemDate.getDate() - 1);

    await db
      .update(treatmentPlans)
      .set({ updatedAt: itemDate })
      .where(eq(treatmentPlans.id, planId));

    await db.insert(treatmentPlanItemsNew).values({
      id: randomUUID(),
      planId,
      toothNumber: 11, // Upper jaw
      phase: 2, // Surgery
      quantity: 1,
      price: "1000",
      isBundle: false,
    });

    await RecallScheduler.processOsteointegrationRecalls();

    const tasks = await db
      .select()
      .from(communicationTasks)
      .where(eq(communicationTasks.patientId, patientId));
    assert.strictEqual(tasks.length, 1);
    assert.ok(tasks[0].title.includes("зуб 11"));
    assert.strictEqual(tasks[0].intent, "recall");
  });

  it("should trigger recall for lower jaw (3 months)", async () => {
    // Lower jaw tooth: 31
    // 3 months ago + 1 day
    const itemDate = new Date();
    itemDate.setMonth(itemDate.getMonth() - 3);
    itemDate.setDate(itemDate.getDate() - 1);

    await db
      .update(treatmentPlans)
      .set({ updatedAt: itemDate })
      .where(eq(treatmentPlans.id, planId));

    await db.insert(treatmentPlanItemsNew).values({
      id: randomUUID(),
      planId,
      toothNumber: 31, // Lower jaw
      phase: 2, // Surgery
      quantity: 1,
      price: "1000",
      isBundle: false,
    });

    await RecallScheduler.processOsteointegrationRecalls();

    const tasks = await db
      .select()
      .from(communicationTasks)
      .where(eq(communicationTasks.patientId, patientId));
    assert.strictEqual(tasks.length, 1);
    assert.ok(tasks[0].title.includes("зуб 31"));
  });

  it("should not trigger recall if healing time has not elapsed", async () => {
    // Upper jaw tooth: 11 (needs 6 months)
    // 5 months ago
    const itemDate = new Date();
    itemDate.setMonth(itemDate.getMonth() - 5);

    await db
      .update(treatmentPlans)
      .set({ updatedAt: itemDate })
      .where(eq(treatmentPlans.id, planId));

    await db.insert(treatmentPlanItemsNew).values({
      id: randomUUID(),
      planId,
      toothNumber: 11,
      phase: 2,
      quantity: 1,
      price: "1000",
      isBundle: false,
    });

    await RecallScheduler.processOsteointegrationRecalls();

    const tasks = await db
      .select()
      .from(communicationTasks)
      .where(eq(communicationTasks.patientId, patientId));
    assert.strictEqual(tasks.length, 0);
  });

  it("should ignore items not in phase 2", async () => {
    const itemDate = new Date();
    itemDate.setMonth(itemDate.getMonth() - 7);
    await db
      .update(treatmentPlans)
      .set({ updatedAt: itemDate })
      .where(eq(treatmentPlans.id, planId));

    await db.insert(treatmentPlanItemsNew).values({
      id: randomUUID(),
      planId,
      toothNumber: 11,
      phase: 3, // Prosthetics
      quantity: 1,
      price: "1000",
      isBundle: false,
    });

    await RecallScheduler.processOsteointegrationRecalls();

    const tasks = await db
      .select()
      .from(communicationTasks)
      .where(eq(communicationTasks.patientId, patientId));
    assert.strictEqual(tasks.length, 0);
  });

  it("should ignore items without toothNumber", async () => {
    const itemDate = new Date();
    itemDate.setMonth(itemDate.getMonth() - 7);
    await db
      .update(treatmentPlans)
      .set({ updatedAt: itemDate })
      .where(eq(treatmentPlans.id, planId));

    await db.insert(treatmentPlanItemsNew).values({
      id: randomUUID(),
      planId,
      toothNumber: null,
      phase: 2, // Surgery
      quantity: 1,
      price: "1000",
      isBundle: false,
    });

    await RecallScheduler.processOsteointegrationRecalls();

    const tasks = await db
      .select()
      .from(communicationTasks)
      .where(eq(communicationTasks.patientId, patientId));
    assert.strictEqual(tasks.length, 0);
  });
});
