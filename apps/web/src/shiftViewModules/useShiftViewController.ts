import { useState, useEffect, useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../lib/safeLocalStorage";
import { staffTelemetryService } from "./../services/logging/staffTelemetryService";
import type { ShiftFinancialMode } from "./shiftViewTypes";
import { useShiftFinancialModeState } from "./useShiftFinancialModeState";

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
}

export function useShiftViewController({
	dashboard, inChairAppointment, staffById, shiftStats, patientsById, setSelectedPatientId,
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

	useEffect(() => {
		let isCancelled = false;
		async function sync() {
			try {
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
			try { safeLocalStorageSetItem("dente_doctor_shift_active", "true"); } catch {}
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
		try { safeLocalStorageSetItem("dente_doctor_shift_active", "false"); } catch {}
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
		activeDoctorFullName, isShiftOpen, handleToggleShift, handleConfirmCloseShift, runRecommendedAction,
	};
}
