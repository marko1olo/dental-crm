import { test, describe } from "node:test";
import assert from "node:assert";
import { getPaymentsByPatientIdInDb } from "./billingQuery.js";
import { db } from "./client.js";

describe("getPaymentsByPatientIdInDb", () => {
  test("returns empty array when no payments are found", async (t) => {
    t.mock.method(db, "select", () => ({
      from: () => ({
        where: async () => []
      })
    }));

    const result = await getPaymentsByPatientIdInDb("org-1", "patient-1");
    assert.deepStrictEqual(result, []);
  });

  test("maps createdAt and updatedAt dates to ISO strings correctly", async (t) => {
    t.mock.method(db, "select", () => ({
      from: () => ({
        where: async () => [
          {
            id: "1",
            organizationId: "org-1",
            patientId: "patient-1",
            amountRub: 1000,
            status: "paid",
            createdAt: new Date("2023-10-01T12:00:00Z"),
            updatedAt: new Date("2023-10-02T12:00:00Z")
          },
          {
            id: "2",
            organizationId: "org-1",
            patientId: "patient-1",
            amountRub: 500,
            status: "pending",
            createdAt: new Date("2023-10-03T12:00:00Z"),
            updatedAt: new Date("2023-10-04T12:00:00Z")
          }
        ]
      })
    }));

    const result = await getPaymentsByPatientIdInDb("org-1", "patient-1");

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, "1");
    assert.strictEqual(result[0].createdAt, "2023-10-01T12:00:00.000Z");
    assert.strictEqual(result[0].updatedAt, "2023-10-02T12:00:00.000Z");
    assert.strictEqual(result[1].id, "2");
    assert.strictEqual(result[1].createdAt, "2023-10-03T12:00:00.000Z");
    assert.strictEqual(result[1].updatedAt, "2023-10-04T12:00:00.000Z");
  });
});
