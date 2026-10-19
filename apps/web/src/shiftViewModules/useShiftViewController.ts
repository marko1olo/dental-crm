import { useState, useEffect, useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../lib/safeLocalStorage";
import { staffTelemetryService } from "./../services/logging/staffTelemetryService";
import type { ShiftFinancialMode } from "./shiftViewTypes";
import { useShiftFinancialModeState } from "./useShiftFinancialModeState";

export const DEFAULT_MAX_SHIFT_DURATION_HOURS = 12;
export const DEFAULT_MAX_SHIFT_DURATION_MS = DEFAULT_MAX_SHIFT_DURATION_HOURS * 60 * 60 * 1000;
export const SHIFT_START_TIME_KEY = "dente_doctor_shift_start_time";

export interface UseShiftViewControllerOptions {
	dashboard?: Dashboard;
	// biome-ignore lint/suspicious/noExplicitAny: generic
	inChairAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: generic
	staffById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: generic
	shiftStats: any;
	// biome-ignore lint/suspicious/noExplicitAny: generic
	patientsById: Map<string, any>;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	maxShiftDurationMs?: number;
}

export function useShiftViewController({
	dashboard, inChairAppointment, staffById, shiftStats, patientsById, setSelectedPatientId, maxShiftDurationMs,
}: UseShiftViewControllerOptions) {
	const [isQueueBoardModalOpen, setIsQueueBoardModalOpen] = useState(false);
	const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
	const [isTimesheetT13ModalOpen, setIsTimesheetT13ModalOpen] = useState(false);
	const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);
	const fin = useShiftFinancialModeState();

	const activeDoctorFullName = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: runtime prop
		const dashAny = dashboard as any;
		if (dashAny?.activeDoctor?.fullName) return dashAny.activeDoctor.fullName;
		const docId = String((inChairAppointment as any)?.doctorId || (inChairAppointment as any)?.doctorUserId || "");
		return (docId && staffById.has(docId)) ? (staffById.get(docId)?.fullName || "Лечащий врач") : "Лечащий врач";
	}, [dashboard, inChairAppointment, staffById]);

	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
		try { const s = safeLocalStorageGetItem("dente_doctor_shift_active"); return s !== null ? s === "true" : true; } catch { return true; }
	});

	const handleAutoCloseShift = async (reason = "auto_close_timeout") => {
		setIsShiftOpen(false);
		setIsShiftCloseModalOpen(false);
		try {
			safeLocalStorageSetItem("dente_doctor_shift_active", "false");
			safeLocalStorageRemoveItem(SHIFT_START_TIME_KEY);
		} catch {}
		// biome-ignore lint/suspicious/noExplicitAny: runtime prop
		const dashAny = dashboard as any;
		staffTelemetryService.logShiftClose("SHIFT-ACTIVE", dashAny?.activeAppointment?.doctorId, dashAny?.activeAppointment?.doctorName, {
			totalAppointments: shiftStats?.totalAppointments ?? 0,
			completedCount: shiftStats?.completedCount ?? 0,
			totalRevenueRub: shiftStats?.totalRevenueRub ?? 0,
			estimatedDoctorPayoutRub: shiftStats?.estimatedDoctorPayoutRub ?? 0,
			autoClosedByTimeout: true,
			reason,
		});
		try {
			await fetch("/api/fiscal/shift/close", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					force: true,
					closedByUserId: dashAny?.activeAppointment?.doctorId,
					autoClosedByTimeout: true,
					reason,
				}),
			});
		} catch {}
	};

	// Anti-Hang Shift Law: Auto-close shift if limit exceeded or past midnight
	useEffect(() => {
		if (!isShiftOpen) return;

		const limitMs = maxShiftDurationMs ?? DEFAULT_MAX_SHIFT_DURATION_MS;

		const checkShiftTimeout = () => {
			try {
				const startTimeStr = safeLocalStorageGetItem(SHIFT_START_TIME_KEY);
				if (!startTimeStr) {
					safeLocalStorageSetItem(SHIFT_START_TIME_KEY, String(Date.now()));
					return;
				}
				const startTime = Number(startTimeStr);
				if (!Number.isFinite(startTime)) return;

				const now = Date.now();
				const elapsed = now - startTime;

				if (elapsed >= limitMs) {
					void handleAutoCloseShift("auto_close_timeout_duration");
					return;
				}

				const startDate = new Date(startTime).toDateString();
				const currentDate = new Date(now).toDateString();
				if (startDate !== currentDate && elapsed > 60_000) {
					void handleAutoCloseShift("auto_close_timeout_midnight");
				}
			} catch {}
		};

		checkShiftTimeout();
		const intervalId = setInterval(checkShiftTimeout, 10_000);
		return () => clearInterval(intervalId);
	}, [isShiftOpen, maxShiftDurationMs]);

	useEffect(() => {
		let isCancelled = false;
		async function sync() {
			try {
				try {
					await fetch("/api/shifts/auto-close-check", { method: "POST" });
				} catch {}
				const res = await fetch("/api/cash/shift-reconciliation");
				if (!res.ok) return;
				const data = await res.json();
				if (!isCancelled && data && typeof data.hasOpenShift === "boolean") {
					setIsShiftOpen(data.hasOpenShift);
					try { safeLocalStorageSetItem("dente_doctor_shift_active", String(data.hasOpenShift)); } catch {}
				}
			} catch {}
		}
		void sync();
		const onHash = () => { if (typeof window !== "undefined" && ["#queue", "#/queue"].includes(window.location.hash.toLowerCase())) setIsQueueBoardModalOpen(true); };
		onHash();
		window.addEventListener("hashchange", onHash);
		return () => { isCancelled = true; window.removeEventListener("hashchange", onHash); };
	}, []);

	const handleToggleShift = async () => {
		if (isShiftOpen) {
			setIsShiftCloseModalOpen(true);
		} else {
			setIsShiftOpen(true);
			const now = Date.now();
			try {
				safeLocalStorageSetItem("dente_doctor_shift_active", "true");
				safeLocalStorageSetItem(SHIFT_START_TIME_KEY, String(now));
			} catch {}
			// biome-ignore lint/suspicious/noExplicitAny: runtime prop
			const dashAny = dashboard as any;
			staffTelemetryService.logShiftOpen("SHIFT-ACTIVE", dashAny?.activeAppointment?.doctorId, dashAny?.activeAppointment?.doctorName);
			try {
				await fetch("/api/fiscal/shift/open", {
					method: "POST", headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ openedByUserId: dashAny?.activeAppointment?.doctorId }),
				});
			} catch {}
		}
	};

	const handleConfirmCloseShift = async () => {
		setIsShiftOpen(false);
		setIsShiftCloseModalOpen(false);
		try {
			safeLocalStorageSetItem("dente_doctor_shift_active", "false");
			safeLocalStorageRemoveItem(SHIFT_START_TIME_KEY);
		} catch {}
		// biome-ignore lint/suspicious/noExplicitAny: runtime prop
		const dashAny = dashboard as any;
		staffTelemetryService.logShiftClose("SHIFT-ACTIVE", dashAny?.activeAppointment?.doctorId, dashAny?.activeAppointment?.doctorName, {
			totalAppointments: shiftStats.totalAppointments, completedCount: shiftStats.completedCount,
			totalRevenueRub: shiftStats.totalRevenueRub, estimatedDoctorPayoutRub: shiftStats.estimatedDoctorPayoutRub,
		});
		try {
			await fetch("/api/fiscal/shift/close", {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ force: true, closedByUserId: dashAny?.activeAppointment?.doctorId }),
			});
		} catch {}
	};

	function runRecommendedAction(action: any) {
		if (action?.patientId && action.patientId !== "00000000-0000-0000-0000-000000000000" && patientsById.has(action.patientId)) {
			setSelectedPatientId?.(action.patientId);
		}
		window.location.hash = (typeof action?.section === "string" && action.section) ? action.section : "shift";
	}

	return {
		isQueueBoardModalOpen, setIsQueueBoardModalOpen, isPayrollModalOpen, setIsPayrollModalOpen,
		isTimesheetT13ModalOpen, setIsTimesheetT13ModalOpen, isShiftCloseModalOpen, setIsShiftCloseModalOpen,
		...fin,
		activeDoctorFullName, isShiftOpen, handleToggleShift, handleConfirmCloseShift, handleAutoCloseShift, runRecommendedAction,
	};
}
