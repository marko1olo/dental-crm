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
  // price_id в treatment_plan_items_new объявлен notNull и без ссылки на
  // прайс-лист: планировщик отзывов его не читает, но пропускать колонку нельзя.
  let priceId: string;

  beforeEach(async () => {
    orgId = randomUUID();
    patientId = randomUUID();
    planId = randomUUID();
    priceId = randomUUID();

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
      organizationId: orgId,
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
      // organization_id стал NOT NULL миграцией 0147: позиция сметы без клиники не
      // принадлежит никому, и запрос с отбором по клинике её не видит. До миграции
      // колонка пропускалась, и вставка опиралась на дырку изоляции.
      organizationId: orgId,
      planId,
      priceId,
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
    const task = tasks[0];
    assert.ok(task);
    assert.ok(task.title.includes("зуб 11"));
    assert.strictEqual(task.intent, "recall");
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
      // organization_id стал NOT NULL миграцией 0147: позиция сметы без клиники не
      // принадлежит никому, и запрос с отбором по клинике её не видит. До миграции
      // колонка пропускалась, и вставка опиралась на дырку изоляции.
      organizationId: orgId,
      planId,
      priceId,
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
    const task = tasks[0];
    assert.ok(task);
    assert.ok(task.title.includes("зуб 31"));
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
      // organization_id стал NOT NULL миграцией 0147: позиция сметы без клиники не
      // принадлежит никому, и запрос с отбором по клинике её не видит. До миграции
      // колонка пропускалась, и вставка опиралась на дырку изоляции.
      organizationId: orgId,
      planId,
      priceId,
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
      // organization_id стал NOT NULL миграцией 0147: позиция сметы без клиники не
      // принадлежит никому, и запрос с отбором по клинике её не видит. До миграции
      // колонка пропускалась, и вставка опиралась на дырку изоляции.
      organizationId: orgId,
      planId,
      priceId,
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
      // organization_id стал NOT NULL миграцией 0147: позиция сметы без клиники не
      // принадлежит никому, и запрос с отбором по клинике её не видит. До миграции
      // колонка пропускалась, и вставка опиралась на дырку изоляции.
      organizationId: orgId,
      planId,
      priceId,
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
