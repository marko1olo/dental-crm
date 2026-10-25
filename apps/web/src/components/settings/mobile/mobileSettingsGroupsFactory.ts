import {
	Building2, CalendarDays, CreditCard, FileSpreadsheet, FileText,
	HardDriveDownload, Layers, Lock, MessageSquare, Percent, ShieldAlert,
	ShieldCheck, Users, Globe, Tag,
} from "lucide-react";
import type { SettingGroup } from "./mobileSettingsTypes";

export function createMobileSettingsGroups(
	chairsCount: number,
	serviceCatalogCount: number,
	staffCount: number,
): SettingGroup[] {
	return [
		{
			id: "clinic_org",
			header: "Клиника и филиалы",
			items: [
				{ id: "clinic", title: "Реквизиты и юрлицо", subtitle: "ИНН, ОГРН, лицензия, адрес", icon: Building2, iconBg: "var(--paper-muted)", iconColor: "var(--teal)" },
				{ id: "clinic_fiscal", title: "Касса и чеки", subtitle: "ККТ, фискальные чеки, НДС", icon: CreditCard, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
				{ id: "clinic_schedule", title: "График работы и кресла", subtitle: chairsCount > 0 ? `Часы приёма, ${chairsCount} установок` : "Часы приёма, кресла", icon: CalendarDays, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
			],
		},
		{
			id: "prices_services",
			header: "Прейскурант и услуги",
			items: [
				{ id: "prices", title: "Прейскурант услуг", subtitle: "Номенклатура услуг, базовые тарифы", icon: Tag, iconBg: "var(--paper-muted)", iconColor: "var(--teal)", badge: serviceCatalogCount > 0 ? `${serviceCatalogCount} услуг` : "Настроить" },
				{ id: "prices_import", title: "Импорт прайс-листа", subtitle: "Excel, CSV, сопоставление тарифов", icon: FileSpreadsheet, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
			],
		},
		{
			id: "staff_team",
			header: "Врачи и персонал",
			items: [
				{ id: "staff", title: "Врачи и сотрудники", subtitle: "Персонал клиники, график, телефоны", icon: Users, iconBg: "var(--paper-muted)", iconColor: "var(--teal)", badge: staffCount > 0 ? `${staffCount} в штате` : "Добавить" },
				{ id: "access", title: "Права доступа", subtitle: "Роли сотрудников, матрица доступов", icon: Lock, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
				{ id: "commissions", title: "Комиссии и мотивация", subtitle: "Ставки врачей %, сдельная оплата", icon: Percent, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
			],
		},
		{
			id: "clinical_standards",
			header: "Клинические стандарты",
			items: [
				{ id: "protocols", title: "Протоколы лечения", subtitle: "Шаблоны дневника приёма, электронная карта", icon: FileText, iconBg: "var(--paper-muted)", iconColor: "var(--teal)" },
				{ id: "rules", title: "Клинические правила и контроль", subtitle: "Безопасность приёма и уведомления", icon: ShieldCheck, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
				{ id: "procedure-boms", title: "Техкарты расхода материалов", subtitle: "Нормы списания расходных материалов", icon: Layers, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
			],
		},
		{
			id: "integrations_sync",
			header: "Интеграции и модули",
			items: [
				{ id: "messengers", title: "Мессенджеры и рассылки", subtitle: "WhatsApp, Telegram, напоминания", icon: MessageSquare, iconBg: "var(--paper-muted)", iconColor: "var(--teal)" },
				{ id: "booking", title: "Онлайн-запись", subtitle: "Виджет для сайта клиники и карт", icon: Globe, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
				{ id: "imports", title: "Перенос данных", subtitle: "Импорт базы пациентов и каталога услуг", icon: HardDriveDownload, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
				{ id: "audit", title: "Журнал аудита", subtitle: "Безопасность и журнал доступа", icon: ShieldAlert, iconBg: "var(--paper-muted)", iconColor: "var(--ink)" },
			],
		},
	];
}
