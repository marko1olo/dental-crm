import { useMemo } from "react";
import type { MobileShiftAppointmentSummary } from "./MobileShiftCockpit";
import { formatClockTime } from "./shiftPrintStatements";

export interface ShiftTelemetryPatient {
	readonly id: string;
	readonly fullName: string;
}

export interface ShiftTelemetryAppointment {
	readonly id: string | number;
	readonly patientId?: string | null | undefined;
	readonly startsAt?: string | null | undefined;
	readonly endsAt?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly appointmentStatus?: string | null | undefined;
	readonly state?: string | null | undefined;
	readonly reason?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly serviceTitle?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly priceRub?: number | string | undefined;
	readonly costRub?: number | string | undefined;
	readonly totalRub?: number | string | undefined;
	readonly amountRub?: number | string | undefined;
	readonly protocolCompleted?: boolean | undefined;
	readonly emrSigned?: boolean | undefined;
	readonly diaryRecorded?: boolean | undefined;
}

export interface UseShiftRealtimeTelemetryOptions {
	readonly todayAppointments: readonly ShiftTelemetryAppointment[];
	readonly inChairAppointments?: readonly ShiftTelemetryAppointment[] | undefined;
	readonly patientsById: ReadonlyMap<string, ShiftTelemetryPatient>;
	readonly currentPatient?: ShiftTelemetryPatient | null | undefined;
	readonly todayIso: string;
}

export interface ShiftRealtimeTelemetry {
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly inProgressCount: number;
	readonly completedProtocolsCount: number;
	readonly chairOccupancyPct: number;
	readonly hasActiveOvertime: boolean;
	readonly mobileAppointments: readonly MobileShiftAppointmentSummary[];
}

function resolveStatus(statusRaw: string): { key: "in_chair" | "waiting" | "payment" | "completed"; label: string } {
	if (["in_chair", "in_treatment", "in_progress"].includes(statusRaw)) return { key: "in_chair", label: "В кресле" };
	if (["completed", "done"].includes(statusRaw)) return { key: "completed", label: "Завершён" };
	if (["payment", "billing", "checkout"].includes(statusRaw)) return { key: "payment", label: "Ожидает оплаты" };
	return { key: "waiting", label: "Ожидает приёма" };
}

export function useShiftRealtimeTelemetry({
	todayAppointments,
	patientsById,
	currentPatient,
}: UseShiftRealtimeTelemetryOptions): ShiftRealtimeTelemetry {
	const completedCount = useMemo(
		() => todayAppointments.filter((app: ShiftTelemetryAppointment) => ["completed", "done"].includes(String(app.status || "").toLowerCase())).length,
		[todayAppointments],
	);

	const inProgressCount = useMemo(
		() => todayAppointments.filter((app: ShiftTelemetryAppointment) => ["in_chair", "in_treatment", "in_progress"].includes(String(app.status || "").toLowerCase())).length,
		[todayAppointments],
	);

	const completedProtocolsCount = useMemo(() => {
		return todayAppointments.filter((app: ShiftTelemetryAppointment) => {
			const isDone = ["completed", "done"].includes(String(app.status || "").toLowerCase());
			return isDone || Boolean(app.protocolCompleted || app.emrSigned || app.diaryRecorded);
		}).length;
	}, [todayAppointments]);

	const chairOccupancyPct = useMemo(() => {
		if (todayAppointments.length === 0) return 0;
		return Math.min(100, Math.round(((completedCount + inProgressCount) / todayAppointments.length) * 100));
	}, [todayAppointments.length, completedCount, inProgressCount]);

	const hasActiveOvertime = useMemo(() => new Date().getHours() >= 21, []);

	const mobileAppointments = useMemo((): readonly MobileShiftAppointmentSummary[] => {
		return todayAppointments.map((app: ShiftTelemetryAppointment) => {
			const st = resolveStatus(String(app.status || app.appointmentStatus || app.state || "").toLowerCase());
			const patient = patientsById.get(app.patientId ?? "") ?? (app.patientId === currentPatient?.id ? currentPatient : null);
			const patientName = patient?.fullName || app.patientFullName || "Пациент";
			const cost = Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) || 0;

			return {
				id: String(app.id),
				patientId: String(app.patientId || ""),
				patientName,
				timeStart: formatClockTime(app.startsAt),
				timeEnd: formatClockTime(app.endsAt ?? app.startsAt),
				serviceTitle: String(app.reason || app.treatmentDescription || app.serviceTitle || "Приём врача-стоматолога"),
				statusKey: st.key,
				statusLabel: st.label,
				priceRub: cost,
			};
		});
	}, [todayAppointments, patientsById, currentPatient]);

	return {
		totalAppointments: todayAppointments.length,
		completedCount,
		inProgressCount,
		completedProtocolsCount,
		chairOccupancyPct,
		hasActiveOvertime,
		mobileAppointments,
	};
}
