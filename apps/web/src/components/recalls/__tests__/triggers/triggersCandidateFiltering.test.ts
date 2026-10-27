import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	filterAndSortRecallCandidates,
	type PatientRecallRecord,
} from "../../patientRecallEngine";

describe("5. Candidate Filtering by Doctor, Period, and Trigger", () => {
	const candidates: PatientRecallRecord[] = [
		{
			id: "c-doc1-hygiene",
			patientId: "p1",
			fullName: "Иванов Петр",
			phone: "+79991110001",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2025-11-15",
			dueDate: "2026-05-15",
			daysOverdue: 0,
			urgencyStatus: "due_now",
			status: "due_now",
			attendingDoctorId: "doc-petrov",
			attendingDoctorName: "Д-р Петров П.П.",
		},
		{
			id: "c-doc2-implant",
			patientId: "p2",
			fullName: "Сидорова Анна",
			phone: "+79991110002",
			cycleType: "implant_monitoring",
			implantSurgeryDate: "2025-04-01",
			lastVisitDate: "2025-04-01",
			dueDate: "2026-04-01",
			daysOverdue: 45,
			urgencyStatus: "overdue_30",
			status: "invited",
			attendingDoctorId: "doc-smirnov",
			attendingDoctorName: "Д-р Смирнов С.С.",
		},
		{
			id: "c-doc1-ortho",
			patientId: "p3",
			fullName: "Козлов Дмитрий",
			phone: "+79991110003",
			cycleType: "orthodontic_braces",
			orthoDeviceType: "braces",
			lastVisitDate: "2026-05-01",
			dueDate: "2026-05-29",
			daysOverdue: -14,
			urgencyStatus: "upcoming",
			status: "scheduled",
			attendingDoctorId: "doc-petrov",
			attendingDoctorName: "Д-р Петров П.П.",
		},
	];

	it("filters candidates by attendingDoctorId", () => {
		const filteredDoc1 = filterAndSortRecallCandidates(candidates, { doctorId: "doc-petrov" });
		assert.equal(filteredDoc1.length, 2);
		assert.ok(filteredDoc1.every((c) => c.attendingDoctorId === "doc-petrov"));

		const filteredDoc2 = filterAndSortRecallCandidates(candidates, { doctorId: "doc-smirnov" });
		assert.equal(filteredDoc2.length, 1);
		assert.equal(filteredDoc2[0]?.id, "c-doc2-implant");
	});

	it("filters candidates by clinical return trigger", () => {
		const hygieneOnly = filterAndSortRecallCandidates(candidates, { triggerType: "hygiene_6m" });
		assert.equal(hygieneOnly.length, 1);
		assert.equal(hygieneOnly[0]?.id, "c-doc1-hygiene");

		const implantOnly = filterAndSortRecallCandidates(candidates, { triggerType: "implant_prosthetic_12m" });
		assert.equal(implantOnly.length, 1);
		assert.equal(implantOnly[0]?.id, "c-doc2-implant");

		const orthoOnly = filterAndSortRecallCandidates(candidates, { triggerType: "ortho_activation_1m" });
		assert.equal(orthoOnly.length, 1);
		assert.equal(orthoOnly[0]?.id, "c-doc1-ortho");
	});

	it("filters candidates by canonical workflow status", () => {
		const notCalled = filterAndSortRecallCandidates(candidates, { canonicalStatus: "not_called" });
		assert.equal(notCalled.length, 1);
		assert.equal(notCalled[0]?.id, "c-doc1-hygiene");

		const reached = filterAndSortRecallCandidates(candidates, { canonicalStatus: "reached" });
		assert.equal(reached.length, 1);
		assert.equal(reached[0]?.id, "c-doc2-implant");

		const scheduled = filterAndSortRecallCandidates(candidates, { canonicalStatus: "scheduled" });
		assert.equal(scheduled.length, 1);
		assert.equal(scheduled[0]?.id, "c-doc1-ortho");
	});

	it("filters candidates by period (overdue relative to refDate)", () => {
		const overdue = filterAndSortRecallCandidates(candidates, {
			period: "overdue",
			referenceDate: "2026-05-15",
		});
		assert.equal(overdue.length, 1);
		assert.equal(overdue[0]?.id, "c-doc2-implant");
	});
});
