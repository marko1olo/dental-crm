export const BANK_PROVIDERS = {
	tinkoff: {
		id: "tinkoff" as const,
		nameRu: "Т-Банк (Тинькофф)",
		badge: "Т-Банк 0-0-12 / 0-0-24",
		approvalSpeedRu: "Одобрение за 2 мин онлайн через Tinkoff ID",
		description: "Без визита в банк, оформление по СМС прямо в смартфоне",
	},
	sberbank: {
		id: "sberbank" as const,
		nameRu: "Сбербанк (Покупай со Сбером)",
		badge: "Сбер 0-0-12 / 0-0-24",
		approvalSpeedRu: "Одобрение в СберБанк Онлайн за 1 минуту",
		description: "Для держателей карт Сбера без справок о доходах",
	},
	otp: {
		id: "otp" as const,
		nameRu: "ОТП Банк",
		badge: "ОТП 0-0-12 / 0-0-24",
		approvalSpeedRu: "Одобрение за 5 минут",
		description: "Лояльное рассмотрение для новых клиентов",
	},
	clinic_internal: {
		id: "clinic_internal" as const,
		nameRu: "Внутренняя рассрочка DENTE",
		badge: "Рассрочка клиники 0%",
		approvalSpeedRu: "Мгновенное одобрение у администратора",
		description: "Оплата равными частями по факту выполнения этапов",
	},
} as const;

export const DEFAULT_FOLLOW_UP_MIN_HOURS = 48;
export const DEFAULT_CURATOR_ESCALATION_MIN_HOURS = 24;
export const CLINICAL_BENCHMARK_TOTAL_RUB = 207000;
export const DEFAULT_TEETH_PRESET = [16, 26, 46];
