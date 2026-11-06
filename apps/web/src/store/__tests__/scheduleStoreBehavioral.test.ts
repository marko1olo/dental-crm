/**
 * apps/web/src/store/__tests__/scheduleStoreBehavioral.test.ts
 *
 * Behavioral unit test suite for ScheduleStore (Zustand).
 * Verifies doctor/chair filters, appointment status filters, draft management,
 * and quick booking slot stage linking.
 * Mandate: 8n (Solo practice sovereignty, seamless chair/doctor scheduling).
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useScheduleStore } from "../scheduleStore";

describe("ScheduleStore Behavioral Tests — Filters & Roster State", () => {
	beforeEach(() => {
		const s = useScheduleStore.getState();
		s.setScheduleDoctorFilterId(null);
		s.setScheduleAssistantFilterId(null);
		s.setScheduleChairFilterId(null);
		s.setScheduleStatusFilter("all");
		s.setScheduleDateFilter(null);
		s.setStaffScheduleDrafts({});
		s.setChairScheduleDrafts({});
		s.setAppointmentScheduleDrafts({});
		s.setPendingStageBooking(null);
	});

	it("1. updates doctor, assistant, and chair filters directly and with updaters", () => {
		const store = useScheduleStore.getState();

		store.setScheduleDoctorFilterId("doc-ivanov");
		assert.equal(useScheduleStore.getState().scheduleDoctorFilterId, "doc-ivanov");

		store.setScheduleAssistantFilterId("asst-smirnova");
		assert.equal(useScheduleStore.getState().scheduleAssistantFilterId, "asst-smirnova");

		store.setScheduleChairFilterId("chair-surgery");
		assert.equal(useScheduleStore.getState().scheduleChairFilterId, "chair-surgery");

		// Functional updater
		store.setScheduleDoctorFilterId((prev) => (prev ? `${prev}-lead` : "doc-lead"));
		assert.equal(useScheduleStore.getState().scheduleDoctorFilterId, "doc-ivanov-lead");
	});

	it("2. updates schedule status filter across canonical statuses", () => {
		const store = useScheduleStore.getState();
		assert.equal(store.scheduleStatusFilter, "all");

		store.setScheduleStatusFilter("confirmed");
		assert.equal(useScheduleStore.getState().scheduleStatusFilter, "confirmed");

		store.setScheduleStatusFilter("in_progress");
		assert.equal(useScheduleStore.getState().scheduleStatusFilter, "in_progress");

		store.setScheduleStatusFilter("completed");
		assert.equal(useScheduleStore.getState().scheduleStatusFilter, "completed");
	});

	it("3. tracks dirty IDs and save states for staff and chair schedule drafts", () => {
		const store = useScheduleStore.getState();

		// Dirty IDs set
		store.setStaffScheduleDirtyIds(new Set(["doc-1", "doc-2"]));
		const dirtyIds = useScheduleStore.getState().staffScheduleDirtyIds;
		assert.equal(dirtyIds.has("doc-1"), true);
		assert.equal(dirtyIds.has("doc-2"), true);
		assert.equal(dirtyIds.has("doc-3"), false);

		// Save state tracking
		store.setStaffScheduleSaveStates({
			"doc-1": "saving",
			"doc-2": "saved",
		});
		assert.equal(useScheduleStore.getState().staffScheduleSaveStates["doc-1"], "saving");
		assert.equal(useScheduleStore.getState().staffScheduleSaveStates["doc-2"], "saved");
	});

	it("4. manages pendingStageBooking for quick slot reservation", () => {
		const store = useScheduleStore.getState();
		assert.equal(store.pendingStageBooking, null);

		const testSlot = {
			dateKey: "2026-11-10",
			startTime: "14:30",
			durationMinutes: 45,
			chairId: "chair-1",
			doctorId: "doc-petrov",
		};

		store.setPendingStageBooking(testSlot);
		assert.deepEqual(useScheduleStore.getState().pendingStageBooking, testSlot);

		store.setPendingStageBooking(null);
		assert.equal(useScheduleStore.getState().pendingStageBooking, null);
	});
});
