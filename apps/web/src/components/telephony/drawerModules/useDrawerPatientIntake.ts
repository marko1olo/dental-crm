import { useState } from "react";
import type { Dashboard, Patient } from "@dental/shared";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import type { UseIncomingCallDataResult } from "../useIncomingCallData";
import type { AppLogicContextValue } from "../../../contexts/AppLogicContext";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { usePatientStore } from "../../../store/patientStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { captureLeadFromIncomingCall } from "../telephonyAttribution";
import { clientLogger } from "../../../services/logging/clientLogger";

export function useDrawerPatientIntake(params: {
	currentCall: IncomingCallPayload | null;
	callData: UseIncomingCallDataResult;
	ctx: AppLogicContextValue | null | undefined;
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
					"Idempotency-Key": crypto.randomUUID(),
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({ fullName: targetName, phone: currentCall.phone }),
			});
			if (!res.ok) {
				let errMsg = "Ошибка при создании пациента";
				try {
					const data = await res.json();
					if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
						errMsg = data.message;
					}
				} catch (err: unknown) {
					clientLogger.warn("[useDrawerPatientIntake] Failed to parse error response:", err);
				}
				showToast(errMsg, "error");
				return;
			}
			const rawJson: unknown = await res.json();
			const payload = (rawJson && typeof rawJson === "object" && "data" in rawJson && rawJson.data)
				? (rawJson.data as Patient)
				: (rawJson as Patient);

			if (!payload?.id) {
				showToast("Не удалось определить идентификатор созданного пациента", "error");
				return;
			}

			const patientFullName = payload.fullName || targetName;
			setSelectedPatientId(payload.id);
			setNewPatientNameInput("");
			const active = useTelephonyStore.getState().activeCall;
			if (active) triggerIncomingCall({ ...active, patientId: payload.id, patientName: patientFullName });
			if (ctx?.setDashboard) {
				ctx.setDashboard((curr: Dashboard | null) =>
					curr
						? {
								...curr,
								patients: [
									payload,
									...curr.patients.filter((p: Patient) => p.id !== payload.id),
								],
							}
						: null,
				);
			}
			showToast(`Создана амбулаторная карта: ${patientFullName} (${callData.formattedPhone})`, "success");
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
