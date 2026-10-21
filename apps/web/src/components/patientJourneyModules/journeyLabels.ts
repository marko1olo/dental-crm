export const medicalDictionary: Array<[RegExp, string]> = [
	[
		/К02\.0|К02\.1|К02\.2|кариес\s*эмали|кариес\s*дентина/gi,
		"Лечение кариеса с эстетической реставрацией",
	],
	[
		/К04\.0|К04\.1|пульпит|девитализация|экстирпация\s*пульпы/gi,
		"Бережное лечение зубного нерва под микроскопом",
	],
	[
		/К04\.4|К04\.5|периодонтит|обтурация\s*каналов/gi,
		"Пломбирование и стерилизация корневых каналов",
	],
	[/К05\.\d|пародонтит|гингивит|кюретаж/gi, "Оздоровление и укрепление десен"],
	[
		/синус-лифтинг|аугментация\s*кости|остеопластика/gi,
		"Подготовка костной ткани к установке имплантата",
	],
	[
		/дентальная\s*имплантация|установка\s*имплантата/gi,
		"Установка премиального имплантата",
	],
	[
		/препарирование\s*под\s*коронку|снятие\s*оттисков/gi,
		"Подготовка зуба под защитную керамическую коронку",
	],
	[/коффердам|раббердам/gi, "Стерильная защита зуба латексным платком"],
	[/апекс-локация/gi, "Точное электронное измерение длины каналов"],
	[
		/профессиональная\s*гигиена|air-flow|ультразвук/gi,
		"Комплексная спа-гигиена Air-Flow и удаление налета",
	],
];

export const appointmentStatusLabels: Record<string, string> = {
	planned: "запланирован",
	confirmed: "подтверждён",
	arrived: "пациент пришёл",
	in_treatment: "идёт приём",
	in_progress: "идёт приём",
	completed: "завершён",
	cancelled: "отменён",
	no_show: "пациент не пришёл",
};

export const insightCategoryLabels: Record<string, string> = {
	churn_risk: "риск потерять пациента",
	unscheduled_treatment: "лечение не запланировано",
	overdue_recall: "пора на осмотр",
	balance_due: "есть долг",
	documents_missing: "не хватает документов",
};

export const insightRiskLabels: Record<string, string> = {
	low: "спокойно",
	watch: "контроль",
	medium: "контроль",
	high: "срочно",
};

export const paymentMethodLabels: Record<string, string> = {
	cash: "наличные",
	card: "карта",
	bank_transfer: "перевод",
	online: "онлайн",
	insurance: "страховая",
	family_wallet: "семейный счёт",
	other: "иное",
};

export const paymentStatusLabels: Record<string, string> = {
	planned: "запланирована",
	paid: "оплачена",
	refunded: "возврат",
	voided: "аннулирована",
};
