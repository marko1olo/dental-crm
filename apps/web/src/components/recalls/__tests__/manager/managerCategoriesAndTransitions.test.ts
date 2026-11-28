import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	calculateRecallMetrics,
	filterAndSortRecallCandidates,
	type PatientRecallRecord,
} from "../../patientRecallEngine";
import { PatientRecallsHubModal } from "../../PatientRecallsHubModal";

const sampleCandidates: readonly PatientRecallRecord[] = [
	{
		id: "rec-1",
		patientId: "pat-1",
		fullName: "Иванова Мария Петровна",
		phone: "+7 999 111-22-33",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2025-10-01",
		dueDate: "2026-04-01",
		daysOverdue: 20,
		urgencyStatus: "due_now",
		status: "pending",
		historicalRevenueRub: 8500,
	},
	{
		id: "rec-2",
		patientId: "pat-2",
		fullName: "Сидоров Алексей Викторович",
		phone: "+7 999 222-33-44",
		cycleType: "implant_monitoring",
		lastVisitDate: "2025-02-01",
		dueDate: "2026-02-01",
		daysOverdue: 80,
		urgencyStatus: "overdue_30",
		status: "contacted",
		lastContactChannel: "whatsapp",
		historicalRevenueRub: 45000,
	},
	{
		id: "rec-3",
		patientId: "pat-3",
		fullName: "Кузнецова Елена Сергеевна",
		phone: "+7 999 333-44-55",
		cycleType: "orthodontic_retention",
		lastVisitDate: "2025-12-01",
		dueDate: "2026-06-01",
		daysOverdue: -15,
		urgencyStatus: "upcoming",
		status: "scheduled",
		historicalRevenueRub: 12000,
	},
	{
		id: "rec-4",
		patientId: "pat-4",
		fullName: "Петров Николай Олегович",
		phone: "+7 999 444-55-66",
		cycleType: "periodontal_maintenance",
		lastVisitDate: "2025-07-01",
		dueDate: "2026-01-01",
		daysOverdue: 110,
		urgencyStatus: "overdue_90",
		status: "declined",
		isArchived: true,
		historicalRevenueRub: 19000,
	},
];

describe("Recall Manager Categories, Filters & Modal Depth = 1", () => {
	it("filters by cycleType, maps contacted under invited filter, and excludes archived by default", () => {
		const active = filterAndSortRecallCandidates(sampleCandidates, {});
		assert.deepEqual(
			active.map((c) => c.patientId),
			["pat-2", "pat-1", "pat-3"],
		);

		const implants = filterAndSortRecallCandidates(sampleCandidates, {
			cycleType: "implant_monitoring",
		});
		assert.equal(implants.length, 1);
		assert.equal(implants[0]?.patientId, "pat-2");

		const invited = filterAndSortRecallCandidates(sampleCandidates, {
			status: "invited",
		});
		assert.deepEqual(invited.map((c) => c.patientId), ["pat-2"]);

		const withArchived = filterAndSortRecallCandidates(sampleCandidates, {
			includeArchived: true,
		});
		assert.equal(withArchived.length, 4);
		assert.equal(withArchived[0]?.patientId, "pat-4");
	});

	it("searches by phone digits or full name and sorts by ltv ascending", () => {
		const byPhone = filterAndSortRecallCandidates(sampleCandidates, {
			searchQuery: "222-33-44",
		});
		assert.deepEqual(byPhone.map((c) => c.patientId), ["pat-2"]);

		const byLtv = filterAndSortRecallCandidates(sampleCandidates, {
			sortBy: "ltv",
			sortDirection: "asc",
		});
		assert.deepEqual(byLtv.map((c) => c.patientId), ["pat-1", "pat-3", "pat-2"]);
	});

	it("calculateRecallMetrics aggregates cycle counts, retention rate and lost revenue", () => {
		const metrics = calculateRecallMetrics(sampleCandidates, 6500);
		assert.equal(metrics.totalCandidates, 4);
		assert.equal(metrics.dueNowCount, 1);
		assert.equal(metrics.overdue30Count, 1);
		assert.equal(metrics.overdue90Count, 1);
		assert.equal(metrics.upcomingCount, 1);
		assert.equal(metrics.scheduledCount, 1);
		assert.equal(metrics.declinedCount, 1);
		assert.equal(metrics.contactedCount, 1);
		assert.equal(metrics.byCycle.implant_monitoring, 1);
		assert.equal(metrics.byCycle.orthodontic_retention, 1);
		assert.equal(metrics.byCycle.periodontal_maintenance, 1);
		assert.equal(metrics.byCycle.standard_prophylaxis, 1);
		assert.equal(metrics.retainedRevenueRub, 6500);
		assert.equal(metrics.overdueEstimatedLostRevenueRub, 3 * 6500);
	});

	it("PatientRecallsHubModal renders active candidates and enforces Max Modal Depth = 1 (no nested QuickBookingDrawer)", () => {
		const html = renderToString(
			React.createElement(PatientRecallsHubModal, {
				isOpen: true,
				embedded: true,
				clinicName: "Стоматология ДЕНТЕ",
				initialCandidates: sampleCandidates.slice(0, 3),
				onClose: () => {},
				onBookAppointment: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="patient-recalls-hub-modal"'));
		assert.ok(html.includes("Иванова Мария Петровна"));
		assert.ok(html.includes("Сидоров Алексей Викторович"));
		assert.equal(
			html.includes('data-testid="quick-booking-drawer"'),
			false,
			"Recalls Hub must never nest QuickBookingDrawer inside itself (Mandate 8d Depth=1)",
		);
	});
});
