import type { Appointment, InsuranceContract, StaffMember } from "@dental/shared";

/**
 * Mock Staff, Appointments & Insurance Contracts for Telephony Tests
 */

export const mockStaff: StaffMember[] = [
	{
		id: "33333333-3333-3333-3333-333333333333",
		organizationId: "99999999-9999-9999-9999-999999999999",
		fullName: "Др. Петров Петр Сергеевич",
		role: "doctor",
		specialties: ["therapist", "surgeon"],
		phone: "+79990001122",
		email: "petrov@clinic.ru",
		active: true,
		canSignMedicalRecords: true,
		canManageMoney: false,
		canManageImports: false,
		color: "#0f766e",
		workingHours: null,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	},
];

export const mockAppointments: Appointment[] = [
	{
		id: "44444444-4444-4444-4444-444444444444",
		organizationId: "99999999-9999-9999-9999-999999999999",
		patientId: "11111111-1111-1111-1111-111111111111",
		doctorUserId: "33333333-3333-3333-3333-333333333333",
		chairId: "55555555-5555-5555-5555-555555555555",
		status: "completed",
		startsAt: "2026-05-14T14:30:00Z",
		endsAt: "2026-05-14T15:30:00Z",
		reason: "Лечение кариеса 1.6",
		comment: "Установлена световая пломба",
	},
	{
		id: "66666666-6666-6666-6666-666666666666",
		organizationId: "99999999-9999-9999-9999-999999999999",
		patientId: "11111111-1111-1111-1111-111111111111",
		doctorUserId: "33333333-3333-3333-3333-333333333333",
		chairId: "55555555-5555-5555-5555-555555555555",
		status: "planned",
		startsAt: "2026-12-30T10:00:00Z",
		endsAt: "2026-12-30T11:00:00Z",
		reason: "Профгигиена полости рта",
		comment: null,
	},
];

export const mockInsuranceContracts: InsuranceContract[] = [
	{
		id: "77777777-7777-7777-7777-777777777777",
		organizationId: "99999999-9999-9999-9999-999999999999",
		companyName: "СОГАЗ Страхование",
		policyNumberMask: "СОГАЗ-XXXXXX",
		coverageTherapyPct: 100,
		coverageSurgeryPct: 80,
		coverageOrthoPct: 0,
		coverageHygienePct: 100,
		annualLimitRub: 150000,
		isActive: true,
	},
];
