import type { OmnichannelTemplate } from "../omnichannelTypes.js";
import { PRIMARY_TEMPLATES } from "./defaultTemplates.js";

export const MARKETING_TEMPLATES: readonly OmnichannelTemplate[] = [
	{
		id: "tpl-sbp",
		name: "Счет на оплату через СБП",
		category: "sbp_payment",
		channel: "all",
		title: "QR-код и ссылка СБП",
		description: "Быстрая оплата услуг без комиссии через Систему Быстрых Платежей НСПК",
		templateText:
			"Здравствуйте, {patientName}!\nСчет на оплату медицинских услуг в {clinicName}:\nЗаказ №{orderId}\nСумма: {treatmentSum}\nСсылка для оплаты через СБП:\n{paymentLink}\n\nЭлектронный кассовый чек поступит сразу после оплаты.",
		interactiveButtons: [
			{ id: "btn-open-sbp", title: "Оплатить в приложении банка (СБП)", action: "open_bank", variant: "primary" },
		],
		variables: ["{patientName}", "{clinicName}", "{orderId}", "{treatmentSum}", "{paymentLink}"],
	},
	{
		id: "tpl-birthday",
		name: "Поздравление с днем рождения",
		category: "birthday_greeting",
		channel: "all",
		title: "Поздравление и праздничный бонус",
		description: "Персональное поздравление пациента с днем рождения с начислением подарочных бонусов",
		templateText:
			"Здравствуйте, {patientName}!\nКоманда клиники {clinicName} поздравляет вас с днем рождения!\nЖелаем вам крепкого здоровья, отличного настроения и прекрасной улыбки!\n\nВ честь праздника дарим вам сертификат на {bonusAmount} (промокод: {promoCode}), действующий {validDays}.\nЖдем вас в гости!",
		interactiveButtons: [
			{ id: "btn-bday-book", title: "Записаться на прием", action: "book_visit", variant: "primary" },
			{ id: "btn-bday-call", title: "Связаться с клиникой", action: "call_clinic", variant: "secondary" },
		],
		variables: ["{patientName}", "{clinicName}", "{bonusAmount}", "{promoCode}", "{validDays}"],
	},
	{
		id: "tpl-hygiene-recall",
		name: "Плановая профгигиена и профосмотр (6 месяцев)",
		category: "hygiene_recall",
		channel: "all",
		title: "Контрольный осмотр и гигиена полости рта",
		description: "Приглашение на плановую профгигиену через 6 месяцев после санации",
		templateText:
			"Здравствуйте, {patientName}!\nПрошло 6 месяцев с вашего последнего визита к доктору {doctorName}.\n\nСтоматологи рекомендуют проходить плановый профосмотр и профессиональную гигиену каждые полгода, чтобы предотвратить появление зубного камня и сохранить здоровье зубов.\n\nПодберем удобное для вас время в {clinicName}?",
		interactiveButtons: [
			{ id: "btn-hygiene-book", title: "Записаться на гигиену", action: "book_hygiene", variant: "primary" },
			{ id: "btn-hygiene-snooze", title: "Напомнить через 2 нед.", action: "snooze_recall", variant: "secondary" },
		],
		variables: ["{patientName}", "{clinicName}", "{doctorName}"],
	},
];

export const DEFAULT_TEMPLATES: readonly OmnichannelTemplate[] = [
	...PRIMARY_TEMPLATES,
	...MARKETING_TEMPLATES,
];
