/**
 * apps/web/src/views/settingsView/settingsTabRenderer.tsx
 *
 * Dedicated tab panel content renderer for settings modules in desktop "all" mode
 * and mobile sub-sections.
 *
 * Mandates 8b, 8c, 8d, 8e: desktop density, <= 500 lines, WCAG AAA.
 */

import React from "react";
import type { DentalPricelistAnalysisResponse } from "@dental/shared";
import { ChevronDown } from "lucide-react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { money } from "../../utils/formatters";
import { AuditLogsPanel } from "../../AuditLogsPanel";
import { EgiszBlankPermissionsWidget } from "../../components/integrations/EgiszBlankPermissionsWidget";
import { YandexCalendarSyncsWidget } from "../../components/integrations/YandexCalendarSyncsWidget";
import { MigrationWizard } from "../../components/settings/MigrationWizard";
import { OfflineBackupVaultPanel } from "../../components/settings/OfflineBackupVaultPanel";
import { HardwareSettingsTab } from "../../components/settings/HardwareSettingsTab";
import { InsuranceContractsPanel } from "../../components/settings/InsuranceContractsPanel";
import { DeepClinicalSettingsSection } from "../../components/settings/DeepClinicalSettingsSection";
import { MaterialBomsSettingsPanel } from "../../components/inventory/MaterialBomsSettingsPanel";
import { SettingsAccessTab } from "../../components/settings/SettingsAccessTab";
import { SettingsAiTab } from "../../components/settings/SettingsAiTab";
import { SettingsAuditTab } from "../../components/settings/SettingsAuditTab";
import { SettingsBpmnTab } from "../../components/settings/SettingsBpmnTab";
import { SettingsImportsTab } from "../../components/settings/SettingsImportsTab";
import { SettingsMarketingTab } from "../../components/settings/SettingsMarketingTab";
import { SettingsMessengersTab } from "../../components/settings/SettingsMessengersTab";
import { SettingsModulesTab } from "../../components/settings/SettingsModulesTab";
import { SettingsPricesTab } from "../../components/settings/SettingsPricesTab";
import { SettingsProfileTab } from "../../components/settings/SettingsProfileTab";
import { SettingsProtocolsTab } from "../../components/settings/SettingsProtocolsTab";
import { SettingsReportingTab } from "../../components/settings/SettingsReportingTab";
import { SettingsRulesTab } from "../../components/settings/SettingsRulesTab";
import { SettingsSourcesTab } from "../../components/settings/SettingsSourcesTab";
import { SettingsStaffTab } from "../../components/settings/SettingsStaffTab";
import { StaffCommissionsPanel } from "../../components/settings/StaffCommissionsPanel";
import { SettingsClinicGeneralTab } from "./SettingsClinicGeneralTab.js";
import { SettingsSecurityAndBackupTab } from "./SettingsSecurityAndBackupTab.js";

export interface SettingsTabRendererProps {
	settingsTab: string;
	settingsProps: any;
	activeStaffUser?: any;
	logic: any;
	flags: any;
	telegramAdminSecretSession: any;
	setTelegramAdminSecretDraft: (draft: string) => void;
	unlockTelegramAdminSession: () => void;
	lockTelegramAdminSession: () => void;
	pricelistAnalysis?: any;
	pricelistImageNote?: string;
	pricelistWarningsText?: (warnings: any[]) => string;
	pricelistItemMaterialText?: (item: any) => string;
	pricelistMaterialSummaryText?: (summary: any) => string;
}

