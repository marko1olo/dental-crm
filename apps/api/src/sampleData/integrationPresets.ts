/**
 * @file integrationPresets.ts
 * @description Layer 1: Third-party integration presets, mode hints, and clinic workspace profiles.
 */

import type { ClinicMode, ClinicWorkspaceProfile, IntegrationPreset } from "@dental/shared";

const integrationPresets: IntegrationPreset[] = [
	{
		id: "preset-32top",
		title: "32top / МИС 32top",
		vendor: "32top",
		category: "dental_mis",
		status: "needs_mapping",
		supportedInputs: [
			"CSV",
			"Excel",
			"копипаст таблицы",
			"текст из отчета",
			"папка снимков рядом",
		],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"documents",
			"services",
			"payments",
			"imaging",
		],
		migrationNotes: [
			"Сначала preview пациентов и дублей, затем отдельная привязка снимков по ФИО, телефону, дате и пути к файлу.",
			"Готовые протоколы и услуги должны идти через таблицу соответствий, без слепой записи в ЭМК.",
		],
		riskLevel: "medium",
	},
	{
		id: "preset-ident",
		title: "IDENT / крупная МИС",
		vendor: "IDENT",
		category: "dental_mis",
		status: "needs_mapping",
		supportedInputs: [
			"CSV",
			"Excel",
			"SQL export через промежуточный CSV",
			"документы HTML/PDF",
		],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"documents",
			"services",
			"payments",
			"audit",
		],
		migrationNotes: [
			"Для сетевых клиник обязательны филиал, врач, кресло и источник каждой строки.",
			"Медицинские записи импортируются как архив/черновик до проверки врача или ответственного администратора.",
		],
		riskLevel: "high",
	},
	{
		id: "preset-cliniccards",
		title: "Cliniccards / облачный экспорт",
		vendor: "Cliniccards",
		category: "dental_mis",
		status: "needs_mapping",
		supportedInputs: ["CSV", "Excel", "zip экспорт", "список файлов"],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"documents",
			"imaging",
		],
		migrationNotes: [
			"Облачный экспорт часто смешивает пациентов, приемы и файлы, поэтому используется smart parser с классификацией строк.",
			"Перед commit нужна сводка пропусков и CSV-отчет для владельца.",
		],
		riskLevel: "medium",
	},
	{
		id: "preset-opendental",
		title: "Open Dental / зарубежная база",
		vendor: "Open Dental",
		category: "dental_mis",
		status: "planned_connector",
		supportedInputs: [
			"CSV",
			"выгрузка базы через адаптер",
			"список папки снимков",
		],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"services",
			"payments",
			"imaging",
		],
		migrationNotes: [
			"Требуется нормализация терминов, кодов услуг и русских документов.",
			"Подходит как будущий адаптер для open-source сценариев.",
		],
		riskLevel: "high",
	},
	{
		id: "preset-excel",
		title: "Excel / Google Sheets / LibreOffice",
		vendor: "Spreadsheet",
		category: "spreadsheet",
		status: "usable_now",
		supportedInputs: ["CSV", "TSV", "точка с запятой", "копипаст диапазона"],
		capabilities: ["patients", "appointments", "services", "payments"],
		migrationNotes: [
			"Колонки распознаются по русским и английским заголовкам, затем показываются дубли и предупреждения.",
			"Это самый простой старт для маленького кабинета без старой МИС.",
		],
		riskLevel: "low",
	},
	{
		id: "preset-paper-ocr",
		title: "Фото журнала / бумажный архив",
		vendor: "OCR + vision",
		category: "paper_archive",
		status: "planned_connector",
		supportedInputs: [
			"фото журнала",
			"скан PDF",
			"распознанный текст",
			"диктовка администратора",
		],
		capabilities: ["patients", "appointments", "documents"],
		migrationNotes: [
			"Vision/OCR должен отдавать только preview, потому что бумажные журналы дают ошибки ФИО и телефонов.",
			"Система обязана подсвечивать низкую уверенность и просить ручное подтверждение.",
		],
		riskLevel: "high",
	},
	{
		id: "preset-imaging-folder",
		title: "RVG / ОПТГ / КТ папка обмена",
		vendor: "папка КТ/JPG/PNG",
		category: "imaging_system",
		status: "usable_now",
		supportedInputs: [
			"КТ/серии",
			"JPG",
			"PNG",
			"TIFF",
			"BMP",
			"CSV список",
			"серверная папка",
		],
		capabilities: ["imaging", "patients", "audit"],
		migrationNotes: [
			"Сканирование папки идет только на чтение: файлы сначала превращаются в проверяемые строки, затем привязываются к пациентам.",
			"Пути с пробелами и Windows-диски сохраняются без разрезания строки.",
		],
		riskLevel: "low",
	},
	{
		id: "preset-pacs-dicomweb",
		title: "Архив снимков клиники",
		vendor: "сервер снимков",
		category: "imaging_system",
		status: "planned_connector",
		supportedInputs: [
			"адрес архива снимков",
			"поиск серий",
			"код исследования",
			"код серии",
		],
		capabilities: ["imaging", "patients", "audit"],
		migrationNotes: [
			"Будущий коннектор должен забирать исследования по пациенту без копирования файлов руками.",
			"КЛКТ/КТ и серии нельзя превращать в одну картинку: нужен просмотрщик, метаданные и врачебная проверка.",
		],
		riskLevel: "medium",
	},
	{
		id: "preset-accounting",
		title: "Касса / 1C / налоговый вычет",
		vendor: "Accounting export",
		category: "accounting",
		status: "planned_connector",
		supportedInputs: [
			"CSV оплат",
			"Excel услуг",
			"акт",
			"договор",
			"справка для вычета",
		],
		capabilities: ["payments", "documents", "tax_documents", "audit"],
		migrationNotes: [
			"Платежи должны связываться с актами, договором и справкой для вычета, а не жить отдельной таблицей.",
			"Для продажи клиникам потребуется отдельная юридическая проверка шаблонов.",
		],
		riskLevel: "medium",
	},
];


