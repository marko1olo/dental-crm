import type { Appointment, Patient, StaffMember } from "@dental/shared";
import { countLabel } from "../../../lib/russianPlural";

export type ShiftVisitAppointment = Pick<Appointment, "startsAt" | "endsAt"> & {
	readonly id: string;
	readonly patientId: string;
	readonly doctorUserId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly appointmentStatus?: string | null | undefined;
	readonly state?: string | null | undefined;
	readonly reason?: string | null | undefined;
};

export type ShiftVisitPatient = Pick<Patient, "id" | "fullName"> & {
	readonly phone?: string | null | undefined;
};

export type ShiftVisitDoctor = Pick<StaffMember, "fullName"> & {
	readonly id?: string | undefined;
};

export interface DoctorShiftVisitsKpiSectionProps {
	readonly todayAppointments: readonly ShiftVisitAppointment[];
	readonly inChairAppointments: readonly ShiftVisitAppointment[];
	readonly waitingAppointments: readonly ShiftVisitAppointment[];
	readonly awaitingPaymentAppointments: readonly ShiftVisitAppointment[];
	readonly patientsById: ReadonlyMap<string, ShiftVisitPatient>;
	readonly staffById: ReadonlyMap<string, ShiftVisitDoctor>;
	readonly currentPatient?: ShiftVisitPatient | null | undefined;
	readonly inChairAppointment?: ShiftVisitAppointment | null | undefined;
	readonly manyDoctors?: boolean | undefined;
	readonly onSelectPatient?: ((patientId: string) => void) | undefined;
	readonly onOpenAppointmentEmk?: ((patientId: string) => void) | undefined;
	readonly onOpenCashier?: ((patientId: string) => void) | undefined;
	readonly onOpenQueueBoardModal?: (() => void) | undefined;
	readonly onOpenSchedule?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export function appointmentsCountLabel(count: number): string {
	return countLabel(count, "прием", "приема", "приемов");
}

export function formatClockTime(value: unknown): string {
	if (typeof value !== "string" || !value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export const STATUS_LABELS: Record<string, string> = {
	planned: "Ожидает приема", scheduled: "Ожидает приема", pending: "Ожидает приема",
	confirmed: "Подтвержден", arrived: "Ожидает приема", waiting: "Ожидает приема",
	in_chair: "На приеме", in_treatment: "На приеме", in_progress: "На приеме",
	completed: "Завершен", done: "Завершен", cancelled: "Отменен", no_show: "Не пришел",
};
