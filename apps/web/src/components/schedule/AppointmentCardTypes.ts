import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ScheduleSuggestion,
} from "@dental/shared";

export type AppointmentCardProps = {
	appointment: Appointment;
	dashboard: Dashboard;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentDraft: Record<
		string,
		string | number | boolean | null | undefined
	>;
	appointmentSaveState: string;
	appointmentSaveError: string | null;
	appointmentDirty: boolean;
	appointmentEditing: boolean;
	appointmentHasOpenVisit: boolean;
	appointmentActiveVisitStatusLocked: boolean;
	appointmentMissingSteps: string[];
	appointmentReadyToSave: boolean;
	openScheduleSuggestion: (section: string) => void;
	formatTime: (value: string) => string;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	openAppointmentEditor: (appointment: Appointment) => void;
	/**
	 * Переносит пациента, врача, ассистента, кресло, длительность и повод этой
	 * записи в форму новой и открывает её. Удобно для «тот же пациент через
	 * неделю». Для переноса на произвольное время — «В буфер» + панель буфера.
	 */
	repeatAppointment: (appointment: Appointment) => void;
	/**
	 * Копирует снимок приёма в серверный буфер расписания (schedule_clipboard_items)
	 * и открывает панель «Буфер». Вставка создаёт новый приём на выбранное время.
	 */
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;

	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: string | number | boolean | null | undefined,
	) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	onOpenVisit?: () => void;
};
