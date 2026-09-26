/**
 * apps/web/src/components/settings/AdminSettingsSection.tsx
 *
 * Dedicated settings workspace tailored specifically for clinic Administrators.
 * Encapsulates clinic schedule, chairs, staff shifts, granular RBAC access,
 * patient messaging routing (WhatsApp/Telegram/SMS), online booking, and modules.
 *
 * Mandates 8b, 8c, 8d, 8e: Strictly <= 800 lines, vector Lucide icons, desktop density.
 */

import React, { useState, useEffect } from "react";
import {
	BellRing,
	CalendarDays,
	CalendarRange,
	Globe,
	Lock,
	MessageSquare,
	Puzzle,
	Send,
	ShieldCheck,
	UserCheck,
	Users,
} from "lucide-react";
import { ErrorBoundary } from "../ErrorBoundary";
import { EgiszBlankPermissionsWidget } from "../integrations/EgiszBlankPermissionsWidget";
import { YandexCalendarSyncsWidget } from "../integrations/YandexCalendarSyncsWidget";
import { PublicBookingLinkPanel } from "./PublicBookingLinkPanel";
import { SettingsAccessTab } from "./SettingsAccessTab";
import { SettingsBpmnTab } from "./SettingsBpmnTab";
import { SettingsClinicTab } from "./SettingsClinicTab";
import { SettingsMarketingTab } from "./SettingsMarketingTab";
import { SettingsMessengersTab } from "./SettingsMessengersTab";
import { SettingsModulesTab } from "./SettingsModulesTab";
import { SettingsStaffTab } from "./SettingsStaffTab";

export type AdminSubTab =
	| "clinic"
	| "staff"
	| "access"
	| "messengers"
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

const ADMIN_TABS: Array<{
	id: AdminSubTab;
	label: string;
	description: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{
		id: "clinic",
		label: "График клиники и кресла",
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
		label: "Права доступа (RBAC)",
		description: "Роли, разрешения, ЕГИСЗ и ограничения",
		icon: Lock,
	},
	{
		id: "messengers",
		label: "Мессенджеры и рассылки",
		description: "WhatsApp, Telegram, SMS и каденция напоминаний",
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
		label: "Модули и интеграции",
		description: "Яндекс.Календарь, АТС/Телефония, аналитика",
		icon: Puzzle,
	},
	{
		id: "marketing",
		label: "Отзывы и сценарии",
		description: "Автосбор отзывов, NPS, цепочки повторных визитов",
		icon: Send,
	},
];

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = ({
	props,
	initialTab = "clinic",
	onSelectTab,
}) => {
	const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(initialTab);

	useEffect(() => {
		if (initialTab) {
			setActiveSubTab(initialTab);
		}
	}, [initialTab]);

	// Super-settings: 1-click admin toggles
	const [remind24h, setRemind24h] = useState(true);
	const [remind2h, setRemind2h] = useState(true);
	const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(true);
	const [postVisitReviewRequest, setPostVisitReviewRequest] = useState(true);

	const handleTabChange = (tabId: AdminSubTab) => {
		setActiveSubTab(tabId);
		onSelectTab?.(tabId);
	};

	return (
		<div className="space-y-6" data-testid="admin-settings-section">
			{/* Super-Header: Admin Banner */}
			<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
						<CalendarRange size={24} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-extrabold text-base sm:text-lg text-[var(--ink)]">
								Рабочее место администратора: операционные настройки
							</h3>
							<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30">
								Front-Desk & Расписание
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Управление креслами, рабочими сменами, напоминаниями пациентам и приемом звонков
						</p>
					</div>
				</div>
			</div>

			{/* Super-Settings: 1-Click Communications & Booking Toggles */}
			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<BellRing size={14} className="text-blue-600" />
						Каденция оповещения пациентов и автодействия:
					</span>
					<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
						Автоматическая отправка без участия администратора
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<button
						type="button"
						onClick={() => setRemind24h((prev) => !prev)}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							remind24h
								? "bg-blue-500/10 border-blue-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">За 24ч до приема</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${remind24h ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{remind24h ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">WhatsApp/SMS подтверждение</span>
					</button>

					<button
						type="button"
						onClick={() => setRemind2h((prev) => !prev)}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							remind2h
								? "bg-indigo-500/10 border-indigo-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">За 2ч до приема</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${remind2h ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{remind2h ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">Напоминание о выходе к врачу</span>
					</button>

					<button
						type="button"
						onClick={() => setOnlineBookingEnabled((prev) => !prev)}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							onlineBookingEnabled
								? "bg-emerald-500/10 border-emerald-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">Онлайн-запись</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${onlineBookingEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{onlineBookingEnabled ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">Виджет на сайте и в картах</span>
					</button>

					<button
						type="button"
						onClick={() => setPostVisitReviewRequest((prev) => !prev)}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							postVisitReviewRequest
								? "bg-teal-500/10 border-teal-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">Запрос отзыва (NPS)</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${postVisitReviewRequest ? "bg-teal-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{postVisitReviewRequest ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">Через 2ч после завершения</span>
					</button>
				</div>
			</div>

			{/* Sub-Navigation Strip (Desktop 32-36px, Mobile 44px) */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--line)] scrollbar-none">
				{ADMIN_TABS.map((tab) => {
					const Icon = tab.icon;
					const isSelected = activeSubTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => handleTabChange(tab.id)}
							className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
								isSelected
									? "bg-blue-600 text-white shadow-xs"
									: "bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)]"
							}`}
							data-testid={`admin-tab-${tab.id}`}
						>
							<Icon size={15} className="shrink-0" />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Sub-Tab Content Rendering */}
			<div className="pt-2">
				{activeSubTab === "clinic" && (
					<ErrorBoundary moduleName="График клиники и кресла">
						<SettingsClinicTab props={props} settingsTab="clinic" />
					</ErrorBoundary>
				)}

				{activeSubTab === "staff" && (
					<ErrorBoundary moduleName="Сотрудники">
						<SettingsStaffTab props={props} />
					</ErrorBoundary>
				)}

				{activeSubTab === "access" && (
					<ErrorBoundary moduleName="Права доступа (RBAC)">
						<div className="space-y-6">
							<SettingsAccessTab
								props={props}
								settingsTab="access"
							/>
							<EgiszBlankPermissionsWidget />
						</div>
					</ErrorBoundary>
				)}

				{activeSubTab === "messengers" && (
					<ErrorBoundary moduleName="Мессенджеры и рассылки">
						<SettingsMessengersTab
							props={props}
							settingsTab="messengers"
						/>
					</ErrorBoundary>
				)}

				{activeSubTab === "booking" && (
					<ErrorBoundary moduleName="Онлайн-запись">
						<PublicBookingLinkPanel />
					</ErrorBoundary>
				)}

				{activeSubTab === "modules" && (
					<ErrorBoundary moduleName="Модули">
						<div className="space-y-6">
							<SettingsModulesTab />
							<YandexCalendarSyncsWidget />
						</div>
					</ErrorBoundary>
				)}

				{activeSubTab === "marketing" && (
					<ErrorBoundary moduleName="Отзывы и сценарии">
						<div className="space-y-6">
							<SettingsMarketingTab />
							<SettingsBpmnTab />
						</div>
					</ErrorBoundary>
				)}

				{activeSubTab === "bpmn" && (
					<ErrorBoundary moduleName="Бизнес-сценарии">
						<SettingsBpmnTab />
					</ErrorBoundary>
				)}
			</div>
		</div>
	);
};
