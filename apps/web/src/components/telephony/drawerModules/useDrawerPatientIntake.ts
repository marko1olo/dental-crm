import { useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { usePatientStore } from "../../../store/patientStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { captureLeadFromIncomingCall } from "../telephonyAttribution";

export function useDrawerPatientIntake(params: {
	currentCall: any; callData: any; ctx: any;
}) {
	const { currentCall, callData, ctx } = params;
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const [newPatientNameInput, setNewPatientNameInput] = useState("");
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);

	const handleQuickCreatePatient = async (customName?: string) => {
		if (!currentCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const entered = typeof customName === "string" ? customName : newPatientNameInput;
			const targetName = entered.trim() || `Пациент ${callData.formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({ fullName: targetName, phone: currentCall.phone }),
			});
			if (!res.ok) {
				let errMsg = "Ошибка при создании пациента";
				try { const data = await res.json(); if (data?.message) errMsg = data.message; } catch {}
				showToast(errMsg, "error");
				return;
			}
			const createdPatient = await res.json();
			setSelectedPatientId(createdPatient.id);
			setNewPatientNameInput("");
			const active = useTelephonyStore.getState().activeCall;
			if (active) triggerIncomingCall({ ...active, patientId: createdPatient.id, patientName: createdPatient.fullName });
			if (ctx?.setDashboard) {
				ctx.setDashboard((curr: any) => curr ? { ...curr, patients: [createdPatient, ...curr.patients.filter((p: any) => p.id !== createdPatient.id)] } : curr);
			}
			showToast(`Создана амбулаторная карта: ${createdPatient.fullName} (${callData.formattedPhone})`, "success");
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

	return {
		newPatientNameInput, setNewPatientNameInput, isCreatingPatient, isCapturingLead,
		handleQuickCreatePatient, handleCaptureLead,
	};
}
