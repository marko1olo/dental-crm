/**
 * apps/web/src/components/analytics/__tests__/doctorProductivityRanking.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock doctor productivity rankings and attendance rates.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateDoctorProductivity,
	type RawDoctorVisitItem,
} from "../doctorProductivityEngine.js";

test("doctorProductivityEngine: calculateDoctorProductivity ranks and computes attendance rate", () => {
	const empty = calculateDoctorProductivity({ visits: [] });
	assert.equal(empty.isEmpty, true);
	assert.equal(empty.activeDoctorsCount, 0);
	assert.equal(empty.topPerformerDoctorName, null);

	const visits: RawDoctorVisitItem[] = [
		{
			id: "dv-1",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "completed",
			patientId: "pat-1",
			isPrimaryPatient: true,
			billedKopecks: 1200000,
			paidKopecks: 1200000,
			durationMinutes: 60,
		},
		{
			id: "dv-2",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "completed",
			patientId: "pat-2",
			isPrimaryPatient: false,
			billedKopecks: 800000,
			paidKopecks: 800000,
			durationMinutes: 60,
		},
		{
			id: "dv-3",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "cancelled",
			patientId: "pat-3",
		},
		{
			id: "dv-4",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "no_show",
			patientId: "pat-4",
		},
		{
			id: "dv-5",
			doctorId: "doc-2",
			doctorName: "Д-р Петров П.П.",
			specialty: "Ортопед",
			status: "completed",
			patientId: "pat-5",
			isPrimaryPatient: true,
			billedKopecks: 4500000,
			paidKopecks: 4500000,
			durationMinutes: 120,
		},
		{
			id: "dv-6",
			doctorId: "doc-2",
			doctorName: "Д-р Петров П.П.",
			specialty: "Ортопед",
			status: "completed",
			patientId: "pat-6",
			isPrimaryPatient: false,
			billedKopecks: 2500000,
			paidKopecks: 2000000,
			durationMinutes: 90,
		},
	];

	const summary = calculateDoctorProductivity({ visits, periodLabel: "Неделя" });

	assert.equal(summary.isEmpty, false);
	assert.equal(summary.activeDoctorsCount, 2);
	assert.equal(summary.topPerformerDoctorName, "Д-р Петров П.П.");

	const petrov = summary.doctors[0]!;
	assert.equal(petrov.doctorId, "doc-2");
	assert.equal(petrov.rank, 1);
	assert.equal(petrov.totalBilledKopecks, 7000000);
	assert.equal(petrov.totalPaidKopecks, 6500000);
	assert.equal(petrov.completedVisitsCount, 2);
	assert.equal(petrov.averageBillKopecks, 3500000);
	assert.equal(petrov.attendanceRatePercent, 100.0);
	assert.equal(petrov.uniquePatientsCount, 2);
	assert.equal(petrov.primaryPatientsCount, 1);
	assert.equal(petrov.repeatPatientsCount, 1);
	assert.equal(petrov.primarySharePercent, 50.0);

	const ivanov = summary.doctors[1]!;
	assert.equal(ivanov.doctorId, "doc-1");
	assert.equal(ivanov.rank, 2);
	assert.equal(ivanov.totalBilledKopecks, 2000000);
	assert.equal(ivanov.completedVisitsCount, 2);
	assert.equal(ivanov.totalScheduledAppointments, 4);
	assert.equal(ivanov.attendedAppointmentsCount, 2);
	assert.equal(ivanov.cancelledCount, 1);
	assert.equal(ivanov.noShowCount, 1);
	assert.equal(ivanov.attendanceRatePercent, 50.0);

	assert.equal(summary.totalClinicBilledKopecks, 9000000);
	assert.equal(summary.totalCompletedVisitsCount, 4);
	assert.equal(summary.averageDoctorBillKopecks, 2250000);
	assert.equal(summary.overallAttendanceRatePercent, 66.7);
});
