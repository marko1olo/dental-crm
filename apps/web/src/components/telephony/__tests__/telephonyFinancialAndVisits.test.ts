import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	calculatePatientFinancialStatus,
	resolvePatientLastVisit,
	resolvePatientNextVisit,
	resolvePatientUpcomingAppointment,
} from "../../../store/telephonyClinical";
import type { Appointment, InsuranceContract, Patient, StaffMember } from "@dental/shared";

describe("Telephony Financial Status & Visit Resolvers (Mandate 8b, 8e)", () => {
	it("1. Patient Financial Status calculation resolves balances, debt and insurance", () => {
		const emptyFin = calculatePatientFinancialStatus(null);
		assert.equal(emptyFin.balanceRub, 0);
		assert.equal(emptyFin.hasDebt, false);
		assert.equal(emptyFin.hasInsurance, false);

		const patientPlus = {
			id: "pat-1",
			organizationId: "org-1",
			fullName: "Иванов Иван Иванович",
			phone: "+79161234567",
			balanceRub: 4500,
			birthDate: "1985-05-15",
			gender: "male",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const finPlus = calculatePatientFinancialStatus(patientPlus);
		assert.equal(finPlus.balanceRub, 4500);
		assert.equal(finPlus.hasDebt, false);

		const patientDebtor = {
			id: "pat-2",
			organizationId: "org-1",
			fullName: "Петрова Анна Сергеевна",
			phone: "+79169876543",
			balanceRub: -12000,
			birthDate: "1990-10-20",
			gender: "female",
			administrativeProfile: {
				insurancePolicyNumber: "POL-777-999",
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const insuranceContracts = [
			{
				id: "ins-1",
				organizationId: "org-1",
				companyName: "СОГАЗ Мед",
				contractNumber: "DMS-2026-01",
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		] as unknown as InsuranceContract[];
		const finDebtor = calculatePatientFinancialStatus(patientDebtor, null, insuranceContracts);
		assert.equal(finDebtor.hasDebt, true);
		assert.equal(finDebtor.debtRub, 12000);
		assert.equal(finDebtor.hasInsurance, true);
		assert.equal(finDebtor.insuranceName, "СОГАЗ Мед");
		assert.equal(finDebtor.policyNumber, "POL-777-999");
	});

	it("2. Visit resolvers correctly compute last visit, upcoming visit and next appointment", () => {
		const nowIso = "2026-10-12T12:00:00.000Z";
		const staff = [
			{
				id: "doc-1",
				organizationId: "org-1",
				fullName: "д-р Смирнов А.В.",
				specialties: ["therapist"],
				role: "doctor",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		] as unknown as StaffMember[];
		const appointments = [
			{
				id: "app-past",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				startsAt: "2026-09-10T10:00:00.000Z",
				endsAt: "2026-09-10T11:00:00.000Z",
				status: "completed",
				reason: "Лечение кариеса 24 зуба",
			},
			{
				id: "app-future",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				startsAt: "2026-10-13T14:30:00.000Z",
				endsAt: "2026-10-13T15:30:00.000Z",
				status: "planned",
				reason: "Контрольный осмотр и гигиена",
			},
		] as unknown as Appointment[];

		const lastVisit = resolvePatientLastVisit("pat-1", appointments, staff, nowIso);
		assert.equal(lastVisit.isNewPatient, false);
		assert.equal(lastVisit.doctorName, "д-р Смирнов А.В.");
		assert.equal(lastVisit.appointmentReason, "Лечение кариеса 24 зуба");

		const nextAppt = resolvePatientUpcomingAppointment("pat-1", appointments, staff, nowIso);
		assert.ok(nextAppt !== null);
		assert.equal(nextAppt?.appointmentId, "app-future");
		assert.equal(nextAppt?.doctorName, "д-р Смирнов А.В.");
		assert.equal(nextAppt?.isTomorrow, true);

		const nextVisitSummary = resolvePatientNextVisit("pat-1", appointments, staff, nowIso);
		assert.equal(nextVisitSummary.hasNextVisit, true);
		assert.equal(nextVisitSummary.doctorName, "д-р Смирнов А.В.");
		assert.ok(nextVisitSummary.fullTextRu.includes("Следующий визит"));
	});
});
