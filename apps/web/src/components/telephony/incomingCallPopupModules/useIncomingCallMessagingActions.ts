import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	type DashboardResponse,
	type IncomingCallPayload,
	type PatientRecord,
	type PatientUpcomingAppointment,
	generateAppointmentConfirmationMessage,
	openWhatsAppChat,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { DEFAULT_CLINIC_BRAND_NAME } from "./incomingCallConstants";

interface MessagingParams {
	currentCall: IncomingCallPayload | null;
	resolvedPatient: PatientRecord | null;
	upcomingAppointment: PatientUpcomingAppointment | null;
	callerName: string;
	formattedPhone: string;
	dashboard: DashboardResponse | null | undefined;
}

export function useIncomingCallMessagingActions({
	currentCall, resolvedPatient, upcomingAppointment, callerName, formattedPhone, dashboard,
}: MessagingParams) {
	const [smsCopied, setSmsCopied] = useState(false);

	const handleSendWhatsAppConfirmation = () => {
		if (!currentCall?.phone) return;
		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName, doctorName: upcomingAppointment?.doctorName || null,
			appointmentStartsAt: upcomingAppointment?.startsAt || new Date().toISOString(),
			clinicName: dashboard?.clinicSettings?.profile?.clinicName || (dashboard?.clinicSettings as any)?.name || DEFAULT_CLINIC_BRAND_NAME,
		});
		openWhatsAppChat(currentCall.phone, msg);
		if (resolvedPatient?.id) {
			fetch("/api/whatsapp/send", {
				method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ patientId: resolvedPatient.id, message: msg }),
			}).catch((err) => console.warn("[IncomingCallPopup] WhatsApp direct send API error:", err));
		}
		showToast(`Чат WhatsApp открыт для ${callerName} (${formattedPhone})`, "success");
	};

	const handleCopySmsConfirmation = () => {
		if (!upcomingAppointment) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName, doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.profile?.clinicName || (dashboard?.clinicSettings as any)?.name || DEFAULT_CLINIC_BRAND_NAME,
		});
		navigator.clipboard?.writeText(msg).then(() => {
			setSmsCopied(true);
			showToast("Текст SMS-подтверждения скопирован в буфер", "success");
		});
	};

	return { smsCopied, handleSendWhatsAppConfirmation, handleCopySmsConfirmation };
}
