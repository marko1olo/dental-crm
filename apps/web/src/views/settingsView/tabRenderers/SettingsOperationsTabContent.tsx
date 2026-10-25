/**
 * @file apps/web/src/views/settingsView/tabRenderers/SettingsOperationsTabContent.tsx
 * @description Tab content renderer for integrations, AI, modules, analytics and audit.
 */

import React from "react";
import { ChevronDown } from "lucide-react";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { AuditLogsPanel } from "../../../AuditLogsPanel";
import { YandexCalendarSyncsWidget } from "../../../components/integrations/YandexCalendarSyncsWidget";
import { MigrationWizard } from "../../../components/settings/MigrationWizard";
import { OfflineBackupVaultPanel } from "../../../components/settings/OfflineBackupVaultPanel";
import { SettingsAiTab } from "../../../components/settings/SettingsAiTab";
import { SettingsAuditTab } from "../../../components/settings/SettingsAuditTab";
import { SettingsBpmnTab } from "../../../components/settings/SettingsBpmnTab";
import { SettingsImportsTab } from "../../../components/settings/SettingsImportsTab";
import { SettingsMarketingTab } from "../../../components/settings/SettingsMarketingTab";
import { SettingsModulesTab } from "../../../components/settings/SettingsModulesTab";
import { SettingsReportingTab } from "../../../components/settings/SettingsReportingTab";
import { SettingsSourcesTab } from "../../../components/settings/SettingsSourcesTab";

export interface SettingsOperationsTabContentProps {
	settingsTab: string;
	settingsProps: any;
	flags: any;
}

export const SettingsOperationsTabContent: React.FC<SettingsOperationsTabContentProps> = ({
	settingsTab,
	settingsProps,
	flags,
}) => {
	if (settingsTab === "sources") return <SettingsSourcesTab />;
	if (settingsTab === "ai") return <SettingsAiTab />;

	if (settingsTab === "modules") {
		return (
			<div className="space-y-6">
				<SettingsModulesTab />
				<YandexCalendarSyncsWidget />
			</div>
		);
	}

	if (settingsTab === "marketing" && flags.hasMarketingModule) return <SettingsMarketingTab />;
	if (settingsTab === "bpmn" && flags.hasBpmWorkflows) return <SettingsBpmnTab />;
	if (settingsTab === "reporting" && flags.hasAnalyticsModule) return <SettingsReportingTab />;

	if (settingsTab === "imports") {
		return (
			<div className="space-y-6">
				<MigrationWizard />
				<OfflineBackupVaultPanel
					organizationId={settingsProps.organizationId}
					clinicName={settingsProps.clinicSettings?.name}
				/>
				<details className="group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
					<summary className="px-4 py-3 cursor-pointer text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between select-none transition-colors">
						<span>Расширенный режим: Индивидуальный импорт и ручные утилиты (legacy)</span>
						<ChevronDown size={14} className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180" />
					</summary>
					<div className="p-4 border-t border-[var(--line)]">
						<ErrorBoundary moduleName="Умный разбор выгрузки">
							<SettingsImportsTab {...settingsProps} settingsTab={settingsTab} />
						</ErrorBoundary>
					</div>
				</details>
			</div>
		);
	}

	if (settingsTab === "backup") {
		return (
			<div className="space-y-6">
				<SettingsAuditTab {...settingsProps} settingsTab="backup" />
			</div>
		);
	}

	if (settingsTab === "audit") {
		return (
			<div className="space-y-6">
				<AuditLogsPanel />
				<SettingsAuditTab {...settingsProps} settingsTab={settingsTab} />
			</div>
		);
	}

	return null;
};
