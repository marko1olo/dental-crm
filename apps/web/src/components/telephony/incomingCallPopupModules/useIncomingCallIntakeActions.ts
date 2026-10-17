import React, { useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { usePatientStore } from "../../../store/patientStore";
import { type DashboardResponse, type IncomingCallPayload, useTelephonyStore } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { captureLeadFromIncomingCall } from "../telephonyAttribution";

interface IntakeParams {
	currentCall: IncomingCallPayload | null;
	formattedPhone: string;
	newPatientNameInput: string;
	setNewPatientNameInput: React.Dispatch<React.SetStateAction<string>>;
	setDashboard?: React.Dispatch<React.SetStateAction<DashboardResponse | null>> | undefined;
}

export function useIncomingCallIntakeActions({
	currentCall, formattedPhone, newPatientNameInput, setNewPatientNameInput, setDashboard,
}: IntakeParams) {
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);

	const handleQuickCreatePatient = async (customName?: string) => {
		if (!currentCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const entered = typeof customName === "string" ? customName : newPatientNameInput;
			const targetName = entered.trim() || `Пациент ${formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-clinic-id": readDenteClinicToken(),
					"x-staff-id": readDenteStaffToken(),
				},
				body: JSON.stringify({ fullName: targetName, phone: currentCall.phone }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || `Ошибка сервера: ${res.status}`);
			}

			const createdPatient = await res.json();
			setSelectedPatientId(createdPatient.id);
			setNewPatientNameInput("");

			const active = useTelephonyStore.getState().activeCall;
			if (active) {
				useTelephonyStore.getState().triggerIncomingCall({
					...active, patientId: createdPatient.id, patientName: createdPatient.fullName,
				});
			}

			if (setDashboard) {
				setDashboard((curr) =>
					curr
						? { ...curr, patients: [createdPatient, ...curr.patients.filter((p) => p.id !== createdPatient.id)] }
						: curr,
				);
			}

			showToast(`Создана амбулаторная карта: ${createdPatient.fullName} (${formattedPhone})`, "success");
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Не удалось сохранить пациента", "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	const handleCaptureLead = async () => {
		if (!currentCall || isCapturingLead) return;
		setIsCapturingLead(true);
		try {
			const res = await captureLeadFromIncomingCall(currentCall, { customName: newPatientNameInput });
			showToast(res.message, res.success ? "success" : "error");
		} finally {
			setIsCapturingLead(false);
		}
	};

	const handleStartQuickCreateFromMenu = () => {
		if (currentCall?.phone) setNewPatientPhone(currentCall.phone);
		void handleQuickCreatePatient();
	};

	return {
		isCreatingPatient, isCapturingLead,
		handleQuickCreatePatient, handleCaptureLead, handleStartQuickCreateFromMenu,
	};
}
