import { useState } from "react";
import { generateUuidV7, type Dashboard } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import type { UseIncomingCallDataResult } from "../useIncomingCallData";
import { generateAppointmentConfirmationMessage, openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";

export function useDrawerConfirmationActions(params: {
	currentCall: IncomingCallPayload | null;
	callData: UseIncomingCallDataResult;
	dashboard: Dashboard | null | undefined;
}) {
	const { currentCall, callData, dashboard } = params;
	const [smsCopied, setSmsCopied] = useState(false);
	const [isConfirmingAppointment, setIsConfirmingAppointment] = useState(false);
	const [confirmedAppointmentId, setConfirmedAppointmentId] = useState<string | null>(null);

	const handleConfirmAppointment = async () => {
		const upcoming = callData.upcomingAppointment;
		if (!upcoming?.appointmentId) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}
		setIsConfirmingAppointment(true);
		try {
			const res = await fetch(`/api/appointments/${encodeURIComponent(upcoming.appointmentId)}/status`, {
				method: "PATCH",
				headers: {
					...denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
					"Idempotency-Key": generateUuidV7(),
				},
				body: JSON.stringify({ status: "confirmed" }),
			});
			if (!res.ok) {
				let errJson: {
					data?: { message?: string; error?: string };
					message?: string;
					error?: string;
				} | null = null;
				try {
					errJson = (await res.json()) as typeof errJson;
				} catch (parseErr) {
					clientLogger.warn("[useDrawerConfirmationActions] Failed to parse error JSON:", parseErr);
				}
				const errBody = errJson?.data ?? errJson;
				const errMsg = errBody?.message || errBody?.error || "Не удалось подтвердить приём в расписании";
				showToast(errMsg, "error");
				return;
			}
			setConfirmedAppointmentId(upcoming.appointmentId);
			showToast(
				`Приём подтверждён в расписании (${upcoming.formattedTime}, ${upcoming.doctorName ?? "врач клиники"})`,
				"success",
			);
			window.dispatchEvent(
				new CustomEvent("dente:appointment-status-updated", {
					detail: { appointmentId: upcoming.appointmentId, status: "confirmed" },
				}),
			);
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Ошибка сети при подтверждении приёма";
			showToast(errMsg, "error");
		} finally {
			setIsConfirmingAppointment(false);
		}
	};

	const handleSendWhatsAppConfirmation = () => {
		if (!callData.upcomingAppointment || !currentCall?.phone) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callData.callerName,
			doctorName: callData.upcomingAppointment.doctorName,
			appointmentStartsAt: callData.upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.profile?.clinicName || "DENTE",
		});
		openWhatsAppChat(currentCall.phone, msg);
		showToast(`Подтверждение приёма отправлено в WhatsApp (${callData.callerName})`, "success");
	};

	const handleCopySmsConfirmation = () => {
		if (!callData.upcomingAppointment) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callData.callerName,
			doctorName: callData.upcomingAppointment.doctorName,
			appointmentStartsAt: callData.upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.profile?.clinicName || "DENTE",
		});
		navigator.clipboard?.writeText(msg).then(() => {
			setSmsCopied(true);
			showToast("Текст SMS-подтверждения скопирован в буфер", "success");
			setTimeout(() => setSmsCopied(false), 2000);
		});
	};

	return {
		smsCopied,
		isConfirmingAppointment,
		confirmedAppointmentId,
		handleConfirmAppointment,
		handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation,
	};
}
