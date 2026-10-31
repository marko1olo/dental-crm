import { useState, useMemo, useCallback } from "react";
import type { DoctorShiftAppointment } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { buildEmergencyAppointment } from "../shiftApiUtils";

export interface UseShiftEmergencyVisitParams {
	initialDoctorId: string;
	initialDoctorName: string;
	initialShiftDateIso: string;
	appointments: readonly DoctorShiftAppointment[];
	setAppointments: React.Dispatch<React.SetStateAction<readonly DoctorShiftAppointment[]>>;
	onAppointmentUpdate?: ((appointments: readonly DoctorShiftAppointment[]) => void) | undefined;
	onEmergencyVisit?: (() => void) | undefined;
	onShiftClose?: (() => void) | undefined;
	onClose: () => void;
}

export interface UseShiftEmergencyVisitReturn {
	isCloseModalOpen: boolean;
	setIsCloseModalOpen: (open: boolean) => void;
	formattedShiftDate: string;
	handleConfirmCloseShift: () => void;
	handleEmergencyVisit: () => void;
}

/**
 * useShiftEmergencyVisit
 *
 * Emergency unscheduled visit intake and shift wrap-up actions.
 * Complies with Mandate 8n (Solo Doctor Sovereignty):
 * - 1-Click acute pain emergency admission into the active chair.
 * - Zero administrative barrier or mandatory assistant requirement.
 */
export function useShiftEmergencyVisit({
	initialDoctorId,
	initialDoctorName,
	initialShiftDateIso,
	appointments,
	setAppointments,
	onAppointmentUpdate,
	onEmergencyVisit,
	onShiftClose,
	onClose,
}: UseShiftEmergencyVisitParams): UseShiftEmergencyVisitReturn {
	const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);

	// Emergency patient admission in 1-click
	const handleEmergencyVisit = useCallback(() => {
		if (onEmergencyVisit) {
			onEmergencyVisit();
			return;
		}
		const emergencyApt = buildEmergencyAppointment(
			initialDoctorId,
			initialDoctorName,
			initialShiftDateIso,
		);
		const updated = [emergencyApt, ...appointments];
		setAppointments(updated);
		onAppointmentUpdate?.(updated);
		showToast("Экстренный пациент принят в кресло (острая боль)", "success");
	}, [
		onEmergencyVisit,
		initialDoctorId,
		initialDoctorName,
		initialShiftDateIso,
		appointments,
		onAppointmentUpdate,
		setAppointments,
	]);

	// Dynamically formatted shift date in Russian locale
	const formattedShiftDate = useMemo(() => {
		const shiftDate = initialShiftDateIso ?? new Date().toISOString().split("T")[0]!;
		try {
			const datePart = shiftDate.split("T")[0] ?? shiftDate;
			const d = new Date(datePart + "T00:00:00");
			if (Number.isNaN(d.getTime())) return shiftDate;
			return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
		} catch {
			return shiftDate;
		}
	}, [initialShiftDateIso]);

	const handleConfirmCloseShift = useCallback(() => {
		setIsCloseModalOpen(false);
		showToast("Смена врача успешно закрыта. Акт сдачи-приемки сформирован.", "success");
		onShiftClose?.();
		onClose();
	}, [onShiftClose, onClose]);

	return {
		isCloseModalOpen,
		setIsCloseModalOpen,
		formattedShiftDate,
		handleConfirmCloseShift,
		handleEmergencyVisit,
	};
}
