import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateRecallMetrics,
	filterAndSortRecallCandidates,
	type PatientRecallRecord,
} from "../../patientRecallEngine";

describe("Patient Recall Engine - Metrics and Filtering", () => {
	const testCandidates: PatientRecallRecord[] = [
		{
			id: "1",
			patientId: "p1",
			fullName: "Иванов И.И.",
			phone: "+79161112233",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-01-10",
			dueDate: "2026-07-10",
			daysOverdue: 49,
			urgencyStatus: "overdue_30",
			status: "scheduled",
			historicalRevenueRub: 20000,
		},
		{
			id: "2",
			patientId: "p2",
			fullName: "Петров П.П.",
			phone: "+79162223344",
			cycleType: "periodontal_maintenance",
			lastVisitDate: "2026-01-15",
			dueDate: "2026-04-15",
			daysOverdue: 135,
			urgencyStatus: "overdue_90",
			status: "completed",
			historicalRevenueRub: 40000,
		},
		{
			id: "3",
			patientId: "p3",
			fullName: "Сидоров С.С.",
			phone: "+79163334455",
			cycleType: "caries_high_risk",
			lastVisitDate: "2026-02-10",
			dueDate: "2026-05-10",
			daysOverdue: 110,
			urgencyStatus: "overdue_90",
			status: "declined",
			historicalRevenueRub: 15000,
		},
		{
			id: "4",
			patientId: "p4",
			fullName: "Кузнецов К.К.",
			phone: "+79164445566",
			cycleType: "orthodontic_braces",
			lastVisitDate: "2026-08-01",
			dueDate: "2026-08-29",
			daysOverdue: -1,
			urgencyStatus: "upcoming",
			status: "due_now",
			historicalRevenueRub: 120000,
		},
	];

	const list: PatientRecallRecord[] = [
		{
			id: "1",
			patientId: "p1",
			fullName: "Алексеев Алексей",
			phone: "+7 (916) 123-45-67",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-02-10",
			dueDate: "2026-08-10",
			daysOverdue: 18,
			urgencyStatus: "due_now",
			status: "due_now",
			attendingDoctorName: "Д-р Кузнецова",
		},
		{
			id: "2",
			patientId: "p2",
			fullName: "Борисов Борис",
			phone: "+7 (925) 987-65-43",
			cycleType: "periodontal_maintenance",
			lastVisitDate: "2026-05-10",
			dueDate: "2026-08-10",
			daysOverdue: 18,
			urgencyStatus: "due_now",
			status: "invited",
			attendingDoctorName: "Д-р Морозов",
		},
	];

	it("computes overall metrics and LTV accurately", () => {
		const metrics = calculateRecallMetrics(testCandidates, 6500);
		assert.equal(metrics.totalCandidates, 4);
		assert.equal(metrics.upcomingCount, 1);
		assert.equal(metrics.conversionRatePercent, 50);
		assert.equal(metrics.retentionRatePercent, 33.3);
		assert.equal(metrics.totalHistoricalLtvRub, 195000);
	});

	it("filters by status and search query across names and phones", () => {
		const dueNowList = filterAndSortRecallCandidates(list, { status: "due_now" });
		assert.equal(dueNowList.length, 1);
		assert.equal(dueNowList[0]?.fullName, "Алексеев Алексей");

		const searchName = filterAndSortRecallCandidates(list, { searchQuery: "Борис" });
		assert.equal(searchName.length, 1);
		assert.equal(searchName[0]?.fullName, "Борисов Борис");

		const searchPhone = filterAndSortRecallCandidates(list, { searchQuery: "9876543" });
		assert.equal(searchPhone.length, 1);
		assert.equal(searchPhone[0]?.fullName, "Борисов Борис");
	});
});
