/**
 * apps/web/src/SettingsView.tsx
 *
 * Decomposed Settings & Configuration Hub Router with Role-Based Super-Settings:
 * 1. Doctor Cockpit ([Врач]): profile, clinical protocols, SOAP templates, 804n material BOMs, AI dictation, chairside hardware.
 * 2. Administrator Cockpit ([Администратор]): clinic schedule, chairs, staff shifts, granular RBAC access, messengers, online booking, modules.
 * 3. Owner & Director Cockpit ([Владелец / Управляющий]): Scale Sovereignty presets, requisites, 54-FZ fiscalization, 804n pricelist, commissions, insurance, migration wizard, 152-FZ audit.
 * 4. All Sections ([Все разделы]): classic comprehensive settings catalogue with full backwards-compatibility.
 *
 * Mandates 8b, 8c, 8d, 8e, 8s: Strictly <= 800 lines (target <= 400 lines), scale sovereignty, zero dead-ends.
 */

import type React from "react";
import { useState, useMemo, useEffect, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import {
	Bot,
	Building2,
	ChevronDown,
	ClipboardCheck,
	Database,
	DollarSign,
	FileText,
	HardDrive,
	HardDriveDownload,
	Layers,
	LineChart,
	Lock,
	MessageSquare,
	MoreHorizontal,
	Puzzle,
	Send,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	Stethoscope,
	User,
	UserCheck,
	Users,
	Wand2,
} from "lucide-react";
import "./styles/modules/settings.css";
import type {
	DentalPricelistAnalysisResponse,
} from "@dental/shared";
import {
	type SettingsTabGroup,
	settingsTabGroups,
	type SettingsTab as SettingsTabId,
	settingsTabs,
} from "./AppConstants";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useSettingsStore } from "./store/settingsStore";
import { useSettingsDerivations } from "./useSettingsDerivations";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";
import { buildSettingsProps } from "./components/settings/settingsPropsBuilder";
import { DoctorSettingsSection, type DoctorSubTab } from "./components/settings/DoctorSettingsSection";
import { AdminSettingsSection, type AdminSubTab } from "./components/settings/AdminSettingsSection";
import { OwnerSettingsSection, type OwnerSubTab } from "./components/settings/OwnerSettingsSection";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { money } from "./AppHelpers";
import { AuditLogsPanel } from "./AuditLogsPanel";
import { EgiszBlankPermissionsWidget } from "./components/integrations/EgiszBlankPermissionsWidget";
import { YandexCalendarSyncsWidget } from "./components/integrations/YandexCalendarSyncsWidget";
import { MigrationWizard } from "./components/settings/MigrationWizard";
import { HardwareSettingsTab } from "./components/settings/HardwareSettingsTab";
import { InsuranceContractsPanel } from "./components/settings/InsuranceContractsPanel";
import { MaterialBomsSettingsPanel } from "./components/inventory/MaterialBomsSettingsPanel";
import { SettingsAccessTab } from "./components/settings/SettingsAccessTab";
import { SettingsAiTab } from "./components/settings/SettingsAiTab";
import { SettingsAuditTab } from "./components/settings/SettingsAuditTab";
import { SettingsBpmnTab } from "./components/settings/SettingsBpmnTab";
import { SettingsClinicTab } from "./components/settings/SettingsClinicTab";
import { SettingsImportsTab } from "./components/settings/SettingsImportsTab";
import { SettingsMarketingTab } from "./components/settings/SettingsMarketingTab";
import { SettingsMessengersTab } from "./components/settings/SettingsMessengersTab";
import { SettingsModulesTab } from "./components/settings/SettingsModulesTab";
import { SettingsPricesTab } from "./components/settings/SettingsPricesTab";
import { SettingsProfileTab } from "./components/settings/SettingsProfileTab";
import { SettingsProtocolsTab } from "./components/settings/SettingsProtocolsTab";
import { SettingsReportingTab } from "./components/settings/SettingsReportingTab";
import { SettingsRulesTab } from "./components/settings/SettingsRulesTab";
import { SettingsSourcesTab } from "./components/settings/SettingsSourcesTab";
import { SettingsStaffTab } from "./components/settings/SettingsStaffTab";

export type SettingsRoleMode = "doctor" | "admin" | "owner" | "all";

