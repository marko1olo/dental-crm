import { generateOrthopedicReadyMessage } from "../../../store/telephonyClinical";

export interface ReadyInClinicLabOrder {
	readonly id?: string | undefined;
	readonly orderNumber: string;
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly toothFdi?: string | number | readonly (string | number)[] | undefined;
	readonly material?: string | undefined;
	readonly colorVita?: string | undefined;
	readonly constructionType?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly bookingUrl?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly clinicSharePct?: number | undefined;
	readonly doctorSharePct?: number | undefined;
	readonly isPartialDelivery?: boolean | undefined;
	readonly isWarrantyRework?: boolean | undefined;
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
