import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CANONICAL_5_CLINICAL_LAB_STATUSES } from "../dentalLabOrderEngine";
import { CANONICAL_5_KANBAN_COLUMNS } from "../DentalLabOrdersKanbanBoard";

describe("dentalLabZeroMockInquisitor — Smoke Facade", () => {
	it("5-stage canonical orthopedic lifecycle and 5-column kanban board are aligned", () => {
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES.length, 5);
		assert.equal(CANONICAL_5_KANBAN_COLUMNS.length, 5);
		assert.ok(CANONICAL_5_KANBAN_COLUMNS.some((c) => c.id === "ready_in_clinic"));
	});
});
