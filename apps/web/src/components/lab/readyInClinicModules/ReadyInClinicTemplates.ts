import { generateOrthopedicReadyMessage } from "../../../store/telephonyClinical";

export interface ReadyInClinicLabOrder {
	readonly id?: string;
	readonly orderNumber: string;
	readonly patientId?: string;
	readonly patientName: string;
	readonly patientPhone?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly toothFdi?: string | number | readonly (string | number)[];
	readonly material?: string;
	readonly colorVita?: string;
	readonly constructionType?: string;
	readonly clinicName?: string;
	readonly clinicPhone?: string;
	readonly bookingUrl?: string;
	readonly priceRub?: number;
	readonly clinicSharePct?: number;
	readonly doctorSharePct?: number;
	readonly isPartialDelivery?: boolean;
	readonly isWarrantyRework?: boolean;
}

export function generateReadyInClinicSmsTemplate(
	order: ReadyInClinicLabOrder,
	clinicName = "DENTE",
	clinicPhone = "+7 (495) 000-00-00",
): string {
	return generateOrthopedicReadyMessage({
		patientName: order.patientName,
		orderNumber: order.orderNumber,
		toothFdi: order.toothFdi,
		material: order.material,
		doctorName: order.doctorName,
		clinicName,
		clinicPhone,
		channel: "sms",
	});
}

export function generateReadyInClinicWhatsAppTemplate(
	order: ReadyInClinicLabOrder,
	clinicName = "DENTE",
	clinicPhone = "+7 (495) 000-00-00",
	bookingUrl = "https://dente.ru/book",
): string {
	return generateOrthopedicReadyMessage({
		patientName: order.patientName,
		orderNumber: order.orderNumber,
		toothFdi: order.toothFdi,
		material: order.material,
		doctorName: order.doctorName || "лечащий врач",
		clinicName,
		clinicPhone,
		bookingUrl,
		channel: "whatsapp",
	});
}
