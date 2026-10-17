import type React from "react";
import { useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../../../lib/safeLocalStorage";
import type { DashboardResponse, IncomingCallPayload } from "../../../../store/telephonyStore";
import { useTelephonyStore } from "../../../../store/telephonyStore";
import { showToast } from "../../../GlobalToast";
import { captureLeadFromIncomingCall } from "../../telephonyAttribution";

interface UseFloatingPatientAndLeadActionsParams {
	activeCall: IncomingCallPayload | null;
	formattedPhone: string;
	dashboard: DashboardResponse | null | undefined;
	setDashboard?: React.Dispatch<React.SetStateAction<DashboardResponse | null>> | undefined;
	setSelectedPatientId: (id: string) => void;
}

export function useFloatingPatientAndLeadActions({
	activeCall,
	formattedPhone,
	dashboard,
	setDashboard,
	setSelectedPatientId,
}: UseFloatingPatientAndLeadActionsParams) {
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);

	const handleQuickCreatePatient = async (customName?: string) => {
		if (!activeCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const targetName = customName?.trim() || `Пациент ${formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({ fullName: targetName, phone: activeCall.phone }),
			});

			if (!res.ok) {
				let errMsg = "Ошибка при создании пациента";
				try {
					const data = await res.json();
					if (data?.message) errMsg = data.message;
				} catch {}
				showToast(errMsg, "error");
				return;
			}

			const createdPatient = await res.json();
			setSelectedPatientId(createdPatient.id);

			const active = useTelephonyStore.getState().activeCall;
			if (active) {
				useTelephonyStore.getState().triggerIncomingCall({
					...active,
					patientId: createdPatient.id,
					patientName: createdPatient.fullName,
				});
			}

			if (setDashboard) {
				setDashboard((curr) =>
					curr ? { ...curr, patients: [createdPatient, ...curr.patients.filter((p) => p.id !== createdPatient.id)] } : curr,
				);
			}

			showToast(`Пациент создан: ${createdPatient.fullName}`, "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Сетевая ошибка при создании пациента";
			showToast(msg, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	const handleCaptureLead = async () => {
		if (!activeCall || isCapturingLead) return;
		setIsCapturingLead(true);
		try {
			const res = await captureLeadFromIncomingCall(activeCall);
			if (res.success) showToast(res.message, "success");
			else showToast(res.message, "error");
		} finally {
			setIsCapturingLead(false);
		}
	};

	return { isCreatingPatient, isCapturingLead, handleQuickCreatePatient, handleCaptureLead };
}
