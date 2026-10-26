import { formatCurrencyRu } from "../../../utils/formatters.js";
import type { PatientOmnichannelContact } from "../omnichannelTypes.js";

export function generateSbpPaymentShareText(params: {
	patientName: string;
	sumRub: number;
	orderId: string;
	nspkUrl: string;
	clinicName: string;
}): string {
	return `Здравствуйте, ${params.patientName}!\nСчет на оплату медицинских услуг в клинике ${params.clinicName}:\nЗаказ №${params.orderId}\nСумма к оплате: ${formatCurrencyRu(params.sumRub)}\nОплата через СБП без комиссии по ссылке:\n${params.nspkUrl}\n\nПосле оплаты чек будет автоматически отправлен вам в этот чат.`;
}

export function generateBirthdayGreetingText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
	bonusRub = 1000,
	promoCode = "BIRTHDAY",
): string {
	return `Здравствуйте, ${contact.fullName}!\nКоманда клиники ${clinicName} от всей души поздравляет вас с днем рождения!\nЖелаем вам крепкого здоровья, сияющей улыбки и отличного настроения!\n\nВ честь праздника дарим вам бонус ${formatCurrencyRu(bonusRub)} (промокод: ${promoCode}) на любые процедуры клиники или профессиональную гигиену. Будем рады видеть вас!`;
}

export function generateHygieneRecallText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
	monthsAgo = 6,
): string {
	const docStr = contact.nextAppointment?.doctorName || "вашего лечащего врача";
	return `Здравствуйте, ${contact.fullName}!\nПрошло уже ${monthsAgo} месяцев с вашего предыдущего приема у стоматолога (${docStr}).\n\nСтоматологи рекомендуют проходить плановый профилактический осмотр и профессиональную гигиену каждые полгода, чтобы защитить зубы от кариеса и сохранить здоровье десен.\n\nБудем рады подобрать для вас удобное время в ${clinicName}!`;
}