const DOCTOR_TABS = new Set<string>([
	"profile",
	"preferences",
	"protocols",
	"rules",
	"procedure-boms",
	"ai",
	"hardware",
]);

const ADMIN_TABS = new Set<string>([
	"clinic",
	"staff",
	"access",
	"messengers",
	"telegram",
	"booking",
	"modules",
	"marketing",
	"bpmn",
]);

const OWNER_TABS = new Set<string>([
	"clinic",
	"prices",
	"commissions",
	"procedure-boms",
	"insurance",
	"reporting",
	"imports",
	"audit",
	"sources",
]);

export interface SettingsViewProps {
	// biome-ignore lint/suspicious/noExplicitAny: universal props
	activeStaffUser?: any;
	// biome-ignore lint/suspicious/noExplicitAny: universal props
	[key: string]: any;
}

export function SettingsView({ activeStaffUser }: SettingsViewProps) {
	const appLogic = useAppLogicContext();
	const settingsStore = useSettingsStore();
	const derivations = useSettingsDerivations();
	const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

	// biome-ignore lint/suspicious/noExplicitAny: props bag unpacking
	const logic = appLogic as Record<string, any>;
	const {
		activeSettingsTabButtonRef,
		reopenOnboarding,
		setSettingsTab,
		settingsTab,
		settingsTabs: rawSettingsTabs,
		setTelegramAdminSecretDraft,
		unlockTelegramAdminSession,
		lockTelegramAdminSession,
		telegramAdminSecretSession,
		pricelistAnalysis,
		pricelistImageNote,
		pricelistWarningsText = () => "",
		pricelistItemMaterialText = () => "",
		pricelistMaterialSummaryText = () => "",
	} = logic;

	const settingsProps = buildSettingsProps(logic, settingsStore, derivations, activeStaffUser);

	const initialRoleMode = useMemo<SettingsRoleMode>(() => {
		const role = activeStaffUser?.role;
		if (role === "doctor") return "doctor";
		if (role === "admin" || role === "receptionist") return "admin";
		if (role === "director" || role === "owner") return "owner";
		return "doctor";
	}, [activeStaffUser?.role]);

	const [roleMode, setRoleMode] = useState<SettingsRoleMode>(initialRoleMode);

	// Deep link synchronization: adapt roleMode if active settingsTab belongs to a specific role
	useEffect(() => {
		if (roleMode === "all") return;
		if (roleMode === "doctor" && !DOCTOR_TABS.has(settingsTab) && settingsTab !== "clinic") {
			if (ADMIN_TABS.has(settingsTab)) setRoleMode("admin");
			else if (OWNER_TABS.has(settingsTab)) setRoleMode("owner");
		} else if (roleMode === "admin" && !ADMIN_TABS.has(settingsTab) && settingsTab !== "clinic") {
			if (DOCTOR_TABS.has(settingsTab)) setRoleMode("doctor");
			else if (OWNER_TABS.has(settingsTab)) setRoleMode("owner");
		} else if (roleMode === "owner" && !OWNER_TABS.has(settingsTab) && settingsTab !== "clinic") {
			if (DOCTOR_TABS.has(settingsTab)) setRoleMode("doctor");
			else if (ADMIN_TABS.has(settingsTab)) setRoleMode("admin");
		}
	}, [settingsTab, roleMode]);

	const flags = useWorkspaceProfile();
	let typedSettingsTabs = (rawSettingsTabs ?? settingsTabs ?? []) as Array<{
		id: SettingsTabId;
		title: string;
		group: SettingsTabGroup;
	}>;
	if (!flags.hasMarketingModule) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "marketing");
	if (!flags.hasAnalyticsModule) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "reporting");
	if (!flags.hasBpmWorkflows) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "bpmn");
	if (!flags.hasClinicalRules) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "rules");
	if (!flags.hasInsuranceCoPay) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "insurance");
	if (activeStaffUser?.role === "doctor")
		typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "telegram");

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

	const selectSettingsTab = (tabId: SettingsTabId | string) => {
		setSettingsTab?.(tabId);
		window.location.hash = `settings/${tabId}`;
	};

	const settingsTabButtonId = (tabId: SettingsTabId) => `settings-tab-${tabId}`;
	const settingsTabPanelId = (tabId: SettingsTabId) => `settings-panel-${tabId}`;
	const activeSettingsTabPanelId = settingsTabPanelId(settingsTab);

	const handleSettingsTabKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		tabId: SettingsTabId,
	) => {
		const currentIndex = typedSettingsTabs.findIndex((tab) => tab.id === tabId);
		if (currentIndex < 0) return;
		const lastIndex = typedSettingsTabs.length - 1;
		const nextIndex =
			event.key === "ArrowRight" || event.key === "ArrowDown"
				? currentIndex === lastIndex
					? 0
					: currentIndex + 1
				: event.key === "ArrowLeft" || event.key === "ArrowUp"
					? currentIndex === 0
						? lastIndex
						: currentIndex - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? lastIndex
							: null;
		if (nextIndex === null) return;
		const nextTab = typedSettingsTabs[nextIndex];
		if (!nextTab) return;
		const nextTabButtonId = settingsTabButtonId(nextTab.id);
		event.preventDefault();
		selectSettingsTab(nextTab.id);
		window.setTimeout(
			() => document.getElementById(nextTabButtonId)?.focus(),
			0,
		);
	};

	const SETTINGS_TAB_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
		profile: User,
		preferences: Wand2,
		clinic: Building2,
		modules: Puzzle,
		staff: Users,
		access: Lock,
		telegram: MessageSquare,
		hardware: HardDrive,
		protocols: FileText,
		rules: ShieldAlert,
		"procedure-boms": Layers,
		prices: DollarSign,
		ai: Bot,
		insurance: ShieldCheck,
		marketing: Send,
		bpmn: SlidersHorizontal,
		sources: Database,
		reporting: LineChart,
		imports: HardDriveDownload,
		audit: Lock,
	};

	const renderTabButton = (tab: (typeof typedSettingsTabs)[number]) => {
		const tabSelected = settingsTab === tab.id;
		const Icon = SETTINGS_TAB_ICONS[tab.id] || SlidersHorizontal;
		return (
			<button
				aria-controls={settingsTabPanelId(tab.id)}
				aria-selected={tabSelected}
				className={`settings-catalogue-btn ${tabSelected ? "active" : ""} flex-shrink-0 whitespace-nowrap`}
				id={settingsTabButtonId(tab.id)}
				key={tab.id}
				onClick={() => selectSettingsTab(tab.id)}
				onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
					handleSettingsTabKeyDown(event, tab.id)
				}
				ref={tabSelected ? activeSettingsTabButtonRef : undefined}
				role="tab"
				tabIndex={tabSelected ? 0 : -1}
				type="button"
			>
				<Icon size={14} className="shrink-0" />
				<span className="truncate">{tab.title}</span>
			</button>
		);
	};

	return (
		<motion.section
			className="settings-zone panel"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				color: "var(--ink)",
				borderRadius: "14px",
				padding: "20px 20px 100px 20px",
				position: "relative",
				overflowY: "auto",
			}}
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			id="settings"
			aria-label="Настройки и перенос данных"
			data-testid="settings-view"
		>
			{/* Top Bar: Title & More Actions */}
			<div className="settings-heading flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
				<div>
					<p className="eyebrow" style={{ color: "var(--muted)" }}>
						Настройки
					</p>
					<h2 title="Раздел административных настроек: управление персоналом, прайс-листом, интеграцией с ЕГИСЗ/ОФД и бланками">
						Настройки клиники
					</h2>
				</div>

				<div className="settings-heading-actions relative">
					<button
						className="secondary-button min-h-[36px] h-9 w-9 p-0 flex items-center justify-center rounded-xl shrink-0 cursor-pointer"
						type="button"
						onClick={() => setIsMoreActionsOpen((prev) => !prev)}
						aria-expanded={isMoreActionsOpen}
						aria-label="Дополнительные действия"
						title="Дополнительные действия"
						data-testid="btn-settings-more-actions"
					>
						<MoreHorizontal size={18} className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors" />
					</button>
					{isMoreActionsOpen && (
						<div
							className="absolute right-0 top-full mt-1.5 w-60 py-1.5 px-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-50 flex flex-col gap-1 text-left animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								onClick={() => {
									setIsMoreActionsOpen(false);
									reopenOnboarding?.();
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
								data-testid="btn-reopen-onboarding-menuitem"
							>
								<ClipboardCheck size={16} className="text-[var(--teal)] shrink-0" />
								<span>Мастер первого запуска</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Role Switcher Cockpit Tabs: Premium macOS / Linear Segmented Control Strip */}
			<div
				className="settings-role-strip-container col-span-full mb-6"
				style={{ gridColumn: "1 / -1" }}
			>
				<div
					className="settings-segmented-strip"
					role="tablist"
					aria-label="Режим настроек"
				>
					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "doctor"}
						onClick={() => setRoleMode("doctor")}
						className={`settings-segment-btn ${roleMode === "doctor" ? "active" : ""}`}
						data-testid="btn-settings-role-doctor"
					>
						<Stethoscope size={15} className="shrink-0" />
						<span className="whitespace-nowrap">Врач</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "admin"}
						onClick={() => setRoleMode("admin")}
						className={`settings-segment-btn ${roleMode === "admin" ? "active" : ""}`}
						data-testid="btn-settings-role-admin"
					>
						<UserCheck size={15} className="shrink-0" />
						<span className="whitespace-nowrap">Администратор</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "owner"}
						onClick={() => setRoleMode("owner")}
						className={`settings-segment-btn ${roleMode === "owner" ? "active" : ""}`}
						data-testid="btn-settings-role-owner"
					>
						<Building2 size={15} className="shrink-0" />
						<span className="whitespace-nowrap">Владелец</span>
					</button>

					<div className="settings-segment-divider" aria-hidden="true" />

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "all"}
						onClick={() => setRoleMode("all")}
						className={`settings-segment-btn ${roleMode === "all" ? "active" : ""}`}
						title="Показать все настройки единым классическим каталогом"
						data-testid="btn-settings-role-all"
					>
						<SlidersHorizontal size={14} className="shrink-0" />
						<span className="whitespace-nowrap">Все разделы</span>
					</button>
				</div>

				<div className="settings-role-hint-pill hidden lg:inline-flex">
					<span className="settings-role-hint-dot" aria-hidden="true" />
					<span>
						{roleMode === "doctor" && "Кабинет врача: персональные стандарты, шаблоны медкарты и автономия"}
						{roleMode === "admin" && "Кабинет администратора: кресла, график смен, права и напоминания"}
						{roleMode === "owner" && "Кабинет владельца: реквизиты, касса, прейскурант и масштаб"}
						{roleMode === "all" && "Полный каталог: все модули и технические параметры клиники"}
					</span>
				</div>
			</div>

			{/* Main Workspace: Active Role Section or Comprehensive View */}
			<div className="col-span-full w-full min-w-0" style={{ gridColumn: "1 / -1" }}>
				{roleMode === "doctor" && (
					<DoctorSettingsSection
						props={settingsProps}
						initialTab={DOCTOR_TABS.has(settingsTab) ? (settingsTab as DoctorSubTab) : "profile"}
						onSelectTab={selectSettingsTab}
					/>
				)}

				{roleMode === "admin" && (
					<AdminSettingsSection
						props={settingsProps}
						initialTab={ADMIN_TABS.has(settingsTab) ? (settingsTab as AdminSubTab) : "clinic"}
						onSelectTab={selectSettingsTab}
					/>
				)}

				{roleMode === "owner" && (
					<OwnerSettingsSection
						props={settingsProps}
						initialTab={OWNER_TABS.has(settingsTab) ? (settingsTab as OwnerSubTab) : "clinic"}
						onSelectTab={selectSettingsTab}
						appLogic={appLogic}
					/>
				)}

				{roleMode === "all" && (
					<div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">
						<div
							className="settings-catalogue-sidebar settings-tabs scrollbar-none touch-pan-x"
							role="tablist"
							aria-label="Раздел настроек"
						>
						{(settingsTabGroups ?? []).map((group) => {
							const tabsInGroup = (typedSettingsTabs ?? []).filter(
								(t) => t?.group === group?.id,
							);
							if (tabsInGroup.length === 0) return null;
							return (
								<div className="settings-catalogue-group settings-tabs-group" key={group.id}>
									<span className="settings-catalogue-group-header settings-tabs-group-header">{group.title}</span>
									{tabsInGroup.map(renderTabButton)}
								</div>
							);
						})}
					</div>

					<div
						className="settings-tab-panel"
						id={activeSettingsTabPanelId}
						role="tabpanel"
						aria-labelledby={settingsTabButtonId(settingsTab)}
						style={{ paddingBottom: "120px" }}
					>
						{settingsTab !== "telegram" ? (
							<details className="settings-advanced-block settings-admin-secret-block mb-4">
								<summary className="settings-advanced-toggle">
									<span className="settings-advanced-label flex items-center gap-1.5">
										<Lock size={15} className="text-amber-500 shrink-0" />
										<span>Доступ к защищенным настройкам</span>
									</span>
									<span className="settings-advanced-hint">
										только если требует сервер
									</span>
									<span className="settings-advanced-chevron">▼</span>
								</summary>
								<article className="telegram-link-panel telegram-admin-panel settings-advanced-form">
									<p>
										Если сервер клиники требует админ-доступ, введите секрет для
										изменений профиля, команды, кресел, источников, импорта и
										аудита. В браузере он не сохраняется.
									</p>
									<p>{settingsProps.adminSecretScopeWarning}</p>
									<div className="telegram-link-controls">
										<label>
											Секрет администратора клиники для настроек
											<input
												type="password"
												autoComplete="current-password"
												value={settingsProps.telegramAdminSecretDraft ?? ""}
												onChange={(event) => {
													setTelegramAdminSecretDraft?.(event.target.value);
												}}
												onKeyDown={(event) => {
													if (event.key === "Enter" && settingsProps.adminSecretReady) {
														event.preventDefault();
														unlockTelegramAdminSession?.();
													}
												}}
												placeholder="введите секрет администратора"
												aria-describedby={
													!settingsProps.adminSecretReady
														? "settings-admin-unlock-guidance"
														: undefined
												}
											/>
										</label>
										{!settingsProps.adminSecretReady ? (
											<p
												className="admin-unlock-guidance"
												id="settings-admin-unlock-guidance"
												role="status"
												aria-live="polite"
											>
												Введите секрет администратора клиники, чтобы менять
												защищенные настройки.
											</p>
										) : null}
										<button
											className="secondary-button"
											type="button"
											onClick={unlockTelegramAdminSession}
											disabled={!settingsProps.adminSecretReady}
											style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
										>
											<ShieldCheck aria-hidden="true" /> Разблокировать
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={lockTelegramAdminSession}
											disabled={!telegramAdminSecretSession}
										>
											Забыть секрет
										</button>
									</div>
									<p>
										{telegramAdminSecretSession
											? "Админ-доступ активен до перезагрузки страницы."
											: "Без секрета работают только окружения без обязательного админ-доступа."}
									</p>
								</article>
							</details>
						) : null}

						{settingsTab === "profile" && <SettingsProfileTab props={settingsProps} />}
						{settingsTab === "staff" && <SettingsStaffTab props={settingsProps} />}
						{settingsTab === "clinic" && <SettingsClinicTab props={settingsProps} settingsTab={settingsTab} />}
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
						{settingsTab === "telegram" && activeStaffUser?.role !== "doctor" && (
							<SettingsMessengersTab props={settingsProps} settingsTab={settingsTab} />
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
									{...(logic?.auth?.currentUser?.organizationId
										? { organizationId: logic.auth.currentUser.organizationId }
										: {})}
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
						{settingsTab === "messengers" && (
							<ErrorBoundary moduleName="Мессенджеры и рассылки">
								<SettingsMessengersTab props={settingsProps} settingsTab={settingsTab} />
							</ErrorBoundary>
						)}
						{settingsTab === "imports" && (
							<div className="space-y-6">
								<MigrationWizard />
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
						{settingsTab === "audit" && (
							<div className="space-y-6">
								<AuditLogsPanel />
								<SettingsAuditTab {...settingsProps} settingsTab={settingsTab} />
							</div>
						)}
						<div className="h-36 w-full shrink-0 pointer-events-none" aria-hidden="true" />
					</div>
				</div>
			)}
			</div>
		</motion.section>
	);
}

export default SettingsView;