const modeHints: Record<ClinicMode, string[]> = {
	solo_doctor: [
		"Один врач: скрываем лишнюю сетевую аналитику, усиливаем быстрый прием, документы и диктовку.",
		"Админские действия доступны врачу, но критичные подписи остаются с аудитом.",
	],
	one_chair: [
		"Один кабинет: главный фокус на смене, пациенте, документах, снимках и налоговом вычете.",
		"Расписание можно вести без сложного распределения по филиалам.",
	],
	small_clinic: [
		"Малая клиника: несколько врачей, кресел, администратор, ассистенты и распределение задач.",
		"Нужны роли, права на кассу, импорт, документы и расписание.",
	],
	network_clinic: [
		"Сеть: филиалы, сквозная аналитика, централизованные шаблоны, раздельные права и аудит.",
		"Импорт и интеграции должны учитывать филиал, кресло, врача и источник данных.",
	],
};


const workspaceProfiles: ClinicWorkspaceProfile[] = [
	{
		id: "workspace-solo-doctor",
		mode: "solo_doctor",
		title: "Личный кабинет врача",
		description:
			"Один специалист ведет прием, запись, документы и оплату без отдельной админ-команды.",
		scope: "personal",
		primaryRoles: ["owner", "doctor"],
		defaultSection: "visit",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
		],
		compactNavigation: true,
		requiredCapabilities: [
			"подпись ЭМК",
			"быстрые документы",
			"диктовка",
			"минимальная касса",
		],
		automations: [
			"автосбор документов из приема",
			"напоминание о неподписанной ЭМК",
			"черновик записи из диктовки",
		],
		safeguards: [
			"AI не подписывает диагноз",
			"оплаты и документы остаются в аудите",
			"настройки не мешают врачу на приеме",
		],
	},
	{
		id: "workspace-one-chair",
		mode: "one_chair",
		title: "Один кабинет",
		description:
			"Смена вращается вокруг одного кресла: врач, пациент, снимки, документы, оплата и связь.",
		scope: "clinic",
		primaryRoles: ["doctor", "administrator", "assistant"],
		defaultSection: "shift",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		compactNavigation: true,
		requiredCapabilities: [
			"кресло",
			"RVG",
			"админская очередь",
			"налоговый вычет",
		],
		automations: [
			"очередь подтверждений",
			"проверка снимков перед ЭМК",
			"закрытие акта и оплаты после приема",
		],
		safeguards: [
			"кресло не перегружается параллельными потоками",
			"документы создаются только через preview",
			"пациентская связь фиксируется событием",
		],
	},
	{
		id: "workspace-small-clinic",
		mode: "small_clinic",
		title: "Малая клиника",
		description:
			"Несколько врачей и кресел требуют распределения задач, ролей, кабинетов и клинических правил.",
		scope: "clinic",
		primaryRoles: ["doctor", "administrator", "assistant", "manager"],
		defaultSection: "shift",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		compactNavigation: false,
		requiredCapabilities: [
			"права по ролям",
			"нагрузка врачей",
			"нагрузка кресел",
			"правила главврача",
		],
		automations: [
			"балансировка загрузки",
			"роль-очереди",
			"шаблоны по специальностям",
			"клинические предупреждения",
		],
		safeguards: [
			"касса отделена от подписи ЭМК",
			"импорт доступен только ответственным",
			"важные предупреждения видны до закрытия приема",
		],
	},
	{
		id: "workspace-network-clinic",
		mode: "network_clinic",
		title: "Сеть и филиалы",
		description:
			"Сквозная клиническая политика, централизованные шаблоны, филиальные права и миграции данных.",
		scope: "network",
		primaryRoles: ["owner", "manager", "doctor", "administrator"],
		defaultSection: "settings",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		compactNavigation: false,
		requiredCapabilities: [
			"центральные шаблоны",
			"сквозной аудит",
			"филиальные права",
			"массовые импорты",
		],
		automations: [
			"проверка филиального источника данных",
			"единые протоколы",
			"аудит критичных операций",
			"сетевые очереди менеджера",
		],
		safeguards: [
			"филиал не меняет центральные правила без владельца",
			"миграции идут через batch и rollback-план",
			"доступ ограничен областью филиала",
		],
	},
];


export { integrationPresets, modeHints, workspaceProfiles };
