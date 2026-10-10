/**
 * @file apps/web/src/views/settingsView/index.tsx
 * @description Layer 5: Master Coordinator for the SettingsView configuration hub.
 * Decomposed from legacy monolith (Wave 25) per Mandate 8b.
 */

import type React from "react";
import { useState, useMemo, useEffect, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import {
	Building2,
	ChevronDown,
	ChevronLeft,
	ClipboardCheck,
	GraduationCap,
	MoreHorizontal,
	SlidersHorizontal,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import { startInteractiveTour } from "../../components/tutorial/InteractiveGuideTour";
import "../../styles/modules/settings.css";
import "../../styles/modules/mobile-settings.css";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MobileSettingsRootView } from "../../components/settings/mobile/MobileSettingsRootView";
import { MobileSettingsPricesView } from "../../components/settings/mobile/MobileSettingsPricesView";
import { MobileSettingsStaffView } from "../../components/settings/mobile/MobileSettingsStaffView";
import type { DentalPricelistAnalysisResponse } from "@dental/shared";
import {
	type SettingsTabGroup,
	type SettingsTab as SettingsTabId,
	settingsTabs,
} from "../../AppConstants";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsStore } from "../../store/settingsStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { buildSettingsProps } from "../../components/settings/settingsPropsBuilder";
import { DoctorSettingsSection, type DoctorSubTab } from "../../components/settings/DoctorSettingsSection";
import { AdminSettingsSection, type AdminSubTab } from "../../components/settings/AdminSettingsSection";
import { OwnerSettingsSection, type OwnerSubTab } from "../../components/settings/OwnerSettingsSection";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { money } from "../../utils/formatters";
import { AuditLogsPanel } from "../../AuditLogsPanel";
import { EgiszBlankPermissionsWidget } from "../../components/integrations/EgiszBlankPermissionsWidget";
import { YandexCalendarSyncsWidget } from "../../components/integrations/YandexCalendarSyncsWidget";
import { MigrationWizard } from "../../components/settings/MigrationWizard";
import { HardwareSettingsTab } from "../../components/settings/HardwareSettingsTab";
import { InsuranceContractsPanel } from "../../components/settings/InsuranceContractsPanel";
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
import { PublicBookingLinkPanel } from "../../components/settings/PublicBookingLinkPanel";
import { StaffCommissionsPanel } from "../../components/settings/StaffCommissionsPanel";

