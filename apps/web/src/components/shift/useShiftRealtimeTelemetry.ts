import { useMemo } from "react";
import type { MobileShiftAppointmentSummary } from "./MobileShiftCockpit";
import { formatClockTime } from "./shiftPrintStatements";

export interface UseShiftRealtimeTelemetryOptions {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly todayAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly inChairAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly currentPatient: any;
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

export function useShiftRealtimeTelemetry({
	todayAppointments,
	inChairAppointments,
	patientsById,
	currentPatient,
}: UseShiftRealtimeTelemetryOptions): ShiftRealtimeTelemetry {
	const completedCount = useMemo(() => {
		return todayAppointments.filter((app: any) =>
			["completed", "done"].includes(String(app.status || "").toLowerCase()),
		).length;
	}, [todayAppointments]);

	const inProgressCount = useMemo(() => {
		return todayAppointments.filter((app: any) =>
			["in_chair", "in_treatment", "in_progress"].includes(
				String(app.status || "").toLowerCase(),
			),
		).length;
	}, [todayAppointments]);

	const completedProtocolsCount = useMemo(() => {
		return todayAppointments.filter((app: any) => {
			const isDone = ["completed", "done"].includes(String(app.status || "").toLowerCase());
			const hasProtocol = Boolean(app.protocolCompleted || app.emrSigned || app.diaryRecorded);
			return isDone || hasProtocol;
		}).length;
	}, [todayAppointments]);

	const chairOccupancyPct = useMemo(() => {
		if (todayAppointments.length === 0) return 0;
		const activeCount = completedCount + inProgressCount;
		return Math.min(100, Math.round((activeCount / todayAppointments.length) * 100));
	}, [todayAppointments.length, completedCount, inProgressCount]);

	const hasActiveOvertime = useMemo(() => {
		return new Date().getHours() >= 21;
	}, []);

	const mobileAppointments = useMemo((): readonly MobileShiftAppointmentSummary[] => {
		return todayAppointments.map((app: any) => {
			const statusKeyRaw = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			let statusKey: "in_chair" | "waiting" | "payment" | "completed" = "waiting";
			let statusLabel = "Ожидает приёма";

			if (["in_chair", "in_treatment", "in_progress"].includes(statusKeyRaw)) {
				statusKey = "in_chair";
				statusLabel = "В кресле";
			} else if (["completed", "done"].includes(statusKeyRaw)) {
				statusKey = "completed";
				statusLabel = "Завершён";
			} else if (["payment", "billing", "checkout"].includes(statusKeyRaw)) {
				statusKey = "payment";
				statusLabel = "Ожидает оплаты";
			}

			const patient =
				patientsById.get(app.patientId) ??
				(app.patientId === currentPatient?.id ? currentPatient : null);
			const patientName =
				patient?.fullName || app.patientFullName || "Пациент";

			const cost =
				Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) ||
				0;

			return {
				id: String(app.id),
				patientId: String(app.patientId || ""),
				patientName,
				timeStart: formatClockTime(app.startsAt),
				timeEnd: formatClockTime(app.endsAt ?? app.startsAt),
				serviceTitle: String(
					app.reason ||
						app.treatmentDescription ||
						app.serviceTitle ||
						"Приём врача-стоматолога",
				),
				statusKey,
				statusLabel,
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
