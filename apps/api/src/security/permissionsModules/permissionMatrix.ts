/**
 * permissionMatrix.ts — матрица прав доступа и ролей DENTE CRM.
 *
 * Принципы:
 *  • список прав закрытый — опечатка в имени права не компилируется;
 *  • неизвестная роль не получает ничего (fail closed), а не «всё»;
 *  • право выдаётся ролям явно, наследования нет: цепочки вроде
 *    «owner наследует admin наследует doctor» скрывают, кто что реально может.
 */

export const PERMISSIONS = [
	// Расписание и приёмы
	"schedule.read",
	"schedule.write",
	// Карточки пациентов
	"patients.read",
	"patients.write",
	// Медицинская документация: осмотры, дневники, планы лечения
	"clinical.read",
	"clinical.write",
	// Деньги: оплаты, касса, семейный кошелёк, возвраты
	"finance.read",
	"finance.write",
	// Отчёты и аналитика
	"analytics.read",
	/*
	 * Зарплата: выплаты врачам, ставки, удержания за материалы.
	 *
	 * ЗАЧЕМ ОТДЕЛЬНОЕ ПРАВО, А НЕ analytics.read. Выплаты нельзя вешать на
	 * аналитику: analytics.read выдан administrator (ресепшен) и НЕ выдан doctor.
	 * На этом праве администратор смены увидел бы зарплаты всех врачей клиники, а
	 * сам врач не увидел бы даже свою. Это ровно наоборот к тому, как зарплата
	 * устроена в клинике.
	 *
	 * payroll.read — выплаты всех врачей клиники. payroll.read.own — только свои
	 * строки, фильтр по doctor_user_id ставится на СЕРВЕРЕ, а не в интерфейсе.
	 */
	"payroll.read",
	"payroll.read.own",
	// Склад и лаборатория
	"inventory.read",
	"inventory.write",
	// Настройки клиники, интеграции, сотрудники
	"settings.read",
	"settings.write",
	// Выгрузка медицинских документов в ЕГИСЗ
	"egisz.submit",
	// Переписка с пациентами: шаблоны, очередь отправки, согласия, рассылки.
	// Отдельно от patients.*: смотреть карточку и рассылать сообщения — разные
	// полномочия, и цена ошибки в рассылке измеряется в штрафах ФАС.
	"communications.read",
	"communications.write",
	// Управление ИИ-ассистентом и контекстом интерфейса (Мандат 8e)
	"agent.read",
	"agent.write",
	// Доступ к рабочей станции врача (томографы, визиографы, файлы)
	"workstation.read",
	"workstation.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

/**
 * Матрица прав. Роли берутся из users.role — в базе сейчас встречаются
 * owner, administrator, doctor, assistant; admin и manager объявлены в
 * StaffRole и поддержаны здесь же.
 */
export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
	owner: ALL,
	admin: ALL,

	// Управляющий: всё, кроме врачебной документации и выгрузки в ЕГИСЗ.
	manager: [
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"clinical.read",
		"finance.read",
		"finance.write",
		"analytics.read",
		// Управляющий считает зарплату врачей — это его работа.
		"payroll.read",
		"inventory.read",
		"inventory.write",
		"settings.read",
		"communications.read",
		"communications.write",
	],

	// Администратор ресепшена: записывает, ведёт картотеку, принимает оплату.
	// Зарплаты врачей не видит — ни чужие, ни свои: он не врач.
	administrator: [
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"clinical.read",
		"finance.read",
		"finance.write",
		"analytics.read",
		"inventory.read",
		"settings.read",
		"communications.read",
		"communications.write",
		"agent.read",
		"agent.write",
	],

	// Врач: ведёт приём, оформляет и принимает оплату у кресла (Мандат 8e / 8n соло-врач),
	// списывает расходные материалы приёма.
	doctor: [
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"clinical.read",
		"clinical.write",
		"finance.read",
		"finance.write",
		"inventory.read",
		"inventory.write",
		// Свою выработку и свою выплату врач видит; чужие — нет.
		"payroll.read.own",
		"egisz.submit",
		// Врач видит переписку с пациентом, но рассылки не запускает.
		"communications.read",
		"agent.read",
		"agent.write",
		"workstation.read",
		"workstation.write",
	],

	// Ассистент: видит приём и списывает материалы, ничего не решает.
	assistant: [
		"schedule.read",
		"patients.read",
		"clinical.read",
		"inventory.read",
		"inventory.write",
		"communications.read",
		"agent.read",
	],

	// Куратор лечения: ведёт пациентов по воронке планов лечения, согласует сметы,
	// видит расписание и переписку, аналитику своей конверсии.
	curator: [
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"clinical.read",
		"finance.read",
		"analytics.read",
		"communications.read",
		"communications.write",
	],
};

/**
 * Роли, объявленные в матрице. Нужны проверке полноты русских подписей:
 * без этого списка тест сверял бы подписи с собственной копией ролей, то есть
 * охранял бы себя, а не текст, который читает человек.
 */
export const ROLES_IN_MATRIX: readonly string[] = Object.keys(ROLE_PERMISSIONS);
