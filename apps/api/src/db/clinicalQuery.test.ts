import { test, describe } from "node:test";
import assert from "node:assert";
import { db } from "./client.js";
import { getTreatmentPlanItemsForPatient } from "./clinicalQuery.js";

describe("clinicalQuery - getTreatmentPlanItemsForPatient", () => {
  test("should return treatment plan items for a valid organization and patient", async (t) => {
    const mockData = [{
      id: "treatment-item-1",
      organizationId: "org-1",
      patientId: "patient-1",
      title: "Test Item",
      quantity: "1",
      priceRub: 1000,
      unitPriceRub: 1000,
      discountRub: 0,
      status: "proposed"
    }];

    t.mock.method(db, 'select', () => ({
      from: () => ({
        where: async () => mockData
      })
    }));

    const result = await getTreatmentPlanItemsForPatient("org-1", "patient-1");
    assert.deepStrictEqual(result, mockData);
  });

  test("should return empty array when no items exist", async (t) => {
    t.mock.method(db, 'select', () => ({
      from: () => ({
        where: async () => []
      })
    }));

    const result = await getTreatmentPlanItemsForPatient("org-1", "patient-1");
    assert.deepStrictEqual(result, []);
  });
});
