import type { DentalLabOrderData } from "../../DentalLabOrderModal";

export function createTechnicianCommentPrompt(
	order: DentalLabOrderData,
	onSubmit: (comment: string) => Promise<void> | void,
) {
	return {
		title: `Комментарий зубному технику · ${(order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ")}`,
		description: `Сообщение для техника ЗТЛ по наряду пациента ${order.patientName || "Пациент"}:`,
		submitLabel: "Отправить технику",
		submitVariant: "teal" as const,
		multiline: true,
		placeholder: "Уточнение параметров препарирования, анатомии, прикуса...",
		quickPresets: [
			"Уточнить цвет по фото в приложении",
			"Обратить внимание на выраженный экватор",
			"Минимальное занижение под прикус",
			"Срочный заказ, пациент уезжает",
		],
		onSubmit,
	};
}

export function createRepeatFittingPrompt(
	order: DentalLabOrderData,
	onSubmit: (reason: string) => Promise<void> | void,
) {
	return {
		title: `Повторная примерка · ${(order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ")}`,
		description: "Укажите клинические замечания для повторной примерки конструкции:",
		submitLabel: "Назначить примерку",
		submitVariant: "teal" as const,
		multiline: true,
		placeholder: "Замечания по окклюзии, контактным пунктам, прилеганию...",
		quickPresets: [
			"Коррекция по прикусу (окклюзия)",
			"Припасовка апроксимальных контактов",
			"Индивидуализация мамелонов и микрорельефа",
			"Повторная примерка после коррекции уступа",
		],
		onSubmit,
	};
}

export function createReclamationPrompt(
	order: DentalLabOrderData,
	onSubmit: (reason: string) => Promise<void> | void,
) {
	return {
		title: `Рекламация / Гарантийная переделка (0 ₽) · ${(order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ")}`,
		description: "Укажите причину рекламации. Для пациента переделка бесплатна (0 ₽). Наряд передается технику без создания дубликата пациента.",
		submitLabel: "Оформить рекламацию (0 ₽)",
		submitVariant: "danger" as const,
		multiline: true,
		placeholder: "Причина брака или рекламации...",
		quickPresets: [
			"Несоответствие оттенка / цвета VITA",
			"Завышение по прикусу / окклюзии",
			"Неплотное краевое прилегание / балансировка",
			"Скол керамической массы",
			"Недосадка каркаса на уступ",
			"Коррекция контактного пункта",
		],
		onSubmit,
	};
}
