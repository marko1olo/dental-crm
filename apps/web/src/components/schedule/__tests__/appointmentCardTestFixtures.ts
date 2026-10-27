import type { Appointment, Dashboard, Patient } from "@dental/shared";

export const debtorPatient: Patient = {
	id: "pat-debtor",
	organizationId: "org-1",
	fullName: "Кузнецов Петр Сергеевич",
	phone: "+7 (999) 555-44-33",
	email: null,
	notes: null,
	birthDate: "1988-03-12",
	status: "active",
	balanceRub: -4500,
	gender: null,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

export const advancePatient: Patient = {
	id: "pat-advance",
	organizationId: "org-1",
	fullName: "Васильева Мария Ивановна",
	phone: "+7 (999) 222-33-44",
	email: null,
	notes: null,
	birthDate: "1992-07-24",
	status: "active",
	balanceRub: 12000,
	gender: null,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

export const zeroPatient: Patient = {
	id: "pat-zero",
	organizationId: "org-1",
	fullName: "Сидоров Иван Павлович",
	phone: "+7 (999) 777-66-55",
	email: null,
	notes: null,
	birthDate: "1995-11-05",
	status: "active",
	balanceRub: 0,
	gender: null,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

export const mockDashboard: any = {
	patients: [debtorPatient, advancePatient, zeroPatient],
	appointments: [],
	clinicSettings: {
		staff: [{ id: "doc-1", fullName: "Д-р Иванов", role: "doctor", active: true }],
		chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
		profile: { mode: "standard", timezone: "Europe/Moscow" },
	},
};

export const baseAppointment: any = {
	id: "app-1",
	organizationId: "org-1",
	patientId: "pat-debtor",
	doctorUserId: "doc-1",
	chairId: "chair-1",
	assistantUserId: null,
	startsAt: "2026-08-20T10:00:00.000Z",
	endsAt: "2026-08-20T10:30:00.000Z",
	status: "planned",
	reason: "Консультация",
	comment: "Первичный прием",
};

export const mockAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

export const activeVisitLockedStatuses = new Set<Appointment["status"]>(["in_treatment"]);

export function createCardProps(appt: any, dashboard: any = mockDashboard) {
	return {
		appointment: appt,
		dashboard: dashboard as Dashboard,
		visibleScheduleSuggestions: [],
		appointmentReadinessById: new Map(),
		appointmentLabels: mockAppointmentLabels,
		appointmentDraft: {},
		appointmentSaveState: "idle" as const,
		appointmentSaveError: null,
		appointmentDirty: false,
		appointmentEditing: false,
		appointmentHasOpenVisit: false,
		appointmentActiveVisitStatusLocked: false,
		appointmentMissingSteps: [],
		appointmentReadyToSave: true,
		openScheduleSuggestion: () => {},
		formatTime: () => "10:00",
		patientName: () => "Пациент",
		openAppointmentEditor: () => {},
		repeatAppointment: () => {},
		closeAppointmentEditor: () => {},
		updateAppointmentScheduleDraft: () => {},
		saveAppointmentSchedule: async () => true,
		normalizedAppointmentStatus: (v: any) => v,
		toDateTimeLocalValue: (v: string) => v,
		fromDateTimeLocalValue: (v: string) => v,
		useManualSelects: false,
		activeVisitLockedAppointmentStatuses: activeVisitLockedStatuses,
	};
}
