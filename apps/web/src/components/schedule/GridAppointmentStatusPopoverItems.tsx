import React, { useRef } from "react";
import type { Appointment } from "@dental/shared";
import { playIntercomChime } from "../../lib/intercomSound";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import { isAppointmentInChair } from "./appointmentCardHelpers";
import { APPOINTMENT_STATUS_CONFIG } from "./appointmentStatusConfig";

export interface StatusItemProps {
	appointmentId: string;
	currentStatus: Appointment["status"];
	patientId?: string | null | undefined;
	patientName: string;
	onClose: () => void;
	onQuickStatusChange: (id: string, status: Appointment["status"]) => void;
}

export function GridAppointmentStatusPopoverItems({
	appointmentId,
	currentStatus,
	patientId,
	patientName,
	onClose,
	onQuickStatusChange,
}: StatusItemProps) {
	const inFlightRef = useRef(false);

	const handleSelect = (status: Appointment["status"]) => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			onQuickStatusChange(appointmentId, status);
			if (status === "arrived") {
				playIntercomChime("urgent");
				showToast(`Пациент ${patientName} в холле клиники`, "info");
			} else if (status === "in_treatment") {
				playIntercomChime("normal");
				if (patientId) usePatientStore.getState().setSelectedPatientId(patientId);
				showToast(`Пациент ${patientName} в кресле`, "info");
			} else if (status === "completed") {
				showToast(`Приём ${patientName} завершён`, "success");
			}
			onClose();
		} finally {
			inFlightRef.current = false;
		}
	};

	return (
		<>
			{APPOINTMENT_STATUS_CONFIG.map((item) => {
				const Icon = item.icon;
				const isActive =
					item.status === "in_treatment"
						? isAppointmentInChair(currentStatus)
						: currentStatus === item.status;
				return (
					<button
						key={item.status}
						type="button"
						onClick={() => handleSelect(item.status)}
						className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
							isActive ? item.activeClass : item.idleClass
						}`}
						data-testid={`quick-status-picker-${item.status.replace("_", "-")}-${appointmentId}`}
					>
						<Icon size={13} />
						<span>{item.label}</span>
					</button>
				);
			})}
		</>
	);
}
