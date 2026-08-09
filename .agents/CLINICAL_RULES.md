# 🩺 Clinical Rules Engine

This document explains the DENTE Clinical Rules Engine logic, database constraints, and warning/blocking trigger evaluations.

---

## ⚙️ Core Logic Flow

The clinical rules engine checks patient visit plans against defined rules to ensure medical compliance and catch mistakes before services are performed.

*   **Trigger Conditions:** Rules are triggered when specific services (`triggerServiceIds`) are planned or scheduled during the visit.
*   **Safety Requirements:**
    *   **Required Services:** Services that MUST be scheduled alongside the triggered service (`requiredServiceIds`).
    *   **Prior Completed Services:** Services that MUST have been completed in previous visits (`requiresCompletedServiceIds`).
    *   **Blocked Services:** Services that are contraindicated and CANNOT be scheduled together (`blockedServiceIds`).

---

## 📋 Evaluation Pipeline (`apps/api/src/db/clinicalQuery.ts`)

During a visit, the frontend calls `POST /api/clinical/rules/evaluate`.
1.  **Retrieve Rules:** Loads all active rules matching `organizationId` from `clinicalRules` table.
2.  **Match Triggers:** Compares the active list of planned service IDs against each rule's trigger array.
3.  **Evaluate Invariants:**
    *   Finds missing required service IDs: `rule.requiredServiceIds` not present in active plan.
    *   Finds missing completed service IDs: `rule.requiresCompletedServiceIds` not present in patient history.
    *   Finds active blocked service IDs: `rule.blockedServiceIds` present in active plan.
4.  **Resolve Rule:**
    *   If `action === "block_service"`: The rule is resolved ONLY if no completed prerequisites are missing and no blocked services are present.
    *   If `action === "show_warning"` or `action === "schedule_followup"`: The rule is automatically unresolved, prompting warning text output.
5.  **Output Summary:** Summarizes evaluations into active count, unresolved count, blockers (severity `blocker`), and warnings (severity `warning`).

---

## 🗄️ Database Mapping (`apps/api/src/db/schema.ts`)

Table: `clinical_rules`
*   `triggerServiceIdsJson` — JSON stringified array of service ID strings.
*   `requiredServiceIdsJson` — JSON stringified array of service ID strings.
*   `requiresCompletedServiceIdsJson` — JSON stringified array of service ID strings.
*   `blockedServiceIdsJson` — JSON stringified array of service ID strings.
*   `action` — PostgreSQL enum `clinical_rule_action` (`add_required_service`, `block_service`, `show_warning`, `schedule_followup`).
*   `severity` — PostgreSQL enum `clinical_rule_severity` (`info`, `warning`, `blocker`).

---

## 🚨 Rules for Agents

1.  **Use Drizzle Helper JSON Parser:** When mapping database rows, always parse JSON fields using `parseJsonArray` helper from `clinicalQuery.ts` to prevent runtime parse failures on empty strings or null.
2.  **Blocker Severity Gating:** Blockers (`severity === "blocker"` and unresolved) should block UI form submission. Do not bypass clinical blockers in UI validation hooks.
