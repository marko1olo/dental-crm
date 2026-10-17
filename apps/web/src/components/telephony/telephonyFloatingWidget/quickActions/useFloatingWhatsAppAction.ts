import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import type {
	DashboardResponse,
	IncomingCallPayload,
	PatientRecord,
	PatientUpcomingAppointment,
} from "../../../../store/telephonyStore";
import {
	generateAppointmentConfirmationMessage,
	openWhatsAppChat,
} from "../../../../store/telephonyStore";
import { showToast } from "../../../GlobalToast";

interface UseFloatingWhatsAppActionParams {
	activeCall: IncomingCallPayload | null;
	resolvedPatient: PatientRecord | null;
	upcomingAppointment: PatientUpcomingAppointment | null;
	callerName: string;
	dashboard: DashboardResponse | null | undefined;
}

export function useFloatingWhatsAppAction({
	activeCall,
	resolvedPatient,
	upcomingAppointment,
	callerName,
	dashboard,
}: UseFloatingWhatsAppActionParams) {
	const [whatsappSent, setWhatsappSent] = useState(false);

	const handleSendWhatsApp = () => {
		if (!activeCall) return;
		const clinicName = dashboard?.clinicSettings?.profile?.clinicName || (dashboard?.clinicSettings as any)?.name || "DENTE";
		const msg = upcomingAppointment
			? generateAppointmentConfirmationMessage({
					patientName: callerName,
					doctorName: upcomingAppointment.doctorName,
					appointmentStartsAt: upcomingAppointment.startsAt,
					clinicName,
				})
			: `Здравствуйте, ${callerName}! Вас приветствует стоматологическая клиника ${clinicName}.`;

		openWhatsAppChat(activeCall.phone, msg);
		if (resolvedPatient?.id) {
			fetch("/api/whatsapp/send", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ patientId: resolvedPatient.id, message: msg }),
			}).catch((err) => {
				console.warn("[TelephonyFloatingWidget] WhatsApp direct send API error:", err);
			});
		}
		setWhatsappSent(true);
		showToast(`Сообщение сформировано в WhatsApp (${callerName})`, "success");
	};

	return { whatsappSent, handleSendWhatsApp };
}
