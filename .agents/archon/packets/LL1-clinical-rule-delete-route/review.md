# Adversarial review — LL1-clinical-rule-delete-route (f31d3378f)

Reviewer: independent. READ-ONLY. Written incrementally.

## VERDICT: PENDING

(Verdict line rewritten at the end. If this file still says PENDING the reviewer died mid-pass.)

---

## 6. Attribution — CHECKED FIRST (cheap, blocking)

`git log -1 --format=%(trailers) f31d3378f` → **prints nothing (empty)**. PASS.

Author: `marko1olo <marko1olo@users.noreply.github.com>`. Subject:
`[ARCHON] fix(клинические правила): удаление правила не работало никогда — маршрута DELETE не существовало`
Cyrillic renders clean in subject — no mojibake at the subject level.

Body: read in full. Contains no `Co-Authored-By`, no `anthropic`, no `Generated with`. Grep of body
pending below.

---

## Diff inventory (mine, from `git show f31d3378f`)

3 files, 350 insertions / 1 deletion:
- `apps/api/src/db/clinicalQuery.ts` +39 — new `deleteClinicalRuleInDb`
- `apps/api/src/routes/clinical.ts` +44/-1 — new `app.delete("/api/clinical/rules/:ruleId")` + import
- `apps/api/src/tests/routes/clinicalRuleDelete.test.ts` +268 — new test file

The load-bearing lines (quoted verbatim from the diff):

```
+  const deleted = await db
+    .delete(schema.clinicalRules)
+    .where(and(eq(schema.clinicalRules.organizationId, organizationId), eq(schema.clinicalRules.id, ruleId)))
+    .returning({ id: schema.clinicalRules.id });
```
```
+  app.delete("/api/clinical/rules/:ruleId", async (request, reply) => {
+    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule delete"))) return;
```

This is real work on the stated defect, not a rename. Note: the route also added a `UUID_PATTERN`
400-branch that the brief did not ask for — checking below whether PATCH does the same (mirror
requirement) and whether it can shadow the 401.

(further sections appended as verified)
