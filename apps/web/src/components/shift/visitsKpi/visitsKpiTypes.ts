import { countLabel } from "../../../lib/russianPlural";

export interface DoctorShiftVisitsKpiSectionProps {
	readonly todayAppointments: readonly any[];
	readonly inChairAppointments: readonly any[];
	readonly waitingAppointments: readonly any[];
	readonly awaitingPaymentAppointments: readonly any[];
	readonly patientsById: Map<string, any>;
	readonly staffById: Map<string, any>;
	readonly currentPatient?: any | null | undefined;
	readonly inChairAppointment?: any | null | undefined;
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
