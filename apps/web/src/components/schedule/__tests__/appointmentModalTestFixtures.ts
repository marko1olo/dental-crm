import type { Appointment, Dashboard } from "@dental/shared";

export const mockAppointment: Appointment = {
	id: "appt-100",
	organizationId: "org-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	assistantUserId: "ast-1",
	chairId: "chair-1",
	startsAt: "2026-08-21T10:00:00.000Z",
	endsAt: "2026-08-21T11:00:00.000Z",
	status: "confirmed",
	reason: null,
	comment: null,
};

export const mockDashboard: any = {
	patients: [{ id: "pat-1", fullName: "Иванов Иван", phone: "+79991112233" }],
	appointments: [mockAppointment],
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Д-р Смирнов", role: "doctor", active: true },
			{ id: "ast-1", fullName: "Асс. Сидорова", role: "assistant", active: true },
		],
		chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
		profile: {
			mode: "solo_doctor",
			timezone: "Europe/Samara",
		},
	},
};

export const mockLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

export function createModalProps(appt: Appointment = mockAppointment, dash: any = mockDashboard, extra: any = {}) {
	return {
		isOpen: true,
		appointment: appt,
		dashboard: dash as Dashboard,
		onClose: () => {},
		onSave: async () => true,
		repeatAppointment: () => {},
		copyAppointmentToBuffer: () => {},
		patientName: () => "Иванов Иван",
		formatTime: () => "10:00",
		toDateTimeLocalValue: () => "2026-08-21T10:00",
		fromDateTimeLocalValue: () => "2026-08-21T10:00:00.000Z",
		appointmentLabels: mockLabels,
		activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
		...extra,
	};
}
