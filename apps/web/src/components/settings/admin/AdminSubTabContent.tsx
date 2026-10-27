import type React from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { EgiszBlankPermissionsWidget } from "../../integrations/EgiszBlankPermissionsWidget";
import { YandexCalendarSyncsWidget } from "../../integrations/YandexCalendarSyncsWidget";
import { PublicBookingLinkPanel } from "../PublicBookingLinkPanel";
import { SettingsAccessTab } from "../SettingsAccessTab";
import { SettingsBpmnTab } from "../SettingsBpmnTab";
import { SettingsClinicTab } from "../SettingsClinicTab";
import { SettingsMarketingTab } from "../SettingsMarketingTab";
import { SettingsMessageTemplatesTab } from "../SettingsMessageTemplatesTab";
import { SettingsMessengersTab } from "../SettingsMessengersTab";
import { SettingsModulesTab } from "../SettingsModulesTab";
import { SettingsStaffTab } from "../SettingsStaffTab";
import type { AdminSubTab } from "./AdminSettingsTypes";

interface AdminSubTabContentProps {
	readonly activeSubTab: AdminSubTab;
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	readonly props: Record<string, any>;
}

export const AdminSubTabContent: React.FC<AdminSubTabContentProps> = ({
	activeSubTab,
	props,
}) => {
	return (
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
						<SettingsAccessTab props={props} settingsTab="access" />
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
	);
};
