import type React from "react";
import {
	CalendarDays,
	Globe,
	Lock,
	MessageSquare,
	Puzzle,
	Send,
	Users,
} from "lucide-react";

export type AdminSubTab =
	| "clinic"
	| "staff"
	| "access"
	| "messengers"
	| "telegram"
	| "templates"
	| "booking"
	| "modules"
	| "marketing"
	| "bpmn";

export interface AdminSettingsSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	readonly props: Record<string, any>;
	readonly initialTab?: AdminSubTab;
	readonly onSelectTab?: (tab: string) => void;
}

export const ADMIN_TABS: Array<{
	id: AdminSubTab;
	label: string;
	description: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{
		id: "clinic",
		label: "График и кресла",
		description: "Часы работы, стоматологические установки, смены",
		icon: CalendarDays,
	},
	{
		id: "staff",
		label: "Сотрудники и смены",
		description: "Персонал, ассистенты, доступы и телефоны",
		icon: Users,
	},
	{
		id: "access",
		label: "Права доступа",
		description: "Роли, разрешения, ЕГИСЗ и ограничения",
		icon: Lock,
	},
	{
		id: "messengers",
		label: "Мессенджеры",
		description: "WhatsApp, Telegram, SMS и каденция напоминаний",
		icon: MessageSquare,
	},
	{
		id: "templates",
		label: "Шаблоны",
		description: "Тексты SMS, WhatsApp, Telegram и макросы {patient_name}, {time}",
		icon: MessageSquare,
	},
	{
		id: "booking",
		label: "Онлайн-запись",
		description: "Виджет для сайта, карт Яндекс/2ГИС и соцсетей",
		icon: Globe,
	},
	{
		id: "modules",
		label: "Интеграции",
		description: "Яндекс.Календарь, АТС/Телефония, аналитика",
		icon: Puzzle,
	},
	{
		id: "marketing",
		label: "Отзывы и NPS",
		description: "Автосбор отзывов, NPS, цепочки повторных визитов",
		icon: Send,
	},
];
