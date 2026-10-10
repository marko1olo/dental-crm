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
	Clock,
	Globe,
	HeartPulse,
	Lock,
	MapPin,
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
import {
	loadReminderCadenceSettings,
	saveReminderCadenceSettings,
} from "./ReminderCadenceConfigPanel";
import { SettingsAccessTab } from "./SettingsAccessTab";
import { SettingsBpmnTab } from "./SettingsBpmnTab";
import { SettingsClinicTab } from "./SettingsClinicTab";
import { SettingsMarketingTab } from "./SettingsMarketingTab";
import { SettingsMessageTemplatesTab } from "./SettingsMessageTemplatesTab";
import { SettingsMessengersTab } from "./SettingsMessengersTab";
import { SettingsModulesTab } from "./SettingsModulesTab";
import { SettingsStaffTab } from "./SettingsStaffTab";
import { showToast } from "../GlobalToast";
import { DelimitedTileCard } from "./DelimitedTileCard";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";

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

const ADMIN_TABS: Array<{
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

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = ({
	props,
	initialTab = "clinic",
	onSelectTab,
}) => {
	const resolvedInitialTab: AdminSubTab = initialTab === "telegram" ? "messengers" : initialTab;
	const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(resolvedInitialTab);

	useEffect(() => {
		if (initialTab) {
			setActiveSubTab(initialTab === "telegram" ? "messengers" : initialTab);
		}
	}, [initialTab]);

	// Persistent cadence settings
	const [cadence, setCadence] = useState(loadReminderCadenceSettings);
	const [onlineBookingEnabled, setOnlineBookingEnabled] = useState<boolean>(() => {
		const val = safeLocalStorageGetItem("dente_online_booking_enabled");
		return val === null ? true : val === "true";
	});

	const toggleRemind24h = () => {
		const next = !cadence.remind24hEnabled;
		const updated = { ...cadence, remind24hEnabled: next };
		setCadence(updated);
		saveReminderCadenceSettings(updated);
		showToast(
			next
				? "Напоминание за 24ч с подтверждением включено"
				: "Напоминание за 24ч отключено",
			"info",
		);
	};

	const toggleRemind2h = () => {
		const next = !cadence.remind2hEnabled;
		const updated = { ...cadence, remind2hEnabled: next };
		setCadence(updated);
		saveReminderCadenceSettings(updated);
		showToast(
			next
				? "Напоминание за 2ч с геопозицией включено"
				: "Напоминание за 2ч отключено",
			"info",
		);
	};

	const togglePostOp24h = () => {
		const next = !cadence.postOp24hEnabled;
		const updated = { ...cadence, postOp24hEnabled: next };
		setCadence(updated);
		saveReminderCadenceSettings(updated);
		showToast(
			next
				? "Памятка и опрос 043/у через 24ч после операции включены"
				: "Памятка после операции отключена",
			"info",
		);
	};

	const toggleOnlineBooking = () => {
		const next = !onlineBookingEnabled;
		setOnlineBookingEnabled(next);
		safeLocalStorageSetItem("dente_online_booking_enabled", String(next));
		showToast(
			next
				? "Виджет онлайн-записи активирован"
				: "Виджет онлайн-записи временно приостановлен",
			"info",
		);
	};

	const handleTabChange = (tabId: AdminSubTab) => {
		setActiveSubTab(tabId);
		onSelectTab?.(tabId);
	};

	return (
		<div className="space-y-4" data-testid="admin-settings-section">
			{/* Sub-Navigation Strip (Desktop 32px, Radius 8px) */}
			<div className="settings-subnav-strip overflow-x-auto pb-1 border-b border-[var(--line)]" role="tablist" aria-label="Разделы настроек администратора">
				{ADMIN_TABS.map((tab) => {
					const Icon = tab.icon;
					const isSelected = activeSubTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isSelected}
							onClick={() => handleTabChange(tab.id)}
							title={tab.description}
							className={`settings-subnav-btn ${isSelected ? "active" : ""}`}
							data-testid={`admin-tab-${tab.id}`}
						>
							<Icon size={14} className="shrink-0" />
							<span className="whitespace-nowrap">{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* When on Messengers tab: Show Cadence as a quiet Apple Grouped Card */}
			{activeSubTab === "messengers" && (
				<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 space-y-2.5 shadow-xs">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<BellRing size={14} className="text-[var(--teal)]" />
							<h4 className="text-xs font-bold text-[var(--ink)]">
								Каденция оповещения пациентов
							</h4>
						</div>
						<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
							Автоматическая отправка без участия администратора
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						<DelimitedTileCard
							icon={Clock}
							title="За 24ч до приема"
							description="Подтверждение визита"
							checked={cadence.remind24hEnabled}
							onChange={toggleRemind24h}
							testId="admin-cadence-toggle-24h"
						/>
						<DelimitedTileCard
							icon={MapPin}
							title="За 2ч до приема"
							description="Геолокация клиники"
							checked={cadence.remind2hEnabled}
							onChange={toggleRemind2h}
							testId="admin-cadence-toggle-2h"
						/>
						<DelimitedTileCard
							icon={HeartPulse}
							title="После операции"
							description="Опрос 043/у (24ч)"
							checked={cadence.postOp24hEnabled}
							onChange={togglePostOp24h}
							testId="admin-cadence-toggle-postop"
						/>
						<DelimitedTileCard
							icon={Globe}
							title="Онлайн-запись"
							description="Виджет на сайте"
							checked={onlineBookingEnabled}
							onChange={toggleOnlineBooking}
							testId="admin-cadence-toggle-booking"
						/>
					</div>
				</div>
			)}

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

				{(activeSubTab === "messengers" || activeSubTab === "telegram") && (
					<ErrorBoundary moduleName="Мессенджеры и рассылки">
						<SettingsMessengersTab
							props={props}
							settingsTab={activeSubTab === "telegram" ? "telegram" : "messengers"}
						/>
					</ErrorBoundary>
				)}

				{activeSubTab === "templates" && (
					<ErrorBoundary moduleName="Шаблоны сообщений">
						<SettingsMessageTemplatesTab />
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

export default AdminSettingsSection;
