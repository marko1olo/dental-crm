/**
 * apps/web/src/components/settings/OwnerSettingsSection.tsx
 *
 * Dedicated settings workspace tailored specifically for clinic Owners, Chief Doctors, and Directors.
 * Encapsulates Scale Sovereignty (1 chair / small clinic / network), statutory requisites,
 * 54-FZ fiscalization, 804n pricelist, doctor commissions & motivation, insurance contracts,
 * data migration wizard, and statutory 152-FZ audit logs.
 *
 * Mandates 8b, 8c, 8d, 8e, 8s: Strictly <= 800 lines, scale sovereignty, zero dead-ends.
 */

import type {
	ClinicMode,
	DentalPricelistAnalysisResponse,
} from "@dental/shared";
import {
	Building2,
	ChevronDown,
	Coins,
	CreditCard,
	Database,
	DollarSign,
	FileSpreadsheet,
	FileText,
	HardDrive,
	HardDriveDownload,
	Layers,
	LineChart,
	Lock,
	Percent,
	Scale,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { money } from "../../AppHelpers";
import { AuditLogsPanel } from "../../AuditLogsPanel";
import { ErrorBoundary } from "../ErrorBoundary";
import { MaterialBomsSettingsPanel } from "../inventory/MaterialBomsSettingsPanel";
import { showToast } from "../GlobalToast";
import { TaxationAndFiscalizationCard } from "./clinic/TaxationAndFiscalizationCard";
import { InsuranceContractsPanel } from "./InsuranceContractsPanel";
import { MigrationWizard } from "./MigrationWizard";
import { OfflineBackupVaultPanel } from "./OfflineBackupVaultPanel";
import { SettingsAuditTab } from "./SettingsAuditTab";
import { SettingsClinicTab } from "./SettingsClinicTab";
import { SettingsImportsTab } from "./SettingsImportsTab";
import { SettingsPricesTab } from "./SettingsPricesTab";
import { SettingsReportingTab } from "./SettingsReportingTab";
import { SettingsSourcesTab } from "./SettingsSourcesTab";
import { StaffCommissionsPanel } from "./StaffCommissionsPanel";
import { OwnerPriceList804nSection } from "./owner/OwnerPriceList804nSection";
import { DeepClinicalSettingsSection } from "./DeepClinicalSettingsSection";
import { SovereignScalePresetsCard } from "../onboarding/SovereignScalePresetsCard";

export type OwnerSubTab =
	| "clinic"
	| "prices"
	| "commissions"
	| "procedure-boms"
	| "insurance"
	| "reporting"
	| "imports"
	| "backup"
	| "audit"
	| "sources"
	| "deep-clinical";

export interface OwnerSettingsSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	readonly props: Record<string, any>;
	readonly initialTab?: OwnerSubTab;
	readonly onSelectTab?: (tab: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: appLogic reference
	readonly appLogic?: any;
}

const OWNER_TABS: Array<{
	id: OwnerSubTab;
	label: string;
	description: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{
		id: "clinic",
		label: "Реквизиты и касса",
		description: "ИНН, ОГРН, лицензия, кассовый аппарат ККТ, филиалы",
		icon: Building2,
	},
	{
		id: "prices",
		label: "Прейскурант 804н",
		description: "Номенклатура услуг, анализ рентабельности и цен",
		icon: DollarSign,
	},
	{
		id: "commissions",
		label: "Комиссии и ЗП",
		description: "Ставки врачей %, сдельная оплата труда, вычеты",
		icon: Percent,
	},
	{
		id: "procedure-boms",
		label: "Техкарты",
		description: "Нормы списания расходников по протоколам процедур",
		icon: Layers,
	},
	{
		id: "insurance",
		label: "Страховые ДМС",
		description: "Договоры со страховыми, гарантийные письма",
		icon: ShieldCheck,
	},
	{
		id: "reporting",
		label: "Отчётность",
		description: "Выручка, маржинальность, загрузка кресел",
		icon: LineChart,
	},
	{
		id: "imports",
		label: "Импорт МИС",
		description: "Миграция баз пациентов, расписания и прайса из внешних МИС",
		icon: HardDriveDownload,
	},
	{
		id: "backup",
		label: "Резервная копия",
		description: "Локальный архив, шифрование AES-GCM-256, расписание",
		icon: HardDrive,
	},
	{
		id: "audit",
		label: "Журнал аудита",
		description: "Безопасность данных, действия сотрудников, логи входов",
		icon: Lock,
	},
	{
		id: "sources",
		label: "Источники КТ",
		description: "DICOM, PACS-сервер, сетевые хранилища снимков",
		icon: Database,
	},
	{
		id: "deep-clinical",
		label: "Автономия и ЭМК",
		description: "ЭМК, ИДС 1051н, нормы списаний, интерком и 54-ФЗ автономия",
		icon: Sparkles,
	},
];

export const OwnerSettingsSection: React.FC<OwnerSettingsSectionProps> = ({
	props,
	initialTab = "clinic",
	onSelectTab,
	appLogic,
}) => {
	const [activeSubTab, setActiveSubTab] = useState<OwnerSubTab>(initialTab);

	useEffect(() => {
		if (initialTab) {
			setActiveSubTab(initialTab);
		}
	}, [initialTab]);

	const handleTabChange = (tabId: OwnerSubTab) => {
		setActiveSubTab(tabId);
		onSelectTab?.(tabId);
	};

	// Scale Sovereignty (Mandate 8s)
	const currentClinicMode: ClinicMode =
		appLogic?.clinicMode ?? props?.clinicMode ?? "small_clinic";

	const handleScaleChange = (mode: ClinicMode) => {
		if (appLogic?.changeClinicMode) {
			appLogic.changeClinicMode(mode);
		} else if (props?.changeClinicMode) {
			props.changeClinicMode(mode);
		}
		const modeTitles: Record<ClinicMode, string> = {
			solo_doctor: "Одиночный врач-арендатор (1 кресло)",
			one_chair: "Кабинет на 1 кресло",
			small_clinic: "Небольшая клиника (2-3 кресла)",
			network_clinic: "Сетевая клиника (многофилиальная)",
		};
		showToast(`Установлен масштаб: ${modeTitles[mode] || mode}`, "success");
	};

	// Pricelist Warnings parsing for compliance test
	const pricelistAnalysis = props?.pricelistAnalysis;
	const typedPricelistItems = (pricelistAnalysis?.items ??
		[]) as DentalPricelistAnalysisResponse["items"];
	const pricelistWarningRows = (typedPricelistItems ?? []).filter(
		(item) => (item?.warnings ?? []).length > 0,
	);
	const typedPricelistResponseWarnings = (pricelistAnalysis?.warnings ??
		[]) as DentalPricelistAnalysisResponse["warnings"];
	const typedPricelistSummary = (pricelistAnalysis?.summary ??
		[]) as DentalPricelistAnalysisResponse["summary"];
	const pricelistImageNote = props?.pricelistImageNote;
	const pricelistWarningsText =
		props?.pricelistWarningsText ?? ((w: string[]) => w.join(", "));
	const pricelistItemMaterialText =
		props?.pricelistItemMaterialText ??
		((item: { title: string }) => item.title);
	const pricelistMaterialSummaryText =
		props?.pricelistMaterialSummaryText ??
		((s: { summary?: string }) => s.summary ?? "—");

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
		<div className="space-y-4" data-testid="owner-settings-section">
			{/* Sub-Navigation Strip (Desktop 32px, Radius 8px, strictly <= 7 controls per row) */}
			<div className="settings-subnav-strip overflow-x-auto pb-1 border-b border-[var(--line)]" role="tablist" aria-label="Разделы настроек владельца">
				{OWNER_TABS.slice(0, 6).map((tab) => {
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
							data-testid={`owner-tab-${tab.id}`}
						>
							<Icon size={14} className="shrink-0" />
							<span>{tab.label}</span>
						</button>
					);
				})}
				<select
					aria-label="Дополнительные системные разделы владельца"
					value={OWNER_TABS.slice(6).some((t) => t.id === activeSubTab) ? activeSubTab : ""}
					onChange={(e) => {
						if (e.target.value) {
							handleTabChange(e.target.value as OwnerSubTab);
						}
					}}
					className={`settings-subnav-btn px-2.5 cursor-pointer ${
						OWNER_TABS.slice(6).some((t) => t.id === activeSubTab) ? "active" : ""
					}`}
					data-testid="owner-tab-system-more-select"
				>
					<option value="" disabled>
						Системные разделы...
					</option>
					{OWNER_TABS.slice(6).map((tab) => (
						<option key={tab.id} value={tab.id} data-testid={`owner-tab-${tab.id}`}>
							{tab.label}
						</option>
					))}
				</select>
			</div>

			{/* Sub-Tab Content Rendering */}
			<div className="pt-2">
				{activeSubTab === "clinic" && (
					<ErrorBoundary moduleName="Реквизиты и касса">
						<div className="space-y-6">
							{/* Scale Sovereignty Presets (Mandate 8s & 8n: Doctor Autonomy & Database-Backed Presets) */}
							<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<SovereignScalePresetsCard
									compactMode={false}
									hideHeader={false}
									onPresetApplied={(presetId) => {
										const targetMode: ClinicMode =
											presetId === "solo_doctor"
												? "solo_doctor"
												: presetId === "standard_clinic"
													? "small_clinic"
													: "network_clinic";
										if (appLogic?.changeClinicMode) {
											appLogic.changeClinicMode(targetMode);
										} else if (props?.changeClinicMode) {
											props.changeClinicMode(targetMode);
										}
									}}
								/>
							</div>
							<TaxationAndFiscalizationCard />
							<SettingsClinicTab props={props} settingsTab="clinic" />
						</div>
					</ErrorBoundary>
				)}

				{activeSubTab === "prices" && (
					<ErrorBoundary moduleName="Прейскурант услуг">
						<div className="space-y-4">
							{typedPricelistResponseWarnings.length > 0 && (
								<section
									aria-label="Замечания к разбору всего прайса"
									role="status"
									aria-live="polite"
									className="p-4 rounded-xl mb-4 bg-amber-500/10 border border-amber-500/30 text-xs"
								>
									<strong className="text-amber-700 dark:text-amber-400 block mb-1">
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

							<OwnerPriceList804nSection />
							<SettingsPricesTab />
						</div>
					</ErrorBoundary>
				)}

				{activeSubTab === "commissions" && (
					<ErrorBoundary moduleName="Комиссии и мотивация врачей">
						<StaffCommissionsPanel />
					</ErrorBoundary>
				)}

				{activeSubTab === "procedure-boms" && (
					<ErrorBoundary moduleName="Техкарты расхода материалов">
						<MaterialBomsSettingsPanel
							{...(props?.auth?.currentUser?.organizationId
								? { organizationId: props.auth.currentUser.organizationId }
								: {})}
						/>
					</ErrorBoundary>
				)}

				{activeSubTab === "insurance" && (
					<ErrorBoundary moduleName="Страховые договоры и ДМС">
						<InsuranceContractsPanel />
					</ErrorBoundary>
				)}

				{activeSubTab === "reporting" && (
					<ErrorBoundary moduleName="Финансовая отчётность">
						<SettingsReportingTab />
					</ErrorBoundary>
				)}

				{activeSubTab === "imports" && (
					<ErrorBoundary moduleName="Перенос данных">
						<div className="space-y-6">
							<MigrationWizard />
							<details className="group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
								<summary className="px-4 py-3 cursor-pointer text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between select-none transition-colors">
									<span>Расширенный режим: Индивидуальный импорт и ручные утилиты (legacy)</span>
									<ChevronDown size={14} className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180" />
								</summary>
								<div className="p-4 border-t border-[var(--line)]">
									<SettingsImportsTab {...props} settingsTab="imports" />
								</div>
							</details>
						</div>
					</ErrorBoundary>
				)}

				{activeSubTab === "backup" && (
					<ErrorBoundary moduleName="Резервное копирование Vault">
						<OfflineBackupVaultPanel />
					</ErrorBoundary>
				)}

				{activeSubTab === "audit" && (
					<ErrorBoundary moduleName="Журнал аудита">
						<div className="space-y-6">
							<AuditLogsPanel />
							<SettingsAuditTab {...props} settingsTab="audit" />
						</div>
					</ErrorBoundary>
				)}

				{activeSubTab === "sources" && (
					<ErrorBoundary moduleName="Источники снимков и КТ">
						<SettingsSourcesTab />
					</ErrorBoundary>
				)}

				{activeSubTab === "deep-clinical" && (
					<ErrorBoundary moduleName="Клинические протоколы и автономия">
						<DeepClinicalSettingsSection />
					</ErrorBoundary>
				)}
			</div>
		</div>
	);
};
