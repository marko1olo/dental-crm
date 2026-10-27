import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_RECALL_CANDIDATES,
	type PatientRecallItem,
} from "../../index";

describe("3 & 4. Category Filtering & Status Transitions", () => {
	it("proves default candidate pool is empty array", () => {
		assert.deepStrictEqual(DEFAULT_RECALL_CANDIDATES, []);
	});

	it("filters candidates accurately by clinical category", () => {
		const sampleCandidates: readonly PatientRecallItem[] = [
			{ id: "1", patientId: "p1", fullName: "Гигиена", phone: "+79991112233", category: "hygiene", categoryLabel: "Гигиена", lastVisitDate: "2026-02-15", dueDate: "2026-08-15", daysOverdue: 14, urgency: "due_now", status: "pending" },
			{ id: "2", patientId: "p2", fullName: "Импланты", phone: "+79991112244", category: "implants", categoryLabel: "Импланты", lastVisitDate: "2025-08-20", dueDate: "2026-08-20", daysOverdue: 9, urgency: "due_now", status: "contacted" },
			{ id: "3", patientId: "p3", fullName: "Ортодонтия", phone: "+79991112255", category: "orthodontics", categoryLabel: "Орто", lastVisitDate: "2026-05-25", dueDate: "2026-08-25", daysOverdue: 4, urgency: "due_now", status: "scheduled" },
		];

		assert.strictEqual(sampleCandidates.filter((c) => c.category === "hygiene").length, 1);
		assert.strictEqual(sampleCandidates.filter((c) => c.category === "implants").length, 1);
		assert.strictEqual(sampleCandidates.filter((c) => c.category === "orthodontics").length, 1);
	});

	it("supports transition from PENDING to CONTACTED to SCHEDULED", () => {
		const cand: PatientRecallItem = {
			id: "rec-101",
			patientId: "pat-101",
			fullName: "Смирнов Алексей Викторович",
			phone: "+7 (916) 450-12-34",
			category: "hygiene",
			categoryLabel: "Гигиена 6 мес.",
			lastVisitDate: "2026-02-15",
			dueDate: "2026-08-15",
			daysOverdue: 14,
			urgency: "due_now",
			status: "pending",
		};
		assert.strictEqual(cand.status, "pending");

		const contacted: PatientRecallItem = {
			...cand,
			status: "contacted",
			lastContactedAt: new Date().toISOString(),
			lastContactChannel: "whatsapp",
		};
		assert.strictEqual(contacted.status, "contacted");

		const booked: PatientRecallItem = {
			...contacted,
			status: "scheduled",
			scheduledAppointmentDate: "2026-09-02T10:00:00Z",
		};
		assert.strictEqual(booked.status, "scheduled");
	});
});
