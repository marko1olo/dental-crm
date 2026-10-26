import type { ReceptionQuickContactParams } from "./types";

export function buildReceptionQuickContactMessage(params: ReceptionQuickContactParams): {
	messageText: string;
	whatsAppLink: string;
	telLink: string;
} {
	const cleanPhone = (params.patientPhone || "").replace(/\D/g, "");
	const formattedPhone = cleanPhone.startsWith("8") && cleanPhone.length === 11
		? `7${cleanPhone.slice(1)}`
		: cleanPhone;

	const clinic = params.clinicName || "Стоматологическая клиника «ДЕНТЕ»";
	const time = params.appointmentTime ? `в ${params.appointmentTime}` : "сегодня";
	const doc = params.doctorName ? ` (врач: ${params.doctorName})` : "";
	const firstName = (params.patientName || "Уважаемый пациент").split(" ")[0] || "Здравствуйте";

	let messageText = "";

	switch (params.template) {
		case "reminder_visit":
			messageText = `Здравствуйте, ${firstName}! Напоминаем о вашем визите в ${clinic} ${time}${doc}. Если ваши планы изменились, пожалуйста, сообщите нам. Ждем вас!`;
			break;
		case "doctor_early":
			messageText = `Здравствуйте, ${firstName}! Доктор${doc} освободился чуть раньше запланированного времени. Если вам удобно, вы можете подойти пораньше. С уважением, ${clinic}.`;
			break;
		case "patient_running_late":
			messageText = `Здравствуйте, ${firstName}! Уточняем, всё ли у вас в порядке и успеваете ли вы к нам на приём ${time}${doc}? Мы вас ждем! С уважением, администратор ${clinic}.`;
			break;
		case "custom":
			messageText = params.customMessage || `Здравствуйте, ${firstName}! С уважением, ${clinic}.`;
			break;
	}

	const whatsAppLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
	const telLink = `tel:+${formattedPhone || cleanPhone}`;

	return {
		messageText,
		whatsAppLink,
		telLink,
	};
}
