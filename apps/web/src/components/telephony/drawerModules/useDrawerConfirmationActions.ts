import { useState } from "react";
import { generateAppointmentConfirmationMessage, openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";

export function useDrawerConfirmationActions(params: {
	currentCall: any;
	callData: any;
	dashboard: any;
}) {
	const { currentCall, callData, dashboard } = params;
	const [smsCopied, setSmsCopied] = useState(false);

	const handleSendWhatsAppConfirmation = () => {
		if (!callData.upcomingAppointment || !currentCall?.phone) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callData.callerName,
			doctorName: callData.upcomingAppointment.doctorName,
			appointmentStartsAt: callData.upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
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
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});
		navigator.clipboard?.writeText(msg).then(() => {
			setSmsCopied(true);
			showToast("Текст SMS-подтверждения скопирован в буфер", "success");
			setTimeout(() => setSmsCopied(false), 2000);
		});
	};

	return { smsCopied, handleSendWhatsAppConfirmation, handleCopySmsConfirmation };
}
