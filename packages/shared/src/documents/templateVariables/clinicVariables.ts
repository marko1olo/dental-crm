import type { DocumentTemplateVariableSpec } from "./types.js";

/**
 * Токены клиники, дат, склада, приёма и документов.
 * Layer 1: Domain Variable Token Group.
 */
export const CLINIC_DOCUMENT_TEMPLATE_VARIABLES: readonly DocumentTemplateVariableSpec[] = [
	// Даты
	{
		token: "ТекущаяДата",
		domain: "date",
		name: "Текущая дата",
		description: "Дата формирования документа в формате ДД.ММ.ГГГГ",
		exampleValue: "03.09.2026",
		resolverPath: "currentDate.short",
	},
	{
		token: "ТекущаяПолнаяДата",
		domain: "date",
		name: "Текущая полная дата прописью",
		description: "Дата прописью по-русски (3 сентября 2026 г.)",
		exampleValue: "03 сентября 2026",
		resolverPath: "currentDate.full",
	},


	// Клиника
	{
		token: "Клиника.Название",
		domain: "clinic",
		name: "Название клиники",
		description: "Фирменное или юридическое наименование медицинской организации",
		exampleValue: "СтомХ стоматология",
		resolverPath: "clinic.name",
	},
	{
		token: "Клиника.ИНН",
		domain: "clinic",
		name: "ИНН клиники",
		description: "Идентификационный номер налогоплательщика клиники",
		exampleValue: "123456789",
		resolverPath: "clinic.inn",
	},
	{
		token: "Клиника.КПП",
		domain: "clinic",
		name: "КПП клиники",
		description: "Код причины постановки на учет",
		exampleValue: "773601001",
		resolverPath: "clinic.kpp",
	},
	{
		token: "Клиника.Адрес",
		domain: "clinic",
		name: "Адрес клиники",
		description: "Юридический и фактический адрес места оказания медицинских услуг",
		exampleValue: "г.Москва ул. Стоматологов, д.15",
		resolverPath: "clinic.address",
	},
	{
		token: "Клиника.Телефон",
		domain: "clinic",
		name: "Телефон клиники",
		description: "Контактный телефон регистратуры клиники",
		exampleValue: "+7(900)123-45-67",
		resolverPath: "clinic.phone",
	},
	{
		token: "Клиника.Лицензия.Номер",
		domain: "clinic",
		name: "Номер медицинской лицензии",
		description: "Регистрационный номер лицензии на осуществление меддеятельности",
		exampleValue: "1234564654",
		resolverPath: "clinic.licenseNumber",
	},
	{
		token: "Клиника.Лицензия.ДатаВыдачи",
		domain: "clinic",
		name: "Дата выдачи лицензии",
		description: "Дата предоставления лицензии (ДД.ММ.ГГГГ)",
		exampleValue: "25.01.2020",
		resolverPath: "clinic.licenseIssuedDate",
	},
	{
		token: "Клиника.Лицензия.СрокДействия",
		domain: "clinic",
		name: "Срок действия лицензии",
		description: "Срок действия или 'Бессрочно'",
		exampleValue: "25.01.2020",
		resolverPath: "clinic.licenseValidity",
	},
	{
		token: "Клиника.Лицензия.КемВыдана",
		domain: "clinic",
		name: "Орган, выдавший лицензию",
		description: "Лицензирующий орган (Министерство / Департамент здравоохранения)",
		exampleValue: "Клуб Стоматологов",
		resolverPath: "clinic.licenseIssuer",
	},


	// Прием
	{
		token: "Прием.Ид",
		domain: "appointment",
		name: "ID приема",
		description: "Идентификатор визита / записи на прием",
		exampleValue: "1",
		resolverPath: "appointment.id",
	},
	{
		token: "Прием.Дата",
		domain: "appointment",
		name: "Дата приема",
		description: "Дата приема в формате ДД.ММ.ГГГГ",
		exampleValue: "05.05.2025",
		resolverPath: "appointment.date",
	},
	{
		token: "Прием.ПолнаяДата",
		domain: "appointment",
		name: "Полная дата приема",
		description: "Дата приема прописью (5 мая 2025 г.)",
		exampleValue: "5 марта 2025",
		resolverPath: "appointment.fullDate",
	},
	{
		token: "Прием.Время",
		domain: "appointment",
		name: "Время приема",
		description: "Время начала приема (ЧЧ:ММ)",
		exampleValue: "12:12",
		resolverPath: "appointment.time",
	},


	// Склад
	{
		token: "Склад.Название",
		domain: "warehouse",
		name: "Название склада",
		description: "Наименование склада хранения материалов",
		exampleValue: "Основной",
		resolverPath: "warehouse.name",
	},
	{
		token: "Склад.Материалы.Название",
		domain: "warehouse",
		name: "Наименование материала",
		description: "Название расходного медицинского материала",
		exampleValue: "Маска",
		resolverPath: "warehouse.materialName",
	},
	{
		token: "Склад.Материалы.МинимальныйПорог",
		domain: "warehouse",
		name: "Минимальный порог остатка",
		description: "Неснижаемый остаток на складе",
		exampleValue: "9",
		resolverPath: "warehouse.minThreshold",
	},
	{
		token: "Склад.Материалы.Остаток",
		domain: "warehouse",
		name: "Остаток материала",
		description: "Текущий фактический остаток материала на складе",
		exampleValue: "7",
		resolverPath: "warehouse.balance",
	},


	// Документ
	{
		token: "Документ.ID",
		domain: "document",
		name: "ID документа",
		description: "Идентификатор документа в архиве",
		exampleValue: "125",
		resolverPath: "document.id",
	},
	{
		token: "Документ.Номер",
		domain: "document",
		name: "Номер документа",
		description: "Регистрационный номер бланка или договора",
		exampleValue: "Б123/ПА",
		resolverPath: "document.number",
	},
	{
		token: "Документ.ДатаНачала",
		domain: "document",
		name: "Дата начала действия",
		description: "Дата начала действия договора или плана",
		exampleValue: "2025-01-01",
		resolverPath: "document.startDate",
	},
	{
		token: "Документ.ДатаОкончания",
		domain: "document",
		name: "Дата окончания действия",
		description: "Дата завершения действия договора или гарантии",
		exampleValue: "2025-01-01",
		resolverPath: "document.endDate",
	},

	// ─── КЛИНИКА И ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ───
	{
		token: "КомпанияНазвание",
		domain: "clinic",
		name: "Название компании (клиники)",
		description: "Название стоматологической клиники",
		exampleValue: "ООО Денте Премиум",
		resolverPath: "clinic.name",
	},
	{
		token: "КомпанияТелефон",
		domain: "clinic",
		name: "Телефон компании",
		description: "Контактный телефон клиники",
		exampleValue: "+7 (800) 333-09-41",
		resolverPath: "clinic.phone",
	},
	{
		token: "КомпанияАдрес",
		domain: "clinic",
		name: "Адрес компании",
		description: "Юридический и фактический адрес клиники",
		exampleValue: "г. Москва, ул. Стоматологов, д. 15",
		resolverPath: "clinic.address",
	},
	{
		token: "Логотип",
		domain: "clinic",
		name: "Логотип клиники",
		description: "HTML-изображение фирменного логотипа клиники",
		exampleValue: "<img src=\"/logo.png\" alt=\"Логотип\" class=\"clinic-logo\" />",
		resolverPath: "clinic.logoHtml",
	},
	{
		token: "ТекущаяДатаПолная",
		domain: "date",
		name: "Текущая дата полная (алиас)",
		description: "Дата прописью по-русски (3 сентября 2026 г.)",
		exampleValue: "03 сентября 2026",
		resolverPath: "currentDate.full",
	},
] as const;
