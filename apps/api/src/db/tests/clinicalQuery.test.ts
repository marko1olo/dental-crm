import test, { mock } from "node:test";
import assert from "node:assert";
import { getClinicalRuleById, getClinicalRules, evaluateClinicalRulesInDb, createClinicalRuleInDb, updateClinicalRuleInDb } from "../clinicalQuery.js";
import { randomUUID } from "node:crypto";
import { db } from "../client.js";

test("getClinicalRuleById", async (t) => {
  const orgId = randomUUID();
  const ruleId = randomUUID();

  const mockRecord = {
    id: ruleId,
    organizationId: orgId,
    title: "Test Rule",
    category: "workflow",
    specialty: "general",
    action: "block_service",
    severity: "blocker",
    ownerRole: "admin",
    triggerServiceIdsJson: '["test-service"]',
    requiredServiceIdsJson: '[]',
    requiresCompletedServiceIdsJson: '[]',
    blockedServiceIdsJson: '[]',
    condition: "true",
    warningText: "Warning",
    patientText: "Patient warning",
    isActive: true
  };

  t.afterEach(() => {
    mock.restoreAll();
  });

  await t.test("should retrieve an existing clinical rule", async () => {
    mock.method(db, 'select', () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mockRecord]
        })
      })
    }));

    const fetched = await getClinicalRuleById(orgId, ruleId);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, ruleId);
    assert.strictEqual(fetched.organizationId, orgId);
    assert.strictEqual(fetched.title, "Test Rule");
    assert.deepStrictEqual(fetched.triggerServiceIds, ["test-service"]);
  });

  await t.test("should return null for non-existent rule", async () => {
    mock.method(db, 'select', () => ({
      from: () => ({
        where: () => ({
          limit: async () => []
        })
      })
    }));

    const fetched = await getClinicalRuleById(orgId, ruleId);
    assert.strictEqual(fetched, null);
  });

  await t.test("should handle malformed JSON correctly", async () => {
    mock.method(db, 'select', () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{
            ...mockRecord,
            triggerServiceIdsJson: 'invalid-json'
          }]
        })
      })
    }));

    const fetched = await getClinicalRuleById(orgId, ruleId);
    assert.ok(fetched);
    assert.deepStrictEqual(fetched.triggerServiceIds, []); // Fallback to empty array
  });
});