export const SettingsTabRenderer: React.FC<SettingsTabRendererProps> = ({
	settingsTab,
	settingsProps,
	activeStaffUser,
	logic,
	flags,
	telegramAdminSecretSession,
	setTelegramAdminSecretDraft,
	unlockTelegramAdminSession,
	lockTelegramAdminSession,
	pricelistAnalysis,
	pricelistImageNote,
	pricelistWarningsText = () => "",
	pricelistItemMaterialText = () => "",
	pricelistMaterialSummaryText = () => "",
}) => {
	const typedPricelistItems = (pricelistAnalysis?.items ??
		[]) as DentalPricelistAnalysisResponse["items"];
	const pricelistWarningRows = (typedPricelistItems ?? []).filter(
		(item) => (item?.warnings ?? []).length > 0,
	);
	const typedPricelistResponseWarnings = (pricelistAnalysis?.warnings ??
		[]) as DentalPricelistAnalysisResponse["warnings"];
	const typedPricelistSummary = (pricelistAnalysis?.summary ??
		[]) as DentalPricelistAnalysisResponse["summary"];

	const pricelistSummaryPriceRangeText = (
		summary: DentalPricelistAnalysisResponse["summary"][number],
	): string => {
		if (summary.minPriceRub === null || summary.maxPriceRub === null)
			return "не определяются — ни одна строка категории не отдала цену";
		const range =
			summary.minPriceRub === summary.maxPriceRub
				? money(summary.minPriceRub)
				: `${money(summary.minPriceRub)} — ${money(summary.maxPriceRub)}`;
		if (summary.averagePriceRub === null)
			return `${range}, среднее не определяется`;
		return `${range}, в среднем ${money(summary.averagePriceRub)}`;
	};

	return (
		<>
			{settingsTab === "access" && (
				<SettingsSecurityAndBackupTab
					settingsProps={settingsProps}
					telegramAdminSecretSession={telegramAdminSecretSession}
					setTelegramAdminSecretDraft={setTelegramAdminSecretDraft}
					unlockTelegramAdminSession={unlockTelegramAdminSession}
					lockTelegramAdminSession={lockTelegramAdminSession}
				/>
			)}

			{settingsTab === "profile" && <SettingsProfileTab props={settingsProps} />}
			{settingsTab === "staff" && <SettingsStaffTab props={settingsProps} />}
			{settingsTab === "commissions" && (
				<ErrorBoundary moduleName="Комиссии и мотивация врачей">
					<StaffCommissionsPanel />
				</ErrorBoundary>
			)}
			{settingsTab === "clinic" && (
				<SettingsClinicGeneralTab props={settingsProps} settingsTab={settingsTab} />
			)}
			{settingsTab === "access" && (
				<div className="space-y-6">
					<SettingsAccessTab
						{...({ props: settingsProps, settingsTab } as {
							props: typeof settingsProps;
							settingsTab: string;
						})}
					/>
					<EgiszBlankPermissionsWidget />
				</div>
			)}
			{settingsTab === "hardware" && (
				<ErrorBoundary moduleName="Оборудование и рентген">
					<HardwareSettingsTab />
				</ErrorBoundary>
			)}
			{settingsTab === "insurance" && <InsuranceContractsPanel />}
			{settingsTab === "protocols" && <SettingsProtocolsTab />}
			{settingsTab === "rules" && (
				<ErrorBoundary moduleName="Правила и регламенты">
					<SettingsRulesTab />
				</ErrorBoundary>
			)}
			{settingsTab === "procedure-boms" && (
				<ErrorBoundary moduleName="Техкарты расхода материалов">
					<MaterialBomsSettingsPanel
						organizationId={
							logic?.dashboard?.clinicSettings?.profile?.organizationId ||
							logic?.auth?.currentUser?.organizationId
						}
					/>
				</ErrorBoundary>
			)}
			{settingsTab === "prices" && (
				<div className="space-y-4">
					{typedPricelistResponseWarnings.length > 0 && (
						<section
							aria-label="Замечания к разбору всего прайса"
							className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2"
						>
							<strong className="text-amber-700 dark:text-amber-400 block">
								Прайс целиком: замечаний — {typedPricelistResponseWarnings.length}
							</strong>
							<ul className="list-disc pl-4 space-y-1 text-[var(--ink)]">
								{typedPricelistResponseWarnings.map((warning) => (
									<li key={warning}>
										{pricelistWarningsText([warning])}
									</li>
								))}
							</ul>
						</section>
					)}

					{typeof pricelistImageNote === "string" && pricelistImageNote.trim() && (
						<p className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
							Фото прайса: {pricelistImageNote}
						</p>
					)}

					{typedPricelistSummary.length > 0 && (
						<section
							aria-label="Материалы и бренды, распознанные в прайсе"
							className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs space-y-2"
						>
							<strong className="text-[var(--ink)] block">Материалы, распознанные в прайсе</strong>
							<ul className="list-disc pl-4 max-h-48 overflow-y-auto space-y-1">
								{typedPricelistSummary.map((summary) => (
									<li key={`${summary.category}-${summary.specialty}`}>
										{summary.category} — строк {summary.count}, с ценой {summary.pricedCount}:{" "}
										<span className="text-[var(--muted)]">
											{pricelistMaterialSummaryText(summary)}
										</span>
										<br />
										<span className="text-[11px] text-[var(--muted)]">
											Цены в категории: {pricelistSummaryPriceRangeText(summary)}
										</span>
									</li>
								))}
							</ul>
						</section>
					)}

					{pricelistWarningRows.length > 0 && (
						<section
							aria-label="Строки прайса, требующие ручной проверки"
							className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2"
						>
							<strong className="text-amber-700 dark:text-amber-400 block">
								Проверьте руками: строк с предупреждениями — {pricelistWarningRows.length} из {typedPricelistItems.length}
							</strong>
							<ul className="list-disc pl-4 max-h-48 overflow-y-auto space-y-1">
								{pricelistWarningRows.map((item) => (
									<li key={item.id}>
										Строка {item.sourceLine} — {item.title}:{" "}
										<span className="text-amber-600 font-bold">
											{pricelistWarningsText(item.warnings)}
										</span>
										<br />
										<span className="text-[11px] text-[var(--muted)]">
											Материал по разбору: {pricelistItemMaterialText(item)}
										</span>
									</li>
								))}
							</ul>
						</section>
					)}

					<SettingsPricesTab />
				</div>
			)}
			{settingsTab === "sources" && <SettingsSourcesTab />}
			{settingsTab === "ai" && <SettingsAiTab />}
			{settingsTab === "modules" && (
				<div className="space-y-6">
					<SettingsModulesTab />
					<YandexCalendarSyncsWidget />
				</div>
			)}
			{settingsTab === "marketing" && flags.hasMarketingModule && <SettingsMarketingTab />}
			{settingsTab === "bpmn" && flags.hasBpmWorkflows && <SettingsBpmnTab />}
			{settingsTab === "reporting" && flags.hasAnalyticsModule && <SettingsReportingTab />}
			{(settingsTab === "messengers" || settingsTab === "telegram") && (
				<ErrorBoundary moduleName="Мессенджеры и рассылки">
					<SettingsMessengersTab props={settingsProps} settingsTab={settingsTab} />
				</ErrorBoundary>
			)}
			{settingsTab === "imports" && (
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
			)}
			{settingsTab === "backup" && (
				<div className="space-y-6">
					<SettingsAuditTab {...settingsProps} settingsTab="backup" />
				</div>
			)}
			{settingsTab === "audit" && (
				<div className="space-y-6">
					<AuditLogsPanel />
					<SettingsAuditTab {...settingsProps} settingsTab={settingsTab} />
				</div>
			)}
			{settingsTab === "deep-clinical" && (
				<ErrorBoundary moduleName="Клинические протоколы и автономия">
					<DeepClinicalSettingsSection />
				</ErrorBoundary>
			)}
		</>
	);
};

export default SettingsTabRenderer;