import {
	type SettingsRoleMode,
	DOCTOR_TABS,
	ADMIN_TABS,
	OWNER_TABS,
	type SettingsViewProps,
} from "./types.js";
import { SettingsNavigationSidebar } from "./SettingsNavigationSidebar.js";
import { SettingsClinicGeneralTab } from "./SettingsClinicGeneralTab.js";
import { SettingsSecurityAndBackupTab } from "./SettingsSecurityAndBackupTab.js";

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
		if (role === "admin" || role === "receptionist" || role === "administrator" || role === "manager") return "admin";
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
		const canonicalTab = tabId === "messengers" ? "telegram" : tabId;
		setSettingsTab?.(canonicalTab);
		window.location.hash = `settings/${canonicalTab}`;
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

	const isMobile = useIsMobile(768);
	const [mobileSection, setMobileSection] = useState<string>(() => {
		if (settingsTab === "telegram" || settingsTab === "messengers") return "messengers";
		if (settingsTab && settingsTab !== "clinic") return settingsTab;
		return "root";
	});

	// Synchronize when settingsTab changes from external links / URL hashes
	useEffect(() => {
		if (settingsTab === "prices") {
			setMobileSection("prices");
		} else if (settingsTab === "staff") {
			setMobileSection("staff");
		} else if (settingsTab === "messengers" || settingsTab === "telegram") {
			setMobileSection("messengers");
		}
	}, [settingsTab]);

	if (isMobile) {
		return (
			<section
				className="settings-zone-mobile w-full min-w-0"
				style={{
					background: "var(--paper)",
					color: "var(--ink)",
					position: "relative",
					overflowY: "auto",
					overflowX: "clip",
					maxWidth: "100vw",
					minHeight: "100dvh",
				}}
				id="settings"
				aria-label="Настройки клиники"
				data-testid="settings-view"
			>
				{mobileSection === "prices" || settingsTab === "prices" ? (
					<MobileSettingsPricesView
						appLogic={logic}
						onBackToSettings={() => {
							setMobileSection("root");
							selectSettingsTab("clinic");
						}}
					/>
				) : mobileSection === "staff" || settingsTab === "staff" ? (
					<MobileSettingsStaffView
						appLogic={logic}
						onBackToSettings={() => {
							setMobileSection("root");
							selectSettingsTab("clinic");
						}}
					/>
				) : mobileSection !== "root" ? (
					<div className="flex flex-col w-full max-w-[100vw] overflow-x-clip pb-24">
						<div className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] px-4 py-2.5 flex items-center justify-between">
							<button
								type="button"
								onClick={() => {
									setMobileSection("root");
									selectSettingsTab("clinic");
								}}
								className="min-w-[44px] min-h-[44px] -ml-2 px-2 flex items-center gap-1 text-[15px] font-medium text-[var(--teal)] hover:opacity-80 active:scale-95 transition-transform cursor-pointer"
								aria-label="Назад в настройки"
								data-testid="btn-mobile-subtab-back"
							>
								<ChevronLeft size={20} className="shrink-0" />
								<span>Настройки</span>
							</button>
							<h2 className="text-[17px] font-semibold text-[var(--ink)] tracking-tight truncate px-2">
								{mobileSection === "clinic" && "Клиника и юрлицо"}
								{mobileSection === "clinic_fiscal" && "Касса и 54-ФЗ"}
								{mobileSection === "clinic_schedule" && "График работы"}
								{mobileSection === "access" && "Права доступа (RBAC)"}
								{mobileSection === "protocols" && "Протоколы лечения"}
								{mobileSection === "rules" && "Клинические правила"}
								{mobileSection === "procedure-boms" && "Техкарты материалов"}
								{(mobileSection === "messengers" || mobileSection === "telegram") && "Мессенджеры"}
								{mobileSection === "booking" && "Онлайн-запись"}
								{mobileSection === "imports" && "Перенос данных"}
								{mobileSection === "audit" && "Журнал аудита"}
								{mobileSection === "commissions" && "Комиссии врачей"}
								{mobileSection === "prices_import" && "Импорт прайса"}
							</h2>
							<div className="w-9" />
						</div>

						<div className="p-4 space-y-4 overflow-x-clip max-w-[100vw]">
							{mobileSection === "clinic" && (
								<SettingsClinicGeneralTab props={settingsProps} settingsTab="clinic" />
							)}
							{mobileSection === "clinic_fiscal" && (
								<SettingsClinicGeneralTab props={settingsProps} settingsTab="clinic" />
							)}
							{mobileSection === "clinic_schedule" && (
								<SettingsClinicGeneralTab props={settingsProps} settingsTab="clinic" />
							)}
							{mobileSection === "access" && (
								<SettingsAccessTab
									{...({ props: settingsProps, settingsTab: "access" } as {
										props: typeof settingsProps;
										settingsTab: string;
									})}
								/>
							)}
							{mobileSection === "protocols" && <SettingsProtocolsTab />}
							{mobileSection === "rules" && <SettingsRulesTab />}
							{mobileSection === "procedure-boms" && (
								<MaterialBomsSettingsPanel
									{...(logic?.auth?.currentUser?.organizationId
										? { organizationId: logic.auth.currentUser.organizationId }
										: {})}
								/>
							)}
							{(mobileSection === "messengers" || mobileSection === "telegram") && (
								<SettingsMessengersTab props={settingsProps} settingsTab="messengers" />
							)}
							{mobileSection === "booking" && <PublicBookingLinkPanel />}
							{mobileSection === "imports" && <MigrationWizard />}
							{mobileSection === "audit" && <AuditLogsPanel />}
							{mobileSection === "commissions" && <StaffCommissionsPanel />}
							{mobileSection === "prices_import" && <SettingsPricesTab />}
						</div>
					</div>
				) : (
					<MobileSettingsRootView
						appLogic={logic}
						onSelectSection={(secId) => {
							if (secId === "prices") {
								setMobileSection("prices");
								selectSettingsTab("prices");
							} else if (secId === "staff") {
								setMobileSection("staff");
								selectSettingsTab("staff");
							} else {
								setMobileSection(secId);
								selectSettingsTab(secId);
							}
						}}
					/>
				)}
			</section>
		);
	}

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
							<button
								type="button"
								onClick={() => {
									setIsMoreActionsOpen(false);
									const currentRole =
										activeStaffUser?.role === "admin" || activeStaffUser?.role === "receptionist"
											? "admin"
											: activeStaffUser?.role === "director" || activeStaffUser?.role === "owner"
												? "director"
												: "doctor";
									startInteractiveTour(currentRole);
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
								data-testid="btn-start-interactive-tour-menuitem"
							>
								<GraduationCap size={16} className="text-[var(--teal)] shrink-0" />
								<span>Интерактивный тур обучения</span>
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
						onClick={() => {
							setRoleMode("doctor");
							selectSettingsTab("profile");
						}}
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
						onClick={() => {
							setRoleMode("admin");
							selectSettingsTab("staff");
						}}
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
						onClick={() => {
							setRoleMode("owner");
							selectSettingsTab("clinic");
						}}
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
						<SettingsNavigationSidebar
							typedSettingsTabs={typedSettingsTabs}
							settingsTab={settingsTab}
							selectSettingsTab={selectSettingsTab}
							handleSettingsTabKeyDown={handleSettingsTabKeyDown}
							activeSettingsTabButtonRef={activeSettingsTabButtonRef}
							settingsTabButtonId={settingsTabButtonId}
							settingsTabPanelId={settingsTabPanelId}
						/>

						<div
							className="settings-tab-panel"
							id={activeSettingsTabPanelId}
							role="tabpanel"
							aria-labelledby={settingsTabButtonId(settingsTab)}
							style={{ paddingBottom: "120px" }}
						>
							{settingsTab !== "telegram" ? (
								<SettingsSecurityAndBackupTab
									settingsProps={settingsProps}
									telegramAdminSecretSession={telegramAdminSecretSession}
									setTelegramAdminSecretDraft={setTelegramAdminSecretDraft}
									unlockTelegramAdminSession={unlockTelegramAdminSession}
									lockTelegramAdminSession={lockTelegramAdminSession}
								/>
							) : null}

							{settingsTab === "profile" && <SettingsProfileTab props={settingsProps} />}
							{settingsTab === "staff" && <SettingsStaffTab props={settingsProps} />}
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
							{(settingsTab === "messengers" || settingsTab === "telegram") && (
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

export * from "./types.js";
export { SettingsNavigationSidebar } from "./SettingsNavigationSidebar.js";
export { SettingsClinicGeneralTab } from "./SettingsClinicGeneralTab.js";
export { SettingsSecurityAndBackupTab } from "./SettingsSecurityAndBackupTab.js";
