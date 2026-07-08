import { describe, it, mock, afterEach, beforeEach } from "node:test";
import assert from "node:assert";
import * as clinicalQuery from "../clinicalQuery.js";
import { db } from "../client.js";

describe("updateClinicalRuleInDb", () => {
  let dbUpdateMock: ReturnType<typeof mock.fn>;
  let dbSetMock: ReturnType<typeof mock.fn>;
  let dbWhereMock: ReturnType<typeof mock.fn>;
  let dbUpdateReturningMock: ReturnType<typeof mock.fn>;

  let dbSelectMock: ReturnType<typeof mock.fn>;
  let dbFromMock: ReturnType<typeof mock.fn>;
  let dbSelectWhereMock: ReturnType<typeof mock.fn>;
  let dbLimitMock: ReturnType<typeof mock.fn>;

  beforeEach(() => {
    // Mock for DB UPDATE
    dbUpdateReturningMock = mock.fn(async () => {
      return [{
        id: "rule-1",
        organizationId: "org-1",
        title: "Updated Title",
        category: "therapy",
        specialty: "therapist",
        action: "show_warning",
        severity: "warning",
        ownerRole: "doctor",
        triggerServiceIdsJson: JSON.stringify(["srv-1"]),
        requiredServiceIdsJson: JSON.stringify([]),
        requiresCompletedServiceIdsJson: JSON.stringify([]),
        blockedServiceIdsJson: JSON.stringify([]),
        condition: null,
        warningText: "Test warning",
        patientText: "Patient warning",
        isActive: true,
      }];
    });
    dbWhereMock = mock.fn(() => ({ returning: dbUpdateReturningMock }));
    dbSetMock = mock.fn(() => ({ where: dbWhereMock }));
    dbUpdateMock = mock.method(db, 'update', () => ({ set: dbSetMock }));

    // Mock for DB SELECT (getClinicalRuleById)
    dbLimitMock = mock.fn(async () => {
      return [{
        id: "rule-1",
        organizationId: "org-1",
        title: "Original Title",
        category: "therapy",
        specialty: "therapist",
        action: "show_warning",
        severity: "warning",
        ownerRole: "doctor",
        triggerServiceIdsJson: JSON.stringify(["srv-1"]),
        requiredServiceIdsJson: JSON.stringify([]),
        requiresCompletedServiceIdsJson: JSON.stringify([]),
        blockedServiceIdsJson: JSON.stringify([]),
        condition: null,
        warningText: "Original warning",
        patientText: "Original patient warning",
        isActive: true,
      }];
    });
    dbSelectWhereMock = mock.fn(() => ({ limit: dbLimitMock }));
    dbFromMock = mock.fn(() => ({ where: dbSelectWhereMock }));
    dbSelectMock = mock.method(db, 'select', () => ({ from: dbFromMock }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("throws an error if rule does not exist", async () => {
    dbLimitMock.mock.mockImplementationOnce(async () => []);

    await assert.rejects(
      clinicalQuery.updateClinicalRuleInDb("org-1", { id: "rule-1" }),
      { message: "Правило не найдено" }
    );
  });

  it("updates rule with provided fields and falls back to existing fields", async () => {
    const input = {
      id: "rule-1",
      title: "Updated Title",
      warningText: "Updated warning"
    };

    const result = await clinicalQuery.updateClinicalRuleInDb("org-1", input as any);

    assert.strictEqual(result.title, "Updated Title");
    assert.strictEqual(dbUpdateMock.mock.calls.length, 1);

    const setArgs = dbSetMock.mock.calls[0].arguments[0];
    assert.strictEqual(setArgs.title, "Updated Title");
    assert.strictEqual(setArgs.warningText, "Updated warning");
    // Should fallback to existing value for category
    assert.strictEqual(setArgs.category, "therapy");
    // Should stringify array arrays correctly
    assert.strictEqual(setArgs.triggerServiceIdsJson, JSON.stringify(["srv-1"]));
  });

  it("handles empty arrays for triggerServiceIds", async () => {
    const input = {
      id: "rule-1",
      triggerServiceIds: [],
    };

    await clinicalQuery.updateClinicalRuleInDb("org-1", input as any);

    const setArgs = dbSetMock.mock.calls[0].arguments[0];
    assert.strictEqual(setArgs.triggerServiceIdsJson, "[]");
  });

  it("handles null/undefined conditions correctly", async () => {
    const input = {
      id: "rule-1",
      condition: "some condition",
    };

    await clinicalQuery.updateClinicalRuleInDb("org-1", input as any);

    const setArgs = dbSetMock.mock.calls[0].arguments[0];
    assert.strictEqual(setArgs.condition, "some condition");
  });

  it("throws an error if update fails to return a record", async () => {
    dbUpdateReturningMock.mock.mockImplementationOnce(async () => []);

    await assert.rejects(
      clinicalQuery.updateClinicalRuleInDb("org-1", { id: "rule-1" }),
      { message: "Failed to update clinical rule" }
    );
  });
});
