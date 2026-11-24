import { useState, useEffect, useMemo } from "react";
import { generateUuidV7, getAppointmentDoctorId, type Dashboard } from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../lib/denteRequestHeaders";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../lib/safeLocalStorage";
import { staffTelemetryService } from "./../services/logging/staffTelemetryService";
import { logger } from "../utils/logger";
import {
	type ShiftCloseSummary,
	type ShiftFinancialMode,
	type ShiftRecommendedAction,
	type ShiftViewStats,
	getDashboardRuntimeMeta,
} from "./shiftViewTypes";
import { useShiftFinancialModeState } from "./useShiftFinancialModeState";

export const DEFAULT_MAX_SHIFT_DURATION_HOURS = 12;
export const DEFAULT_MAX_SHIFT_DURATION_MS = DEFAULT_MAX_SHIFT_DURATION_HOURS * 60 * 60 * 1000;
export const SHIFT_START_TIME_KEY = "dente_doctor_shift_start_time";

export interface UseShiftViewControllerOptions {
	dashboard?: Dashboard;
	inChairAppointment: unknown;
	staffById: Map<string, unknown>;
	shiftStats: ShiftViewStats;
	patientsById: Map<string, unknown>;
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
		const meta = getDashboardRuntimeMeta(dashboard);
		if (meta?.activeDoctor?.fullName) return meta.activeDoctor.fullName;
		const docId = getAppointmentDoctorId(inChairAppointment) || "";
		if (docId && staffById.has(docId)) {
			const staffMember = staffById.get(docId);
			if (typeof staffMember === "object" && staffMember && "fullName" in staffMember) {
				const name = (staffMember as { fullName?: unknown }).fullName;
				if (typeof name === "string" && name.trim()) return name.trim();
			}
		}
		return "Лечащий врач";
	}, [dashboard, inChairAppointment, staffById]);

	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
		try {
			const s = safeLocalStorageGetItem("dente_doctor_shift_active");
			return s !== null ? s === "true" : true;
		} catch (err) {
			logger.warn("[useShiftViewController] Failed to read shift state:", err);
			return true;
		}
	});

	const handleAutoCloseShift = async (reason = "auto_close_timeout") => {
		setIsShiftOpen(false);
		setIsShiftCloseModalOpen(false);
		try {
			safeLocalStorageSetItem("dente_doctor_shift_active", "false");
			safeLocalStorageRemoveItem(SHIFT_START_TIME_KEY);
		} catch (err) {
			logger.warn("[useShiftViewController] Failed to clear shift storage:", err);
		}
		const meta = getDashboardRuntimeMeta(dashboard);
		staffTelemetryService.logShiftClose("SHIFT-ACTIVE", meta?.activeAppointment?.doctorId, meta?.activeAppointment?.doctorName, {
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
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					force: true,
					closedByUserId: meta?.activeAppointment?.doctorId,
				}),
			});
		} catch (err) {
			logger.warn("[useShiftViewController] Auto-close shift request failed:", err);
		}
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
			} catch (err) {
				logger.warn("[useShiftViewController] Shift timeout check error:", err);
			}
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
					await fetch("/api/shifts/auto-close-check", {
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Idempotency-Key": generateUuidV7(),
						}),
					});
				} catch (err) {
					logger.warn("[useShiftViewController] auto-close-check failed:", err);
				}
				const res = await fetch("/api/cash/shift-reconciliation", {
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (!isCancelled && data && typeof data.hasOpenShift === "boolean") {
					setIsShiftOpen(data.hasOpenShift);
					try {
						safeLocalStorageSetItem("dente_doctor_shift_active", String(data.hasOpenShift));
					} catch (storageErr) {
						logger.warn("[useShiftViewController] Failed to save shift active flag:", storageErr);
					}
				}
			} catch (err) {
				logger.warn("[useShiftViewController] Shift reconciliation sync failed:", err);
			}
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
			} catch (err) {
				logger.warn("[useShiftViewController] Failed to persist shift start:", err);
			}
			const meta = getDashboardRuntimeMeta(dashboard);
			staffTelemetryService.logShiftOpen("SHIFT-ACTIVE", meta?.activeAppointment?.doctorId, meta?.activeAppointment?.doctorName);
			try {
				await fetch("/api/fiscal/shift/open", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({ openedByUserId: meta?.activeAppointment?.doctorId }),
				});
			} catch (err) {
				logger.warn("[useShiftViewController] Shift open request failed:", err);
			}
		}
	};

	const handleConfirmCloseShift = async (summary?: ShiftCloseSummary) => {
		setIsShiftOpen(false);
		setIsShiftCloseModalOpen(false);
		try {
			safeLocalStorageSetItem("dente_doctor_shift_active", "false");
			safeLocalStorageRemoveItem(SHIFT_START_TIME_KEY);
		} catch (err) {
			logger.warn("[useShiftViewController] Failed to clear shift start:", err);
		}
		const meta = getDashboardRuntimeMeta(dashboard);
		staffTelemetryService.logShiftClose("SHIFT-ACTIVE", meta?.activeAppointment?.doctorId, meta?.activeAppointment?.doctorName, {
			totalAppointments: shiftStats.totalAppointments,
			completedCount: shiftStats.completedCount,
			totalRevenueRub: shiftStats.totalRevenueRub,
			estimatedDoctorPayoutRub: summary?.calculatedPayoutRub ?? shiftStats.estimatedDoctorPayoutRub ?? 0,
			countedCashRub: summary?.countedCashRub,
		});
		try {
			await fetch("/api/fiscal/shift/close", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					force: true,
					closedByUserId: meta?.activeAppointment?.doctorId,
					countedCashRub: summary?.countedCashRub,
					incomeCashRub: shiftStats?.cashBreakdown?.cashRub,
					incomeElectronicRub: shiftStats?.cashBreakdown?.cardRub,
					incomeSbpRub: shiftStats?.cashBreakdown?.sbpRub,
					advanceOffsetRub: shiftStats?.cashBreakdown?.depositRub,
					netRevenueRub: shiftStats?.totalRevenueRub,
				}),
			});
		} catch (err) {
			logger.warn("[useShiftViewController] Shift close request failed:", err);
		}
	};

	function runRecommendedAction(action: ShiftRecommendedAction | null | undefined) {
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
